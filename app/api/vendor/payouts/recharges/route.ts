import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/database'
import { withAuth } from '@/lib/middleware'
import { eventStore } from '@/lib/event-store'

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
  
  // Insert recharge request
  const result = await db.run(
    `INSERT INTO payout_recharges (vendor_id, amount, utr, status) VALUES (?, ?, ?, 'created')`,
    [vendorId, amount, utr]
  )
  
  const rechargeId = result.lastID;
  
  // Get vendor information for the event
  const vendor = await db.get(
    `SELECT business_name, contact_name, email FROM vendors WHERE id = ?`,
    [vendorId]
  );
  
  // Emit recharge created event via WebSocket
  const event = {
    id: `recharge_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    type: 'recharge_created',
    payload: {
      id: rechargeId,
      vendorId,
      businessName: vendor?.business_name || `Vendor #${vendorId}`,
      contactName: vendor?.contact_name,
      email: vendor?.email,
      amount,
      utr,
      status: 'created',
      timestamp: new Date().toISOString()
    },
    timestamp: new Date()
  };
  
  eventStore.emit(event);
  console.log('Recharge event emitted:', event);
  
  return NextResponse.json({ success: true, message: 'Recharge request created' })
})


