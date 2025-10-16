import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database';
import { generatePayoutId } from '@/lib/utils';
import { eventStore } from '@/lib/event-store';
import { demoCallbackStore } from '@/lib/callback-store';
import { validateRequest, validateBusinessRules, sanitizeInput } from '@/lib/validation';
import { withRateLimit } from '@/lib/middleware';
import { payoutCreationRateLimit } from '@/lib/rate-limit';
import { apiCors } from '@/lib/cors';
import { sendTelegramAdminAlert } from '@/lib/telegram';
import Joi from 'joi';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Custom schema for instant payouts (without vendorCode requirement)
const instantPayoutSchema = Joi.object({
  amount: Joi.number().positive().precision(2).min(100).max(100000).required()
    .messages({
      'number.min': 'Payout amount must be at least ₹100',
      'number.max': 'Payout amount cannot exceed ₹1,00,000'
    }),
  currency: Joi.string().valid('INR').default('INR'),
  beneficiary_name: Joi.string().min(2).max(100).pattern(/^[a-zA-Z\s.]+$/).required(),
  beneficiary_account: Joi.string().pattern(/^[0-9]{6,18}$/).optional()
    .messages({
      'string.pattern.base': 'Bank account number must be 6-18 digits'
    }),
  beneficiary_ifsc: Joi.string().pattern(/^[A-Z]{4}0[A-Z0-9]{6}$/).optional()
    .messages({
      'string.pattern.base': 'IFSC code must be in format: ABCD0123456'
    }),
  beneficiary_upi: Joi.string().pattern(/^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+$/).optional(),
  reference_id: Joi.string().pattern(/^[a-zA-Z0-9_-]{3,255}$/).optional(),
  remarks: Joi.string().max(500).optional()
}).custom((value, helpers) => {
  // At least one payment method must be provided
  if (!value.beneficiary_account && !value.beneficiary_upi) {
    return helpers.error('custom.paymentMethod');
  }
  // If bank account is provided, IFSC is required
  if (value.beneficiary_account && !value.beneficiary_ifsc) {
    return helpers.error('custom.ifscRequired');
  }
  return value;
}).messages({
  'custom.paymentMethod': 'Either bank account or UPI ID must be provided',
  'custom.ifscRequired': 'IFSC code is required when bank account is provided'
});

async function createInstantPayout(req: NextRequest) {
  try {
    // Validate secret key from authorization header
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Authorization header with Bearer token is required' }, { status: 401 });
    }
    
    const secretKey = authHeader.substring(7);
    
    // Validate secret key format (sk_ or sk_live_ + characters)
    if (!secretKey.startsWith('sk_') || secretKey.length < 35) {
      return NextResponse.json({ error: 'Invalid secret key format. Must start with sk_ and be at least 35 characters long.' }, { status: 401 });
    }

    console.log(`[INSTANT-PAYOUT] Attempting authentication for secret key: ${secretKey.substring(0, 8)}...`);

    // Verify secret key exists in database and get vendor info
    const vendor = await db.get(
      'SELECT id, vendor_code, business_name, payout_balance FROM vendors WHERE secret_key = ?',
      [secretKey]
    );

    if (!vendor) {
      console.log(`[INSTANT-PAYOUT] Secret key not found in database: ${secretKey.substring(0, 8)}...`);
      return NextResponse.json({ 
        error: 'Invalid secret key. The provided secret key does not exist.',
        details: 'Please check your secret key and try again'
      }, { status: 401 });
    }
    
    console.log(`[INSTANT-PAYOUT] Secret key verified for vendor ID: ${vendor.id} (${vendor.vendor_code})`);

    const body = await req.json();
    
    // Validate request body using instant payout schema
    const validatedData = validateRequest(instantPayoutSchema, body);
    
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
      remarks
    } = {
      ...validatedData,
      beneficiary_name: sanitizeInput(validatedData.beneficiary_name),
      remarks: validatedData.remarks ? sanitizeInput(validatedData.remarks) : undefined
    };

    console.log(`[INSTANT-PAYOUT] Creating payout for vendor ${vendor.id} (${vendor.vendor_code})`);
    console.log(`[INSTANT-PAYOUT] Raw payout_balance from DB: ${vendor.payout_balance}`);

    // Check vendor balance (matching main API)
    const balance = Number(vendor.payout_balance || 0);
    const amt = Number(amount);
    console.log(`[INSTANT-PAYOUT] Processed balance: ${balance}, Required amount: ${amt}`);
    
    if (balance < amt) {
      return NextResponse.json({ 
        error: 'Insufficient payout balance', 
        details: `Current balance: ₹${balance}, Required: ₹${amt}`,
        currentBalance: balance,
        requiredAmount: amt
      }, { status: 400 });
    }

    // Generate callback token for demo purposes
    const callbackToken = `vendor-${vendor.vendor_code}`;

    // Generate unique payout ID if not provided (matching main API)
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

    // Hold funds immediately by subtracting from balance and storing held_amount (matching main API)
    await db.run(`UPDATE vendors SET payout_balance = COALESCE(payout_balance,0) - ? WHERE id = ?`, [amt, vendor.id]);

    // Insert payout into database (matching main API structure)
    const result = await db.run(
      `INSERT INTO payouts (
        vendor_id, amount, currency, beneficiary_name, beneficiary_account, 
        beneficiary_ifsc, beneficiary_upi, reference_id, remarks, status, held_amount, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'created', ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      [
        vendor.id,
        amt,
        currency,
        beneficiary_name,
        beneficiary_account,
        beneficiary_ifsc,
        beneficiary_upi,
        payoutReferenceId,
        remarks,
        amt // held_amount
      ]
    );

    const payoutId_db = result.lastID;

    console.log(`[INSTANT-PAYOUT] Payout created with ID: ${payoutId_db}`);

    // Emit payout created event (matching main API structure)
    const event = {
      id: `payout_created_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'payout_status_changed',
      payload: {
        id: payoutId_db,
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

    // Telegram alert for admin (HTML)
    const alert = [
      '<b>🔔 New Instant Payout Request</b>',
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

    // Store callback for demo purposes (matching main API structure)
    demoCallbackStore.append(callbackToken, {
      type: 'payout_status_changed',
      payoutId: payoutId_db,
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

    console.log(`[INSTANT-PAYOUT] Successfully created payout ${payoutId_db} for vendor ${vendor.id}`);

    // Debug: Check if payout is visible in admin query
    const adminCheck = await db.get(
      `SELECT p.id, p.vendor_id, v.business_name, p.status, p.created_at
       FROM payouts p
       LEFT JOIN vendors v ON v.id = p.vendor_id
       WHERE p.id = ?`,
      [payoutId_db]
    );
    console.log(`[INSTANT-PAYOUT] Admin visibility check:`, adminCheck);

    // Get payout details for response (matching main API structure)
    const payout = await db.get(
      `SELECT id, amount, currency, beneficiary_name, beneficiary_account, beneficiary_ifsc, beneficiary_upi, reference_id, remarks, status, created_at
       FROM payouts WHERE id = ?`,
      [payoutId_db]
    );

    return NextResponse.json({ 
      success: true,
      message: 'Payout request created', 
      payout,
      authMethod: 'secret_key'
    });

  } catch (error) {
    console.error('Instant payout creation error:', error);
    return NextResponse.json({ 
      error: 'Failed to create instant payout',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

async function handler(req: NextRequest) {
  if (req.method === 'POST') {
    return createInstantPayout(req);
  }
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
}

export const POST = apiCors(withRateLimit(payoutCreationRateLimit)(handler));
export const OPTIONS = apiCors(async () => new NextResponse(null, { status: 200 }));
