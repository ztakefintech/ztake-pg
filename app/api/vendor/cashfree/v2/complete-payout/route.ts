import { NextRequest, NextResponse } from 'next/server';
import { withApiKeyAuth, createApiResponse, createErrorResponse, AuthenticatedRequest } from '@/lib/middleware';
import { db } from '@/lib/database';
import { generatePayoutId } from '@/lib/utils';
import { eventStore } from '@/lib/event-store';
import { sendTelegramAdminAlert } from '@/lib/telegram';
import Joi from 'joi';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Cashfree V2 API base URLs
function getCashfreeBase(env?: string) {
  const normalized = (env || '').toLowerCase();
  const isProd = normalized === 'prod' || normalized === 'production' || normalized === 'live';
  return isProd ? 'https://api.cashfree.com/payout' : 'https://sandbox.cashfree.com/payout';
}

// Sanitize beneficiary ID for Cashfree (alphanumeric only, max 40 chars)
function sanitizeBeneficiaryId(input: string): string {
  return (input || '').replace(/[^a-zA-Z0-9]/g, '').slice(0, 40);
}

// Generic Cashfree API call function
async function callCashfree(base: string, path: string, method: string, headers: Record<string, string>, body?: any) {
  const url = `${base}${path.startsWith('/') ? '' : '/'}${path}`;
  const resp = await fetch(url, {
    method,
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      ...headers
    },
    body: body ? JSON.stringify(body) : undefined
  });
  
  const text = await resp.text();
  let json: any = undefined;
  try { 
    json = text ? JSON.parse(text) : undefined; 
  } catch (e) {
    console.error('Failed to parse Cashfree response:', e);
  }
  
  return { 
    status: resp.status, 
    json, 
    text,
    success: resp.status >= 200 && resp.status < 300
  };
}

// Get Bearer token for Cashfree V2 APIs
async function getBearerToken(base: string, clientId: string, clientSecret: string, extraHeaders?: Headers): Promise<string | null> {
  const passHeaders: Record<string, string> = {};
  if (extraHeaders) {
    extraHeaders.forEach((v, k) => { 
      if (k.toLowerCase().startsWith('x-cf-')) passHeaders[k] = v; 
    });
  }
  
  console.log(`[CF-V2] Requesting token from: ${base}/v1/authorize`);
  console.log(`[CF-V2] Client ID: ${clientId?.substring(0, 8)}...`);
  
  const resp = await fetch(`${base}/v1/authorize`, {
    method: 'POST',
    headers: { 
      'X-Client-Id': clientId, 
      'X-Client-Secret': clientSecret, 
      'Accept': 'application/json', 
      ...passHeaders 
    }
  });
  
  const text = await resp.text();
  console.log(`[CF-V2] Token response status: ${resp.status}`);
  console.log(`[CF-V2] Token response: ${text}`);
  
  try { 
    const j = text ? JSON.parse(text) : undefined; 
    const token = resp.ok ? (j?.data?.token || j?.token || null) : null;
    console.log(`[CF-V2] Extracted token: ${token ? 'YES' : 'NO'}`);
    return token;
  } catch (e) { 
    console.error('[CF-V2] Failed to parse token response:', e);
    return null; 
  }
}

