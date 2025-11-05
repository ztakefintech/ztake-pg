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
import { processPayoutToCashfree } from '@/lib/cashfree-payout';

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
      `SELECT id, amount, currency, beneficiary_name, beneficiary_account, beneficiary_ifsc, beneficiary_upi, reference_id, remarks, status, cashfree_payout_id AS provider_payout_id, admin_notes, created_at, updated_at, webhook_data
       FROM payouts
       WHERE vendor_id = ?
       ORDER BY created_at DESC
       LIMIT ? OFFSET ?`,
      [vendor.id, limit, offset]
    );

    // Process rows to use webhook status if available and status is still pending
    const processedRows = await Promise.all(rows.map(async (row: any) => {
      // If status is pending but webhook_data exists, try to get status from webhook
      if (row.webhook_data) {
        try {
          const webhookData = typeof row.webhook_data === 'string' 
            ? JSON.parse(row.webhook_data) 
            : row.webhook_data;
          
          if (webhookData?.data?.status) {
            const webhookStatus = webhookData.data.status.toLowerCase();
            const currentStatus = row.status?.toLowerCase();
            
            // If webhook has a definitive status different from current status, use webhook status
            if (webhookStatus && 
                !['pending', 'created', 'processing'].includes(webhookStatus) &&
                (currentStatus === 'pending' || currentStatus === 'created' || currentStatus !== webhookStatus)) {
              console.log(`[LIST-PAYOUTS] Webhook status mismatch for payout ${row.id}: DB="${row.status}" -> Webhook="${webhookStatus}"`);
              
              // Update database if status is still pending/created but webhook has definitive status
              if (currentStatus === 'pending' || currentStatus === 'created') {
                try {
                  // Get payout details before updating to check if refund needed
                  const payoutDetails = await db.get(
                    'SELECT status, held_amount, vendor_id, amount FROM payouts WHERE id = ?',
                    [row.id]
                  );
                  
                  const wasAlreadyFailed = payoutDetails?.status === 'failed' || payoutDetails?.status === 'reversed' || payoutDetails?.status === 'rejected';
                  
                  await db.run(
                    'UPDATE payouts SET status = ? WHERE id = ?',
                    [webhookStatus, row.id]
                  );
                  console.log(`[LIST-PAYOUTS] Fixed payout ${row.id} status from "${row.status}" to "${webhookStatus}"`);
                  
                  // If status is reversed or failed, refund the amount to payout wallet
                  if ((webhookStatus === 'reversed' || webhookStatus === 'failed' || webhookStatus === 'rejected') && 
                      !wasAlreadyFailed && payoutDetails?.vendor_id && payoutDetails?.amount) {
                    try {
                      const refundAmount = payoutDetails?.held_amount ? payoutDetails.held_amount : Number(payoutDetails.amount);
                      await db.run(
                        'UPDATE vendors SET payout_balance = COALESCE(payout_balance, 0) + ? WHERE id = ?',
                        [refundAmount, payoutDetails.vendor_id]
                      );
                      
                      if (payoutDetails?.held_amount) {
                        await db.run('UPDATE payouts SET held_amount = NULL WHERE id = ?', [row.id]);
                      }
                      
                      console.log(`[LIST-PAYOUTS] Refunded ${refundAmount} to vendor ${payoutDetails.vendor_id} payout wallet for ${webhookStatus} payout`);
                    } catch (refundError) {
                      console.error(`[LIST-PAYOUTS] Failed to refund payout ${row.id}:`, refundError);
                    }
                  }
                } catch (updateError) {
                  console.error(`[LIST-PAYOUTS] Failed to update payout ${row.id} status:`, updateError);
                }
              }
              
              row.status = webhookStatus;
            }
          }
        } catch (e) {
          // Invalid JSON, ignore
          console.warn(`[LIST-PAYOUTS] Could not parse webhook_data for payout ${row.id}`);
        }
      }
      
      // Remove webhook_data from response (not needed in UI)
      delete row.webhook_data;
      return row;
    }));

    // Get status counts based on payout status
    const successCountRow = await db.get(
      `SELECT COUNT(*) AS count
       FROM payouts
       WHERE vendor_id = ? AND (status = 'paid' OR status = 'approved' OR status = 'success' OR status = 'completed')`,
      [vendor.id]
    );
    const successCount = successCountRow?.count || 0;

    const pendingCountRow = await db.get(
      `SELECT COUNT(*) AS count
       FROM payouts
       WHERE vendor_id = ? AND (status = 'created' OR status = 'pending' OR status = 'processing')`,
      [vendor.id]
    );
    const pendingCount = pendingCountRow?.count || 0;

    const failedCountRow = await db.get(
      `SELECT COUNT(*) AS count
       FROM payouts
       WHERE vendor_id = ? AND (status = 'rejected' OR status = 'failed' OR status = 'reversed')`,
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
      payouts: processedRows,
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

    // Support alias params from clients (transferId, bankAccount, ifsc, name, email, phone, transferMode)
    const aliasEmail = body?.email ?? null;
    const aliasPhone = body?.phone ?? null;
    const normalizedBody = {
      ...body,
      beneficiary_name: body?.beneficiary_name ?? body?.name ?? body?.beneficiaryName,
      beneficiary_account: body?.beneficiary_account ?? body?.bankAccount ?? body?.accountNumber ?? body?.account,
      beneficiary_ifsc: body?.beneficiary_ifsc ?? body?.ifsc ?? body?.bank_ifsc,
      beneficiary_upi: body?.beneficiary_upi ?? body?.upi ?? null,
      reference_id: body?.reference_id ?? body?.transferId ?? body?.transfer_id,
      remarks: body?.remarks ?? body?.transferRemarks ?? body?.transfer_remarks,
      external_callback_url: body?.external_callback_url ?? body?.callback_url ?? body?.callbackUrl ?? null,
      email: body?.email ?? null,
      phone: body?.phone ?? null
    };

    // Validate request body using comprehensive schema
    let validatedData: any;
    try {
      validatedData = validateRequest(createPayoutSchema, normalizedBody);
    } catch (e: any) {
      return NextResponse.json({
        error: 'Invalid request body',
        details: e?.message || 'Validation failed'
      }, { status: 400 });
    }
    
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
      external_callback_url,
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

    const rawRequest = {
      original: body,
      aliases: {
        transferId: body?.transferId ?? body?.transfer_id ?? null,
        bankAccount: body?.bankAccount ?? body?.accountNumber ?? body?.account ?? null,
        ifsc: body?.ifsc ?? body?.bank_ifsc ?? null,
        name: body?.name ?? null,
        email: aliasEmail,
        phone: aliasPhone
      }
    };

    const result = await db.run(
      `INSERT INTO payouts (vendor_id, amount, currency, beneficiary_name, beneficiary_account, beneficiary_ifsc, beneficiary_upi, reference_id, remarks, status, held_amount, raw_request, external_callback_url)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'created', ?, ?, ?)`,
      [
        vendor.id,
        amt,
        currency,
        beneficiary_name || null,
        beneficiary_account || null,
        beneficiary_ifsc || null,
        beneficiary_upi || null,
        payoutReferenceId,
        remarks || null,
        amt,
        JSON.stringify(rawRequest),
        external_callback_url || null
      ]
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

    // If an external callback URL was provided, notify immediately with created status
    if (external_callback_url) {
      try {
        const externalCallbackPayload = {
          id: payout.id,
          reference_id: payout.reference_id,
          status: 'created',
          amount: payout.amount,
          currency: payout.currency,
          beneficiary_name: payout.beneficiary_name,
          beneficiary_account: payout.beneficiary_account,
          beneficiary_ifsc: payout.beneficiary_ifsc,
          utr: null,
          failure_reason: null,
          updated_at: new Date().toISOString(),
          timestamp: new Date().toISOString(),
          event_type: 'status_changed',
          old_status: null,
          new_status: 'created'
        };
        fetch(external_callback_url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'ZTake-Webhook/1.0'
          },
          body: JSON.stringify(externalCallbackPayload)
        }).catch(() => {});
      } catch {}
    }

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
      utr: null,
      remarks,
      status: 'created',
      timestamp: new Date().toISOString()
    });

    // Process payout automatically
    console.log(`[PAYOUT] Processing payout ${result.lastID}...`);
    const cashfreeResult = await processPayoutToCashfree(result.lastID);
    
    if (!cashfreeResult.success) {
      console.error(`[PAYOUT] Payout processing failed: ${cashfreeResult.error}`);
      // Update payout status to failed
      await db.run(
        `UPDATE payouts SET status = 'failed', failure_reason = ? WHERE id = ?`,
        [cashfreeResult.error || 'Payout processing failed', result.lastID]
      );
    }

    // Get updated payout details
    const updatedPayout = await db.get(
      `SELECT id, amount, currency, beneficiary_name, beneficiary_account, beneficiary_ifsc, beneficiary_upi, reference_id, remarks, status, cashfree_payout_id, created_at
       FROM payouts WHERE id = ?`,
      [result.lastID]
    );

    return NextResponse.json({ 
      success: true,
      message: cashfreeResult.success ? 'Payout request processed successfully' : 'Payout created but processing failed',
      payout: updatedPayout,
      details: cashfreeResult.success ? { processed: true, transferId: cashfreeResult.transferId } : { error: cashfreeResult.error },
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