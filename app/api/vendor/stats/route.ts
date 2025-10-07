import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database';
import { withAuth, type AuthenticatedRequest } from '@/lib/middleware';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function handler(req: AuthenticatedRequest) {
  if (req.method !== 'GET') {
    return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
  }
  try {
    const vendorId = req.vendor!.id;
    const row = await db.get(
      `SELECT COALESCE(SUM(amount), 0) as total_amount
       FROM orders
       WHERE vendor_id = ? AND status = 'Succeeded'`,
      [vendorId]
    );
    return NextResponse.json({
      success: true,
      data: {
        totalReceivedOrdersAmount: Number(row?.total_amount || 0)
      }
    });
  } catch (e) {
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
  }
}

export const GET = withAuth(handler);


