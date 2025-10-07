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

    // Get total count
    const totalResult = await db.get(
      'SELECT COUNT(*) as total FROM payments WHERE vendor_id = ?',
      [req.vendor!.id]
    );
    const total = totalResult.total;

    // Get payments with pagination
    const payments = await db.all(
      `SELECT id, order_id, utr, amount, status, payment_status, checked_status, checked_at, created_at, updated_at
       FROM payments 
       WHERE vendor_id = ? 
       ORDER BY created_at DESC 
       LIMIT ? OFFSET ?`,
      [req.vendor!.id, limit, offset]
    );

    // Get overall status counts (not limited by pagination)
    const statusCountRows = await db.all(
      `SELECT payment_status, COUNT(*)::int AS count
       FROM payments
       WHERE vendor_id = ?
       GROUP BY payment_status`,
      [req.vendor!.id]
    );

    const statusCounts = {
      Succeeded: 0,
      Pending: 0,
      Failed: 0
    } as { [key: string]: number };

    for (const row of statusCountRows) {
      const key = row.payment_status as string;
      const value = typeof row.count === 'number' ? row.count : parseInt(row.count || '0', 10);
      if (key in statusCounts) {
        statusCounts[key] = value;
      }
    }

    // Get count of checked transactions
    const checkedRow = await db.get(
      `SELECT COUNT(*)::int AS count
       FROM payments
       WHERE vendor_id = ? AND checked_status = TRUE`,
      [req.vendor!.id]
    );
    const checkedCount = checkedRow?.count || 0;

    return createApiResponse({
      payments,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      },
      statusCounts,
      checkedCount
    });

  } catch (error) {
    console.error('Get vendor payments error:', error);
    return createErrorResponse('Failed to fetch payments', 500);
  }
}

export const GET = withAuth(handler);
