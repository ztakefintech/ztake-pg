import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database';

export async function POST(
  req: NextRequest,
  { params }: { params: { qpayOrderId: string } }
) {
  try {
    const body = await req.json();
    const { utr } = body || {};

    if (!utr || typeof utr !== 'string') {
      return NextResponse.json({ error: 'utr is required' }, { status: 400 });
    }

    const order = await db.get(
      `SELECT ztake_order_id, merchant_order_id, amount, currency, customer_name, status, vendor_id, callback_url 
       FROM orders WHERE ztake_order_id = ?`,
      [params.qpayOrderId]
    );

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Always accept UTR: set order status to 'Pending' and send Pending callback
    await db.run(
      `UPDATE orders SET utr = ?, status = 'Pending', updated_at = CURRENT_TIMESTAMP WHERE ztake_order_id = ?`,
      [utr, params.qpayOrderId]
    );

    if (order.callback_url) {
      const pendingPayload = {
        merchantOrderId: order.merchant_order_id,
        ztakeOrderId: order.ztake_order_id,
        amount: Number(order.amount),
        utr,
        status: 'PENDING',
        paymentTime: new Date().toISOString()
      };
      fetch(order.callback_url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(pendingPayload)
      }).catch(() => {});
    }

    // If payment already exists and succeeded, flip now and send SUCCESS callback
    if (order.vendor_id) {
      const paymentRow = await db.get(
        `SELECT id, utr, amount, payment_status, checked_status FROM payments WHERE utr = ? AND vendor_id = ?`,
        [utr, order.vendor_id]
      );
      if (paymentRow && paymentRow.payment_status === 'Succeeded') {
        await db.run(
          `UPDATE payments SET order_id = ?, checked_status = TRUE, checked_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
           WHERE utr = ? AND vendor_id = ? AND checked_status = FALSE`,
          [order.ztake_order_id, utr, order.vendor_id]
        );
        if (paymentRow.amount != null) {
          await db.run(`UPDATE orders SET amount = ?, updated_at = CURRENT_TIMESTAMP WHERE ztake_order_id = ?`, [paymentRow.amount, params.qpayOrderId]);
        }
        await db.run(
          `UPDATE orders SET status = 'Succeeded', payment_time = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE ztake_order_id = ?`,
          [params.qpayOrderId]
        );
        if (order.callback_url) {
          const successPayload = {
            merchantOrderId: order.merchant_order_id,
            ztakeOrderId: order.ztake_order_id,
            amount: Number(paymentRow.amount ?? order.amount),
            utr,
            status: 'SUCCESS',
            paymentTime: new Date().toISOString()
          };
          fetch(order.callback_url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(successPayload)
          }).catch(() => {});
        }
        return NextResponse.json({ success: true, verified: true, status: 'Succeeded', amount: Number(paymentRow.amount ?? order.amount) });
      }
    }

    return NextResponse.json({ success: true, verified: false, status: 'Pending' });
  } catch (error) {
    console.error('Submit UTR error:', error);
    return NextResponse.json({ error: 'Failed to submit UTR' }, { status: 500 });
  }
}


