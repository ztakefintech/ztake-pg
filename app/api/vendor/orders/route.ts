import { NextRequest } from 'next/server';
import { withAuth, createApiResponse, createErrorResponse, AuthenticatedRequest } from '@/lib/middleware';
import { db } from '@/lib/database';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function handler(req: AuthenticatedRequest) {
  if (req.method !== 'GET') return createErrorResponse('Method not allowed', 405);
  try {
    const rows = await db.all(
      `
      SELECT ztake_order_id, merchant_order_id, amount, currency, customer_name, status, utr, created_at
      FROM orders
      WHERE vendor_id = ?
      UNION ALL
      SELECT 
        COALESCE(reference_id, CONCAT('PYT', LPAD(id::text, 8, '0'))) as ztake_order_id,
        COALESCE(reference_id, CONCAT('PYT', LPAD(id::text, 8, '0'))) as merchant_order_id,
        amount,
        currency,
        COALESCE(beneficiary_name, 'Payout') as customer_name,
        status,
        NULL as utr,
        created_at
      FROM payouts
      WHERE vendor_id = ?
      ORDER BY created_at DESC
      LIMIT 200
      `,
      [req.vendor!.id, req.vendor!.id]
    );
    return createApiResponse({ orders: rows });
  } catch (e) {
    return createErrorResponse('Failed to fetch orders', 500);
  }
}

export const GET = withAuth(handler);