// Validation schema for complete payout request
const completePayoutSchema = Joi.object({
  // Payout details
  amount: Joi.number().positive().precision(2).min(1).max(100000).required()
    .messages({
      'number.min': 'Amount must be at least ₹1',
      'number.max': 'Amount cannot exceed ₹1,00,000'
    }),
  currency: Joi.string().valid('INR').default('INR'),
  remarks: Joi.string().max(500).optional(),
  reference_id: Joi.string().pattern(/^[a-zA-Z0-9_-]{3,255}$/).optional(),

  // Mode details (optional overrides)
  transfer_mode: Joi.string().valid(
    'banktransfer',
    'imps',
    'neft',
    'rtgs',
    'upi',
    'paytm',
    'amazonpay',
    'card',
    'cardupi'
  ).optional(),
  transfer_mode_subtype: Joi.string().valid('imps', 'neft', 'rtgs').optional(),
  
  // Beneficiary details
  beneficiary_name: Joi.string().min(2).max(100).pattern(/^[a-zA-Z\s.]+$/).required()
    .messages({
      'string.pattern.base': 'Beneficiary name must contain only letters, spaces, and dots'
    }),
  beneficiary_id: Joi.string().pattern(/^[a-zA-Z0-9_-]{3,40}$/).optional(),
  email: Joi.string().email().optional(),
  phone: Joi.string().pattern(/^[6-9]\d{9}$/).optional()
    .messages({
      'string.pattern.base': 'Phone number must be a valid 10-digit Indian mobile number'
    }),
  
  // Bank account details
  bank_account_number: Joi.string().pattern(/^[0-9]{6,18}$/).optional()
    .messages({
      'string.pattern.base': 'Bank account number must be 6-18 digits'
    }),
  bank_ifsc: Joi.string().pattern(/^[A-Z]{4}0[A-Z0-9]{6}$/).optional()
    .messages({
      'string.pattern.base': 'IFSC code must be in format: ABCD0123456'
    }),
  
  // Callback URL
  callback_url: Joi.string().uri().optional()
});

