import { NextRequest } from 'next/server';
import { db } from '@/lib/database';
import { withAuth, createApiResponse, createErrorResponse, AuthenticatedRequest } from '@/lib/middleware';
import { generatePayoutId } from '@/lib/utils';
import { eventStore } from '@/lib/event-store';
import { demoCallbackStore } from '@/lib/callback-store';
import { createPayoutSchema, validateRequest, validateBusinessRules, sanitizeInput, paginationSchema, validateQueryParams } from '@/lib/validation';
import { withRateLimit } from '@/lib/middleware';
import { payoutCreationRateLimit } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function listPayouts(req: AuthenticatedRequest) {
  try {
    const { searchParams } = new URL(req.url);
    
    // Validate pagination parameters
    const validatedParams = validateQueryParams(paginationSchema, searchParams);
    const { page, limit, offset } = validatedParams;

    const totalRow = await db.get(
      'SELECT COUNT(*)::int as total FROM payouts WHERE vendor_id = ?',
      [req.vendor!.id]
    );
    const total = totalRow?.total || 0;

    const rows = await db.all(
      `SELECT id, amount, currency, beneficiary_name, beneficiary_account, beneficiary_ifsc, beneficiary_upi, reference_id, remarks, status, cashfree_payout_id AS provider_payout_id, admin_notes, created_at, updated_at
       FROM payouts
       WHERE vendor_id = ?
       ORDER BY created_at DESC
       LIMIT ? OFFSET ?`,
      [req.vendor!.id, limit, offset]
    );

    // Get status counts based on payout status
    const successCountRow = await db.get(
      `SELECT COUNT(*)::int AS count
       FROM payouts
       WHERE vendor_id = ? AND (status = 'paid' OR status = 'approved' OR status = 'success')`,
      [req.vendor!.id]
    );
    const successCount = successCountRow?.count || 0;

    const pendingCountRow = await db.get(
      `SELECT COUNT(*)::int AS count
       FROM payouts
       WHERE vendor_id = ? AND (status = 'created' OR status = 'pending')`,
      [req.vendor!.id]
    );
    const pendingCount = pendingCountRow?.count || 0;

    const failedCountRow = await db.get(
      `SELECT COUNT(*)::int AS count
       FROM payouts
       WHERE vendor_id = ? AND (status = 'rejected' OR status = 'failed')`,
      [req.vendor!.id]
    );
    const failedCount = failedCountRow?.count || 0;

    const statusCounts = {
      Success: successCount,
      Pending: pendingCount,
      Failed: failedCount
    };

    return createApiResponse({
      payouts: rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      },
      statusCounts
    });
  } catch (error) {
    console.error('List payouts error:', error);
    return createErrorResponse('Failed to fetch payouts', 500);
  }
}

async function createPayout(req: AuthenticatedRequest) {
  try {
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
      remarks
    } = {
      ...validatedData,
      beneficiary_name: sanitizeInput(validatedData.beneficiary_name),
      remarks: validatedData.remarks ? sanitizeInput(validatedData.remarks) : undefined
    };

    // Check vendor balance
    const vendor = await db.get(`SELECT payout_balance FROM vendors WHERE id = ?`, [req.vendor!.id]);
    const balance = Number(vendor?.payout_balance || 0);
    const amt = Number(amount);
    if (balance < amt) {
      return createErrorResponse('Insufficient payout balance', 400);
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
        return createErrorResponse('Failed to generate unique payout ID', 500);
      }
    }

    // Hold funds immediately by subtracting from balance and storing held_amount
    await db.run(`UPDATE vendors SET payout_balance = COALESCE(payout_balance,0) - ? WHERE id = ?`, [amt, req.vendor!.id]);

    const result = await db.run(
      `INSERT INTO payouts (vendor_id, amount, currency, beneficiary_name, beneficiary_account, beneficiary_ifsc, beneficiary_upi, reference_id, remarks, status, held_amount)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'created', ?)`,
      [req.vendor!.id, amt, currency, beneficiary_name || null, beneficiary_account || null, beneficiary_ifsc || null, beneficiary_upi || null, payoutReferenceId, remarks || null, amt]
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
        vendorId: req.vendor!.id,
        businessName: req.vendor!.business_name || `Vendor #${req.vendor!.id}`,
        contactName: req.vendor!.contact_name,
        email: req.vendor!.email,
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

    // Also send to callback store for demo purposes
    const callbackToken = `vendor-${req.vendor!.vendor_code || req.vendor!.id}`;
    demoCallbackStore.append(callbackToken, {
      type: 'payout_status_changed',
      payoutId: result.lastID,
      vendorId: req.vendor!.id,
      businessName: req.vendor!.business_name || `Vendor #${req.vendor!.id}`,
      contactName: req.vendor!.contact_name,
      email: req.vendor!.email,
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

    return createApiResponse({ message: 'Payout request created', payout });
  } catch (error) {
    console.error('Create payout error:', error);
    return createErrorResponse('Failed to create payout', 500);
  }
}

async function handler(req: AuthenticatedRequest) {
  if (req.method === 'GET') {
    return listPayouts(req);
  }
  if (req.method === 'POST') {
    return createPayout(req);
  }
  return createErrorResponse('Method not allowed', 405);
}

export const GET = withAuth(handler);
export const POST = withAuth(withRateLimit(payoutCreationRateLimit)(handler));
