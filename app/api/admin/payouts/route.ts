import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/database'
import { requirePermission, getVendorFilterForAdmin } from '@/lib/admin-middleware'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export const GET = requirePermission('view_payouts')(async (req: NextRequest) => {
  try {
    // Get admin info from headers
    const adminData = req.headers.get('x-admin-id');
    const admin = adminData ? JSON.parse(adminData) : null;
    
    if (!admin) {
      return NextResponse.json({ error: 'Admin authentication required' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status')
    const vendorId = searchParams.get('vendor_id')
    const limit = Math.min(parseInt(searchParams.get('limit') || '200', 10), 500)
    const offset = Math.max(parseInt(searchParams.get('offset') || '0', 10), 0)

    // Get vendor filter for this admin
    const vendorFilter = await getVendorFilterForAdmin(admin.id);

    const params: any[] = [...vendorFilter.params]
    let paramIndex = vendorFilter.params.length + 1;
    let where = vendorFilter.params.length > 0 
      ? `WHERE p.vendor_id IN (${vendorFilter.params.map((_, i) => `$${i + 1}`).join(', ')})`
      : 'WHERE 1=1'
    if (status) { where += ` AND p.status = $${paramIndex}`; params.push(status); paramIndex++; }
    if (vendorId) { where += ` AND p.vendor_id = $${paramIndex}`; params.push(Number(vendorId)); paramIndex++; }

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
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, limit, offset]
    )

    return NextResponse.json({ success: true, data: { payouts } })
  } catch (error) {
    console.error('Admin payouts list error:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch payouts' }, { status: 500 })
  }
});

export const PATCH = requirePermission('manage_payout')(async (req: NextRequest) => {
  try {
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
    const isApproved = newStatus === 'approved' || newStatus === 'paid'
    const isRejected = newStatus === 'rejected'

    // Held funds logic: on approval, do nothing (already held on creation). On rejection, add back held amount.
    if (!wasFinalized && existing?.vendor_id && existing?.amount != null) {
      if (isApproved) {
        // no-op: amount already deducted at creation time
      } else if (isRejected) {
        await db.run(
          `UPDATE vendors SET payout_balance = COALESCE(payout_balance, 0) + ? WHERE id = ?`,
          [Number(existing.amount), Number(existing.vendor_id)]
        )
      }
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
});


