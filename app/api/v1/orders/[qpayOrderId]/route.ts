import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database';

/**
 * Public endpoint - No authentication required
 * Used by payment page where customers view order details and submit UTR
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { qpayOrderId: string } }
) {
  try {
    console.log(`[GET-ORDER-PUBLIC] Fetching order: ${params.qpayOrderId}`);

    const order = await db.get(
      `SELECT ztake_order_id, merchant_order_id, amount, currency, customer_name, return_url, callback_url, status, utr, payment_time, created_at, vendor_id
       FROM orders WHERE ztake_order_id = ?`,
      [params.qpayOrderId]
    );

    if (!order) {
      console.log(`[GET-ORDER-PUBLIC] Order not found: ${params.qpayOrderId}`);
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    console.log(`[GET-ORDER-PUBLIC] Order found: ${params.qpayOrderId}`);

    return NextResponse.json({
      success: true,
      data: order
    });
  } catch (error) {
    console.error('Get order error:', error);
    return NextResponse.json({ error: 'Failed to fetch order' }, { status: 500 });
  }
}


