import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database';
import { AuthService } from '@/lib/auth';
import { generatePayoutId } from '@/lib/utils';
import { eventStore } from '@/lib/event-store';
import { demoCallbackStore } from '@/lib/callback-store';
import { createPayoutSchema, validateRequest, validateBusinessRules, sanitizeInput, paginationSchema, validateQueryParams, apiKeyValidationSchema } from '@/lib/validation';
import { withRateLimit } from '@/lib/middleware';
import { payoutCreationRateLimit } from '@/lib/rate-limit';
import { apiCors } from '@/lib/cors';
import { sendTelegramAdminAlert } from '@/lib/telegram';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function listPayouts(req: NextRequest) {
  try {
    // Validate API key from authorization header
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Authorization header with Bearer token is required' }, { status: 401 });
    }
    
    const apiKey = authHeader.substring(7);
    try {
      validateRequest(apiKeyValidationSchema, apiKey);
    } catch (error) {
      return NextResponse.json({ error: 'Invalid API key format in Authorization header' }, { status: 401 });
    }

    console.log(`[LIST-PAYOUTS] Attempting authentication for API key: ${apiKey.substring(0, 8)}...`);

    // Verify API key exists in database
    const apiKeyInfo = await AuthService.verifyApiKeyFromDb(apiKey);
    if (!apiKeyInfo) {
      console.log(`[LIST-PAYOUTS] API key not found in database: ${apiKey.substring(0, 8)}...`);
      return NextResponse.json({ 
        error: 'Invalid API key. The provided API key does not exist.',
        details: 'Please check your API key and try again'
      }, { status: 401 });
    }
    
    console.log(`[LIST-PAYOUTS] API key verified for key ID: ${apiKeyInfo.keyId}`);

    // Get vendor code from query parameters
    const { searchParams } = new URL(req.url);
    const vendorCodeFromQuery = searchParams.get('vendorCode');
    
    if (!vendorCodeFromQuery) {
      console.log(`[LIST-PAYOUTS] Vendor code not provided in query parameters`);
      return NextResponse.json({ 
        error: 'Vendor code is required as a query parameter.',
        details: 'Please provide vendorCode in the query string'
      }, { status: 400 });
    }

    console.log(`[LIST-PAYOUTS] Listing payouts for vendor code: ${vendorCodeFromQuery}`);

    // Get vendor by vendor code
    const vendor = await db.get(
      'SELECT id, vendor_code FROM vendors WHERE vendor_code = ?',
      [vendorCodeFromQuery]
    );

    if (!vendor) {
      console.log(`[LIST-PAYOUTS] Vendor code not found: ${vendorCodeFromQuery}`);
      return NextResponse.json({ 
        error: 'Invalid vendor code. The provided vendor code does not exist.',
        details: 'Please check your vendor code and try again'
      }, { status: 401 });
    }

    console.log(`[LIST-PAYOUTS] Vendor code verified for vendor ID: ${vendor.id}`);

    // Verify that the API key belongs to the same vendor
    if (apiKeyInfo.vendorId && apiKeyInfo.vendorId !== vendor.id) {
      console.log(`[LIST-PAYOUTS] API key vendor mismatch. API key belongs to vendor ${apiKeyInfo.vendorId}, but vendor code belongs to vendor ${vendor.id}`);
      return NextResponse.json({ 
        error: 'API key and vendor code mismatch.',
        details: 'The provided API key does not belong to the specified vendor'
      }, { status: 403 });
    }

    // If API key doesn't have vendor association, we need to verify it belongs to the order's vendor
    if (!apiKeyInfo.vendorId) {
      console.log(`[LIST-PAYOUTS] API key has no vendor association, checking if it can access this vendor's payouts`);
      // For now, we'll allow it, but this could be enhanced with additional validation
      console.log(`[LIST-PAYOUTS] Allowing API key without vendor association to proceed`);
    }

    console.log(`[LIST-PAYOUTS] Authentication successful for vendor ${vendor.id}`);

    // Validate pagination parameters
    const validatedParams = validateQueryParams(paginationSchema, searchParams);
    const { page, limit, offset } = validatedParams;

    const totalRow = await db.get(
      'SELECT COUNT(*) as total FROM payouts WHERE vendor_id = ?',
      [vendor.id]
    );
    const total = totalRow?.total || 0;

    const rows = await db.all(
      `SELECT id, amount, currency, beneficiary_name, beneficiary_account, beneficiary_ifsc, beneficiary_upi, reference_id, remarks, status, cashfree_payout_id AS provider_payout_id, admin_notes, created_at, updated_at
       FROM payouts
       WHERE vendor_id = ?
       ORDER BY created_at DESC
       LIMIT ? OFFSET ?`,
      [vendor.id, limit, offset]
    );

    // Get status counts based on payout status
    const successCountRow = await db.get(
      `SELECT COUNT(*) AS count
       FROM payouts
       WHERE vendor_id = ? AND (status = 'paid' OR status = 'approved' OR status = 'success')`,
      [vendor.id]
    );
    const successCount = successCountRow?.count || 0;

    const pendingCountRow = await db.get(
      `SELECT COUNT(*) AS count
       FROM payouts
       WHERE vendor_id = ? AND (status = 'created' OR status = 'pending')`,
      [vendor.id]
    );
    const pendingCount = pendingCountRow?.count || 0;

    const failedCountRow = await db.get(
      `SELECT COUNT(*) AS count
       FROM payouts
       WHERE vendor_id = ? AND (status = 'rejected' OR status = 'failed')`,
      [vendor.id]
    );
    const failedCount = failedCountRow?.count || 0;

    const statusCounts = {
      Success: successCount,
      Pending: pendingCount,
      Failed: failedCount
    };

    console.log(`[LIST-PAYOUTS] Successfully listed ${rows.length} payouts for vendor ${vendor.id} (${vendor.vendor_code})`);

    return NextResponse.json({
      success: true,
      payouts: rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      },
      statusCounts,
      vendorCode: vendor.vendor_code
    });
  } catch (error) {
    console.error('List payouts error:', error);
    return NextResponse.json({ error: 'Failed to fetch payouts' }, { status: 500 });
  }
}

