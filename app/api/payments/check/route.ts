import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database';
import { checkPaymentSchema, validateRequest } from '@/lib/validation';
import { withRateLimit, createApiResponse, createErrorResponse } from '@/lib/middleware';
import { apiRateLimit } from '@/lib/rate-limit';
import { apiCors } from '@/lib/cors';

async function handler(req: NextRequest) {
  if (req.method !== 'POST') {
    return createErrorResponse('Method not allowed', 405);
  }

  try {
    const body = await req.json();
    const validatedData = validateRequest(checkPaymentSchema, body);

    // Find payment by UTR and vendor_code only (order_id may not exist yet)
    const payment = await db.get(
      `SELECT p.id, p.order_id, p.utr, p.amount, p.status, p.payment_status, p.checked_status, p.checked_at, p.created_at, p.updated_at,
              v.id as vendor_id, v.vendor_code, v.business_name, v.contact_name, v.upi_id
       FROM payments p
       JOIN vendors v ON p.vendor_id = v.id
       WHERE p.utr = ? AND v.vendor_code = ?`,
      [validatedData.utr, validatedData.vendor_code]
    );

    if (!payment) {
      return createErrorResponse('Payment not found for this vendor', 404);
    }

    // Check if UTR has already been checked
    if (payment.checked_status) {
      return createApiResponse({
        payment: {
          id: payment.id,
          order_id: payment.order_id,
          utr: payment.utr,
          amount: payment.amount,
          status: payment.status,
          payment_status: payment.payment_status,
          checked_status: payment.checked_status,
          checked_at: payment.checked_at,
          created_at: payment.created_at,
          updated_at: payment.updated_at,
          vendor: {
            id: payment.vendor_id,
            business_name: payment.business_name,
            contact_name: payment.contact_name,
            upi_id: payment.upi_id
          }
        },
        message: 'UTR has already been checked'
      });
    }

    // Only process if payment is succeeded
    if (payment.payment_status !== 'Succeeded') {
      return createApiResponse({
        payment: {
          id: payment.id,
          order_id: payment.order_id,
          utr: payment.utr,
          amount: payment.amount,
          status: payment.status,
          payment_status: payment.payment_status,
          checked_status: payment.checked_status,
          checked_at: payment.checked_at,
          created_at: payment.created_at,
          updated_at: payment.updated_at,
          vendor: {
            id: payment.vendor_id,
            business_name: payment.business_name,
            contact_name: payment.contact_name,
            upi_id: payment.upi_id
          }
        },
        message: 'Payment not succeeded, cannot be checked'
      });
    }

    // Update order_id and mark as checked (only for succeeded payments, only once)
    await db.run(
      `UPDATE payments 
       SET order_id = ?, checked_status = TRUE, checked_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP 
       WHERE utr = ? AND vendor_id = ? AND payment_status = 'Succeeded' AND checked_status = FALSE`,
      [validatedData.order_id, validatedData.utr, validatedData.vendor_id]
    );

    // Fetch updated payment data
    const updatedPayment = await db.get(
      `SELECT p.id, p.order_id, p.utr, p.amount, p.status, p.payment_status, p.checked_status, p.checked_at, p.created_at, p.updated_at,
              v.id as vendor_id, v.business_name, v.contact_name, v.upi_id
       FROM payments p
       JOIN vendors v ON p.vendor_id = v.id
       WHERE p.utr = ? AND p.vendor_id = ?`,
      [validatedData.utr, validatedData.vendor_id]
    );

    return createApiResponse({
      payment: {
        id: updatedPayment.id,
        order_id: updatedPayment.order_id,
        utr: updatedPayment.utr,
        amount: updatedPayment.amount,
        status: updatedPayment.status,
        payment_status: updatedPayment.payment_status,
        checked_status: updatedPayment.checked_status,
        checked_at: updatedPayment.checked_at,
        created_at: updatedPayment.created_at,
        updated_at: updatedPayment.updated_at,
        vendor: {
          id: updatedPayment.vendor_id,
          business_name: updatedPayment.business_name,
          contact_name: updatedPayment.contact_name,
          upi_id: updatedPayment.upi_id
        }
      },
      message: 'UTR checked successfully'
    });

  } catch (error) {
    console.error('Check payment error:', error);
    return createErrorResponse(
      error instanceof Error ? error.message : 'Failed to check payment status',
      500
    );
  }
}

export const POST = apiCors(withRateLimit(apiRateLimit)(handler));
export const OPTIONS = apiCors(async () => new NextResponse(null, { status: 200 }));
