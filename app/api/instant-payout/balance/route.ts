import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database';

export async function GET(req: NextRequest) {
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

    console.log(`[INSTANT-BALANCE] Attempting authentication for secret key: ${secretKey.substring(0, 8)}...`);

    // Verify secret key exists in database and get vendor info
    const vendor = await db.get(
      'SELECT id, vendor_code, business_name, payout_balance FROM vendors WHERE secret_key = ?',
      [secretKey]
    );

    // Debug: Also fetch the same vendor by ID to compare
    if (vendor) {
      const vendorById = await db.get(
        'SELECT id, vendor_code, business_name, payout_balance FROM vendors WHERE id = ?',
        [vendor.id]
      );
      console.log(`[INSTANT-BALANCE] Vendor by secret key - ID: ${vendor.id}, Balance: ${vendor.payout_balance}`);
      console.log(`[INSTANT-BALANCE] Vendor by ID - ID: ${vendorById?.id}, Balance: ${vendorById?.payout_balance}`);
    }

    if (!vendor) {
      console.log(`[INSTANT-BALANCE] Secret key not found in database: ${secretKey.substring(0, 8)}...`);
      return NextResponse.json({ 
        error: 'Invalid secret key. The provided secret key does not exist.',
        details: 'Please check your secret key and try again'
      }, { status: 401 });
    }
    
    console.log(`[INSTANT-BALANCE] Secret key verified for vendor ID: ${vendor.id} (${vendor.vendor_code})`);
    console.log(`[INSTANT-BALANCE] Raw payout_balance from DB: ${vendor.payout_balance}`);

    const balance = Number(vendor.payout_balance || 0);
    console.log(`[INSTANT-BALANCE] Processed balance: ${balance}`);

    return NextResponse.json({
      success: true,
      balance: balance,
      vendor: {
        id: vendor.id,
        vendor_code: vendor.vendor_code,
        business_name: vendor.business_name
      }
    });

  } catch (error) {
    console.error('Instant balance fetch error:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch balance',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