async function createPayout(req: NextRequest) {
  try {
    // Validate API key from authorization header
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Authorization header with Bearer token is required' }, { status: 401 });
    }
    
    const apiKey = authHeader.substring(7);
    try {
      validateRequest(apiKeyValidationSchema, apiKey);
    } catch (error) {
      return NextResponse.json({ error: 'Invalid API key format in Authorization header' }, { status: 401 });
    }

    console.log(`[CREATE-PAYOUT] Attempting authentication for API key: ${apiKey.substring(0, 8)}...`);

    // Verify API key exists in database
    const apiKeyInfo = await AuthService.verifyApiKeyFromDb(apiKey);
    if (!apiKeyInfo) {
      console.log(`[CREATE-PAYOUT] API key not found in database: ${apiKey.substring(0, 8)}...`);
      return NextResponse.json({ 
        error: 'Invalid API key. The provided API key does not exist.',
        details: 'Please check your API key and try again'
      }, { status: 401 });
    }
    
    console.log(`[CREATE-PAYOUT] API key verified for key ID: ${apiKeyInfo.keyId}`);

    const body = await req.json();
    
    // Validate request body using comprehensive schema
    const validatedData = validateRequest(createPayoutSchema, body);
    
    // Apply business rules validation
    validateBusinessRules(validatedData, 'payout');
    
    // Sanitize inputs
    const {
      amount,
      currency,
      beneficiary_name,
      beneficiary_account,
      beneficiary_ifsc,
      beneficiary_upi,
      reference_id,
      remarks,
      vendorCode: vendorCodeFromBody
    } = {
      ...validatedData,
      beneficiary_name: sanitizeInput(validatedData.beneficiary_name),
      remarks: validatedData.remarks ? sanitizeInput(validatedData.remarks) : undefined
    };

    console.log(`[CREATE-PAYOUT] Creating payout with vendor code: ${vendorCodeFromBody}`);

    // Get vendor by vendor code
    const vendor = await db.get(
      'SELECT id, vendor_code, business_name, contact_name, email, payout_balance FROM vendors WHERE vendor_code = ?',
      [vendorCodeFromBody]
    );

    if (!vendor) {
      console.log(`[CREATE-PAYOUT] Vendor code not found: ${vendorCodeFromBody}`);
      return NextResponse.json({ 
        error: 'Invalid vendor code. The provided vendor code does not exist.',
        details: 'Please check your vendor code and try again'
      }, { status: 401 });
    }

    console.log(`[CREATE-PAYOUT] Vendor code verified for vendor ID: ${vendor.id}`);

    // Verify that the API key belongs to the same vendor
    if (apiKeyInfo.vendorId && apiKeyInfo.vendorId !== vendor.id) {
      console.log(`[CREATE-PAYOUT] API key vendor mismatch. API key belongs to vendor ${apiKeyInfo.vendorId}, but vendor code belongs to vendor ${vendor.id}`);
      return NextResponse.json({ 
        error: 'API key and vendor code mismatch.',
        details: 'The provided API key does not belong to the specified vendor'
      }, { status: 403 });
    }

    // If API key doesn't have vendor association, associate it with this vendor
    if (!apiKeyInfo.vendorId) {
      console.log(`[CREATE-PAYOUT] API key has no vendor association, associating with vendor ${vendor.id}`);
      // This could be enhanced to update the API key's vendor association
    }

    console.log(`[CREATE-PAYOUT] Authentication successful for vendor ${vendor.id}`);

    // Check vendor balance
    const balance = Number(vendor.payout_balance || 0);
    const amt = Number(amount);
    if (balance < amt) {
      return NextResponse.json({ error: 'Insufficient payout balance' }, { status: 400 });
    }

    // Generate unique payout ID if not provided
    let payoutReferenceId = reference_id;
    if (!payoutReferenceId) {
      let isUnique = false;
      let attempts = 0;
      const maxAttempts = 10;

      do {
        payoutReferenceId = generatePayoutId();
        const existingPayout = await db.get(
          'SELECT id FROM payouts WHERE reference_id = ?',
          [payoutReferenceId]
        );
        isUnique = !existingPayout;
        attempts++;
      } while (!isUnique && attempts < maxAttempts);

      if (!isUnique) {
        return NextResponse.json({ error: 'Failed to generate unique payout ID' }, { status: 500 });
      }
    }

    // Hold funds immediately by subtracting from balance and storing held_amount
    await db.run(`UPDATE vendors SET payout_balance = COALESCE(payout_balance,0) - ? WHERE id = ?`, [amt, vendor.id]);

    const result = await db.run(
      `INSERT INTO payouts (vendor_id, amount, currency, beneficiary_name, beneficiary_account, beneficiary_ifsc, beneficiary_upi, reference_id, remarks, status, held_amount)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'created', ?)`,
      [vendor.id, amt, currency, beneficiary_name || null, beneficiary_account || null, beneficiary_ifsc || null, beneficiary_upi || null, payoutReferenceId, remarks || null, amt]
    );

    const payout = await db.get(
      `SELECT id, amount, currency, beneficiary_name, beneficiary_account, beneficiary_ifsc, beneficiary_upi, reference_id, remarks, status, created_at
       FROM payouts WHERE id = ?`,
      [result.lastID]
    );

    // Emit payout created event via WebSocket
    const event = {
      id: `payout_created_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'payout_status_changed',
      payload: {
        id: result.lastID,
        vendorId: vendor.id,
        businessName: vendor.business_name || `Vendor #${vendor.id}`,
        contactName: vendor.contact_name,
        email: vendor.email,
        amount: amt,
        currency,
        beneficiaryName: beneficiary_name,
        beneficiaryAccount: beneficiary_account,
        beneficiaryIfsc: beneficiary_ifsc,
        beneficiaryUpi: beneficiary_upi,
        referenceId: payoutReferenceId,
        remarks,
        status: 'created',
        timestamp: new Date().toISOString()
      },
      timestamp: new Date()
    };
    
    eventStore.emit(event);
    console.log('Payout created event emitted:', event);
    console.log(`[CREATE-PAYOUT] Successfully created payout ${result.lastID} for vendor ${vendor.id} with amount ${amt}`);

    // Telegram alert for admin (HTML)
    const alert = [
      '<b>🔔 New Payout Request</b>',
      `• Vendor: ${vendor.business_name || `Vendor #${vendor.id}`} (${vendor.vendor_code || '-'})`,
      `• Amount: ₹${amt} ${currency}`,
      beneficiary_name ? `• Beneficiary: ${beneficiary_name}` : undefined,
      beneficiary_account ? `• Account: ${beneficiary_account}` : undefined,
      beneficiary_upi ? `• UPI: ${beneficiary_upi}` : undefined,
      `• Ref: ${payoutReferenceId}`,
      remarks ? `• Remarks: ${remarks}` : undefined,
      `• Status: created`
    ].filter(Boolean).join('\n');
    sendTelegramAdminAlert(alert, vendor.id).catch(() => {});

    // Also send to callback store for demo purposes
    const callbackToken = `vendor-${vendor.vendor_code || vendor.id}`;
    demoCallbackStore.append(callbackToken, {
      type: 'payout_status_changed',
      payoutId: result.lastID,
      vendorId: vendor.id,
      businessName: vendor.business_name || `Vendor #${vendor.id}`,
      contactName: vendor.contact_name,
      email: vendor.email,
      amount: amt,
      currency,
      beneficiaryName: beneficiary_name,
      beneficiaryAccount: beneficiary_account,
      beneficiaryIfsc: beneficiary_ifsc,
      beneficiaryUpi: beneficiary_upi,
      referenceId: payoutReferenceId,
      remarks,
      status: 'created',
      timestamp: new Date().toISOString()
    });

    return NextResponse.json({ 
      success: true,
      message: 'Payout request created', 
      payout,
      authMethod: 'api_key_vendor_code'
    });
  } catch (error) {
    console.error('Create payout error:', error);
    return NextResponse.json({ error: 'Failed to create payout' }, { status: 500 });
  }
}

async function handler(req: NextRequest) {
  if (req.method === 'GET') {
    return listPayouts(req);
  }
  if (req.method === 'POST') {
    return createPayout(req);
  }
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
}

export const GET = apiCors(handler);
export const POST = apiCors(withRateLimit(payoutCreationRateLimit)(handler));
export const OPTIONS = apiCors(async () => new NextResponse(null, { status: 200 }));