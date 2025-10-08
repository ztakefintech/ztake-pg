import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/database'
import { withAuth } from '@/lib/middleware'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export const GET = withAuth(async (req: any) => {
  const vendorId = req.vendor!.id
  const rows = await db.all(
    `SELECT id, amount, utr, status, admin_notes, created_at FROM payout_recharges WHERE vendor_id = ? ORDER BY created_at DESC LIMIT 100`,
    [vendorId]
  )
  return NextResponse.json({ success: true, data: { recharges: rows } })
})

export const POST = withAuth(async (req: any) => {
  const vendorId = req.vendor!.id
  const body = await req.json().catch(() => ({}))
  const amount = Number(body?.amount)
  const utrRaw = body?.utr
  const utr = typeof utrRaw === 'string' ? utrRaw.trim() : ''
  if (!Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json({ success: false, error: 'Invalid amount' }, { status: 400 })
  }
  if (!utr || utr.length < 6) {
    return NextResponse.json({ success: false, error: 'UTR is required' }, { status: 400 })
  }
  await db.run(
    `INSERT INTO payout_recharges (vendor_id, amount, utr, status) VALUES (?, ?, ?, 'created')`,
    [vendorId, amount, utr]
  )
  return NextResponse.json({ success: true, message: 'Recharge request created' })
})


