import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database';
import { AuthService } from '@/lib/auth';
import { validateRequest, apiKeyValidationSchema } from '@/lib/validation';

export async function GET(
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

    console.log(`[GET-ORDER] Attempting authentication for API key: ${apiKey.substring(0, 8)}... for order: ${params.qpayOrderId}`);

    // Verify API key exists in database
    const apiKeyInfo = await AuthService.verifyApiKeyFromDb(apiKey);
    if (!apiKeyInfo) {
      console.log(`[GET-ORDER] API key not found in database: ${apiKey.substring(0, 8)}...`);
      return NextResponse.json({ 
        error: 'Invalid API key. The provided API key does not exist.',
        details: 'Please check your API key and try again'
      }, { status: 401 });
    }
    
    console.log(`[GET-ORDER] API key verified for key ID: ${apiKeyInfo.keyId}`);

    const order = await db.get(
      `SELECT ztake_order_id, merchant_order_id, amount, currency, customer_name, return_url, callback_url, status, utr, payment_time, created_at
       FROM orders WHERE ztake_order_id = ?`,
      [params.qpayOrderId]
    );

    if (!order) {
      console.log(`[GET-ORDER] Order not found: ${params.qpayOrderId}`);
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Get vendor_id separately for verification
    const orderWithVendor = await db.get(
      `SELECT vendor_id FROM orders WHERE ztake_order_id = ?`,
      [params.qpayOrderId]
    );

    if (!orderWithVendor) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    console.log(`[GET-ORDER] Order found for vendor ID: ${orderWithVendor.vendor_id}`);

    // Verify that the API key belongs to the same vendor as the order
    if (apiKeyInfo.vendorId && apiKeyInfo.vendorId !== orderWithVendor.vendor_id) {
      console.log(`[GET-ORDER] API key vendor mismatch. API key belongs to vendor ${apiKeyInfo.vendorId}, but order belongs to vendor ${orderWithVendor.vendor_id}`);
      return NextResponse.json({ 
        error: 'Access denied. You can only view orders belonging to your vendor account.',
        details: 'The provided API key does not belong to the vendor who created this order'
      }, { status: 403 });
    }

    // If API key doesn't have vendor association, we need to verify it belongs to the order's vendor
    if (!apiKeyInfo.vendorId) {
      console.log(`[GET-ORDER] API key has no vendor association, checking if it can access this vendor's orders`);
      // For now, we'll allow it, but this could be enhanced with additional validation
      console.log(`[GET-ORDER] Allowing API key without vendor association to proceed`);
    }

    console.log(`[GET-ORDER] Authentication successful for order ${params.qpayOrderId}`);

    return NextResponse.json({
      success: true,
      data: order
    });
  } catch (error) {
    console.error('Get order error:', error);
    return NextResponse.json({ error: 'Failed to fetch order' }, { status: 500 });
  }
}


