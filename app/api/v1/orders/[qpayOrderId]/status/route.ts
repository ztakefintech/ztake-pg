import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database';

async function sendCallback(payload: any, callbackUrl: string) {
  try {
    const res = await fetch(callbackUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return res.ok;
  } catch (e) {
    console.error('Callback error:', e);
    return false;
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { ztakeOrderId: string } }
) {
  try {
    const body = await req.json();
    const { status, utr } = body || {};

    const normalizedStatus = typeof status === 'string' ? status.toUpperCase() : '';
    if (!['SUCCESS', 'FAILED', 'PENDING'].includes(normalizedStatus)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }
    const dbStatus = normalizedStatus === 'SUCCESS' ? 'Succeeded' : normalizedStatus === 'FAILED' ? 'Failed' : 'Pending';

    const order = await db.get(
      `SELECT ztake_order_id, merchant_order_id, amount, callback_url FROM orders WHERE ztake_order_id = ?`,
      [params.ztakeOrderId]
    );

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    await db.run(
      `UPDATE orders SET status = ?, utr = COALESCE(?, utr), payment_time = CASE WHEN ? = 'SUCCESS' THEN CURRENT_TIMESTAMP ELSE payment_time END, updated_at = CURRENT_TIMESTAMP WHERE ztake_order_id = ?`,
      [dbStatus, utr || null, normalizedStatus, params.ztakeOrderId]
    );

    const callbackPayload = {
      merchantOrderId: order.merchant_order_id,
      ztakeOrderId: order.ztake_order_id,
      amount: Number(order.amount),
      utr: utr || null,
      status: normalizedStatus,
      paymentTime: new Date().toISOString()
    };

    // Fire and forget callback
    sendCallback(callbackPayload, order.callback_url);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Update order status error:', error);
    return NextResponse.json({ error: 'Failed to update status' }, { status: 500 });
  }
}


