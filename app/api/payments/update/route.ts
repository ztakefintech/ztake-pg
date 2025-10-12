
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database';
import { withApiKeyAuth, createApiResponse, createErrorResponse, AuthenticatedRequest } from '@/lib/middleware';
import { updatePaymentSchema, validateRequest } from '@/lib/validation';
import { withRateLimit } from '@/lib/middleware';
import { paymentUpdateRateLimit } from '@/lib/rate-limit';
import { apiCors } from '@/lib/cors';
import { eventStore } from '@/lib/event-store';

async function handler(req: AuthenticatedRequest) {
  if (req.method !== 'POST') {
    return createErrorResponse('Method not allowed', 405);
  }

  try {
    const body = await req.json();
    const validatedData = validateRequest(updatePaymentSchema, body);

    // Check if vendor exists
    const vendor = await db.get(
      'SELECT id, vendor_code, business_name FROM vendors WHERE vendor_code = ?',
      [validatedData.vendor_code]
    );

    if (!vendor) {
      return createErrorResponse('Vendor not found', 404);
    }

    // Check if UTR already exists
    const existingPayment = await db.get(
      'SELECT id FROM payments WHERE utr = ?',
      [validatedData.utr]
    );

    if (existingPayment) {
      return createErrorResponse('Payment with this UTR already exists', 409);
    }

    // Create payment record with provided status
    const paymentStatus = validatedData.payment_status || 'Succeeded';
    const result = await db.run(
      `INSERT INTO payments (order_id, utr, amount, vendor_id, status, payment_status) 
       VALUES (?, ?, ?, ?, 'completed', ?)`,
      [validatedData.order_id || null, validatedData.utr, validatedData.amount, vendor.id, paymentStatus]
    );

    // If the new payment is pending, mark related order pending by UTR (if attached later)
    if (paymentStatus === 'Pending') {
      const order = await db.get(
        `SELECT ztake_order_id, merchant_order_id, amount, callback_url FROM orders WHERE utr = ?`,
        [validatedData.utr]
      );
      if (order) {
        await db.run(
          `UPDATE orders SET status = 'Pending', updated_at = CURRENT_TIMESTAMP WHERE ztake_order_id = ?`,
          [order.ztake_order_id]
        );
        if (order.callback_url) {
          const payload = {
            merchantOrderId: order.merchant_order_id,
            ztakeOrderId: order.ztake_order_id,
            amount: Number(validatedData.amount),
            utr: validatedData.utr,
            status: 'PENDING',
            paymentTime: new Date().toISOString()
          };
          fetch(order.callback_url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          }).catch(() => {});
        }
      }
    }

    // If the new payment is succeeded, attempt to update any matching order by UTR and send callback
    if (paymentStatus === 'Succeeded') {
      const order = await db.get(
        `SELECT ztake_order_id, merchant_order_id, amount, callback_url FROM orders WHERE utr = ?`,
        [validatedData.utr]
      );
      if (order) {
        await db.run(
          `UPDATE payments SET order_id = ?, checked_status = TRUE, checked_at = CURRENT_TIMESTAMP WHERE id = ? AND checked_status = FALSE`,
          [order.ztake_order_id, result.lastID]
        );
        // Sync order amount from payment
        await db.run(
          `UPDATE orders SET amount = ?, status = 'Succeeded', payment_time = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE ztake_order_id = ?`,
          [validatedData.amount, order.ztake_order_id]
        );
        if (order.callback_url) {
          const payload = {
            merchantOrderId: order.merchant_order_id,
            ztakeOrderId: order.ztake_order_id,
            amount: Number(validatedData.amount),
            utr: validatedData.utr,
            status: 'SUCCESS',
            paymentTime: new Date().toISOString()
          };
          fetch(order.callback_url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          }).catch(() => {});
        }
      }
    }

    // Fetch the created payment with vendor details
    const payment = await db.get(
      `SELECT p.id, p.utr, p.amount, p.status, p.payment_status, p.created_at, 
              v.business_name, v.contact_name, v.upi_id
       FROM payments p
       JOIN vendors v ON p.vendor_id = v.id
       WHERE p.id = ?`,
      [result.lastID]
    );

    // Emit payment created event via WebSocket
    const event = {
      id: `payment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'payment_status_changed',
      payload: {
        id: payment.id,
        vendorId: vendor.id,
        businessName: payment.business_name,
        contactName: payment.contact_name,
        upiId: payment.upi_id,
        utr: payment.utr,
        amount: payment.amount,
        payment_status: payment.payment_status,
        status: payment.status,
        timestamp: new Date().toISOString()
      },
      timestamp: new Date()
    };
    
    eventStore.emit(event);
    console.log('Payment event emitted:', event);

    return createApiResponse({
      message: 'Payment updated successfully',
      payment: {
        id: payment.id,
        utr: payment.utr,
        amount: payment.amount,
        status: payment.status,
        payment_status: payment.payment_status,
        created_at: payment.created_at,
        vendor: {
          id: validatedData.vendor_id,
          business_name: payment.business_name,
          contact_name: payment.contact_name,
          upi_id: payment.upi_id
        }
      }
    }, 201);

  } catch (error) {
    console.error('Update payment error:', error);
    return createErrorResponse(
      error instanceof Error ? error.message : 'Failed to update payment',
      500
    );
  }
}

export const POST = apiCors(withRateLimit(paymentUpdateRateLimit)(withApiKeyAuth(handler)));
export const OPTIONS = apiCors(async () => new NextResponse(null, { status: 200 }));