async function handler(req: AuthenticatedRequest) {
  if (req.method !== 'POST') {
    return createErrorResponse('Method not allowed', 405);
  }

  try {
    const vendor = (req.vendor as any) || {};
    const { 
      cashfree_payout_client_id, 
      cashfree_payout_client_secret, 
      cashfree_env 
    } = vendor;
    
    if (!cashfree_payout_client_id || !cashfree_payout_client_secret) {
      return createErrorResponse('Cashfree payout credentials not configured', 400);
    }

    const base = getCashfreeBase(cashfree_env);
    console.log(`[CF-V2] Using base URL: ${base} for vendor ${vendor.id}`);

    // Parse and validate request body
    const body = await req.json();
    const { error, value: validatedData } = completePayoutSchema.validate(body, { 
      abortEarly: false,
      stripUnknown: true 
    });

    if (error) {
      const errorMessages = error.details.map(detail => detail.message).join(', ');
      return createErrorResponse(`Validation failed: ${errorMessages}`, 400);
    }

    const {
      amount,
      currency,
      remarks,
      reference_id,
      transfer_mode,
      transfer_mode_subtype,
      beneficiary_name,
      beneficiary_id,
      email,
      phone,
      bank_account_number,
      bank_ifsc,
      callback_url
    } = validatedData;

    // Validate that bank account details are provided
    if (!bank_account_number || !bank_ifsc) {
      return createErrorResponse('Bank account number and IFSC code are required', 400);
    }

    // Remove internal vendor balance check; rely on Cashfree fundsource balance instead
    // const balance = Number(vendor.payout_balance || 0);
    // if (balance < amount) {
    //   return NextResponse.json({
    //     error: 'Insufficient payout balance',
    //     currentBalance: balance,
    //     requiredAmount: amount,
    //     details: `Current balance: ₹${balance}, Required: ₹${amount}`
    //   }, { status: 400 });
    // }

    // Generate unique payout reference ID if not provided
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
        return NextResponse.json({
          error: 'Failed to generate unique payout reference ID'
        }, { status: 500 });
      }
    }

    // Generate beneficiary ID if not provided
    // You can pass any beneficiary_id, or it will be auto-generated
    const beneficiaryId = beneficiary_id || sanitizeBeneficiaryId(
      `${vendor.id}-${bank_account_number}-${Date.now()}`
    );

    // Get Bearer token for V2 APIs
    const token = await getBearerToken(base, cashfree_payout_client_id, cashfree_payout_client_secret, req.headers);
    console.log(`[CF-V2] Token obtained: ${token ? 'YES' : 'NO'}`);
    
    // Build headers; add Authorization only if token exists. Some Cashfree V2 endpoints accept X-Client-Id/Secret without Bearer.
    const headers: Record<string, string> = {
      'X-Client-Id': cashfree_payout_client_id,
      'X-Client-Secret': cashfree_payout_client_secret,
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    // Add API version header (required by Cashfree Payouts V2). Allow override via request or env.
    const apiVersion = req.headers.get('x-api-version') || process.env.CASHFREE_PAYOUT_API_VERSION || '2022-01-01';
    headers['X-Api-Version'] = apiVersion as string;

    // Forward optional idempotency key if provided by client
    const idempotencyKey = req.headers.get('x-idempotency-key') || req.headers.get('X-Idempotency-Key');
    if (idempotencyKey) {
      headers['X-Idempotency-Key'] = idempotencyKey;
    }

    // Step 1: Create Beneficiary using V2 API
    console.log(`[CF-V2] Creating beneficiary ${beneficiaryId} for vendor ${vendor.id}`);
    
    const beneficiaryPayload = {
      beneficiary_id: beneficiaryId,
      beneficiary_name: beneficiary_name,
      beneficiary_instrument_details: { 
        bank_account_number: bank_account_number, 
        bank_ifsc: bank_ifsc 
      },
      ...(email || phone ? { 
        beneficiary_contact_details: { 
          ...(email ? { beneficiary_email: email } : {}),
          ...(phone ? { beneficiary_phone: phone } : {})
        } 
      } : {})
    };

    console.log('[CF-V2] Beneficiary payload:', JSON.stringify(beneficiaryPayload, null, 2));

    let beneficiaryResp = await callCashfree(base, '/beneficiary', 'POST', headers, beneficiaryPayload);
    
    if (!beneficiaryResp.success) {
      // If we tried without token (token null) and failed with 401/403, try once more by forcing a new token and retry
      if (!token && (beneficiaryResp.status === 401 || beneficiaryResp.status === 403)) {
        const retryToken = await getBearerToken(base, cashfree_payout_client_id, cashfree_payout_client_secret, req.headers);
        if (retryToken) {
          const retryHeaders = { ...headers, Authorization: `Bearer ${retryToken}` };
          beneficiaryResp = await callCashfree(base, '/beneficiary', 'POST', retryHeaders, beneficiaryPayload);
        }
      }
      
      // If beneficiary already exists, treat as success and continue
      const providerMsg = (beneficiaryResp.json?.message || beneficiaryResp.text || '').toString().toLowerCase();
      const providerCode = (beneficiaryResp.json?.code || '').toString().toLowerCase();
      if (/already exists/.test(providerMsg) || providerCode === 'conflict_with_existing_beneficiary') {
        console.warn('[CF-V2] Beneficiary already exists. Proceeding with existing beneficiary:', beneficiaryId);
      } else if (!beneficiaryResp.success) {
        console.error('[CF-V2] Beneficiary creation failed:', beneficiaryResp.text || beneficiaryResp.json);
        return NextResponse.json({
          error: 'Failed to create beneficiary',
          details: beneficiaryResp.json?.message || beneficiaryResp.text || 'Unknown error',
          provider: beneficiaryResp.json
        }, { status: 400 });
      }
    }

    console.log(`[CF-V2] Beneficiary created successfully: ${beneficiaryId}`);

    // Step 2: Initiate Transfer using V2 API
    console.log(`[CF-V2] Initiating transfer for vendor ${vendor.id}, amount: ${amount}`);
    
    // Always use internal webhook for status updates
    const internalWebhookUrl = `${process.env.NEXT_PUBLIC_BASE_URL || 'https://www.ztake.in'}/api/webhooks/cashfree-payout`;
    
    const transferPayload: any = {
      transfer_id: payoutReferenceId,
      transfer_amount: amount,
      beneficiary_details: {
        beneficiary_id: beneficiaryId
      },
      ...(remarks ? { transfer_remarks: remarks } : {}),
      callback_url: internalWebhookUrl
    };
    
    // If external callback_url is provided, add it as additional callback
    if (callback_url && callback_url !== internalWebhookUrl) {
      transferPayload.external_callback_url = callback_url;
      console.log(`[CF-V2] External callback URL provided: ${callback_url}`);
    }

    // Decide mode: default banktransfer for bank beneficiaries; allow override
    const resolvedMode = transfer_mode || 'banktransfer';
    transferPayload.transfer_mode = resolvedMode;

    // Subtype: default to imps for most cases; allow override
    const resolvedSubtype = transfer_mode_subtype || 'imps';
    if (resolvedMode === 'banktransfer') {
      transferPayload.transfer_mode_subtype = resolvedSubtype;
    }

    console.log(`[CF-V2] Using internal webhook URL: ${internalWebhookUrl}`);
    if (callback_url && callback_url !== internalWebhookUrl) {
      console.log(`[CF-V2] External callback URL: ${callback_url}`);
    }
    console.log('[CF-V2] Transfer payload:', JSON.stringify(transferPayload, null, 2));

    let transferResp = await callCashfree(base, '/transfers', 'POST', headers, transferPayload);
    
    if (!transferResp.success) {
      // If we tried without token (token null) and failed with 401/403, try once more by forcing a new token and retry
      if (!token && (transferResp.status === 401 || transferResp.status === 403)) {
        const retryToken = await getBearerToken(base, cashfree_payout_client_id, cashfree_payout_client_secret, req.headers);
        if (retryToken) {
          const retryHeaders = { ...headers, Authorization: `Bearer ${retryToken}` };
          transferResp = await callCashfree(base, '/transfers', 'POST', retryHeaders, transferPayload);
        }
      }
      
      if (!transferResp.success) {
        console.error('[CF-V2] Transfer initiation failed:', transferResp.text || transferResp.json);
        return NextResponse.json({
          error: 'Failed to initiate transfer',
          details: transferResp.json?.message || transferResp.text || 'Unknown error',
          provider: transferResp.json
        }, { status: 400 });
      }
    }

    console.log(`[CF-V2] Transfer initiated successfully: ${payoutReferenceId}`);

    // Removed: internal balance deduction; Cashfree is the source of truth for funds
    // await db.run(
    //   `UPDATE vendors SET payout_balance = COALESCE(payout_balance,0) - ? WHERE id = ?`, 
    //   [amount, vendor.id]
    // );

    // Step 4: Create payout record in database
    const rawRequest = {
      original: body,
        beneficiary: beneficiaryPayload,
        transfer: transferPayload,
        external_callback_url: callback_url && callback_url !== internalWebhookUrl ? callback_url : null,
        timestamp: new Date().toISOString()
    };

    const result = await db.run(
      `INSERT INTO payouts (
        vendor_id, amount, currency, beneficiary_name, beneficiary_account, 
        beneficiary_ifsc, beneficiary_upi, reference_id, remarks, status, 
        cashfree_payout_id, held_amount, raw_request, raw_response, external_callback_url, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'initiated', ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      [
        vendor.id,
        amount,
        currency,
        beneficiary_name,
        bank_account_number,
        bank_ifsc,
        null, // beneficiary_upi is always null now
        payoutReferenceId,
        remarks || null,
        transferResp.json?.cf_transfer_id || null,
        null, // held_amount is not used when relying on Cashfree fund source
        JSON.stringify(rawRequest),
        JSON.stringify(transferResp.json || null),
        callback_url && callback_url !== internalWebhookUrl ? callback_url : null
      ]
    );

    const payoutId = result.lastID;

    // Step 5: Emit payout created event
    const event = {
      id: `payout_created_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'payout_status_changed',
      payload: {
        id: payoutId,
        vendorId: vendor.id,
        businessName: vendor.business_name || `Vendor #${vendor.id}`,
        contactName: vendor.contact_name,
        email: vendor.email,
        amount: amount,
        currency,
        beneficiaryName: beneficiary_name,
        beneficiaryAccount: bank_account_number,
        beneficiaryIfsc: bank_ifsc,
        beneficiaryUpi: null,
        referenceId: payoutReferenceId,
        remarks,
        status: 'initiated',
        cashfreeTransferId: transferResp.json?.cf_transfer_id,
        timestamp: new Date().toISOString()
      },
      timestamp: new Date()
    };
    
    eventStore.emit(event);
    console.log('[CF-V2] Payout created event emitted:', event);

    // Step 6: Send Telegram alert
    const alert = [
      '<b>🚀 New Cashfree V2 Payout Request</b>',
      `• Vendor: ${vendor.business_name || `Vendor #${vendor.id}`} (${vendor.vendor_code || '-'})`,
      `• Amount: ₹${amount} ${currency}`,
      `• Beneficiary: ${beneficiary_name}`,
      `• Account: ${bank_account_number}`,
      `• IFSC: ${bank_ifsc}`,
      `• Ref: ${payoutReferenceId}`,
      `• CF Transfer ID: ${transferResp.json?.cf_transfer_id || 'N/A'}`,
      `• Internal Webhook: ${internalWebhookUrl}`,
      ...(callback_url && callback_url !== internalWebhookUrl ? [`• External Callback: ${callback_url}`] : []),
      remarks ? `• Remarks: ${remarks}` : undefined,
      `• Status: initiated`
    ].filter(Boolean).join('\n');
    
    sendTelegramAdminAlert(alert, vendor.id).catch(() => {});

    // Step 7: Send immediate callback to external URL if provided
    if (callback_url && callback_url !== internalWebhookUrl) {
      try {
        const immediateCallbackPayload = {
          id: payoutId,
          reference_id: payoutReferenceId,
          status: 'initiated',
          amount: amount,
          currency: currency,
          beneficiary_name: beneficiary_name,
          beneficiary_account: bank_account_number,
          beneficiary_ifsc: bank_ifsc,
          utr: null,
          failure_reason: null,
          status_code: null,
          status_description: null,
          cf_transfer_id: transferResp.json?.cf_transfer_id || null,
          updated_at: new Date().toISOString(),
          timestamp: new Date().toISOString(),
          event_type: 'payout_initiated'
        };
        
        console.log(`[CF-V2] Sending immediate callback to: ${callback_url}`);
        
        const immediateResponse = await fetch(callback_url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'ZTake-Payout/1.0'
          },
          body: JSON.stringify(immediateCallbackPayload)
        });
        
        if (immediateResponse.ok) {
          console.log(`[CF-V2] Immediate callback successful: ${immediateResponse.status}`);
        } else {
          console.warn(`[CF-V2] Immediate callback failed: ${immediateResponse.status} ${immediateResponse.statusText}`);
        }
      } catch (immediateError) {
        console.error(`[CF-V2] Immediate callback error:`, immediateError);
        // Don't fail the payout creation if immediate callback fails
      }
    }

    return createApiResponse({
      message: 'Payout initiated successfully',
      data: {
        payoutId: payoutId,
        cashfreeTransferId: transferResp.json?.cf_transfer_id,
        referenceId: payoutReferenceId,
        status: 'initiated',
        callbackUrl: callback_url || null,
        amount: amount,
        currency,
        beneficiaryName: beneficiary_name,
        beneficiaryAccount: bank_account_number,
        beneficiaryIfsc: bank_ifsc,
        createdAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Error in complete-payout handler:', error);
    return createErrorResponse('Internal server error', 500);
  }
}

export const POST = withApiKeyAuth(handler);