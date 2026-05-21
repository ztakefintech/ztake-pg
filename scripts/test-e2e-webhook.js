// scripts/test-e2e-webhook.js
// Run with: node scripts/test-e2e-webhook.js

const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

if (!process.env.DATABASE_URL) {
  require('dotenv').config({ path: '.env' });
}

console.log('Using DATABASE_URL:', process.env.DATABASE_URL ? 'Loaded' : 'NOT FOUND');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const PORT = process.env.PORT || 3001;
const BASE_URL = `http://localhost:${PORT}`;
const VENDOR_SECRET = 'sk_live_test_secret_key_123456789012345';
const VENDOR_CODE = 'TSTVND';

async function setupTestData() {
  const client = await pool.connect();
  try {
    console.log('\n--- Setting Up Test Vendor & API Keys ---');
    
    // Ensure test vendor exists
    await client.query(`
      INSERT INTO vendors (
        vendor_code, email, password_hash, business_name, contact_name, phone, upi_id, is_approved, secret_key
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      ON CONFLICT (email) DO UPDATE SET 
        secret_key = EXCLUDED.secret_key,
        vendor_code = EXCLUDED.vendor_code
    `, [
      VENDOR_CODE,
      'test_vendor@ztake.in',
      'hashed_pwd_here',
      'Test Business',
      'Test Contact',
      '9999999999',
      'test@upi',
      true,
      VENDOR_SECRET
    ]);

    // Retrieve vendor ID
    const res = await client.query('SELECT id FROM vendors WHERE vendor_code = $1', [VENDOR_CODE]);
    const vendorId = res.rows[0].id;
    console.log(`Test Vendor exists with ID: ${vendorId}`);
    return vendorId;
  } finally {
    client.release();
  }
}

async function createTestOrder(vendorId, ztakeOrderId, amount = 15.00) {
  const client = await pool.connect();
  try {
    await client.query('DELETE FROM orders WHERE ztake_order_id = $1', [ztakeOrderId]);
    await client.query(`
      INSERT INTO orders (
        ztake_order_id, merchant_order_id, amount, currency, customer_name, status, vendor_id, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
    `, [
      ztakeOrderId,
      `mch_${ztakeOrderId}`,
      amount,
      'INR',
      'Karthik User',
      'order_created',
      vendorId
    ]);
    console.log(`Created test order ${ztakeOrderId} in order_created state.`);
  } finally {
    client.release();
  }
}

async function verifyOrderState(ztakeOrderId, expectedStatus, expectedWebhookVerified) {
  const client = await pool.connect();
  try {
    const res = await client.query(
      'SELECT status, webhook_verified, utr, verification_source FROM orders WHERE ztake_order_id = $1',
      [ztakeOrderId]
    );
    if (res.rows.length === 0) {
      throw new Error(`Order ${ztakeOrderId} not found in DB!`);
    }
    const order = res.rows[0];
    const statusMatch = order.status === expectedStatus;
    const webhookVerifiedMatch = order.webhook_verified === expectedWebhookVerified;
    
    console.log(`Order ${ztakeOrderId} status: '${order.status}' (Expected: '${expectedStatus}'), webhook_verified: ${order.webhook_verified} (Expected: ${expectedWebhookVerified}), UTR: '${order.utr || ''}', source: '${order.verification_source || ''}'`);
    
    if (!statusMatch || !webhookVerifiedMatch) {
      throw new Error(`State verification failed for order ${ztakeOrderId}`);
    }
    return order;
  } finally {
    client.release();
  }
}

async function verifyWebhookState(utr, expectedProcessed, expectedMatchedTxnId) {
  const client = await pool.connect();
  try {
    const res = await client.query(
      'SELECT processed, matched_txn_id, amount, sender_name, payment_app, mdr_gst, amount_received FROM webhook_events WHERE utr = $1 ORDER BY received_at DESC LIMIT 1',
      [utr]
    );
    if (res.rows.length === 0) {
      throw new Error(`Webhook event with UTR ${utr} not found in DB!`);
    }
    const event = res.rows[0];
    const processedMatch = event.processed === expectedProcessed;
    const matchedTxnMatch = event.matched_txn_id === expectedMatchedTxnId;
    
    console.log(`Webhook Event processed: ${event.processed} (Expected: ${expectedProcessed}), matched_txn_id: '${event.matched_txn_id || ''}' (Expected: '${expectedMatchedTxnId || ''}')`);
    console.log(`Parsed details - Sender: ${event.sender_name}, App: ${event.payment_app}, Amount: ${event.amount}, MDR: ${event.mdr_gst}, Net: ${event.amount_received}`);
    
    if (!processedMatch || !matchedTxnMatch) {
      throw new Error(`State verification failed for webhook event UTR ${utr}`);
    }
    return event;
  } finally {
    client.release();
  }
}

