import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/database'
import { requireAdmin } from '@/lib/admin-middleware'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(req: NextRequest) {
  try {
    requireAdmin(req)
    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status')
    const vendorId = searchParams.get('vendor_id')
    const limit = Math.min(parseInt(searchParams.get('limit') || '200', 10), 500)
    const offset = Math.max(parseInt(searchParams.get('offset') || '0', 10), 0)

    const params: any[] = []
    let where = 'WHERE 1=1'
    if (status) { where += ' AND p.status = ?'; params.push(status) }
    if (vendorId) { where += ' AND p.vendor_id = ?'; params.push(Number(vendorId)) }

    const payouts = await db.all(
      `SELECT 
         p.id,
         p.vendor_id,
         v.business_name,
         p.amount,
         p.currency,
         p.beneficiary_name,
         p.beneficiary_account,
         p.beneficiary_ifsc,
         p.beneficiary_upi,
         p.reference_id,
         p.remarks,
         p.status,
         p.cashfree_payout_id,
         p.created_at,
         p.updated_at
       FROM payouts p
       LEFT JOIN vendors v ON v.id = p.vendor_id
       ${where}
       ORDER BY p.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    )

    return NextResponse.json({ success: true, data: { payouts } })
  } catch (error) {
    console.error('Admin payouts list error:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch payouts' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    requireAdmin(req)
    const body = await req.json().catch(() => ({}))
    const { id, status } = body || {}
    if (!id || !status) {
      return NextResponse.json({ success: false, error: 'id and status are required' }, { status: 400 })
    }

    // Fetch existing payout to detect status transition and get amount/vendor
    const existing = await db.get(
      `SELECT id, vendor_id, amount, status FROM payouts WHERE id = ?`,
      [Number(id)]
    )

    await db.run(
      `UPDATE payouts SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [String(status), Number(id)]
    )

    // If transitioning into approved/paid from a non-approved state, subtract amount from vendor balance
    const newStatus = String(status)
    const wasFinalized = existing?.status === 'approved' || existing?.status === 'paid'
    const isFinalizing = newStatus === 'approved' || newStatus === 'paid'
    if (!wasFinalized && isFinalizing && existing?.vendor_id && existing?.amount != null) {
      await db.run(
        `UPDATE vendors SET payout_balance = GREATEST(COALESCE(payout_balance, 0) - ?, 0) WHERE id = ?`,
        [Number(existing.amount), Number(existing.vendor_id)]
      )
    }

    const payout = await db.get(
      `SELECT id, vendor_id, amount, currency, beneficiary_name, beneficiary_account, beneficiary_ifsc, beneficiary_upi, reference_id, remarks, status, cashfree_payout_id, created_at, updated_at FROM payouts WHERE id = ?`,
      [Number(id)]
    )

    return NextResponse.json({ success: true, data: { payout } })
  } catch (error) {
    console.error('Admin payout update error:', error)
    return NextResponse.json({ success: false, error: 'Failed to update payout' }, { status: 500 })
  }
}


