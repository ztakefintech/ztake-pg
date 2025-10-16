import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database';
import { AuthService } from '@/lib/auth';
import { withApiKeyAuth, type AuthenticatedRequest } from '@/lib/middleware';
import { createOrderSchema, validateRequest, validateBusinessRules, sanitizeInput, apiKeyValidationSchema } from '@/lib/validation';
import { withRateLimit } from '@/lib/middleware';
import { orderCreationRateLimit } from '@/lib/rate-limit';
import { apiCors } from '@/lib/cors';
import { sendTelegramAdminAlert } from '@/lib/telegram';

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

    // Vendor association: API key + vendor code authentication
    let vendorId: number | null = null;
    
    console.log(`[AUTH] Attempting authentication for API key: ${apiKey.substring(0, 8)}... and vendor code: ${vendorCodeFromBody}`);
    
    // Verify API key exists in database
    const apiKeyInfo = await AuthService.verifyApiKeyFromDb(apiKey);
    if (!apiKeyInfo) {
      console.log(`[AUTH] API key not found in database: ${apiKey.substring(0, 8)}...`);
      return NextResponse.json({ 
        error: 'Invalid API key. The provided API key does not exist.',
        details: 'Please check your API key and try again'
      }, { status: 401 });
    }
    
    console.log(`[AUTH] API key verified for key ID: ${apiKeyInfo.keyId}`);
    
    // Get vendor by vendor code
    const vendor = await db.get(
      'SELECT id FROM vendors WHERE vendor_code = ?',
      [vendorCodeFromBody]
    );
    
    if (!vendor) {
      console.log(`[AUTH] Vendor code not found: ${vendorCodeFromBody}`);
      return NextResponse.json({ 
        error: 'Invalid vendor code. The provided vendor code does not exist.',
        details: 'Please check your vendor code and try again'
      }, { status: 401 });
    }
    
    vendorId = vendor.id;
    console.log(`[AUTH] Vendor code verified for vendor ID: ${vendorId}`);
    
    // Verify that the API key belongs to the vendor (if API key has vendor association)
    if (apiKeyInfo.vendorId && apiKeyInfo.vendorId !== vendorId) {
      console.log(`[AUTH] API key vendor mismatch. API key belongs to vendor ${apiKeyInfo.vendorId}, but vendor code belongs to vendor ${vendorId}`);
      return NextResponse.json({ 
        error: 'API key and vendor code mismatch.',
        details: 'The provided API key does not belong to the specified vendor'
      }, { status: 401 });
    }
    
    console.log(`[AUTH] Successfully authenticated with API key and vendor code for vendor ID: ${vendorId}`);

    await db.run(
      `INSERT INTO orders (ztake_order_id, order_code, merchant_order_id, amount, currency, customer_name, return_url, callback_url, vendor_id, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'order_created')`,
      [ztakeOrderId, ztakeOrderId, merchantOrderId, amount, currency, customerName, returnUrl, callbackUrl, vendorId]
    );

    console.log(`[ORDER] Successfully created order ${ztakeOrderId} for vendor ${vendorId} using API key + vendor code authentication`);

    // Telegram alert for admin (HTML)
    const alert = [
      '<b>🔔 New Pay-in Order Created</b>',
      `• Vendor ID: ${vendorId}`,
      `• Amount: ₹${amount} ${currency}`,
      `• Customer: ${customerName}`,
      `• Merchant Order ID: ${merchantOrderId}`,
      `• Ztake Order ID: ${ztakeOrderId}`,
      `• Action: Awaiting payment`
    ].join('\n');
    sendTelegramAdminAlert(alert, vendorId || undefined).catch(() => {});

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
      vendorCode: vendorCode,
      authMethod: 'api_key_vendor_code'
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

    console.log(`[GET-ORDERS] Attempting authentication for API key: ${apiKey.substring(0, 8)}...`);

    // Verify API key exists in database
    const apiKeyInfo = await AuthService.verifyApiKeyFromDb(apiKey);
    if (!apiKeyInfo) {
      console.log(`[GET-ORDERS] API key not found in database: ${apiKey.substring(0, 8)}...`);
      return NextResponse.json({ 
        error: 'Invalid API key. The provided API key does not exist.',
        details: 'Please check your API key and try again'
      }, { status: 401 });
    }
    
    console.log(`[GET-ORDERS] API key verified for key ID: ${apiKeyInfo.keyId}`);

    // Get vendor code from query parameters
    const { searchParams } = new URL(req.url);
    const vendorCode = searchParams.get('vendorCode');
    
    if (!vendorCode) {
      return NextResponse.json({ 
        error: 'Vendor code is required',
        details: 'Please provide vendorCode in query parameters'
      }, { status: 400 });
    }

    // Get vendor by vendor code
    const vendor = await db.get(
      'SELECT id FROM vendors WHERE vendor_code = ?',
      [vendorCode]
    );
    
    if (!vendor) {
      console.log(`[GET-ORDERS] Vendor code not found: ${vendorCode}`);
      return NextResponse.json({ 
        error: 'Invalid vendor code. The provided vendor code does not exist.',
        details: 'Please check your vendor code and try again'
      }, { status: 401 });
    }
    
    console.log(`[GET-ORDERS] Vendor code verified for vendor ID: ${vendor.id}`);
    
    // Verify that the API key belongs to the vendor (if API key has vendor association)
    if (apiKeyInfo.vendorId && apiKeyInfo.vendorId !== vendor.id) {
      console.log(`[GET-ORDERS] API key vendor mismatch. API key belongs to vendor ${apiKeyInfo.vendorId}, but vendor code belongs to vendor ${vendor.id}`);
      return NextResponse.json({ 
        error: 'API key and vendor code mismatch.',
        details: 'The provided API key does not belong to the specified vendor'
      }, { status: 403 });
    }
    
    console.log(`[GET-ORDERS] Successfully authenticated with API key and vendor code for vendor ID: ${vendor.id}`);

    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 200);
    const offset = Math.max(parseInt(searchParams.get('offset') || '0', 10), 0);

    // Fetch orders only for the authenticated vendor
    const orders = await db.all(
      `SELECT ztake_order_id, merchant_order_id, amount, currency, customer_name, status, utr, created_at
       FROM orders WHERE vendor_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [vendor.id, limit, offset]
    );

    const countRow = await db.get(`SELECT COUNT(*) as count FROM orders WHERE vendor_id = ?`, [vendor.id]);

    return NextResponse.json({
      success: true,
      data: {
        orders,
        count: Number(countRow?.count || 0),
        vendorCode: vendorCode
      }
    });
  } catch (error) {
    console.error('List orders error:', error);
    return NextResponse.json({ error: 'Failed to list orders' }, { status: 500 });
  }
}


