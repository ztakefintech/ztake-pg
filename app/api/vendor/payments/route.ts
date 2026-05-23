import { NextRequest } from 'next/server';
import { db } from '@/lib/database';
import { withAuth, createApiResponse, createErrorResponse, AuthenticatedRequest } from '@/lib/middleware';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

async function handler(req: AuthenticatedRequest) {
  if (req.method !== 'GET') {
    return createErrorResponse('Method not allowed', 405);
  }

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

    console.log(`Vendor ID: ${req.vendor!.id}, Total orders: ${total}`);

    // Get orders with pagination
    const orders = await db.all(
      `SELECT id, ztake_order_id, merchant_order_id, amount, original_amount, currency, customer_name, status, utr, created_at, updated_at
       FROM orders 
       WHERE vendor_id = ? 
       ORDER BY created_at DESC 
       LIMIT ? OFFSET ?`,
      [req.vendor!.id, limit, offset]
    );

    console.log(`Returning ${orders.length} orders for vendor ${req.vendor!.id}`);

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

    console.log(`Status counts - Success: ${successCount}, Pending: ${pendingCount}, Failed: ${failedCount}`);

    return createApiResponse({
      payments: orders,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      },
      statusCounts,
      checkedCount: successCount // Using success count as checked count for orders
    });

  } catch (error) {
    console.error('Get vendor payments error:', error);
    return createErrorResponse('Failed to fetch payments', 500);
  }
}

export const GET = withAuth(handler);
