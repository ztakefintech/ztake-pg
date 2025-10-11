import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database';
import { requirePermission, getVendorFilterForAdmin } from '@/lib/admin-middleware';

// Ensure this route is always dynamic since it reads cookies for admin auth
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const GET = requirePermission('view_payments')(async (request: NextRequest) => {
  try {
    // Get admin info from headers
    const adminData = request.headers.get('x-admin-id');
    const admin = adminData ? JSON.parse(adminData) : null;
    
    if (!admin) {
      return NextResponse.json({ error: 'Admin authentication required' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const status = searchParams.get('status');
    const vendorCode = searchParams.get('vendor_code');
    
    const offset = (page - 1) * limit;
    
    // Get vendor filter for this admin
    const vendorFilter = await getVendorFilterForAdmin(admin.id);
    
    let whereClause = '';
    const params: any[] = [...vendorFilter.params];
    let paramIndex = vendorFilter.params.length + 1;
    
    if (status) {
      whereClause += ` AND p.payment_status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }
    
    if (vendorCode) {
      whereClause += ` AND v.vendor_code = $${paramIndex}`;
      params.push(vendorCode);
      paramIndex++;
    }

    const baseWhere = vendorFilter.params.length > 0
      ? `WHERE p.vendor_id IN (${vendorFilter.params.map((_, i) => `$${i + 1}`).join(', ')})`
      : 'WHERE 1=1';

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
      ${baseWhere} ${whereClause}
      ORDER BY p.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `, [...params, limit, offset]);

    // Get total count for pagination
    const totalResult = await db.get(`
      SELECT COUNT(*) as total
      FROM payments p
      JOIN vendors v ON p.vendor_id = v.id
      ${baseWhere} ${whereClause}
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
