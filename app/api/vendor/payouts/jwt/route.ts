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

    // Get payouts with webhook_data for status fallback
    const rows = await db.all(
      `SELECT id, amount, currency, beneficiary_name, beneficiary_account, beneficiary_ifsc, beneficiary_upi, reference_id, remarks, status, cashfree_payout_id AS provider_payout_id, admin_notes, utr, created_at, updated_at, webhook_data
       FROM payouts
       WHERE vendor_id = ?
       ORDER BY created_at DESC
       LIMIT ? OFFSET ?`,
      [vendorId, limit, offset]
    );

    // Process rows to use webhook status if available and status is still pending
    const processedRows = await Promise.all(rows.map(async (row: any) => {
      // If status is pending but webhook_data exists, try to get status from webhook
      if (row.webhook_data) {
        try {
          const webhookData = typeof row.webhook_data === 'string' 
            ? JSON.parse(row.webhook_data) 
            : row.webhook_data;
          
          if (webhookData?.data?.status) {
            const webhookStatus = webhookData.data.status.toLowerCase();
            const currentStatus = row.status?.toLowerCase();
            
            // If webhook has a definitive status different from current status, use webhook status
            if (webhookStatus && 
                !['pending', 'created', 'processing'].includes(webhookStatus) &&
                (currentStatus === 'pending' || currentStatus === 'created' || currentStatus !== webhookStatus)) {
              console.log(`[JWT-PAYOUTS] Webhook status mismatch for payout ${row.id}: DB="${row.status}" -> Webhook="${webhookStatus}"`);
              
              // Update database if status is still pending/created but webhook has definitive status
              if (currentStatus === 'pending' || currentStatus === 'created') {
                try {
                  // Get payout details before updating to check if refund needed
                  const payoutDetails = await db.get(
                    'SELECT status, held_amount, vendor_id, amount FROM payouts WHERE id = ?',
                    [row.id]
                  );
                  
                  const wasAlreadyFailed = payoutDetails?.status === 'failed' || payoutDetails?.status === 'reversed' || payoutDetails?.status === 'rejected';
                  
                  await db.run(
                    'UPDATE payouts SET status = ? WHERE id = ?',
                    [webhookStatus, row.id]
                  );
                  console.log(`[JWT-PAYOUTS] Fixed payout ${row.id} status from "${row.status}" to "${webhookStatus}"`);
                  
                  // If status is reversed or failed, refund the amount to payout wallet
                  if ((webhookStatus === 'reversed' || webhookStatus === 'failed' || webhookStatus === 'rejected') && 
                      !wasAlreadyFailed && payoutDetails?.vendor_id && payoutDetails?.amount) {
                    try {
                      const refundAmount = payoutDetails?.held_amount ? payoutDetails.held_amount : Number(payoutDetails.amount);
                      await db.run(
                        'UPDATE vendors SET payout_balance = COALESCE(payout_balance, 0) + ? WHERE id = ?',
                        [refundAmount, payoutDetails.vendor_id]
                      );
                      
                      if (payoutDetails?.held_amount) {
                        await db.run('UPDATE payouts SET held_amount = NULL WHERE id = ?', [row.id]);
                      }
                      
                      console.log(`[JWT-PAYOUTS] Refunded ${refundAmount} to vendor ${payoutDetails.vendor_id} payout wallet for ${webhookStatus} payout`);
                    } catch (refundError) {
                      console.error(`[JWT-PAYOUTS] Failed to refund payout ${row.id}:`, refundError);
                    }
                  }
                } catch (updateError) {
                  console.error(`[JWT-PAYOUTS] Failed to update payout ${row.id} status:`, updateError);
                }
              }
              
              row.status = webhookStatus;
            }
          }
        } catch (e) {
          // Invalid JSON, ignore
          console.warn(`[JWT-PAYOUTS] Could not parse webhook_data for payout ${row.id}`);
        }
      }
      
      // Remove webhook_data from response (not needed in UI)
      delete row.webhook_data;
      return row;
    }));

    // Get status counts based on payout status
    const successCountRow = await db.get(
      `SELECT COUNT(*) AS count
       FROM payouts
       WHERE vendor_id = ? AND (status = 'paid' OR status = 'approved' OR status = 'success' OR status = 'completed')`,
      [vendorId]
    );
    const successCount = successCountRow?.count || 0;

    const pendingCountRow = await db.get(
      `SELECT COUNT(*) AS count
       FROM payouts
       WHERE vendor_id = ? AND (status = 'created' OR status = 'pending' OR status = 'processing')`,
      [vendorId]
    );
    const pendingCount = pendingCountRow?.count || 0;

    const failedCountRow = await db.get(
      `SELECT COUNT(*) AS count
       FROM payouts
       WHERE vendor_id = ? AND (status = 'rejected' OR status = 'failed' OR status = 'reversed')`,
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
      payouts: processedRows,
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
