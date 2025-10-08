import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/database'
import { requireAdmin } from '@/lib/admin-middleware'

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

    // allow editing amount and utr
    await db.run(`UPDATE payout_recharges SET status = ?, admin_notes = ?, amount = COALESCE(?, amount), utr = COALESCE(?, utr), updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [status, admin_notes || null, amount ?? null, utr ?? null, Number(id)])

    // If approved/paid, credit vendor balance
    if (status === 'approved' || status === 'paid') {
      const r = await db.get(`SELECT vendor_id, amount FROM payout_recharges WHERE id = ?`, [Number(id)])
      if (r?.vendor_id && r?.amount) {
        await db.run(`UPDATE vendors SET payout_balance = COALESCE(payout_balance,0) + ? WHERE id = ?`, [Number(r.amount), Number(r.vendor_id)])
      }
    }

    return NextResponse.json({ success: true })
  } catch (e) {
    return NextResponse.json({ success: false, error: 'Failed to update' }, { status: 500 })
  }
});


