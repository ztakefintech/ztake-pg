import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database';
import { parseBankWebhookPayload } from '@/lib/webhooks/parse-bank-payload';
import crypto from 'crypto';
import { eventStore } from '@/lib/event-store';
import { sendTelegramAdminAlert } from '@/lib/telegram';

// Disable body parser — read raw for signature verification
export const dynamic = 'force-dynamic';

/**
 * GET handler — diagnostic health check.
 * Visit https://ztake.in/api/webhooks/bank in a browser to confirm endpoint is alive.
 */
export async function GET(req: NextRequest) {
  return NextResponse.json({
    status: 'ok',
    endpoint: '/api/webhooks/bank',
    method: 'POST',
    description: 'Bank webhook receiver for GPay Business / Tasker notifications.',
    timestamp: new Date().toISOString(),
  });
}

/**
 * POST handler — receives bank webhook payloads from Tasker/GPay Business.
 * 
 * Expected payload format:
 * {
 *   "amount": "+ ₹15",
 *   "time": "19 May, 9:28 am",
 *   "raw_screen": "Back|Show menu|Received from ...|...",
 *   "source": "gpay_business",
 *   "timestamp": "1779163139"
 * }
 */
export async function POST(req: NextRequest) {
  let rawBody = '';
  let payload: any = {};

  // Capture request metadata for debugging (like webhook.site)
  const requestHeaders: Record<string, string> = {};
  req.headers.forEach((value, key) => {
    requestHeaders[key] = value;
  });
  const requestIp = req.headers.get('x-forwarded-for')
    || req.headers.get('x-real-ip')
    || req.headers.get('cf-connecting-ip')
    || 'unknown';
  const userAgent = req.headers.get('user-agent') || '';
  const contentType = req.headers.get('content-type') || '';

  console.log(`[WEBHOOK] ← POST /api/webhooks/bank | IP: ${requestIp} | UA: ${userAgent} | CT: ${contentType}`);

  // 1. Read raw body and parse based on content type
  try {
    rawBody = await req.text();
    console.log(`[WEBHOOK] Raw body (${rawBody.length} bytes): ${rawBody.substring(0, 1000)}`);

    // Try JSON first
    if (contentType.includes('application/json') || rawBody.trimStart().startsWith('{')) {
      try {
        payload = JSON.parse(rawBody);
      } catch {
        // JSON parse failed, try URL-encoded fallback below
      }
    }

    // If payload is still empty, try parsing as URL-encoded form data
    if (!payload || Object.keys(payload).length === 0) {
      try {
        const params = new URLSearchParams(rawBody);
        const entries = Array.from(params.entries());
        if (entries.length > 0) {
          payload = {};
          for (const [key, value] of entries) {
            payload[key] = value;
          }
          console.log(`[WEBHOOK] Parsed as URL-encoded form data with ${entries.length} fields`);
        }
      } catch {
        // URL-encoded parse also failed
      }
    }

    // If still empty, try one more JSON parse attempt (content type might be wrong)
    if (!payload || Object.keys(payload).length === 0) {
      try {
        payload = JSON.parse(rawBody);
      } catch {
        // Total failure
      }
    }

    // Final check — if payload is still empty, store as error
    if (!payload || Object.keys(payload).length === 0) {
      console.error('[WEBHOOK] ✗ Could not parse body as JSON or form data');
      try {
        await db.run(
          `INSERT INTO webhook_events (source, raw_payload, signature_valid, processed, note, request_headers, request_ip, user_agent, content_type) VALUES (?, ?::jsonb, ?, ?, ?, ?::jsonb, ?, ?, ?)`,
          [
            'unknown',
            JSON.stringify({ error: 'Could not parse body', raw_body_preview: rawBody.substring(0, 2000) }),
            false,
            false,
            `Body parse error: not JSON or form-encoded. Content-Type: ${contentType}`,
            JSON.stringify(requestHeaders),
            requestIp,
            userAgent,
            contentType,
          ]
        );
      } catch (dbErr) {
        console.error('[WEBHOOK] ✗ Failed to log bad body to DB:', dbErr);
      }
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    console.log(`[WEBHOOK] Parsed payload keys: ${Object.keys(payload).join(', ')}`);
  } catch (parseErr) {
    console.error('[WEBHOOK] ✗ Body read/parse failed:', parseErr);
    // Still store the raw body for debugging even if parse fails
    try {
      await db.run(
        `INSERT INTO webhook_events (source, raw_payload, signature_valid, processed, note, request_headers, request_ip, user_agent, content_type) VALUES (?, ?::jsonb, ?, ?, ?, ?::jsonb, ?, ?, ?)`,
        [
          'unknown',
          JSON.stringify({ error: 'Body read failed', raw_body_preview: rawBody.substring(0, 2000) }),
          false,
          false,
          `Body read error: ${parseErr instanceof Error ? parseErr.message : 'Unknown'}`,
          JSON.stringify(requestHeaders),
          requestIp,
          userAgent,
          contentType,
        ]
      );
    } catch (dbErr) {
      console.error('[WEBHOOK] ✗ Failed to log bad body to DB:', dbErr);
    }
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  // Top-level try/catch — NEVER let the handler crash without storing the event
  try {
    // 2. Verify webhook signature (HMAC-SHA256)
    const signature = req.headers.get('x-webhook-signature') || '';
    const secret = process.env.WEBHOOK_SECRET || '';
    let signatureValid = false;

    // Verify signature only if secret is configured
    if (secret && signature) {
      const expected = crypto
        .createHmac('sha256', secret)
        .update(rawBody)
        .digest('hex');
      try {
        signatureValid = crypto.timingSafeEqual(
          Buffer.from(expected, 'hex'),
          Buffer.from(signature, 'hex')
        );
      } catch {
        signatureValid = false;
      }
    } else {
      // No secret configured – accept payload but log for debugging
      if (!secret) console.warn('[WEBHOOK] WEBHOOK_SECRET not set – skipping signature verification');
      signatureValid = true;
    }

    if (!signatureValid) {
      console.log('[WEBHOOK] ✗ Invalid signature');
      await db.run(
        `INSERT INTO webhook_events (source, raw_payload, signature_valid, processed, note, request_headers, request_ip, user_agent, content_type) VALUES (?, ?::jsonb, ?, ?, ?, ?::jsonb, ?, ?, ?)`,
        [
          payload.source || 'unknown',
          JSON.stringify(payload),
          false,
          false,
          'Invalid or missing webhook signature',
          JSON.stringify(requestHeaders),
          requestIp,
          userAgent,
          contentType,
        ]
      );
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    // 3. Parse payload
    const parsed = parseBankWebhookPayload(payload);
    console.log(`[WEBHOOK] Parsed → UTR: ${parsed.utr || 'N/A'} | Amount: ${parsed.amount} | Sender: ${parsed.sender_name || 'N/A'} | Source: ${parsed.source}`);

    // 4. If no UTR extracted, log and return 200
    if (!parsed.utr) {
      console.log('[WEBHOOK] No UTR extracted — logging as no_utr');
      await db.run(
        `INSERT INTO webhook_events (source, amount, paid_at, raw_payload, signature_valid, processed, note, payment_type, sender_name, payment_method, payment_app, customer_paid, mdr_gst, amount_received, request_headers, request_ip, user_agent, content_type) VALUES (?, ?, ?, ?::jsonb, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?::jsonb, ?, ?, ?)`,
        [
          parsed.source || 'unknown',
          parsed.amount,
          parsed.paid_at ? parsed.paid_at.toISOString() : null,
          JSON.stringify(payload),
          true,
          false,
          'Could not extract UTR from raw_screen',
          parsed.payment_type,
          parsed.sender_name,
          parsed.payment_method,
          parsed.payment_app,
          parsed.customer_paid,
          parsed.mdr_gst,
          parsed.amount_received,
          JSON.stringify(requestHeaders),
          requestIp,
          userAgent,
          contentType,
        ]
      );
      return NextResponse.json({ status: 'logged_no_utr' }, { status: 200 });
    }

    // 5. Find matching transaction by UTR
    const transaction = await db.get(
      `SELECT ztake_order_id, amount, status, vendor_id, callback_url, merchant_order_id, currency, customer_name, webhook_verified FROM orders WHERE utr = ?`,
      [parsed.utr]
    );

    // Common insert params for all UTR-bearing events
    const baseInsertSql = `INSERT INTO webhook_events (source, utr, google_txn_id, amount, paid_at, raw_payload, signature_valid, matched_txn_id, processed, note, payment_type, sender_name, payment_method, payment_app, customer_paid, mdr_gst, amount_received, request_headers, request_ip, user_agent, content_type) VALUES (?, ?, ?, ?, ?, ?::jsonb, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?::jsonb, ?, ?, ?)`;
    const baseParams = (matchedTxnId: string | null, isProcessed: boolean, note: string) => [
      parsed.source || '',
      parsed.utr,
      parsed.google_txn_id,
      parsed.amount,
      parsed.paid_at ? parsed.paid_at.toISOString() : null,
      JSON.stringify(payload),
      true,
      matchedTxnId,
      isProcessed,
      note,
      parsed.payment_type,
      parsed.sender_name,
      parsed.payment_method,
      parsed.payment_app,
      parsed.customer_paid,
      parsed.mdr_gst,
      parsed.amount_received,
      JSON.stringify(requestHeaders),
      requestIp,
      userAgent,
      contentType,
    ];

    // 6. Idempotency — if already verified, skip silently
    if (transaction?.webhook_verified === true || transaction?.webhook_verified === 1) {
      console.log(`[WEBHOOK] Duplicate — UTR ${parsed.utr} already verified for order ${transaction.ztake_order_id}`);
      await db.run(baseInsertSql, baseParams(transaction.ztake_order_id, true, 'Duplicate — already webhook-verified'));
      return NextResponse.json({ status: 'already_processed' }, { status: 200 });
    }

    // 7. Matched — auto-verify
    if (transaction) {
      try {
        console.log(`[WEBHOOK] ✓ UTR ${parsed.utr} matched to order ${transaction.ztake_order_id} — auto-verifying`);
        
        const expectedAmount = Number(transaction.amount);
        const receivedAmount = parsed.amount !== null ? Number(parsed.amount) : expectedAmount;
        const amountMatches = expectedAmount === receivedAmount;
        
        let note = 'Auto-verified via webhook UTR match';
        if (!amountMatches) {
          console.warn(`[WEBHOOK] ⚠ Amount mismatch for order ${transaction.ztake_order_id}: expected ₹${expectedAmount}, received ₹${receivedAmount}`);
          note = `Auto-verified but amount mismatch: expected ₹${expectedAmount}, received ₹${receivedAmount}`;
        }

        // Update the order amount to the actual received amount and mark as succeeded
        await db.run(
          `UPDATE orders SET status = 'Succeeded', amount = ?, payment_time = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP, webhook_verified = true, webhook_verified_at = CURRENT_TIMESTAMP, verification_source = 'webhook' WHERE ztake_order_id = ?`,
          [receivedAmount, transaction.ztake_order_id]
        );

        // Keep payments table fully in sync to update admin overview stats and daily trends
        if (transaction.vendor_id) {
          const existingPayment = await db.get(
            `SELECT id FROM payments WHERE utr = ? AND vendor_id = ?`,
            [parsed.utr, transaction.vendor_id]
          );
          if (existingPayment) {
            await db.run(
              `UPDATE payments SET order_id = ?, amount = ?, payment_status = 'Succeeded', checked_status = TRUE, checked_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
              [transaction.ztake_order_id, receivedAmount, existingPayment.id]
            );
          } else {
            await db.run(
              `INSERT INTO payments (order_id, utr, amount, vendor_id, status, payment_status, checked_status, checked_at) VALUES (?, ?, ?, ?, 'completed', 'Succeeded', TRUE, CURRENT_TIMESTAMP)`,
              [transaction.ztake_order_id, parsed.utr, receivedAmount, transaction.vendor_id]
            );
          }

          // Emit WebSocket status event
          const vendor = await db.get(
            `SELECT id, business_name, contact_name, upi_id, vendor_code FROM vendors WHERE id = ?`,
            [transaction.vendor_id]
          );
          if (vendor) {
            const event = {
              id: `payment_verified_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              type: 'payment_status_changed',
              payload: {
                id: Date.now(),
                vendorId: vendor.id,
                businessName: vendor.business_name,
                contactName: vendor.contact_name,
                upiId: vendor.upi_id,
                utr: parsed.utr,
                amount: receivedAmount,
                payment_status: 'Succeeded',
                status: 'completed',
                checked_status: true,
                checked_at: new Date().toISOString(),
                orderId: transaction.ztake_order_id,
                timestamp: new Date().toISOString()
              },
              timestamp: new Date()
            };
            eventStore.emit(event);

            // Send Telegram admin alert
            const successAlert = [
              '<b>🔔 Pay-in Payment Succeeded (Webhook)</b>',
              `• Vendor: ${vendor.business_name || `Vendor #${vendor.id}`} (${vendor.vendor_code || '-'})`,
              `• Amount: ₹${receivedAmount} ${transaction.currency || 'INR'}`,
              `• Customer: ${transaction.customer_name || 'Anonymous'}`,
              `• Merchant Order ID: ${transaction.merchant_order_id || '-'}`,
              `• Ztake Order ID: ${transaction.ztake_order_id}`,
              `• UTR: ${parsed.utr}`,
              `• Status: Succeeded`
            ].join('\n');
            sendTelegramAdminAlert(successAlert, vendor.id).catch(() => {});
          }
        }

        // Trigger Callback URL
        if (transaction.callback_url) {
          const successPayload = {
            merchantOrderId: transaction.merchant_order_id,
            ztakeOrderId: transaction.ztake_order_id,
            amount: Number(receivedAmount),
            utr: parsed.utr,
            status: 'SUCCESS',
            paymentTime: new Date().toISOString()
          };
          fetch(transaction.callback_url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(successPayload)
          }).catch((err) => {
            console.error('[WEBHOOK] Callback error:', err);
          });
        }

        await db.run(baseInsertSql, baseParams(transaction.ztake_order_id, true, note));
        return NextResponse.json({ status: 'verified', transaction_id: transaction.ztake_order_id }, { status: 200 });
      } catch (err) {
        console.error('[WEBHOOK] ✗ Error processing matched transaction:', err);
        return NextResponse.json({ error: 'Failed to process' }, { status: 500 });
      }
    }

    // 8. No matching transaction found — log as unmatched
    console.log(`[WEBHOOK] No matching order for UTR ${parsed.utr} — logging as unmatched`);
    await db.run(baseInsertSql, baseParams(null, false, `No PENDING transaction found for UTR: ${parsed.utr}`));
    return NextResponse.json({ status: 'logged_unmatched' }, { status: 200 });

  } catch (topLevelErr) {
    // CRITICAL: Top-level catch — log the error and STILL try to store the event
    console.error('[WEBHOOK] ✗ CRITICAL top-level error:', topLevelErr);
    try {
      await db.run(
        `INSERT INTO webhook_events (source, raw_payload, signature_valid, processed, note, request_headers, request_ip, user_agent, content_type) VALUES (?, ?::jsonb, ?, ?, ?, ?::jsonb, ?, ?, ?)`,
        [
          payload?.source || 'error',
          JSON.stringify(payload || {}),
          false,
          false,
          `CRITICAL ERROR: ${topLevelErr instanceof Error ? topLevelErr.message : String(topLevelErr)}`,
          JSON.stringify(requestHeaders),
          requestIp,
          userAgent,
          contentType,
        ]
      );
    } catch (dbErr) {
      console.error('[WEBHOOK] ✗ Even DB storage failed:', dbErr);
    }
    // Return 200 so the sender doesn't endlessly retry
    return NextResponse.json({ status: 'error_logged', error: 'Internal processing error' }, { status: 200 });
  }
}
