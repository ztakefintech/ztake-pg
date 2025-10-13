import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(req: NextRequest) {
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

    console.log(`[TEST-PAYMENT] Attempting authentication for secret key: ${secretKey.substring(0, 8)}...`);

    // Verify secret key exists in database and get vendor info
    const vendor = await db.get(
      'SELECT id, vendor_code, business_name FROM vendors WHERE secret_key = ?',
      [secretKey]
    );

    if (!vendor) {
      console.log(`[TEST-PAYMENT] Secret key not found in database: ${secretKey.substring(0, 8)}...`);
      return NextResponse.json({ 
        error: 'Invalid secret key. The provided secret key does not exist.',
        details: 'Please check your secret key and try again'
      }, { status: 401 });
    }
    
    console.log(`[TEST-PAYMENT] Secret key verified for vendor ID: ${vendor.id} (${vendor.vendor_code})`);

    const body = await req.json();
    const { utr, amount = 1000, order_id = null } = body || {};

    if (!utr || typeof utr !== 'string') {
      return NextResponse.json({ error: 'utr is required' }, { status: 400 });
    }

    console.log(`[TEST-PAYMENT] Creating test payment for UTR: ${utr}`);

    // Insert test payment into database
    const result = await db.run(
      `INSERT INTO payments (
        utr, amount, currency, vendor_id, payment_status, checked_status, 
        order_id, created_at, updated_at
      ) VALUES (?, ?, 'INR', ?, 'Succeeded', FALSE, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      [utr, amount, vendor.id, order_id]
    );

    const paymentId = result.lastID;

    console.log(`[TEST-PAYMENT] Test payment created with ID: ${paymentId}`);

    return NextResponse.json({
      success: true,
      message: 'Test payment created successfully',
      payment: {
        id: paymentId,
        utr: utr,
        amount: amount,
        currency: 'INR',
        vendor_id: vendor.id,
        vendor_code: vendor.vendor_code,
        payment_status: 'Succeeded',
        checked_status: false,
        order_id: order_id,
        created_at: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Test payment creation error:', error);
    return NextResponse.json({ 
      error: 'Failed to create test payment',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
