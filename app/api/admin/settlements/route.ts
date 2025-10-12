import { NextRequest, NextResponse } from 'next/server';
import { requirePermission, getVendorFilterForAdmin } from '@/lib/admin-middleware';
import { db } from '@/lib/database';
import { eventStore } from '@/lib/event-store';

export const GET = requirePermission('view_settlements')(async (req: NextRequest) => {
  try {
    // Get admin info from headers
    const adminData = req.headers.get('x-admin-id');
    const admin = adminData ? JSON.parse(adminData) : null;
    
    if (!admin) {
      return NextResponse.json({ error: 'Admin authentication required' }, { status: 401 });
    }

    // Get vendor filter for this admin
    const vendorFilter = await getVendorFilterForAdmin(admin.id);

    const result = vendorFilter.params.length > 0
      ? await db.all(`
          SELECT s.*, v.business_name, v.email
          FROM settlements s
          JOIN vendors v ON s.vendor_id = v.id
          WHERE s.vendor_id IN (${vendorFilter.params.map((_, i) => `$${i + 1}`).join(', ')})
          ORDER BY s.created_at DESC
        `, vendorFilter.params)
      : await db.all(`
          SELECT s.*, v.business_name, v.email
          FROM settlements s
          JOIN vendors v ON s.vendor_id = v.id
          ORDER BY s.created_at DESC
        `);

    return NextResponse.json({
      settlements: result
    });

  } catch (error) {
    console.error('Settlements fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch settlements' }, { status: 500 });
  }
});

export const PATCH = requirePermission('manage_settlements')(async (req: NextRequest) => {
  try {
    const { id, status, admin_notes } = await req.json();

    if (!id || !status) {
      return NextResponse.json({ error: 'Settlement ID and status are required' }, { status: 400 });
    }

    if (!['approved', 'rejected'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status. Must be approved or rejected' }, { status: 400 });
    }

    // Get current settlement details
    const settlementResult = await db.all(
      'SELECT * FROM settlements WHERE id = ?',
      [id]
    );

    if (settlementResult.length === 0) {
      return NextResponse.json({ error: 'Settlement not found' }, { status: 404 });
    }

    const settlement = settlementResult[0];

    // Only allow status change if currently pending
    if (settlement.status !== 'pending') {
      return NextResponse.json({ error: 'Settlement is not in pending status' }, { status: 400 });
    }

    // Update settlement status
    await db.run(
      'UPDATE settlements SET status = ?, admin_notes = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [status, admin_notes || null, id]
    );

    if (status === 'approved') {
      // If approved, add the amount to vendor's payout balance
      await db.run(
        'UPDATE vendors SET payout_balance = payout_balance + ? WHERE id = ?',
        [settlement.amount, settlement.vendor_id]
      );
    }
    // If rejected, no change to payout balance (settlement is cancelled)

    // Get vendor information for the event
    const vendor = await db.get(
      `SELECT business_name, contact_name, email FROM vendors WHERE id = ?`,
      [settlement.vendor_id]
    );

    // Emit settlement status changed event via WebSocket
    const event = {
      id: `settlement_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'settlement_status_changed',
      payload: {
        id: Number(id),
        vendorId: settlement.vendor_id,
        businessName: vendor?.business_name || `Vendor #${settlement.vendor_id}`,
        contactName: vendor?.contact_name,
        email: vendor?.email,
        amount: settlement.amount,
        status,
        adminNotes: admin_notes,
        previousStatus: settlement.status,
        timestamp: new Date().toISOString()
      },
      timestamp: new Date()
    };
    
    eventStore.emit(event);
    console.log('Settlement event emitted:', event);

    return NextResponse.json({
      success: true,
      message: `Settlement ${status} successfully`
    });

  } catch (error) {
    console.error('Settlement update error:', error);
    return NextResponse.json({ error: 'Failed to update settlement' }, { status: 500 });
  }
});
