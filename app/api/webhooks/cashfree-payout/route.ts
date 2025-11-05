import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database';
import { demoCallbackStore } from '@/lib/callback-store';

// Note: This webhook receives status updates from Cashfree and updates payouts accordingly.
// Authentication is handled via IP whitelisting configured in Cashfree.

// Use Cashfree status directly from callback (normalize to lowercase)
function getCashfreeStatus(cfStatus: string): string {
  if (!cfStatus) return 'pending';
  // Return Cashfree status as-is, normalized to lowercase for consistency
  return cfStatus.toLowerCase();
}

export async function POST(req: NextRequest) {
  try {
    console.log('[CF-Webhook] Received webhook callback');
    console.log('[CF-Webhook] Headers:', Object.fromEntries(req.headers.entries()));
    
    // Get raw body
    const rawBody = await req.text();
    console.log('[CF-Webhook] Raw body:', rawBody);
    
    // Parse webhook payload
    let webhookData;
    try {
      webhookData = JSON.parse(rawBody);
    } catch (error) {
      console.error('[CF-Webhook] Invalid JSON payload:', error);
      return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
    }
    
    console.log('[CF-Webhook] Webhook data:', JSON.stringify(webhookData, null, 2));
    
    // Handle test webhooks
    if (webhookData.type === 'test' || webhookData.event_type === 'test' || webhookData.test === true || 
        webhookData.message === 'test' || rawBody === '{}' || rawBody === '') {
      console.log('[CF-Webhook] Received test webhook');
      return NextResponse.json({ 
        success: true, 
        message: 'Test webhook received successfully',
        timestamp: new Date().toISOString()
      });
    }
    
    // Extract transfer details from webhook format
    const { data, event_time, type } = webhookData;
    
    if (!data || !data.transfer_id) {
      console.error('[CF-Webhook] Missing transfer_id in payload');
      return NextResponse.json({ 
        success: true,
        message: 'Webhook received (no transfer_id - treating as test)'
      });
    }
    
    const {
      transfer_id,
      cf_transfer_id,
      status,
      status_code,
      status_description,
      beneficiary_details,
      transfer_amount,
      transfer_mode,
      transfer_utr,
      added_on,
      updated_on
    } = data;
    
    // Find the payout record by transfer_id (reference_id in our DB)
    const payout = await db.get(
      'SELECT * FROM payouts WHERE reference_id = ?',
      [transfer_id]
    );
    
    if (!payout) {
      console.warn(`[CF-Webhook] Payout not found for transfer_id: ${transfer_id}`);
      return NextResponse.json({ 
        error: 'Payout not found',
        transfer_id
      }, { status: 404 });
    }
    
    console.log(`[CF-Webhook] Processing ${type} event for transfer ${transfer_id}`);
    console.log(`[CF-Webhook] Raw Cashfree Status: "${status}" (type: ${typeof status})`);
    console.log(`[CF-Webhook] Status Code: ${status_code}, Status Description: ${status_description}`);
    
    // Use Cashfree status directly from callback (normalize to lowercase)
    // Important: Check both uppercase and original case for REVERSED
    const statusUpper = typeof status === 'string' ? status.toUpperCase() : String(status).toUpperCase();
    const newStatus = getCashfreeStatus(status);
    console.log(`[CF-Webhook] Normalized Status: "${newStatus}"`);
    console.log(`[CF-Webhook] Current DB Status: "${payout.status}"`);
    console.log(`[CF-Webhook] Full webhook data.status value:`, JSON.stringify(status));
    
    // Use status_description as failure_reason if status is failed/rejected/reversed
    const finalFailureReason = (statusUpper === 'REJECTED' || statusUpper === 'FAILED' || statusUpper === 'REVERSED') ? status_description : null;
    
    if (statusUpper === 'REVERSED') {
      console.log(`[CF-Webhook] ⚠️ REVERSED STATUS DETECTED - Updating payout status to 'reversed'`);
    }
    
    // Update payout status
    const updateQuery = `
      UPDATE payouts 
      SET 
        status = ?,
        utr = ?,
        failure_reason = ?,
        processed_at = ?,
        acknowledged_at = ?,
        updated_at = CURRENT_TIMESTAMP,
        webhook_data = ?,
        cashfree_payout_id = ?
      WHERE id = ?
    `;
    
    console.log(`[CF-Webhook] About to update payout ${payout.id} with status: "${newStatus}"`);
    console.log(`[CF-Webhook] Update parameters:`, {
      newStatus,
      transfer_utr: transfer_utr || null,
      finalFailureReason,
      updated_on: updated_on || null,
      added_on: added_on || null,
      cf_transfer_id: cf_transfer_id || payout.cashfree_payout_id,
      payout_id: payout.id
    });
    
    try {
      const updateResult = await db.run(updateQuery, [
        newStatus,
        transfer_utr || null,
        finalFailureReason,
        updated_on || null,
        added_on || null,
        JSON.stringify(webhookData),
        cf_transfer_id || payout.cashfree_payout_id,
        payout.id
      ]);
      
      console.log(`[CF-Webhook] Update result:`, updateResult);
      console.log(`[CF-Webhook] Updated payout ${payout.id} status: ${payout.status} -> ${newStatus}`);
      
      // Verify the update succeeded by reading back the status
      const verifyPayout = await db.get(
        'SELECT id, status, reference_id FROM payouts WHERE id = ?',
        [payout.id]
      );
      
      if (verifyPayout) {
        console.log(`[CF-Webhook] Verified payout ${payout.id} status after update: "${verifyPayout.status}"`);
        if (verifyPayout.status !== newStatus) {
          console.error(`[CF-Webhook] ⚠️ STATUS MISMATCH! Expected: "${newStatus}", Got: "${verifyPayout.status}"`);
        }
      } else {
        console.error(`[CF-Webhook] ⚠️ Could not verify payout ${payout.id} after update`);
      }
    } catch (updateError) {
      console.error(`[CF-Webhook] ⚠️ Error updating payout status:`, updateError);
      throw updateError;
    }
    
    // Handle status-specific fund management
    const wasSuccessful = payout.status === 'success' || payout.status === 'completed' || payout.status === 'SUCCESS' || payout.status === 'COMPLETED';
    const isReversed = newStatus === 'reversed' || statusUpper === 'REVERSED';
    const isFailed = newStatus === 'failed' || newStatus === 'rejected' || isReversed;
    const isCompleted = newStatus === 'completed' || newStatus === 'success';
    
    // If payout is reversed or failed, refund the amount back to vendor payout wallet
    // Only refund if status was not already failed/reversed (to avoid double refunding)
    const wasAlreadyFailed = payout.status === 'failed' || payout.status === 'reversed' || payout.status === 'rejected' || 
                              payout.status === 'FAILED' || payout.status === 'REVERSED' || payout.status === 'REJECTED';
    
    if (isFailed && !wasAlreadyFailed && payout.vendor_id && payout.amount) {
      const refundAmount = payout.held_amount ? payout.held_amount : Number(payout.amount);
      console.log(`[CF-Webhook] Payout ${newStatus} - refunding ${refundAmount} to vendor ${payout.vendor_id} payout wallet`);
      
      await db.run(
        'UPDATE vendors SET payout_balance = COALESCE(payout_balance, 0) + ? WHERE id = ?',
        [refundAmount, payout.vendor_id]
      );
      
      // Clear held_amount if it exists
      if (payout.held_amount) {
        await db.run(
          'UPDATE payouts SET held_amount = NULL WHERE id = ?',
          [payout.id]
        );
      }
      
      console.log(`[CF-Webhook] Successfully refunded ${refundAmount} to vendor payout wallet`);
    }
    
    // If payout is completed/success, release held funds (if any) - no refund needed as payout succeeded
    if (isCompleted && payout.held_amount) {
      console.log(`[CF-Webhook] Payout completed with held amount: ${payout.held_amount}`);
      await db.run(
        'UPDATE payouts SET held_amount = NULL WHERE id = ?',
        [payout.id]
      );
    }
    
    // Emit WebSocket event for real-time updates
    const event = {
      id: `payout_update_${payout.id}_${Date.now()}`,
      type: 'payout_status_update',
      vendor_id: payout.vendor_id,
      payout_id: payout.id,
      reference_id: payout.reference_id,
      old_status: payout.status,
      new_status: newStatus,
      amount: payout.amount,
      currency: payout.currency,
      utr: transfer_utr || null,
      failure_reason: finalFailureReason,
      status_code: status_code || null,
      status_description: status_description || null,
      transfer_mode: transfer_mode || null,
      cf_transfer_id: cf_transfer_id || null,
      processed_at: updated_on || null,
      timestamp: new Date().toISOString()
    };
    
    // Import WebSocket manager
    const { wsManager } = await import('@/lib/websocket-manager');
    wsManager.broadcastToAll(event);
    
    console.log(`[CF-Webhook] Emitted WebSocket event for payout ${payout.id}`);

    // Also append to demo callback store (used by vendor UI/testing)
    try {
      const vendorInfo = await db.get(
        `SELECT vendor_code, business_name, contact_name, email FROM vendors WHERE id = ?`,
        [payout.vendor_id]
      );
      const callbackToken = `vendor-${vendorInfo?.vendor_code || payout.vendor_id}`;
      demoCallbackStore.append(callbackToken, {
        type: 'payout_status_changed',
        payoutId: payout.id,
        vendorId: payout.vendor_id,
        businessName: vendorInfo?.business_name || `Vendor #${payout.vendor_id}`,
        contactName: vendorInfo?.contact_name,
        email: vendorInfo?.email,
        amount: payout.amount,
        currency: payout.currency,
        beneficiaryName: payout.beneficiary_name,
        beneficiaryAccount: payout.beneficiary_account,
        beneficiaryIfsc: payout.beneficiary_ifsc,
        beneficiaryUpi: payout.beneficiary_upi || null,
        referenceId: payout.reference_id,
        utr: transfer_utr || null,
        status: newStatus,
        previousStatus: payout.status,
        failure_reason: finalFailureReason || null,
        timestamp: new Date().toISOString()
      });
    } catch (cbErr) {
      console.warn('[CF-Webhook] Failed to append to demo callback store:', cbErr);
    }
    
    // Forward status update to external callback URL if provided
    if (payout.external_callback_url) {
      try {
        const externalCallbackPayload = {
          id: payout.id,
          reference_id: payout.reference_id,
          status: newStatus,
          amount: payout.amount,
          currency: payout.currency,
          beneficiary_name: payout.beneficiary_name,
          beneficiary_account: payout.beneficiary_account,
          beneficiary_ifsc: payout.beneficiary_ifsc,
          utr: transfer_utr || null,
          failure_reason: finalFailureReason || null,
          updated_at: new Date().toISOString(),
          timestamp: new Date().toISOString(),
          event_type: 'status_changed',
          old_status: payout.status,
          new_status: newStatus
        };
        
        console.log(`[CF-Webhook] Forwarding to external callback: ${payout.external_callback_url}`);
        
        const externalResponse = await fetch(payout.external_callback_url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'ZTake-Webhook/1.0'
          },
          body: JSON.stringify(externalCallbackPayload)
        });
        
        if (externalResponse.ok) {
          console.log(`[CF-Webhook] External callback successful: ${externalResponse.status}`);
        } else {
          console.warn(`[CF-Webhook] External callback failed: ${externalResponse.status}`);
        }
      } catch (externalError) {
        console.error(`[CF-Webhook] External callback error:`, externalError);
      }
    }
    
    // Send Telegram notification to admins (optional)
    if (process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_ADMIN_CHAT_ID) {
      try {
        const { sendTelegramAdminAlert } = await import('@/lib/telegram');
        
        const statusEmoji = {
          'completed': '✅',
          'success': '✅',
          'failed': '❌',
          'rejected': '❌',
          'reversed': '↩️',
          'pending': '⏳',
          'processing': '🔄',
          'cancelled': '🚫'
        }[newStatus] || '📋';
        
        const message = [
          `${statusEmoji} *Payout Status Update*`,
          `💰 Amount: ₹${payout.amount}`,
          `🆔 Reference: ${payout.reference_id}`,
          `📊 Status: ${payout.status} → ${newStatus}`,
          `👤 Beneficiary: ${payout.beneficiary_name}`,
          ...(transfer_utr ? [`🏦 UTR: ${transfer_utr}`] : []),
          ...(finalFailureReason ? [`❌ Reason: ${finalFailureReason}`] : []),
          `⏰ Time: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`
        ].join('\n');
        
        await sendTelegramAdminAlert(message, payout.vendor_id);
        console.log('[CF-Webhook] Sent Telegram notification');
      } catch (telegramError) {
        console.error('[CF-Webhook] Telegram notification failed:', telegramError);
      }
    }
    
    return NextResponse.json({ 
      success: true, 
      message: 'Webhook processed successfully',
      payout_id: payout.id,
      status: newStatus
    });
    
  } catch (error) {
    console.error('[CF-Webhook] Error processing webhook:', error);
    console.error('[CF-Webhook] Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

// Handle GET requests for webhook verification/testing
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const test = url.searchParams.get('test');
  
  if (test === 'webhook') {
    return NextResponse.json({
      message: 'Cashfree Payout Webhook Endpoint',
      status: 'active',
      timestamp: new Date().toISOString(),
      methods: ['POST'],
      description: 'This endpoint receives payout status updates from Cashfree'
    });
  }
  
  return NextResponse.json({
    message: 'Cashfree Payout Webhook Endpoint',
    status: 'active',
    timestamp: new Date().toISOString(),
    methods: ['POST'],
    description: 'This endpoint receives payout status updates from Cashfree',
    test_url: `${req.nextUrl.origin}${req.nextUrl.pathname}?test=webhook`
  });
}

