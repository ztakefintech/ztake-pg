import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database';
import { withApiKeyAuth, createApiResponse, createErrorResponse, AuthenticatedRequest } from '@/lib/middleware';
import { updatePaymentStatusSchema, validateRequest, validateBusinessRules, sanitizeInput } from '@/lib/validation';
import { withRateLimit } from '@/lib/middleware';
import { paymentUpdateRateLimit } from '@/lib/rate-limit';
import { apiCors } from '@/lib/cors';

async function handler(req: AuthenticatedRequest) {
  if (req.method !== 'POST') {
    return createErrorResponse('Method not allowed', 405);
  }

  try {
    const body = await req.json();
    
    // Validate request body using comprehensive schema
    const validatedData = validateRequest(updatePaymentStatusSchema, body);
    
    // Apply business rules validation
    validateBusinessRules(validatedData, 'payment');
    
    // Sanitize inputs
    const sanitizedData = {
      ...validatedData,
      utr: sanitizeInput(validatedData.utr)
    };

    // Check if payment exists
    const existingPayment = await db.get(
      'SELECT id, utr, amount, status, payment_status, vendor_id FROM payments WHERE utr = ?',
      [sanitizedData.utr]
    );

    if (!existingPayment) {
      return createErrorResponse('Payment not found', 404);
    }

    // Update payment status
    await db.run(
      'UPDATE payments SET payment_status = ?, updated_at = CURRENT_TIMESTAMP WHERE utr = ?',
      [sanitizedData.payment_status, sanitizedData.utr]
    );

    // Fetch the updated payment with vendor details
    const payment = await db.get(
      `SELECT p.id, p.utr, p.amount, p.status, p.payment_status, p.created_at, p.updated_at,
              v.id as vendor_id, v.business_name, v.contact_name, v.upi_id
       FROM payments p
       JOIN vendors v ON p.vendor_id = v.id
       WHERE p.utr = ?`,
      [sanitizedData.utr]
    );

  // If payment succeeded, attempt to update linked order by UTR and send callback
  if (sanitizedData.payment_status === 'Succeeded') {
    const order = await db.get(
      `SELECT ztake_order_id, merchant_order_id, amount, callback_url FROM orders WHERE utr = ?`,
      [sanitizedData.utr]
    );
    if (order) {
      await db.run(
        `UPDATE payments SET order_id = ?, checked_status = TRUE, checked_at = CURRENT_TIMESTAMP WHERE utr = ? AND checked_status = FALSE`,
        [order.ztake_order_id, sanitizedData.utr]
      );
      await db.run(
        `UPDATE orders SET status = 'Succeeded', payment_time = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE ztake_order_id = ?`,
        [order.ztake_order_id]
      );
      if (order.callback_url) {
        const payload = {
          merchantOrderId: order.merchant_order_id,
          ztakeOrderId: order.ztake_order_id,
          amount: Number(payment.amount),
          utr: sanitizedData.utr,
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

  return createApiResponse({
      message: 'Payment status updated successfully',
      payment: {
        id: payment.id,
        utr: payment.utr,
        amount: payment.amount,
        status: payment.status,
        payment_status: payment.payment_status,
        created_at: payment.created_at,
        updated_at: payment.updated_at,
        vendor: {
          id: payment.vendor_id,
          business_name: payment.business_name,
          contact_name: payment.contact_name,
          upi_id: payment.upi_id
        }
      }
    }, 200);

  } catch (error) {
    console.error('Update payment status error:', error);
    return createErrorResponse(
      error instanceof Error ? error.message : 'Failed to update payment status',
      500
    );
  }
}

export const POST = apiCors(withRateLimit(paymentUpdateRateLimit)(withApiKeyAuth(handler)));
export const OPTIONS = apiCors(async () => new NextResponse(null, { status: 200 }));
