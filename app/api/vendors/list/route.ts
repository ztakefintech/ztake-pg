import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Get all vendors
    const vendors = await db.all('SELECT id, business_name, upi_id, email, created_at FROM vendors ORDER BY id');
    
    return NextResponse.json({
      success: true,
      data: {
        vendors: vendors,
        count: vendors.length
      }
    });

  } catch (error) {
    console.error('Vendors list API error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch vendors',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
