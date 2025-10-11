import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database';
import { requirePermission, getVendorFilterForAdmin } from '@/lib/admin-middleware';

// Ensure dynamic rendering due to cookie-based admin auth
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const GET = requirePermission('view_overview')(async (request: NextRequest) => {
  try {
    // Get admin info from headers
    const adminData = request.headers.get('x-admin-id');
    const admin = adminData ? JSON.parse(adminData) : null;
    
    if (!admin) {
      return NextResponse.json({ error: 'Admin authentication required' }, { status: 401 });
    }

    // Get vendor filter for this admin
    const vendorFilter = await getVendorFilterForAdmin(admin.id);

    // Handle case when admin has no assigned vendors (non-superuser)
    if (admin.role !== 'superuser' && vendorFilter.params.length === 0) {
      return NextResponse.json({
        totalUsers: 0,
        totalPayments: 0,
        totalReceivedOrdersAmount: 0,
        paymentStatusBreakdown: [],
        recentPayments: [],
        topVendors: [],
        dailyTrends: []
      });
    }

    // Get total users (filtered by assigned vendors)
    const totalUsers = vendorFilter.params.length > 0 
      ? await db.get(`SELECT COUNT(*) as count FROM vendors WHERE id IN (${vendorFilter.params.map((_, i) => `$${i + 1}`).join(', ')})`, vendorFilter.params)
      : await db.get('SELECT COUNT(*) as count FROM vendors');
    
    // Get total payments (filtered by assigned vendors)
    const totalPayments = vendorFilter.params.length > 0
      ? await db.get(`
          SELECT COUNT(*) as count 
          FROM payments p
          JOIN vendors v ON p.vendor_id = v.id
          WHERE p.vendor_id IN (${vendorFilter.params.map((_, i) => `$${i + 1}`).join(', ')})
        `, vendorFilter.params)
      : await db.get('SELECT COUNT(*) as count FROM payments');
    
    // Get payment status breakdown (filtered by assigned vendors)
    const paymentStatusBreakdown = vendorFilter.params.length > 0
      ? await db.all(`
          SELECT 
            p.payment_status,
            COUNT(*) as count,
            SUM(p.amount) as total_amount
          FROM payments p
          JOIN vendors v ON p.vendor_id = v.id
          WHERE p.vendor_id IN (${vendorFilter.params.map((_, i) => `$${i + 1}`).join(', ')})
          GROUP BY p.payment_status
        `, vendorFilter.params)
      : await db.all(`
          SELECT 
            payment_status,
            COUNT(*) as count,
            SUM(amount) as total_amount
          FROM payments 
          GROUP BY payment_status
        `);
    
    // Get total received from orders (Succeeded) - filtered by assigned vendors
    const totalReceivedOrders = vendorFilter.params.length > 0
      ? await db.get(`
          SELECT COALESCE(SUM(o.amount), 0) as total_amount
          FROM orders o
          JOIN vendors v ON o.vendor_id = v.id
          WHERE o.status = 'Succeeded' AND o.vendor_id IN (${vendorFilter.params.map((_, i) => `$${i + 1}`).join(', ')})
        `, vendorFilter.params)
      : await db.get(`
          SELECT COALESCE(SUM(amount), 0) as total_amount
          FROM orders
          WHERE status = 'Succeeded'
        `);

    // Get recent payments (last 7 days) - filtered by assigned vendors
    const recentPayments = vendorFilter.params.length > 0
      ? await db.all(`
          SELECT 
            p.utr,
            p.amount,
            p.payment_status,
            p.created_at,
            v.business_name
          FROM payments p
          JOIN vendors v ON p.vendor_id = v.id
          WHERE p.created_at >= NOW() - INTERVAL '7 days' AND p.vendor_id IN (${vendorFilter.params.map((_, i) => `$${i + 1}`).join(', ')})
          ORDER BY p.created_at DESC
          LIMIT 10
        `, vendorFilter.params)
      : await db.all(`
          SELECT 
            p.utr,
            p.amount,
            p.payment_status,
            p.created_at,
            v.business_name
          FROM payments p
          JOIN vendors v ON p.vendor_id = v.id
          WHERE p.created_at >= NOW() - INTERVAL '7 days'
          ORDER BY p.created_at DESC
          LIMIT 10
        `);
    
    // Get top vendors by payment count - filtered by assigned vendors
    const topVendors = vendorFilter.params.length > 0
      ? await db.all(`
          SELECT 
            v.business_name,
            v.contact_name,
            v.email,
            COUNT(p.id) as payment_count,
            SUM(p.amount) as total_amount
          FROM vendors v
          LEFT JOIN payments p ON v.id = p.vendor_id
          WHERE v.id IN (${vendorFilter.params.map((_, i) => `$${i + 1}`).join(', ')})
          GROUP BY v.id, v.business_name, v.contact_name, v.email
          ORDER BY payment_count DESC
          LIMIT 10
        `, vendorFilter.params)
      : await db.all(`
          SELECT 
            v.business_name,
            v.contact_name,
            v.email,
            COUNT(p.id) as payment_count,
            SUM(p.amount) as total_amount
          FROM vendors v
          LEFT JOIN payments p ON v.id = p.vendor_id
          GROUP BY v.id, v.business_name, v.contact_name, v.email
          ORDER BY payment_count DESC
          LIMIT 10
        `);
    
    // Get daily payment trends (last 30 days) - filtered by assigned vendors
    const dailyTrends = vendorFilter.params.length > 0
      ? await db.all(`
          SELECT 
            DATE(p.created_at) as date,
            COUNT(*) as payment_count,
            SUM(p.amount) as total_amount
          FROM payments p
          JOIN vendors v ON p.vendor_id = v.id
          WHERE p.created_at >= NOW() - INTERVAL '30 days' AND p.vendor_id IN (${vendorFilter.params.map((_, i) => `$${i + 1}`).join(', ')})
          GROUP BY DATE(p.created_at)
          ORDER BY date DESC
        `, vendorFilter.params)
      : await db.all(`
          SELECT 
            DATE(created_at) as date,
            COUNT(*) as payment_count,
            SUM(amount) as total_amount
          FROM payments
          WHERE created_at >= NOW() - INTERVAL '30 days'
          GROUP BY DATE(created_at)
          ORDER BY date DESC
        `);

    return NextResponse.json({
      totalUsers: totalUsers?.count || 0,
      totalPayments: totalPayments?.count || 0,
      totalReceivedOrdersAmount: Number(totalReceivedOrders?.total_amount || 0),
      paymentStatusBreakdown,
      recentPayments,
      topVendors,
      dailyTrends
    });
  } catch (error) {
    console.error('Get admin stats error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch statistics' },
      { status: error instanceof Error && error.message.includes('Admin authentication') ? 401 : 500 }
    );
  }
});
