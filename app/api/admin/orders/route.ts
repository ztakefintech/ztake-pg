import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const vendorId = searchParams.get('vendor_id');
    const withUtr = searchParams.get('with_utr');
    const limit = Math.min(parseInt(searchParams.get('limit') || '200', 10), 500);
    const offset = Math.max(parseInt(searchParams.get('offset') || '0', 10), 0);

    const params: any[] = [];
    let where = 'WHERE 1=1';
    if (status) { where += ' AND status = ?'; params.push(status); }
    if (vendorId) { where += ' AND vendor_id = ?'; params.push(Number(vendorId)); }
    if (withUtr === '1' || withUtr === 'true') { where += ' AND utr IS NOT NULL AND LENGTH(utr) > 0'; }

    const orders = await db.all(
      `SELECT ztake_order_id, merchant_order_id, amount, currency, customer_name, status, utr, vendor_id, created_at
       FROM orders ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );
    return NextResponse.json({ success: true, data: { orders } });
  } catch (error) {
    console.error('Admin orders list error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch orders' }, { status: 500 });
  }
}


