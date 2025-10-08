import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/admin-middleware';
import { db } from '@/lib/database';

export const GET = requirePermission('view_settlements')(async (req: NextRequest) => {
  try {
    const result = await db.all(`
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

    return NextResponse.json({
      success: true,
      message: `Settlement ${status} successfully`
    });

  } catch (error) {
    console.error('Settlement update error:', error);
    return NextResponse.json({ error: 'Failed to update settlement' }, { status: 500 });
  }
});
