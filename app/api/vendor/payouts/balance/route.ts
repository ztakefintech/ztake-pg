import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/database'
import { withAuth } from '@/lib/middleware'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export const GET = withAuth(async (req: any) => {
  const vendorId = req.vendor!.id
  const row = await db.get(
    `SELECT payout_balance, payout_recharge_bank_name, payout_recharge_account_number, payout_recharge_account_holder, payout_recharge_ifsc 
     FROM vendors WHERE id = ?`,
    [vendorId]
  )
  return NextResponse.json({
    success: true,
    data: {
      balance: Number(row?.payout_balance || 0),
      recharge_account: row ? {
        bank_name: row.payout_recharge_bank_name,
        account_number: row.payout_recharge_account_number,
        account_holder: row.payout_recharge_account_holder,
        ifsc: row.payout_recharge_ifsc,
      } : null,
    }
  })
})


