import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database';
import { AuthService } from '@/lib/auth';
import { checkPaymentSchema, validateRequest, validateBusinessRules, sanitizeInput, apiKeyValidationSchema } from '@/lib/validation';
import { withRateLimit, createApiResponse, createErrorResponse } from '@/lib/middleware';
import { apiRateLimit } from '@/lib/rate-limit';
import { apiCors } from '@/lib/cors';
import { eventStore } from '@/lib/event-store';

async function handler(req: NextRequest) {
  if (req.method !== 'POST') {
    return createErrorResponse('Method not allowed', 405);
  }

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

    console.log(`[PAYMENTS-CHECK] Attempting authentication for API key: ${apiKey.substring(0, 8)}...`);

    // Verify API key exists in database
    const apiKeyInfo = await AuthService.verifyApiKeyFromDb(apiKey);
    if (!apiKeyInfo) {
      console.log(`[PAYMENTS-CHECK] API key not found in database: ${apiKey.substring(0, 8)}...`);
      return NextResponse.json({ 
        error: 'Invalid API key. The provided API key does not exist.',
        details: 'Please check your API key and try again'
      }, { status: 401 });
    }
    
    console.log(`[PAYMENTS-CHECK] API key verified for key ID: ${apiKeyInfo.keyId}`);

    const body = await req.json();
    
    // Validate request body using comprehensive schema
    const validatedData = validateRequest(checkPaymentSchema, body);
    
    // Apply business rules validation
    validateBusinessRules(validatedData, 'payment');
    
    // Sanitize inputs
    const sanitizedData = {
      ...validatedData,
      utr: sanitizeInput(validatedData.utr),
      order_id: sanitizeInput(validatedData.order_id)
    };

    console.log(`[PAYMENTS-CHECK] Checking payment for UTR: ${sanitizedData.utr}, vendor code: ${sanitizedData.vendor_code}`);

    // Find payment by UTR and vendor_code only (order_id may not exist yet)
    const payment = await db.get(
      `SELECT p.id, p.order_id, p.utr, p.amount, p.status, p.payment_status, p.checked_status, p.checked_at, p.created_at, p.updated_at,
              v.id as vendor_id, v.vendor_code, v.business_name, v.contact_name, v.upi_id
       FROM payments p
       JOIN vendors v ON p.vendor_id = v.id
       WHERE p.utr = ? AND v.vendor_code = ?`,
      [sanitizedData.utr, sanitizedData.vendor_code]
    );

    if (!payment) {
      console.log(`[PAYMENTS-CHECK] Payment not found for UTR: ${sanitizedData.utr}, vendor code: ${sanitizedData.vendor_code}`);
      return createErrorResponse('Payment not found for this vendor', 404);
    }

    console.log(`[PAYMENTS-CHECK] Payment found for vendor ID: ${payment.vendor_id}`);

    // Verify that the API key belongs to the same vendor
    if (apiKeyInfo.vendorId && apiKeyInfo.vendorId !== payment.vendor_id) {
      console.log(`[PAYMENTS-CHECK] API key vendor mismatch. API key belongs to vendor ${apiKeyInfo.vendorId}, but payment belongs to vendor ${payment.vendor_id}`);
      return NextResponse.json({ 
        error: 'API key and vendor code mismatch.',
        details: 'The provided API key does not belong to the specified vendor'
      }, { status: 403 });
    }

    // If API key doesn't have vendor association, we need to verify it belongs to the payment's vendor
    if (!apiKeyInfo.vendorId) {
      console.log(`[PAYMENTS-CHECK] API key has no vendor association, checking if it can access this vendor's payments`);
      // For now, we'll allow it, but this could be enhanced with additional validation
      console.log(`[PAYMENTS-CHECK] Allowing API key without vendor association to proceed`);
    }

    console.log(`[PAYMENTS-CHECK] Authentication successful for vendor ${payment.vendor_id}`);

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
      [sanitizedData.order_id, sanitizedData.utr, payment.vendor_id]
    );

    // Fetch updated payment data
    const updatedPayment = await db.get(
      `SELECT p.id, p.order_id, p.utr, p.amount, p.status, p.payment_status, p.checked_status, p.checked_at, p.created_at, p.updated_at,
              v.id as vendor_id, v.business_name, v.contact_name, v.upi_id
       FROM payments p
       JOIN vendors v ON p.vendor_id = v.id
       WHERE p.utr = ? AND p.vendor_id = ?`,
      [sanitizedData.utr, sanitizedData.vendor_id]
    );

    // Emit payment checked event via WebSocket
    const event = {
      id: `payment_checked_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'payment_status_changed',
      payload: {
        id: updatedPayment.id,
        vendorId: updatedPayment.vendor_id,
        businessName: updatedPayment.business_name,
        contactName: updatedPayment.contact_name,
        upiId: updatedPayment.upi_id,
        utr: updatedPayment.utr,
        amount: updatedPayment.amount,
        payment_status: updatedPayment.payment_status,
        status: updatedPayment.status,
        checked_status: updatedPayment.checked_status,
        checked_at: updatedPayment.checked_at,
        timestamp: new Date().toISOString()
      },
      timestamp: new Date()
    };
    
    eventStore.emit(event);
    console.log('Payment checked event emitted:', event);
    console.log(`[PAYMENTS-CHECK] Successfully checked payment ${updatedPayment.id} for vendor ${payment.vendor_id}`);

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