async function cleanupTestData(utrs, orderIds) {
  const client = await pool.connect();
  try {
    console.log('\n--- Cleaning up sandbox test data ---');
    if (utrs.length > 0) {
      await client.query('DELETE FROM webhook_events WHERE utr = ANY($1)', [utrs]);
      console.log(`Deleted webhook events for UTRs: ${utrs.join(', ')}`);
    }
    if (orderIds.length > 0) {
      await client.query('DELETE FROM orders WHERE ztake_order_id = ANY($1)', [orderIds]);
      console.log(`Deleted orders: ${orderIds.join(', ')}`);
    }
  } finally {
    client.release();
  }
}

async function runTests() {
  const vendorId = await setupTestData();
  
  const utr1 = (100000000000 + Math.floor(Math.random() * 900000000000)).toString();
  const orderId1 = `ORD_E2E_SCEN_1_${Date.now()}`;
  
  const utr2 = (200000000000 + Math.floor(Math.random() * 900000000000)).toString();
  const orderId2 = `ORD_E2E_SCEN_2_${Date.now()}`;

  const utr3 = (300000000000 + Math.floor(Math.random() * 900000000000)).toString();
  const orderId3 = `ORD_E2E_SCEN_3_${Date.now()}`;

  try {
    // ==========================================
    // TEST 1: Webhook Arrives First -> UTR Submitted Second (Private Endpoint)
    // ==========================================
    console.log('\n🚀 [TEST 1] Webhook First -> UTR Second (Private Endpoint)');
    await createTestOrder(vendorId, orderId1, 15.00);

    // 1. Simulate Incoming Webhook
    console.log(`1. Posting GPay bank webhook payload to endpoint...`);
    const webhookRes1 = await fetch(`${BASE_URL}/api/webhooks/bank`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        amount: '+ ₹15',
        time: '20 May, 10:30 pm',
        raw_screen: `Back|Show menu|Received from MOHIT SHARMA|20 May, 10:30 pm|₹15 credited|See insights|Payment from Google Pay|Payment received from customer|Transaction details\nPayment method\nUPI\nUPI Transaction ID\n${utr1}\nGoogle Transaction ID\nCICAgNjO9uHwAA\nPaid via\nExternal app\nCustomer paid\n₹15\nMDR + GST\n₹0\nAmount you get\n₹15|Learn more`,
        source: 'gpay_business',
        timestamp: String(Math.floor(Date.now() / 1000))
      })
    });

    const webhookJson1 = await webhookRes1.json();
    console.log('Webhook response:', webhookJson1);
    if (webhookJson1.status !== 'logged_unmatched') {
      throw new Error(`Expected 'logged_unmatched' status, got: ${webhookJson1.status}`);
    }

    // Verify webhook event logged as unmatched
    await verifyWebhookState(utr1, false, null);

    // 2. Submit UTR via Private Endpoint
    console.log(`2. Submitting UTR ${utr1} to private endpoint for order ${orderId1}...`);
    const submitRes1 = await fetch(`${BASE_URL}/api/instant-payin/${orderId1}/submit-utr`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${VENDOR_SECRET}`
      },
      body: JSON.stringify({ utr: utr1 })
    });

    const submitJson1 = await submitRes1.json();
    console.log('Submit UTR response:', submitJson1);
    if (!submitJson1.success || !submitJson1.verified || submitJson1.status !== 'Succeeded') {
      throw new Error(`Expected success and verified Succeeded status, got: ${JSON.stringify(submitJson1)}`);
    }

    // Verify states in DB
    await verifyOrderState(orderId1, 'Succeeded', true);
    await verifyWebhookState(utr1, true, orderId1);
    console.log('✅ TEST 1 passed successfully!');

    // ==========================================
    // TEST 2: UTR Submitted First -> Webhook Arrives Second (Instant Match)
    // ==========================================
    console.log('\n🚀 [TEST 2] UTR First -> Webhook Second (Instant Match)');
    await createTestOrder(vendorId, orderId2, 15.00);

    // 1. Submit UTR via Private Endpoint
    console.log(`1. Submitting UTR ${utr2} first...`);
    const submitRes2 = await fetch(`${BASE_URL}/api/instant-payin/${orderId2}/submit-utr`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${VENDOR_SECRET}`
      },
      body: JSON.stringify({ utr: utr2 })
    });

    const submitJson2 = await submitRes2.json();
    console.log('Submit UTR response:', submitJson2);
    if (!submitJson2.success || submitJson2.verified || submitJson2.status !== 'Pending') {
      throw new Error(`Expected success and Pending status, got: ${JSON.stringify(submitJson2)}`);
    }

    // Verify order is Pending
    await verifyOrderState(orderId2, 'Pending', false);

    // 2. Simulate Webhook Arrival
    console.log(`2. Webhook arriving now for UTR ${utr2}...`);
    const webhookRes2 = await fetch(`${BASE_URL}/api/webhooks/bank`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        amount: '+ ₹15',
        time: '20 May, 10:35 pm',
        raw_screen: `Back|Show menu|Received from MOHIT SHARMA|20 May, 10:35 pm|₹15 credited|See insights|Payment from Google Pay|Payment received from customer|Transaction details\nPayment method\nUPI\nUPI Transaction ID\n${utr2}\nGoogle Transaction ID\nCICAgNjO9uHwBB\nPaid via\nExternal app\nCustomer paid\n₹15\nMDR + GST\n₹0\nAmount you get\n₹15|Learn more`,
        source: 'gpay_business',
        timestamp: String(Math.floor(Date.now() / 1000))
      })
    });

    const webhookJson2 = await webhookRes2.json();
    console.log('Webhook response:', webhookJson2);
    if (webhookJson2.status !== 'verified') {
      throw new Error(`Expected 'verified' status, got: ${webhookJson2.status}`);
    }

    // Verify DB states
    await verifyOrderState(orderId2, 'Succeeded', true);
    await verifyWebhookState(utr2, true, orderId2);
    console.log('✅ TEST 2 passed successfully!');

    // ==========================================
    // TEST 3: Webhook Arrives First -> UTR Submitted Second (Public Endpoint)
    // ==========================================
    console.log('\n🚀 [TEST 3] Webhook First -> UTR Second (Public Endpoint)');
    await createTestOrder(vendorId, orderId3, 15.00);

    // 1. Simulate Incoming Webhook
    console.log(`1. Posting GPay bank webhook payload to endpoint...`);
    const webhookRes3 = await fetch(`${BASE_URL}/api/webhooks/bank`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        amount: '+ ₹15',
        time: '20 May, 10:40 pm',
        raw_screen: `Back|Show menu|Received from ROHIT KUMAR|20 May, 10:40 pm|₹15 credited|See insights|Payment from PhonePe|Payment received from customer|Transaction details\nPayment method\nUPI\nUPI Transaction ID\n${utr3}\nGoogle Transaction ID\nCICAgNjO9uHwCC\nPaid via\nExternal app\nCustomer paid\n₹15\nMDR + GST\n₹0\nAmount you get\n₹15|Learn more`,
        source: 'gpay_business',
        timestamp: String(Math.floor(Date.now() / 1000))
      })
    });

    const webhookJson3 = await webhookRes3.json();
    console.log('Webhook response:', webhookJson3);
    if (webhookJson3.status !== 'logged_unmatched') {
      throw new Error(`Expected 'logged_unmatched' status, got: ${webhookJson3.status}`);
    }

    // Verify webhook event logged as unmatched
    await verifyWebhookState(utr3, false, null);

    // 2. Submit UTR via Public Endpoint
    console.log(`2. Submitting UTR ${utr3} to public endpoint for order ${orderId3}...`);
    const submitRes3 = await fetch(`${BASE_URL}/api/v1/orders/${orderId3}/submit-utr`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ utr: utr3 })
    });

    const submitJson3 = await submitRes3.json();
    console.log('Submit UTR response:', submitJson3);
    if (!submitJson3.success || !submitJson3.verified || submitJson3.status !== 'Succeeded') {
      throw new Error(`Expected success and verified Succeeded status, got: ${JSON.stringify(submitJson3)}`);
    }

    // Verify states in DB
    await verifyOrderState(orderId3, 'Succeeded', true);
    await verifyWebhookState(utr3, true, orderId3);
    console.log('✅ TEST 3 passed successfully!');

    console.log('\n🎉 ALL END-TO-END INTEGRATION TESTS PASSED TRIUMPHANTLY! 🎉');

  } catch (error) {
    console.error('\n❌ TEST SUITE RUN ENCOUNTERED A FAILURE:');
    console.error(error);
    process.exitCode = 1;
  } finally {
    // Cleanup sandbox test data
    await cleanupTestData([utr1, utr2, utr3], [orderId1, orderId2, orderId3]);
    await pool.end();
  }
}

runTests();
