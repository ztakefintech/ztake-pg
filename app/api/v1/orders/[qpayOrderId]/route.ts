import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database';

export async function GET(
  _req: NextRequest,
  { params }: { params: { qpayOrderId: string } }
) {
  try {
    const order = await db.get(
      `SELECT ztake_order_id, merchant_order_id, amount, currency, customer_name, return_url, callback_url, status, utr, payment_time, vendor_id, created_at
       FROM orders WHERE ztake_order_id = ?`,
      [params.qpayOrderId]
    );

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: order
    });
  } catch (error) {
    console.error('Get order error:', error);
    return NextResponse.json({ error: 'Failed to fetch order' }, { status: 500 });
  }
}


