import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database';
import { eventStore } from '@/lib/event-store';

/**
 * Public endpoint - No authentication required
 * Used by payment page where customers submit UTR
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { qpayOrderId: string } }
) {
  try {
    console.log(`[SUBMIT-UTR-PUBLIC] Processing UTR submission for order: ${params.qpayOrderId}`);

    const body = await req.json();
    const { utr } = body || {};

    if (!utr || typeof utr !== 'string') {
      return NextResponse.json({ error: 'utr is required' }, { status: 400 });
    }

    const order = await db.get(
      `SELECT ztake_order_id, merchant_order_id, amount, currency, customer_name, status, callback_url, vendor_id 
       FROM orders WHERE ztake_order_id = ?`,
      [params.qpayOrderId]
    );

    if (!order) {
      console.log(`[SUBMIT-UTR-PUBLIC] Order not found: ${params.qpayOrderId}`);
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    console.log(`[SUBMIT-UTR-PUBLIC] Order found for vendor ID: ${order.vendor_id}`);

    // Prevent duplicate UTR across different orders
    const existingWithSameUtr = await db.get(
      `SELECT ztake_order_id FROM orders WHERE utr = ? AND ztake_order_id <> ?`,
      [utr, params.qpayOrderId]
    );
    if (existingWithSameUtr) {
      return NextResponse.json({ 
        error: 'UTR already used for another order', 
        code: 'UTR_ALREADY_USED' 
      }, { status: 409 });
    }

    // Always accept UTR: set order status to 'Pending' and send Pending callback
    await db.run(
      `UPDATE orders SET utr = ?, status = 'Pending', updated_at = CURRENT_TIMESTAMP WHERE ztake_order_id = ?`,
      [utr, params.qpayOrderId]
    );

    console.log(`[SUBMIT-UTR-PUBLIC] UTR ${utr} submitted for order ${params.qpayOrderId} by vendor ${order.vendor_id}`);

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
        
        // Emit payment verified event via WebSocket
        const vendor = await db.get(
          `SELECT id, business_name, contact_name, upi_id FROM vendors WHERE id = ?`,
          [order.vendor_id]
        );
        
        if (vendor) {
          const event = {
            id: `payment_verified_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            type: 'payment_status_changed',
            payload: {
              id: paymentRow.id,
              vendorId: vendor.id,
              businessName: vendor.business_name,
              contactName: vendor.contact_name,
              upiId: vendor.upi_id,
              utr: paymentRow.utr,
              amount: paymentRow.amount,
              payment_status: 'Succeeded',
              status: 'completed',
              checked_status: true,
              checked_at: new Date().toISOString(),
              orderId: order.ztake_order_id,
              timestamp: new Date().toISOString()
            },
            timestamp: new Date()
          };
          
          eventStore.emit(event);
          console.log('Payment verified event emitted:', event);
        }
        
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
        console.log(`[SUBMIT-UTR] Payment verified successfully for order ${params.qpayOrderId} with UTR ${utr}`);
        return NextResponse.json({ success: true, verified: true, status: 'Succeeded', amount: Number(paymentRow.amount ?? order.amount) });
      }
    }

    return NextResponse.json({ success: true, verified: false, status: 'Pending' });
  } catch (error) {
    console.error('Submit UTR error:', error);
    return NextResponse.json({ error: 'Failed to submit UTR' }, { status: 500 });
  }
}


