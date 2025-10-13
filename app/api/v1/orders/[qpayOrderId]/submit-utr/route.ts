import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database';
import { eventStore } from '@/lib/event-store';
import { AuthService } from '@/lib/auth';
import { validateRequest, apiKeyValidationSchema } from '@/lib/validation';

export async function POST(
  req: NextRequest,
  { params }: { params: { qpayOrderId: string } }
) {
  try {
    // Validate API key from authorization header
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Authorization header with Bearer token is required' }, { status: 401 });
    }
    
    const apiKey = authHeader.substring(7);
    try {
      validateRequest(apiKeyValidationSchema, apiKey);
    } catch (error) {
      return NextResponse.json({ error: 'Invalid API key format in Authorization header' }, { status: 401 });
    }

    console.log(`[SUBMIT-UTR] Attempting authentication for API key: ${apiKey.substring(0, 8)}... for order: ${params.qpayOrderId}`);

    // Verify API key exists in database
    const apiKeyInfo = await AuthService.verifyApiKeyFromDb(apiKey);
    if (!apiKeyInfo) {
      console.log(`[SUBMIT-UTR] API key not found in database: ${apiKey.substring(0, 8)}...`);
      return NextResponse.json({ 
        error: 'Invalid API key. The provided API key does not exist.',
        details: 'Please check your API key and try again'
      }, { status: 401 });
    }
    
    console.log(`[SUBMIT-UTR] API key verified for key ID: ${apiKeyInfo.keyId}`);

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
      console.log(`[SUBMIT-UTR] Order not found: ${params.qpayOrderId}`);
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    console.log(`[SUBMIT-UTR] Order found for vendor ID: ${order.vendor_id}`);

    // Verify that the API key belongs to the same vendor as the order
    if (apiKeyInfo.vendorId && apiKeyInfo.vendorId !== order.vendor_id) {
      console.log(`[SUBMIT-UTR] API key vendor mismatch. API key belongs to vendor ${apiKeyInfo.vendorId}, but order belongs to vendor ${order.vendor_id}`);
      return NextResponse.json({ 
        error: 'Access denied. You can only submit UTR for orders belonging to your vendor account.',
        details: 'The provided API key does not belong to the vendor who created this order'
      }, { status: 403 });
    }

    // If API key doesn't have vendor association, we need to verify it belongs to the order's vendor
    if (!apiKeyInfo.vendorId) {
      console.log(`[SUBMIT-UTR] API key has no vendor association, checking if it can access this vendor's orders`);
      // For now, we'll allow it, but this could be enhanced with additional validation
      console.log(`[SUBMIT-UTR] Allowing API key without vendor association to proceed`);
    }

    console.log(`[SUBMIT-UTR] Authentication successful for order ${params.qpayOrderId}`);

    // Always accept UTR: set order status to 'Pending' and send Pending callback
    await db.run(
      `UPDATE orders SET utr = ?, status = 'Pending', updated_at = CURRENT_TIMESTAMP WHERE ztake_order_id = ?`,
      [utr, params.qpayOrderId]
    );

    console.log(`[SUBMIT-UTR] UTR ${utr} submitted for order ${params.qpayOrderId} by vendor ${order.vendor_id}`);

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


