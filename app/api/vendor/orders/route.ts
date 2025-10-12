import { NextRequest } from 'next/server';
import { withAuth, createApiResponse, createErrorResponse, AuthenticatedRequest } from '@/lib/middleware';
import { db } from '@/lib/database';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function handler(req: AuthenticatedRequest) {
  if (req.method !== 'GET') return createErrorResponse('Method not allowed', 405);
  
  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = (page - 1) * limit;

    // Get total count from orders table
    const totalResult = await db.get(
      'SELECT COUNT(*) as total FROM orders WHERE vendor_id = ?',
      [req.vendor!.id]
    );
    const total = totalResult.total;

    // Get orders with pagination
    const orders = await db.all(
      `SELECT ztake_order_id, merchant_order_id, amount, currency, customer_name, status, utr, created_at
       FROM orders 
       WHERE vendor_id = ? 
       ORDER BY created_at DESC 
       LIMIT ? OFFSET ?`,
      [req.vendor!.id, limit, offset]
    );

    // Get status counts based on order status
    const successCountRow = await db.get(
      `SELECT COUNT(*)::int AS count
       FROM orders
       WHERE vendor_id = ? AND (status = 'Succeeded' OR status = 'SUCCEEDED' OR status = 'completed')`,
      [req.vendor!.id]
    );
    const successCount = successCountRow?.count || 0;

    const pendingCountRow = await db.get(
      `SELECT COUNT(*)::int AS count
       FROM orders
       WHERE vendor_id = ? AND (status = 'Pending' OR status = 'PENDING' OR status = 'created')`,
      [req.vendor!.id]
    );
    const pendingCount = pendingCountRow?.count || 0;

    const failedCountRow = await db.get(
      `SELECT COUNT(*)::int AS count
       FROM orders
       WHERE vendor_id = ? AND (status = 'Failed' OR status = 'FAILED' OR status = 'rejected')`,
      [req.vendor!.id]
    );
    const failedCount = failedCountRow?.count || 0;

    const statusCounts = {
      Success: successCount,
      Pending: pendingCount,
      Failed: failedCount
    };

    return createApiResponse({
      orders,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      },
      statusCounts
    });
  } catch (e) {
    return createErrorResponse('Failed to fetch orders', 500);
  }
}

export const GET = withAuth(handler);


