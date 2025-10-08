import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database';
import { requirePermission } from '@/lib/admin-middleware';

// Ensure dynamic rendering due to cookie-based admin auth
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const GET = requirePermission('view_overview')(async (request: NextRequest) => {
  try {

    // Get total users
    const totalUsers = await db.get('SELECT COUNT(*) as count FROM vendors');
    
    // Get total payments
    const totalPayments = await db.get('SELECT COUNT(*) as count FROM payments');
    
    // Get payment status breakdown
    const paymentStatusBreakdown = await db.all(`
      SELECT 
        payment_status,
        COUNT(*) as count,
        SUM(amount) as total_amount
      FROM payments 
      GROUP BY payment_status
    `);
    
    // Get total received from orders (Succeeded)
    const totalReceivedOrders = await db.get(`
      SELECT COALESCE(SUM(amount), 0) as total_amount
      FROM orders
      WHERE status = 'Succeeded'
    `);

    // Get recent payments (last 7 days)
    const recentPayments = await db.all(`
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
    
    // Get top vendors by payment count
    const topVendors = await db.all(`
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
    
    // Get daily payment trends (last 30 days)
    const dailyTrends = await db.all(`
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
