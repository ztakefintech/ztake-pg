import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database';
import { requireAdmin } from '@/lib/admin-middleware';

// Ensure this route is always dynamic since it reads cookies for admin auth
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const GET = requireAdmin(async (request: NextRequest) => {
  try {

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const status = searchParams.get('status');
    const vendorId = searchParams.get('vendor_id');
    
    const offset = (page - 1) * limit;
    
    let whereClause = '';
    const params: any[] = [];
    
    if (status) {
      whereClause += ' AND p.payment_status = ?';
      params.push(status);
    }
    
    if (vendorId) {
      whereClause += ' AND p.vendor_id = ?';
      params.push(vendorId);
    }

    const payments = await db.all(`
      SELECT 
        p.id,
        p.order_id,
        p.utr,
        p.amount,
        p.payment_status,
        p.checked_status,
        p.checked_at,
        p.created_at,
        p.updated_at,
        v.business_name,
        v.contact_name,
        v.email,
        v.upi_id
      FROM payments p
      JOIN vendors v ON p.vendor_id = v.id
      WHERE 1=1 ${whereClause}
      ORDER BY p.created_at DESC
      LIMIT ? OFFSET ?
    `, [...params, limit, offset]);

    // Get total count for pagination
    const totalResult = await db.get(`
      SELECT COUNT(*) as total
      FROM payments p
      WHERE 1=1 ${whereClause}
    `, params);

    const total = totalResult?.total || 0;
    const totalPages = Math.ceil(total / limit);

    return NextResponse.json({
      payments,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    });
  } catch (error) {
    console.error('Get payments error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch payments' },
      { status: error instanceof Error && error.message.includes('Admin authentication') ? 401 : 500 }
    );
  }
});
