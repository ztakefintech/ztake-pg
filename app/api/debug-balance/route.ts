import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const secretKey = searchParams.get('secretKey');
    
    if (!secretKey) {
      return NextResponse.json({ error: 'secretKey parameter required' }, { status: 400 });
    }

    console.log(`[DEBUG-BALANCE] Testing with secret key: ${secretKey.substring(0, 8)}...`);

    // Method 1: Get vendor by secret key
    const vendorBySecretKey = await db.get(
      'SELECT id, vendor_code, business_name, payout_balance FROM vendors WHERE secret_key = ?',
      [secretKey]
    );

    console.log(`[DEBUG-BALANCE] Vendor by secret key:`, vendorBySecretKey);

    if (!vendorBySecretKey) {
      return NextResponse.json({ error: 'Vendor not found with this secret key' }, { status: 404 });
    }

    // Method 2: Get vendor by ID (same as dashboard would do)
    const vendorById = await db.get(
      'SELECT id, vendor_code, business_name, payout_balance FROM vendors WHERE id = ?',
      [vendorBySecretKey.id]
    );

    console.log(`[DEBUG-BALANCE] Vendor by ID:`, vendorById);

    // Method 3: Get all vendors to see if there are multiple with same ID
    const allVendors = await db.all(
      'SELECT id, vendor_code, business_name, payout_balance, secret_key FROM vendors WHERE id = ?',
      [vendorBySecretKey.id]
    );

    console.log(`[DEBUG-BALANCE] All vendors with same ID:`, allVendors);

    return NextResponse.json({
      success: true,
      secretKey: secretKey.substring(0, 8) + '...',
      vendorBySecretKey,
      vendorById,
      allVendors,
      comparison: {
        sameId: vendorBySecretKey.id === vendorById?.id,
        sameBalance: vendorBySecretKey.payout_balance === vendorById?.payout_balance,
        balanceBySecretKey: Number(vendorBySecretKey.payout_balance || 0),
        balanceById: Number(vendorById?.payout_balance || 0)
      }
    });

  } catch (error) {
    console.error('Debug balance error:', error);
    return NextResponse.json({ 
      error: 'Failed to debug balance',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
