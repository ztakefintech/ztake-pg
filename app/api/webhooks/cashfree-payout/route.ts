import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database';
import crypto from 'crypto';

// Webhook signature validation
function verifyWebhookSignature(payload: string, signature: string, secret: string): boolean {
  try {
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');
    
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  } catch (error) {
    console.error('[CF-Webhook] Signature verification error:', error);
    return false;
  }
}

// Map Cashfree status to internal status
function mapCashfreeStatus(cfStatus: string): string {
  const statusMap: Record<string, string> = {
    'SUCCESS': 'completed',
    'FAILED': 'failed',
    'PENDING': 'pending',
    'CANCELLED': 'cancelled',
    'REJECTED': 'failed',
    'PROCESSING': 'processing',
    'QUEUED': 'pending',
    'INITIATED': 'pending',
    'COMPLETED': 'completed',
    'FAILURE': 'failed'
  };
  
  return statusMap[cfStatus] || 'pending';
}

export async function POST(req: NextRequest) {
  try {
    console.log('[CF-Webhook] Received payout webhook');
    console.log('[CF-Webhook] Headers:', Object.fromEntries(req.headers.entries()));
    
    // Get raw body for signature verification
    const rawBody = await req.text();
    console.log('[CF-Webhook] Raw body:', rawBody);
    
    const signature = req.headers.get('x-webhook-signature') || req.headers.get('X-Webhook-Signature') || '';
    
    // Verify webhook signature (optional but recommended)
    const webhookSecret = process.env.CASHFREE_WEBHOOK_SECRET;
    if (webhookSecret && signature) {
      const isValidSignature = verifyWebhookSignature(rawBody, signature, webhookSecret);
      if (!isValidSignature) {
        console.error('[CF-Webhook] Invalid signature');
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
      }
    }
    
    // Parse webhook payload
    let webhookData;
    try {
      webhookData = JSON.parse(rawBody);
    } catch (error) {
      console.error('[CF-Webhook] Invalid JSON payload:', error);
      console.error('[CF-Webhook] Raw body that failed to parse:', rawBody);
      return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
    }
    
    console.log('[CF-Webhook] Webhook data:', JSON.stringify(webhookData, null, 2));
    
    // Handle test webhooks from Cashfree
    if (webhookData.type === 'test' || webhookData.event_type === 'test' || webhookData.test === true || 
        webhookData.message === 'test' || webhookData.status === 'test' || 
        Object.keys(webhookData).length === 0 || rawBody === '{}' || rawBody === '') {
      console.log('[CF-Webhook] Received test webhook, responding with success');
      return NextResponse.json({ 
        success: true, 
        message: 'Test webhook received successfully',
        timestamp: new Date().toISOString(),
        received_data: webhookData
      });
    }
    
    // Extract transfer details from Cashfree webhook format
    const { data, event_time, type } = webhookData;
    
    if (!data || !data.transfer_id) {
      console.error('[CF-Webhook] Missing transfer_id in payload');
      console.error('[CF-Webhook] Payload structure:', Object.keys(webhookData));
      
      // For Cashfree webhook testing, return success even if format is unexpected
      console.log('[CF-Webhook] Unexpected payload format, treating as test and returning success');
      return NextResponse.json({ 
        success: true,
        message: 'Webhook received (unexpected format - treating as test)',
        received_keys: Object.keys(webhookData),
        payload: webhookData
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
      added_on,
      updated_on,
      utr,
      failure_reason
    } = data;
    
    // Find the payout record
    const payout = await db.get(
      'SELECT * FROM payouts WHERE reference_id = ?',
      [transfer_id]
    );
    
    if (!payout) {
      console.warn(`[CF-Webhook] Payout not found for transfer_id: ${transfer_id}`);
      // For test webhooks or unknown transfers, return success to avoid webhook failures
      if (transfer_id.includes('TEST') || transfer_id.includes('test')) {
        console.log('[CF-Webhook] Test transfer detected, returning success');
        return NextResponse.json({ 
          success: true, 
          message: 'Test transfer processed (payout not found in database)',
          transfer_id 
        });
      }
      return NextResponse.json({ 
        error: 'Payout not found',
        transfer_id,
        message: 'This transfer_id does not exist in our database'
      }, { status: 404 });
    }
    
    console.log(`[CF-Webhook] Processing ${type} event for transfer ${transfer_id}`);
    console.log(`[CF-Webhook] Event time: ${event_time}, Status: ${status}`);
    console.log(`[CF-Webhook] Payout record fields:`, Object.keys(payout));
    console.log(`[CF-Webhook] External callback URL from DB:`, payout.external_callback_url);
    
    // Map Cashfree status to internal status
    const newStatus = mapCashfreeStatus(status);
    
    // Use status_description as failure_reason if status is failed/rejected
    const finalFailureReason = failure_reason || (status === 'REJECTED' || status === 'FAILED' ? status_description : null);
    
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
        webhook_data = ?
      WHERE id = ?
    `;
    
    await db.run(updateQuery, [
      newStatus,
      utr || null,
      finalFailureReason,
      updated_on || null,
      added_on || null,
      JSON.stringify(webhookData),
      payout.id
    ]);
    
    console.log(`[CF-Webhook] Updated payout ${payout.id} status: ${payout.status} -> ${newStatus}`);
    
    // If payout is completed, release held funds
    if (newStatus === 'completed' && payout.held_amount) {
      console.log(`[CF-Webhook] Releasing held amount: ₹${payout.held_amount}`);
      // Note: We don't add back to payout_balance since it's already deducted
      // Just clear the held_amount
      await db.run(
        'UPDATE payouts SET held_amount = NULL WHERE id = ?',
        [payout.id]
      );
    }
    
    // If payout failed, release held funds back to vendor balance
    if (newStatus === 'failed' && payout.held_amount) {
      console.log(`[CF-Webhook] Refunding held amount: ₹${payout.held_amount}`);
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
      utr: utr || null,
      failure_reason: finalFailureReason,
      status_code: status_code || null,
      status_description: status_description || null,
      transfer_mode: transfer_mode || null,
      cf_transfer_id: cf_transfer_id || null,
      processed_at: updated_on || null,
      acknowledged_at: added_on || null,
      timestamp: new Date().toISOString()
    };
    
    // Import WebSocket manager
    const { wsManager } = await import('@/lib/websocket-manager');
    // Broadcast to all connected clients (vendors and admins)
    wsManager.broadcastToAll(event);
    
    console.log(`[CF-Webhook] Emitted WebSocket event for payout ${payout.id}`);
    
    // Debug: Check if external callback URL exists
    console.log(`[CF-Webhook] External callback URL check:`, {
      hasExternalCallback: !!payout.external_callback_url,
      externalCallbackUrl: payout.external_callback_url
    });
    
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
          utr: utr || null,
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
        console.log(`[CF-Webhook] External callback payload:`, JSON.stringify(externalCallbackPayload, null, 2));
        
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
          console.warn(`[CF-Webhook] External callback failed: ${externalResponse.status} ${externalResponse.statusText}`);
        }
      } catch (externalError) {
        console.error(`[CF-Webhook] External callback error:`, externalError);
        // Don't fail the webhook if external callback fails
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
          ...(utr ? [`🏦 UTR: ${utr}`] : []),
          ...(finalFailureReason ? [`❌ Reason: ${finalFailureReason}`] : []),
          ...(status_code ? [`📋 Status Code: ${status_code}`] : []),
          ...(transfer_mode ? [`🔄 Transfer Mode: ${transfer_mode}`] : []),
          ...(cf_transfer_id ? [`🆔 CF Transfer ID: ${cf_transfer_id}`] : []),
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
    // Simulate a test webhook response
    return NextResponse.json({
      message: 'Cashfree Payout Webhook Endpoint',
      status: 'active',
      timestamp: new Date().toISOString(),
      methods: ['POST'],
      description: 'This endpoint receives payout status updates from Cashfree',
      test_response: {
        success: true,
        message: 'Test webhook would be processed successfully'
      }
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
