import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database';
import { requirePermission, getVendorFilterForAdmin } from '@/lib/admin-middleware';

export const dynamic = 'force-dynamic';

export const GET = requirePermission('view_payments')(async (req: NextRequest) => {
  try {
    // Get admin info from headers
    const adminData = req.headers.get('x-admin-id');
    const admin = adminData ? JSON.parse(adminData) : null;
    
    if (!admin) {
      return NextResponse.json({ error: 'Admin authentication required' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const vendorId = searchParams.get('vendor_id');
    const withUtr = searchParams.get('with_utr');
    const limit = Math.min(parseInt(searchParams.get('limit') || '200', 10), 500);
    const offset = Math.max(parseInt(searchParams.get('offset') || '0', 10), 0);

    // Get vendor filter for this admin
    const vendorFilter = await getVendorFilterForAdmin(admin.id);

    const params: any[] = [...vendorFilter.params];
    let paramIndex = vendorFilter.params.length + 1;
    let where = vendorFilter.params.length > 0 
      ? `WHERE vendor_id IN (${vendorFilter.params.map((_, i) => `$${i + 1}`).join(', ')})`
      : 'WHERE 1=1';
    if (status) { where += ` AND status = $${paramIndex}`; params.push(status); paramIndex++; }
    if (vendorId) { where += ` AND vendor_id = $${paramIndex}`; params.push(Number(vendorId)); paramIndex++; }
    if (withUtr === '1' || withUtr === 'true') { where += ' AND utr IS NOT NULL AND LENGTH(utr) > 0'; }

    const orders = await db.all(
      `SELECT o.ztake_order_id, o.merchant_order_id, o.amount, o.original_amount, o.currency, o.customer_name, o.status, o.utr, o.vendor_id, v.vendor_code, o.created_at, o.verification_source
       FROM orders o
       LEFT JOIN vendors v ON o.vendor_id = v.id
       ${where} ORDER BY o.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, limit, offset]
    );
    return NextResponse.json({ success: true, data: { orders } });
  } catch (error) {
    console.error('Admin orders list error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch orders' }, { status: 500 });
  }
});


