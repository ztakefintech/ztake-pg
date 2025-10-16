import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/database'
import { requireAdmin } from '@/lib/admin-middleware'
import { eventStore } from '@/lib/event-store'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export const GET = requireAdmin(async (req: NextRequest) => {
  try {
    const rows = await db.all(`
      SELECT r.id, r.vendor_id, v.business_name, r.amount, r.utr, r.status, r.admin_notes, r.created_at
      FROM payout_recharges r
      JOIN vendors v ON v.id = r.vendor_id
      ORDER BY r.created_at DESC
      LIMIT 200
    `)
    return NextResponse.json({ success: true, data: { recharges: rows } })
  } catch (e) {
    return NextResponse.json({ success: false, error: 'Failed to fetch' }, { status: 500 })
  }
});

export const PATCH = requireAdmin(async (req: NextRequest) => {
  try {
    const body = await req.json().catch(() => ({}))
    const { id, status, admin_notes, amount, utr } = body || {}
    if (!id || !status) {
      return NextResponse.json({ success: false, error: 'id and status required' }, { status: 400 })
    }

    // Get current recharge data before updating
    const currentRecharge = await db.get(`
      SELECT r.*, v.business_name, v.contact_name, v.email 
      FROM payout_recharges r 
      JOIN vendors v ON v.id = r.vendor_id 
      WHERE r.id = ?
    `, [Number(id)]);

    if (!currentRecharge) {
      return NextResponse.json({ success: false, error: 'Recharge request not found' }, { status: 404 })
    }

    // allow editing amount and utr
    await db.run(`UPDATE payout_recharges SET status = ?, admin_notes = ?, amount = COALESCE(?, amount), utr = COALESCE(?, utr), updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [status, admin_notes || null, amount ?? null, utr ?? null, Number(id)])

    // If approved/paid, credit vendor balance with net amount (after fee)
    if (status === 'approved' || status === 'paid') {
      const r = await db.get(`SELECT vendor_id, net_amount, amount FROM payout_recharges WHERE id = ?`, [Number(id)])
      if (r?.vendor_id) {
        const creditAmount = r?.net_amount != null ? Number(r.net_amount) : Number(r.amount)
        await db.run(`UPDATE vendors SET payout_balance = COALESCE(payout_balance,0) + ? WHERE id = ?`, [creditAmount, Number(r.vendor_id)])
      }
    }

    // Emit recharge status changed event via WebSocket
    const event = {
      id: `recharge_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'recharge_status_changed',
      payload: {
        id: Number(id),
        vendorId: currentRecharge.vendor_id,
        businessName: currentRecharge.business_name,
        contactName: currentRecharge.contact_name,
        email: currentRecharge.email,
        amount: amount ?? currentRecharge.amount,
        utr: utr ?? currentRecharge.utr,
        status,
        adminNotes: admin_notes,
        previousStatus: currentRecharge.status,
        timestamp: new Date().toISOString()
      },
      timestamp: new Date()
    };
    
    eventStore.emit(event);
    console.log('Admin recharge event emitted:', event);

    return NextResponse.json({ success: true })
  } catch (e) {
    return NextResponse.json({ success: false, error: 'Failed to update' }, { status: 500 })
  }
});


