import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database';
import { validateRequest, validateBusinessRules, sanitizeInput } from '@/lib/validation';
import { withRateLimit } from '@/lib/middleware';
import { orderCreationRateLimit } from '@/lib/rate-limit';
import { apiCors } from '@/lib/cors';
import Joi from 'joi';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Generate Ztake order ID
function generateOrderId(): string {
  const randomPart = Math.random().toString(36).substring(2, 8).toUpperCase();
  const timePart = Date.now().toString().slice(-6);
  return `ZTK${timePart}${randomPart}`;
}

// Custom schema for instant orders (without vendorCode requirement)
const instantOrderSchema = Joi.object({
  merchantOrderId: Joi.string().pattern(/^[a-zA-Z0-9_-]{3,255}$/).required()
    .messages({
      'string.pattern.base': 'Merchant order ID must be 3-255 characters and contain only letters, numbers, underscores, and hyphens'
    }),
  amount: Joi.number().positive().precision(2).min(5).max(100000).required()
    .messages({
      'number.min': 'Amount must be at least ₹5',
      'number.max': 'Amount cannot exceed ₹1,00,000'
    }),
  currency: Joi.string().valid('INR', 'USD', 'EUR').default('INR'),
  customerName: Joi.string().min(2).max(100).pattern(/^[a-zA-Z\s.]+$/).required(),
  returnUrl: Joi.string().uri({ scheme: ['http', 'https'] }).max(2048).required(),
  callbackUrl: Joi.string().uri({ scheme: ['http', 'https'] }).max(2048).required()
});

async function createInstantOrder(req: NextRequest) {
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

    console.log(`[INSTANT-PAYIN] Attempting authentication for secret key: ${secretKey.substring(0, 8)}...`);

    // Verify secret key exists in database and get vendor info
    const vendor = await db.get(
      'SELECT id, vendor_code, business_name FROM vendors WHERE secret_key = ?',
      [secretKey]
    );

    if (!vendor) {
      console.log(`[INSTANT-PAYIN] Secret key not found in database: ${secretKey.substring(0, 8)}...`);
      return NextResponse.json({ 
        error: 'Invalid secret key. The provided secret key does not exist.',
        details: 'Please check your secret key and try again'
      }, { status: 401 });
    }
    
    console.log(`[INSTANT-PAYIN] Secret key verified for vendor ID: ${vendor.id} (${vendor.vendor_code})`);

    const body = await req.json();
    
    // Validate request body using instant order schema
    const validatedData = validateRequest(instantOrderSchema, body);
    
    // Apply business rules validation
    validateBusinessRules(validatedData, 'order');
    
    // Sanitize inputs
    const {
      merchantOrderId,
      amount,
      currency,
      customerName,
      returnUrl,
      callbackUrl
    } = {
      ...validatedData,
      customerName: sanitizeInput(validatedData.customerName)
    };

    console.log(`[INSTANT-PAYIN] Creating order for vendor ${vendor.id} (${vendor.vendor_code})`);

    // Generate Ztake order ID
    const ztakeOrderId = generateOrderId();

    // Insert order into database (matching main API structure)
    const result = await db.run(
      `INSERT INTO orders (
        ztake_order_id, order_code, merchant_order_id, amount, currency, customer_name, 
        return_url, callback_url, status, vendor_id, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'order_created', ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      [
        ztakeOrderId,
        ztakeOrderId, // order_code same as ztake_order_id
        merchantOrderId,
        amount,
        currency,
        customerName,
        returnUrl,
        callbackUrl,
        vendor.id
      ]
    );

    const orderId = result.lastID;

    console.log(`[INSTANT-PAYIN] Order created with ID: ${orderId}`);

    // Generate payment URL
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const paymentUrl = `${baseUrl}/orders/${ztakeOrderId}`;

    console.log(`[INSTANT-PAYIN] Successfully created order ${orderId} for vendor ${vendor.id}`);

    return NextResponse.json({
      status: 'success',
      merchantOrderId: merchantOrderId,
      ztakeOrderId: ztakeOrderId,
      paymentUrl: paymentUrl,
      vendorCode: vendor.vendor_code,
      authMethod: 'secret_key'
    });

  } catch (error) {
    console.error('Instant payin creation error:', error);
    return NextResponse.json({ 
      error: 'Failed to create instant order',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

async function handler(req: NextRequest) {
  if (req.method === 'POST') {
    return createInstantOrder(req);
  }
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
}

export const POST = apiCors(withRateLimit(orderCreationRateLimit)(handler));
export const OPTIONS = apiCors(async () => new NextResponse(null, { status: 200 }));
