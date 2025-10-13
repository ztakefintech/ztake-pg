import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database';
import { withAuth, AuthenticatedRequest } from '@/lib/middleware';
import { paginationSchema, validateQueryParams } from '@/lib/validation';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const GET = withAuth(async (req: AuthenticatedRequest) => {
  try {
    const vendorId = req.vendor!.id;
    const { searchParams } = new URL(req.url);
    
    // Validate pagination parameters
    const validatedParams = validateQueryParams(paginationSchema, searchParams);
    const { page, limit, offset } = validatedParams;

    console.log(`[JWT-PAYOUTS] Fetching payouts for vendor ID: ${vendorId}`);

    // Get total count
    const totalRow = await db.get(
      'SELECT COUNT(*) as total FROM payouts WHERE vendor_id = ?',
      [vendorId]
    );
    const total = totalRow?.total || 0;

    // Get payouts
    const rows = await db.all(
      `SELECT id, amount, currency, beneficiary_name, beneficiary_account, beneficiary_ifsc, beneficiary_upi, reference_id, remarks, status, cashfree_payout_id AS provider_payout_id, admin_notes, created_at, updated_at
       FROM payouts
       WHERE vendor_id = ?
       ORDER BY created_at DESC
       LIMIT ? OFFSET ?`,
      [vendorId, limit, offset]
    );

    // Get status counts based on payout status
    const successCountRow = await db.get(
      `SELECT COUNT(*) AS count
       FROM payouts
       WHERE vendor_id = ? AND (status = 'paid' OR status = 'approved' OR status = 'success')`,
      [vendorId]
    );
    const successCount = successCountRow?.count || 0;

    const pendingCountRow = await db.get(
      `SELECT COUNT(*) AS count
       FROM payouts
       WHERE vendor_id = ? AND (status = 'created' OR status = 'pending')`,
      [vendorId]
    );
    const pendingCount = pendingCountRow?.count || 0;

    const failedCountRow = await db.get(
      `SELECT COUNT(*) AS count
       FROM payouts
       WHERE vendor_id = ? AND (status = 'rejected' OR status = 'failed')`,
      [vendorId]
    );
    const failedCount = failedCountRow?.count || 0;

    const statusCounts = {
      Success: successCount,
      Pending: pendingCount,
      Failed: failedCount
    };

    console.log(`[JWT-PAYOUTS] Successfully listed ${rows.length} payouts for vendor ${vendorId}`);

    return NextResponse.json({
      success: true,
      payouts: rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      },
      statusCounts,
      vendorCode: req.vendor!.vendor_code
    });
  } catch (error) {
    console.error('JWT payouts list error:', error);
    return NextResponse.json({ error: 'Failed to fetch payouts' }, { status: 500 });
  }
});
