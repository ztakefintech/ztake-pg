import { NextRequest } from 'next/server';
import { db } from '@/lib/database';
import { withAuth, createApiResponse, createErrorResponse, AuthenticatedRequest } from '@/lib/middleware';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function listPayouts(req: AuthenticatedRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = (page - 1) * limit;

    const totalRow = await db.get(
      'SELECT COUNT(*)::int as total FROM payouts WHERE vendor_id = ?',
      [req.vendor!.id]
    );
    const total = totalRow?.total || 0;

    const rows = await db.all(
      `SELECT id, amount, currency, beneficiary_name, beneficiary_account, beneficiary_ifsc, beneficiary_upi, reference_id, remarks, status, cashfree_payout_id AS provider_payout_id, created_at, updated_at
       FROM payouts
       WHERE vendor_id = ?
       ORDER BY created_at DESC
       LIMIT ? OFFSET ?`,
      [req.vendor!.id, limit, offset]
    );

    return createApiResponse({
      payouts: rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('List payouts error:', error);
    return createErrorResponse('Failed to fetch payouts', 500);
  }
}

async function createPayout(req: AuthenticatedRequest) {
  try {
    const body = await req.json();
    const { amount, currency = 'INR', beneficiary_name, beneficiary_account, beneficiary_ifsc, beneficiary_upi, reference_id, remarks } = body || {};

    if (!amount || isNaN(Number(amount))) {
      return createErrorResponse('Invalid amount', 400);
    }

    // Check vendor balance
    const vendor = await db.get(`SELECT payout_balance FROM vendors WHERE id = ?`, [req.vendor!.id]);
    const balance = Number(vendor?.payout_balance || 0);
    const amt = Number(amount);
    if (balance < amt) {
      return createErrorResponse('Insufficient payout balance', 400);
    }

    // Hold funds immediately by subtracting from balance and storing held_amount
    await db.run(`UPDATE vendors SET payout_balance = COALESCE(payout_balance,0) - ? WHERE id = ?`, [amt, req.vendor!.id]);

    const result = await db.run(
      `INSERT INTO payouts (vendor_id, amount, currency, beneficiary_name, beneficiary_account, beneficiary_ifsc, beneficiary_upi, reference_id, remarks, status, held_amount)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'created', ?)`,
      [req.vendor!.id, amt, currency, beneficiary_name || null, beneficiary_account || null, beneficiary_ifsc || null, beneficiary_upi || null, reference_id || null, remarks || null, amt]
    );

    const payout = await db.get(
      `SELECT id, amount, currency, beneficiary_name, beneficiary_account, beneficiary_ifsc, beneficiary_upi, reference_id, remarks, status, created_at
       FROM payouts WHERE id = ?`,
      [result.lastID]
    );

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
export const POST = withAuth(handler);
