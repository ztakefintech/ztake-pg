import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database';
import { parseBankWebhookPayload } from '@/lib/webhooks/parse-bank-payload';
import crypto from 'crypto';
import { eventStore } from '@/lib/event-store';
import { sendTelegramAdminAlert } from '@/lib/telegram';

// Disable body parser — read raw for signature verification
export const dynamic = 'force-dynamic';

/**
 * Main Webhook Handler supporting all HTTP methods (GET, POST, PUT, PATCH, DELETE).
 * Can parse structured JSON payloads, multipart/form-data, URL-encoded data, and GET query parameters.
 */
async function handleWebhook(req: NextRequest) {
  const method = req.method;
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

  console.log(`[WEBHOOK] ← ${method} /api/webhooks/bank | IP: ${requestIp} | UA: ${userAgent} | CT: ${contentType}`);

  // Retrieve GET query parameters
  const queryParams: Record<string, string> = {};
  req.nextUrl.searchParams.forEach((value, key) => {
    queryParams[key] = value;
  });

  // GET Diagnostic Health Check if no parameters are present
  if (method === 'GET' && Object.keys(queryParams).length === 0) {
    return NextResponse.json({
      status: 'ok',
      endpoint: '/api/webhooks/bank',
      method,
      description: 'Bank webhook receiver for GPay Business / Tasker notifications.',
      timestamp: new Date().toISOString(),
    });
  }

  // 1. Read raw body and parse based on content type (for methods with bodies)
  try {
    if (method !== 'GET' && method !== 'HEAD') {
      if (contentType.includes('multipart/form-data')) {
        try {
          const formData = await req.formData();
          payload = {};
          const entries: string[] = [];
          formData.forEach((value, key) => {
            if (typeof value === 'string') {
              let decodedVal = value;
              try {
                decodedVal = decodeURIComponent(value.replace(/\+/g, ' '));
              } catch {
                // Ignore decoding error
              }
              payload[key] = decodedVal;
              entries.push(`${key}=${value}`);
            }
          });
          rawBody = entries.join('&');
          console.log(`[WEBHOOK] Parsed as multipart/form-data with ${Object.keys(payload).length} fields`);
        } catch (formDataErr) {
          console.error('[WEBHOOK] Failed parsing multipart/form-data:', formDataErr);
        }
      }

      if (!payload || Object.keys(payload).length === 0) {
        rawBody = await req.text();
        console.log(`[WEBHOOK] Raw body (${rawBody.length} bytes): ${rawBody.substring(0, 1000)}`);

        const trimmedBody = rawBody.trim();

        // 1. Try parsing as JSON first (regardless of Content-Type header)
        if (trimmedBody.length > 0) {
          try {
            payload = JSON.parse(trimmedBody);
            console.log('[WEBHOOK] Successfully parsed body as JSON (pre-emptive check)');
          } catch {
            // Not valid JSON, continue to next formats
          }
        }

        // 2. Try parsing as URL-encoded form data if not already parsed and contains '='
        if ((!payload || Object.keys(payload).length === 0) && trimmedBody.includes('=')) {
          try {
            const params = new URLSearchParams(trimmedBody);
            const entries = Array.from(params.entries());
            if (entries.length > 0) {
              const firstKey = entries[0][0];
              if (!firstKey.startsWith('{') && !firstKey.startsWith('[')) {
                payload = {};
                for (const [key, value] of entries) {
                  let decodedKey = key;
                  let decodedVal = value;
                  try {
                    decodedKey = decodeURIComponent(key.replace(/\+/g, ' '));
                    decodedVal = decodeURIComponent(value.replace(/\+/g, ' '));
                  } catch {
                    // Ignore decoding error
                  }
                  payload[decodedKey] = decodedVal;
                }
                console.log(`[WEBHOOK] Parsed as URL-encoded form data with ${entries.length} fields`);
              }
            }
          } catch {
            // URL-encoded parse failed
          }
        }

        // 3. Fallback: If payload is still empty but body has text content, treat the entire body as raw notification text
        if ((!payload || Object.keys(payload).length === 0) && trimmedBody.length > 0) {
          console.log(`[WEBHOOK] Treating body as raw notification text (${trimmedBody.length} bytes)`);
          payload = {
            raw_screen: trimmedBody,
            source: 'raw_text',
          };
        }
      }
    } else {
      // For GET/HEAD requests, the query params represent the payload and the rawBody is the query string
      rawBody = req.nextUrl.search;
      payload = queryParams;
    }

    // Merge query params into payload as backup/fallback for POST/PUT/PATCH/DELETE
    payload = {
      ...queryParams,
      ...payload
    };

    // Final check — if payload is STILL empty
    if (!payload || Object.keys(payload).length === 0) {
      console.error('[WEBHOOK] ✗ Empty body/params received');
      try {
        await db.run(
          `INSERT INTO webhook_events (source, raw_payload, signature_valid, processed, note, request_headers, request_ip, user_agent, content_type, request_method) VALUES (?, ?::jsonb, ?, ?, ?, ?::jsonb, ?, ?, ?, ?)`,
          [
            'unknown',
            JSON.stringify({ error: 'Empty body/params received', raw_body_preview: rawBody.substring(0, 2000) }),
            false,
            false,
            `Empty body/params received. Content-Type: ${contentType}`,
            JSON.stringify(requestHeaders),
            requestIp,
            userAgent,
            contentType,
            method,
          ]
        );
      } catch (dbErr) {
        console.error('[WEBHOOK] ✗ Failed to log empty body to DB:', dbErr);
      }
      return NextResponse.json({ error: 'Empty request body' }, { status: 400 });
    }

    console.log(`[WEBHOOK] Parsed payload keys: ${Object.keys(payload).join(', ')}`);
  } catch (parseErr) {
    console.error('[WEBHOOK] ✗ Body read/parse failed:', parseErr);
    // Still store the raw body/params for debugging even if parse fails
    try {
      await db.run(
        `INSERT INTO webhook_events (source, raw_payload, signature_valid, processed, note, request_headers, request_ip, user_agent, content_type, request_method) VALUES (?, ?::jsonb, ?, ?, ?, ?::jsonb, ?, ?, ?, ?)`,
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
          method,
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
      try {
        await db.run(
          `INSERT INTO webhook_events (source, raw_payload, signature_valid, processed, note, request_headers, request_ip, user_agent, content_type, request_method) VALUES (?, ?::jsonb, ?, ?, ?, ?::jsonb, ?, ?, ?, ?)`,
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
            method,
          ]
        );
      } catch (dbErr) {
        console.error('[WEBHOOK] ✗ Failed to log invalid signature event to DB:', dbErr);
      }
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    // 3. Parse payload
    const parsed = parseBankWebhookPayload(payload);
    console.log(`[WEBHOOK] Parsed → UTR: ${parsed.utr || 'N/A'} | Amount: ${parsed.amount} | Sender: ${parsed.sender_name || 'N/A'} | Source: ${parsed.source}`);

    // Ensure all numeric values are clean (no NaN) and dates are valid before inserting
    const paidAtStr = (parsed.paid_at instanceof Date && !isNaN(parsed.paid_at.getTime())) ? parsed.paid_at.toISOString() : null;
    const finalAmount = (parsed.amount !== null && parsed.amount !== undefined && !isNaN(parsed.amount)) ? parsed.amount : null;
    const customerPaid = (parsed.customer_paid !== null && parsed.customer_paid !== undefined && !isNaN(parsed.customer_paid)) ? parsed.customer_paid : null;
    const mdrGst = (parsed.mdr_gst !== null && parsed.mdr_gst !== undefined && !isNaN(parsed.mdr_gst)) ? parsed.mdr_gst : null;
    const amountReceived = (parsed.amount_received !== null && parsed.amount_received !== undefined && !isNaN(parsed.amount_received)) ? parsed.amount_received : null;

    // 4. If no UTR extracted, log and return 200
    if (!parsed.utr) {
      console.log('[WEBHOOK] No UTR extracted — logging as no_utr');
      try {
        await db.run(
          `INSERT INTO webhook_events (source, amount, paid_at, raw_payload, signature_valid, processed, note, payment_type, sender_name, payment_method, payment_app, customer_paid, mdr_gst, amount_received, request_headers, request_ip, user_agent, content_type, request_method) VALUES (?, ?, ?, ?::jsonb, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?::jsonb, ?, ?, ?, ?)`,
          [
            parsed.source || 'unknown',
            finalAmount,
            paidAtStr,
            JSON.stringify(payload),
            true,
            false,
            'Could not extract UTR from raw_screen',
            parsed.payment_type,
            parsed.sender_name,
            parsed.payment_method,
            parsed.payment_app,
            customerPaid,
            mdrGst,
            amountReceived,
            JSON.stringify(requestHeaders),
            requestIp,
            userAgent,
            contentType,
            method,
          ]
        );
      } catch (dbErr) {
        console.error('[WEBHOOK] ✗ Failed to log no-UTR event to DB:', dbErr);
      }
      return NextResponse.json({ status: 'logged_no_utr' }, { status: 200 });
    }

    // 5. Find matching transaction by UTR
    const transaction = await db.get(
      `SELECT ztake_order_id, amount, status, vendor_id, callback_url, merchant_order_id, currency, customer_name, webhook_verified FROM orders WHERE utr = ?`,
      [parsed.utr]
    );

    // Common insert params for all UTR-bearing events
    const baseInsertSql = `INSERT INTO webhook_events (source, utr, google_txn_id, amount, paid_at, raw_payload, signature_valid, matched_txn_id, processed, note, payment_type, sender_name, payment_method, payment_app, customer_paid, mdr_gst, amount_received, request_headers, request_ip, user_agent, content_type, request_method) VALUES (?, ?, ?, ?, ?, ?::jsonb, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?::jsonb, ?, ?, ?, ?)`;
    const baseParams = (matchedTxnId: string | null, isProcessed: boolean, note: string) => [
      parsed.source || '',
      parsed.utr,
      parsed.google_txn_id,
      finalAmount,
      paidAtStr,
      JSON.stringify(payload),
      true,
      matchedTxnId,
      isProcessed,
      note,
      parsed.payment_type,
      parsed.sender_name,
      parsed.payment_method,
      parsed.payment_app,
      customerPaid,
      mdrGst,
      amountReceived,
      JSON.stringify(requestHeaders),
      requestIp,
      userAgent,
      contentType,
      method,
    ];

    // 6. Idempotency — if already verified, skip silently
    if (transaction?.webhook_verified === true || transaction?.webhook_verified === 1) {
      console.log(`[WEBHOOK] Duplicate — UTR ${parsed.utr} already verified for order ${transaction.ztake_order_id}`);
      try {
        await db.run(baseInsertSql, baseParams(transaction.ztake_order_id, true, 'Duplicate — already webhook-verified'));
      } catch (dbErr) {
        console.error('[WEBHOOK] ✗ Failed to log duplicate webhook event:', dbErr);
      }
      return NextResponse.json({ status: 'already_processed' }, { status: 200 });
    }

    // 7. Matched — auto-verify
    if (transaction) {
      try {
        console.log(`[WEBHOOK] ✓ UTR ${parsed.utr} matched to order ${transaction.ztake_order_id} — auto-verifying`);
        
        const expectedAmount = Number(transaction.amount);
        const receivedAmount = finalAmount !== null ? Number(finalAmount) : expectedAmount;
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

        try {
          await db.run(baseInsertSql, baseParams(transaction.ztake_order_id, true, note));
        } catch (dbErr) {
          console.error('[WEBHOOK] ✗ Failed to log matched success event:', dbErr);
        }
        return NextResponse.json({ status: 'verified', transaction_id: transaction.ztake_order_id }, { status: 200 });
      } catch (err) {
        console.error('[WEBHOOK] ✗ Error processing matched transaction:', err);
        return NextResponse.json({ error: 'Failed to process' }, { status: 500 });
      }
    }

    // 8. No matching transaction found — log as unmatched
    console.log(`[WEBHOOK] No matching order for UTR ${parsed.utr} — logging as unmatched`);
    try {
      await db.run(baseInsertSql, baseParams(null, false, `No PENDING transaction found for UTR: ${parsed.utr}`));
    } catch (dbErr) {
      console.error('[WEBHOOK] ✗ Failed to log unmatched event:', dbErr);
    }
    return NextResponse.json({ status: 'logged_unmatched' }, { status: 200 });

  } catch (topLevelErr) {
    // CRITICAL: Log the error and STILL try to store the event in DB
    console.error('[WEBHOOK] ✗ CRITICAL top-level error:', topLevelErr);
    try {
      await db.run(
        `INSERT INTO webhook_events (source, raw_payload, signature_valid, processed, note, request_headers, request_ip, user_agent, content_type, request_method) VALUES (?, ?::jsonb, ?, ?, ?, ?::jsonb, ?, ?, ?, ?)`,
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
          method,
        ]
      );
    } catch (dbErr) {
      console.error('[WEBHOOK] ✗ Even DB storage failed:', dbErr);
    }
    return NextResponse.json({ status: 'error_logged', error: 'Internal processing error' }, { status: 200 });
  }
}

// Export HTTP method handlers for standard web request verbs
export async function GET(req: NextRequest) {
  return handleWebhook(req);
}

export async function POST(req: NextRequest) {
  return handleWebhook(req);
}

export async function PUT(req: NextRequest) {
  return handleWebhook(req);
}

export async function PATCH(req: NextRequest) {
  return handleWebhook(req);
}

export async function DELETE(req: NextRequest) {
  return handleWebhook(req);
}
