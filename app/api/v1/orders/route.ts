import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database';
import { AuthService } from '@/lib/auth';
import { withApiKeyAuth, type AuthenticatedRequest } from '@/lib/middleware';
import { createOrderSchema, validateRequest, validateBusinessRules, sanitizeInput, pkValidationSchema } from '@/lib/validation';
import { withRateLimit } from '@/lib/middleware';
import { orderCreationRateLimit } from '@/lib/rate-limit';
import { apiCors } from '@/lib/cors';

function generateztakeOrderId(): string {
  const randomPart = Math.random().toString(36).substring(2, 8).toUpperCase();
  const timePart = Date.now().toString().slice(-6);
  return `ZTK${timePart}${randomPart}`;
}

function isValidUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

async function createOrder(req: NextRequest) {
  try {
    const body = await req.json();
    
    // Validate request body using comprehensive schema
    const validatedData = validateRequest(createOrderSchema, body);
    
    // Apply business rules validation
    validateBusinessRules(validatedData, 'order');
    
    // Validate PK from authorization header
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Authorization header with Bearer token is required' }, { status: 401 });
    }
    
    const pk = authHeader.substring(7);
    try {
      validateRequest(pkValidationSchema, pk);
    } catch (error) {
      return NextResponse.json({ error: 'Invalid PK format in Authorization header' }, { status: 401 });
    }
    
    // Sanitize inputs
    const {
      merchantOrderId,
      amount,
      currency,
      customerName,
      returnUrl,
      callbackUrl,
      vendorCode: vendorCodeFromBody
    } = {
      ...validatedData,
      merchantOrderId: sanitizeInput(validatedData.merchantOrderId),
      customerName: sanitizeInput(validatedData.customerName),
      returnUrl: sanitizeInput(validatedData.returnUrl),
      callbackUrl: sanitizeInput(validatedData.callbackUrl)
    };

    const ztakeOrderId = generateztakeOrderId();
    const paymentUrl = `${process.env.NEXT_PUBLIC_BASE_URL || ''}/orders/${ztakeOrderId}`;

    // Vendor association: prefer PK (secret key), then API key, then JWT token, then vendor_code
    let vendorId: number | null = null;
    
    // First try to get vendor from PK (secret key) - already validated above
    const vendorByPk = await db.get(
      'SELECT id FROM vendors WHERE secret_key = ?',
      [pk]
    );
    if (vendorByPk) {
      vendorId = vendorByPk.id;
    } else {
      // Try API key authentication
      const apiKeyInfo = await AuthService.verifyApiKeyFromDb(pk);
      if (apiKeyInfo && apiKeyInfo.vendorId) {
        vendorId = apiKeyInfo.vendorId;
      } else {
        // Try JWT token authentication
        const payload = AuthService.verifyVendorToken(pk);
        if (payload && (payload as any).id) {
          vendorId = (payload as any).id;
        }
      }
    }
    
    // If no vendor from auth, try vendor_code from body
    if (!vendorId && vendorCodeFromBody && typeof vendorCodeFromBody === 'string') {
      const vendor = await db.get(
        'SELECT id FROM vendors WHERE vendor_code = ?',
        [vendorCodeFromBody]
      );
      if (vendor) {
        vendorId = vendor.id;
      }
    }
    
    // If still no vendor found, return error
    if (!vendorId) {
      return NextResponse.json({ error: 'Invalid PK or vendor not found' }, { status: 401 });
    }

    await db.run(
      `INSERT INTO orders (ztake_order_id, order_code, merchant_order_id, amount, currency, customer_name, return_url, callback_url, vendor_id, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'order_created')`,
      [ztakeOrderId, ztakeOrderId, merchantOrderId, amount, currency, customerName, returnUrl, callbackUrl, vendorId]
    );

    // Get vendor code for response
    let vendorCode: string | null = null;
    if (vendorId) {
      const vendor = await db.get('SELECT vendor_code FROM vendors WHERE id = ?', [vendorId]);
      vendorCode = vendor?.vendor_code || null;
    }

    return NextResponse.json({
      status: 'success',
      merchantOrderId:merchantOrderId,
      ztakeOrderId:ztakeOrderId,
      paymentUrl,
      vendorId: vendorId,
      vendorCode: vendorCode
    });
  } catch (error) {
    console.error('Create order error:', error);
    return NextResponse.json({ error: 'Failed to create order' }, { status: 500 });
  }
}

export const POST = apiCors(withRateLimit(orderCreationRateLimit)(createOrder));
export const OPTIONS = apiCors(async () => new NextResponse(null, { status: 200 }));

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 200);
    const offset = Math.max(parseInt(searchParams.get('offset') || '0', 10), 0);

    const orders = await db.all(
      `SELECT ztake_order_id, merchant_order_id, amount, currency, customer_name, status, utr, created_at
       FROM orders ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [limit, offset]
    );

    const countRow = await db.get(`SELECT COUNT(*) as count FROM orders`);

    return NextResponse.json({
      success: true,
      data: {
        orders,
        count: Number(countRow?.count || 0)
      }
    });
  } catch (error) {
    console.error('List orders error:', error);
    return NextResponse.json({ error: 'Failed to list orders' }, { status: 500 });
  }
}


