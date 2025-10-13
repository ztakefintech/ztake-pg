import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database';
import { eventStore } from '@/lib/event-store';
import { demoCallbackStore } from '@/lib/callback-store';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(
  req: NextRequest,
  { params }: { params: { orderId: string } }
) {
  try {
    // Validate secret key from authorization header
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Authorization header with Bearer token is required' }, { status: 401 });
    }
    
    const secretKey = authHeader.substring(7);
    
    // Validate secret key format (sk_ or sk_live_ + characters)
    if (!secretKey.startsWith('sk_') || secretKey.length < 35) {
      return NextResponse.json({ error: 'Invalid secret key format. Must start with sk_ and be at least 35 characters long.' }, { status: 401 });
    }

    console.log(`[INSTANT-UTR] Attempting authentication for secret key: ${secretKey.substring(0, 8)}... for order: ${params.orderId}`);

    // Verify secret key exists in database and get vendor info
    const vendor = await db.get(
      'SELECT id, vendor_code, business_name FROM vendors WHERE secret_key = ?',
      [secretKey]
    );

    if (!vendor) {
      console.log(`[INSTANT-UTR] Secret key not found in database: ${secretKey.substring(0, 8)}...`);
      return NextResponse.json({ 
        error: 'Invalid secret key. The provided secret key does not exist.',
        details: 'Please check your secret key and try again'
      }, { status: 401 });
    }
    
    console.log(`[INSTANT-UTR] Secret key verified for vendor ID: ${vendor.id} (${vendor.vendor_code})`);

    const body = await req.json();
    const { utr } = body || {};

    if (!utr || typeof utr !== 'string') {
      return NextResponse.json({ error: 'utr is required' }, { status: 400 });
    }

    const order = await db.get(
      `SELECT ztake_order_id, merchant_order_id, amount, currency, customer_name, status, callback_url
       FROM orders WHERE ztake_order_id = ?`,
      [params.orderId]
    );

    if (!order) {
      console.log(`[INSTANT-UTR] Order not found: ${params.orderId}`);
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Get vendor_id separately for verification
    const orderWithVendor = await db.get(
      `SELECT vendor_id FROM orders WHERE ztake_order_id = ?`,
      [params.orderId]
    );

    if (!orderWithVendor) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    console.log(`[INSTANT-UTR] Order found for vendor ID: ${orderWithVendor.vendor_id}`);

    // Verify that the order belongs to the same vendor as the secret key
    if (vendor.id !== orderWithVendor.vendor_id) {
      console.log(`[INSTANT-UTR] Secret key vendor mismatch. Secret key belongs to vendor ${vendor.id}, but order belongs to vendor ${orderWithVendor.vendor_id}`);
      return NextResponse.json({
        error: 'Access denied. You can only submit UTR for orders belonging to your vendor account.',
        details: 'The provided secret key does not belong to the vendor who created this order'
      }, { status: 403 });
    }

    console.log(`[INSTANT-UTR] Authentication successful for vendor ${vendor.id}`);

    // Check if order is already succeeded
    if (order.status === 'Succeeded') {
      return NextResponse.json({
        success: false,
        code: 'ALREADY_SUCCEEDED',
        message: 'Order already succeeded'
      }, { status: 409 });
    }

    // Update order with UTR and set status to Pending
    await db.run(
      'UPDATE orders SET utr = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE ztake_order_id = ?',
      [utr, 'Pending', params.orderId]
    );

    console.log(`[INSTANT-UTR] UTR ${utr} submitted for order ${params.orderId}, status set to Pending`);

    // Generate callback token for demo purposes
    const callbackToken = `vendor-${vendor.vendor_code}`;

    // Emit order status changed event (Pending)
    const pendingEvent = {
      id: `order_${params.orderId}_${Date.now()}`,
      type: 'order_status_changed',
      payload: {
        orderId: params.orderId,
        merchantOrderId: order.merchant_order_id,
        vendorId: vendor.id,
        vendorCode: vendor.vendor_code,
        amount: order.amount,
        currency: order.currency,
        status: 'Pending',
        utr: utr
      },
      timestamp: new Date()
    };
    
    eventStore.emit(pendingEvent);
    console.log('Order status changed to Pending event emitted:', pendingEvent);

    // Store callback for demo purposes (Pending status)
    if (order.callback_url) {
      demoCallbackStore.append(callbackToken, {
        type: 'order_status_changed',
        orderId: params.orderId,
        merchantOrderId: order.merchant_order_id,
        vendorId: vendor.id,
        vendorCode: vendor.vendor_code,
        amount: order.amount,
        currency: order.currency,
        status: 'Pending',
        utr: utr,
        timestamp: new Date().toISOString()
      });
    }

    // Check if payment exists for this UTR and vendor
    const payment = await db.get(
      'SELECT id, amount, payment_status, checked_status FROM payments WHERE utr = ? AND vendor_id = ?',
      [utr, vendor.id]
    );

    if (payment) {
      console.log(`[INSTANT-UTR] Payment found for UTR: ${utr}`);
      
      // Update order amount from payment
      await db.run(
        'UPDATE orders SET amount = ?, updated_at = CURRENT_TIMESTAMP WHERE ztake_order_id = ?',
        [payment.amount, params.orderId]
      );

      if (payment.payment_status === 'Succeeded' && !payment.checked_status) {
        // Mark payment as checked
        await db.run(
          'UPDATE payments SET checked_status = TRUE, checked_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
          [payment.id]
        );

        // Update order status to succeeded
        await db.run(
          'UPDATE orders SET status = ?, payment_time = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE ztake_order_id = ?',
          ['Succeeded', params.orderId]
        );

        console.log(`[INSTANT-UTR] Order ${params.orderId} marked as succeeded`);

        // Emit order succeeded event
        const succeededEvent = {
          id: `order_${params.orderId}_succeeded_${Date.now()}`,
          type: 'order_status_changed',
          payload: {
            orderId: params.orderId,
            merchantOrderId: order.merchant_order_id,
            vendorId: vendor.id,
            vendorCode: vendor.vendor_code,
            amount: payment.amount,
            currency: order.currency,
            status: 'Succeeded',
            utr: utr
          },
          timestamp: new Date()
        };
        
        eventStore.emit(succeededEvent);
        console.log('Order succeeded event emitted:', succeededEvent);

        // Store callback for demo purposes (Succeeded status)
        if (order.callback_url) {
          demoCallbackStore.append(callbackToken, {
            type: 'order_status_changed',
            orderId: params.orderId,
            merchantOrderId: order.merchant_order_id,
            vendorId: vendor.id,
            vendorCode: vendor.vendor_code,
            amount: payment.amount,
            currency: order.currency,
            status: 'Succeeded',
            utr: utr,
            timestamp: new Date().toISOString()
          });
        }

        return NextResponse.json({
          success: true,
          verified: true,
          status: 'Succeeded',
          amount: payment.amount,
          message: 'UTR verified and order succeeded'
        });
      } else if (payment.checked_status) {
        return NextResponse.json({
          success: false,
          code: 'UTR_ALREADY_USED',
          message: 'UTR already checked once'
        }, { status: 409 });
      } else {
        return NextResponse.json({
          success: true,
          verified: false,
          status: 'Pending',
          code: 'PAYMENT_NOT_SUCCEEDED',
          message: 'UTR found but payment not succeeded yet'
        });
      }
    } else {
      console.log(`[INSTANT-UTR] No payment found for UTR: ${utr}`);
      return NextResponse.json({
        success: true,
        verified: false,
        status: 'Pending',
        code: 'UTR_NOT_FOUND',
        message: 'UTR submitted, order status set to Pending. No payment found for this UTR yet.'
      });
    }

  } catch (error) {
    console.error('Instant UTR submission error:', error);
    return NextResponse.json({ 
      error: 'Failed to submit UTR',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
