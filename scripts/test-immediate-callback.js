const { Pool } = require('pg');

async function createTestPayoutWithCallback() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_on7qfUuh5jmM@ep-small-cloud-a1axg124-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require'
  });

  try {
    const client = await pool.connect();
    
    console.log('Creating test payout with external callback URL...');
    
    // Insert a test payout record
    const result = await client.query(`
      INSERT INTO payouts (
        vendor_id, amount, currency, beneficiary_name, beneficiary_account, 
        beneficiary_ifsc, reference_id, status, external_callback_url, 
        created_at, updated_at
      ) VALUES (
        1, 1500.00, 'INR', 'Test Callback User', '1234567890', 
        'HDFC0001234', 'PAYOUT_CALLBACK_TEST_001', 'initiated', 
        'https://webhook.site/cd68de8b-a811-4f08-b1fb-316decdaa30e',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
      ) RETURNING id
    `);
    
    console.log('✅ Test payout created with ID:', result.rows[0].id);
    console.log('Reference ID: PAYOUT_CALLBACK_TEST_001');
    console.log('External Callback URL: https://webhook.site/cd68de8b-a811-4f08-b1fb-316decdaa30e');
    
    // Test immediate callback
    console.log('\n🔄 Testing immediate callback...');
    
    const immediateCallbackPayload = {
      id: result.rows[0].id,
      reference_id: 'PAYOUT_CALLBACK_TEST_001',
      status: 'initiated',
      amount: '1500.00',
      currency: 'INR',
      beneficiary_name: 'Test Callback User',
      beneficiary_account: '1234567890',
      beneficiary_ifsc: 'HDFC0001234',
      utr: null,
      failure_reason: null,
      status_code: null,
      status_description: null,
      cf_transfer_id: 'CF_CALLBACK_TEST_001',
      updated_at: new Date().toISOString(),
      timestamp: new Date().toISOString(),
      event_type: 'payout_initiated'
    };
    
    try {
      const response = await fetch('https://webhook.site/cd68de8b-a811-4f08-b1fb-316decdaa30e', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'ZTake-Payout/1.0'
        },
        body: JSON.stringify(immediateCallbackPayload)
      });
      
      console.log('✅ Immediate callback response:', response.status, response.statusText);
      
    } catch (error) {
      console.error('❌ Immediate callback error:', error.message);
    }
    
    client.release();
  } catch (error) {
    console.error('❌ Error creating test payout:', error.message);
  } finally {
    await pool.end();
  }
}

createTestPayoutWithCallback();
