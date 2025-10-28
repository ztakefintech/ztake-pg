import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database';

// Note: This webhook receives status updates from Cashfree and updates payouts accordingly.
// Authentication is handled via IP whitelisting configured in Cashfree.

// Map Cashfree status to internal status
function mapCashfreeStatus(cfStatus: string): string {
  const statusMap: Record<string, string> = {
    'SUCCESS': 'completed',
    'COMPLETED': 'completed',
    'FAILED': 'failed',
    'PENDING': 'pending',
    'CANCELLED': 'cancelled',
    'REJECTED': 'failed',
    'PROCESSING': 'processing',
    'QUEUED': 'pending',
    'INITIATED': 'pending',
    'RECEIVED': 'pending',
    'APPROVAL_PENDING': 'pending'
  };
  
  return statusMap[cfStatus] || 'pending';
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
    console.log(`[CF-Webhook] Status: ${status}, Status Code: ${status_code}`);
    
    // Map Cashfree status to internal status
    const newStatus = mapCashfreeStatus(status);
    
    // Use status_description as failure_reason if status is failed/rejected
    const finalFailureReason = (status === 'REJECTED' || status === 'FAILED') ? status_description : null;
    
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
    
    await db.run(updateQuery, [
      newStatus,
      transfer_utr || null,
      finalFailureReason,
      updated_on || null,
      added_on || null,
      JSON.stringify(webhookData),
      cf_transfer_id || payout.cashfree_payout_id,
      payout.id
    ]);
    
    console.log(`[CF-Webhook] Updated payout ${payout.id} status: ${payout.status} -> ${newStatus}`);
    
    // If payout is completed, release held funds (if any)
    if (newStatus === 'completed' && payout.held_amount) {
      console.log(`[CF-Webhook] Payout completed with held amount: ${payout.held_amount}`);
      await db.run(
        'UPDATE payouts SET held_amount = NULL WHERE id = ?',
        [payout.id]
      );
    }
    
    // If payout failed, release held funds back to vendor balance
    if (newStatus === 'failed' && payout.held_amount) {
      console.log(`[CF-Webhook] Refunding held amount: ${payout.held_amount}`);
      await db.run(
        'UPDATE vendors SET payout_balance = COALESCE(payout_balance, 0) + ? WHERE id = ?',
        [payout.held_amount, payout.vendor_id]
      );
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
          status_code: status_code || null,
          status_description: status_description || null,
          cf_transfer_id: cf_transfer_id || null,
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
          'failed': '❌',
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

