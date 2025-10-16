import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/database'
import { withAuth } from '@/lib/middleware'
import { eventStore } from '@/lib/event-store'
import { sendTelegramAdminAlert } from '@/lib/telegram'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export const GET = withAuth(async (req: any) => {
  const vendorId = req.vendor!.id
  const rows = await db.all(
    `SELECT id, amount, utr, status, admin_notes, created_at,
            fee_percent, fee_amount, net_amount, fee_note
       FROM payout_recharges 
      WHERE vendor_id = ? 
      ORDER BY created_at DESC 
      LIMIT 100`,
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
  
  // Fee calculation for payout recharge: 1.18%
  const feePercent = 1.18; // 1.18%
  const feeAmount = Number((amount * (feePercent / 100)).toFixed(2))
  const netAmount = Number((amount - feeAmount).toFixed(2))
  const feeNote = '1%+GST PAYOUT RECHARGE'

  // Insert recharge request with fee details; fallback if fee columns don't exist yet
  let result;
  try {
    result = await db.run(
      `INSERT INTO payout_recharges (vendor_id, amount, utr, status, fee_percent, fee_amount, net_amount, fee_note) VALUES (?, ?, ?, 'created', ?, ?, ?, ?)`,
      [vendorId, amount, utr, feePercent, feeAmount, netAmount, feeNote]
    )
  } catch (e: any) {
    const msg = String(e?.message || e);
    const missingColumn = msg.includes('column') && (msg.includes('fee_percent') || msg.includes('fee_amount') || msg.includes('net_amount') || msg.includes('fee_note'));
    if (!missingColumn) throw e;
    // Fallback insert minimal columns
    result = await db.run(
      `INSERT INTO payout_recharges (vendor_id, amount, utr, status) VALUES (?, ?, ?, 'created')`,
      [vendorId, amount, utr]
    );
    // Best-effort add columns for future
    try {
      await db.run(
        `ALTER TABLE payout_recharges 
         ADD COLUMN IF NOT EXISTS fee_percent DECIMAL(5,2),
         ADD COLUMN IF NOT EXISTS fee_amount DECIMAL(12,2),
         ADD COLUMN IF NOT EXISTS net_amount DECIMAL(12,2),
         ADD COLUMN IF NOT EXISTS fee_note VARCHAR(64)`
      );
      // Update the row we just inserted with computed values
      await db.run(
        `UPDATE payout_recharges SET fee_percent = ?, fee_amount = ?, net_amount = ?, fee_note = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        [feePercent, feeAmount, netAmount, feeNote, result.lastID]
      );
    } catch {
      // ignore; table will be migrated on next init
    }
  }
  
  const rechargeId = result.lastID;
  
  // Get vendor information for the event
  const vendor = await db.get(
    `SELECT business_name, contact_name, email, vendor_code FROM vendors WHERE id = ?`,
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
  
  // Telegram alert for admin
  const alert = [
    '<b>🔔 New Payout Recharge Request</b>',
    `• Vendor: ${vendor?.business_name} (${vendor?.vendor_code})`,
    `• Amount: ₹${amount}`,
    `• Fee: ${feePercent}% (${feeAmount})`,
    `• Net Amount: ₹${netAmount}`,
    `• UTR: ${utr}`,
    `• Status: created`
  ].join('\n');
  sendTelegramAdminAlert(alert, vendorId).catch(() => {});
  
  return NextResponse.json({ success: true, message: 'Recharge request created' })
})


