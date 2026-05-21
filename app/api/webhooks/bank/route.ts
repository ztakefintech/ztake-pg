import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database';
import { parseBankWebhookPayload } from '@/lib/webhooks/parse-bank-payload';
import crypto from 'crypto';
import { eventStore } from '@/lib/event-store';
import { sendTelegramAdminAlert } from '@/lib/telegram';

// Force dynamic — never cache webhooks
export const dynamic = 'force-dynamic';

// CORS headers for webhook responses
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS, HEAD',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-webhook-signature, x-api-key, x-forwarded-for, x-real-ip',
};

/**
 * Extract request metadata for debugging (like webhook.site)
 */
function extractRequestMeta(req: NextRequest) {
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
  return { requestHeaders, requestIp, userAgent, contentType };
}

/**
 * Try to parse the body from the request in every possible format.
 * Returns { rawBody, payload } — payload is ALWAYS an object, even if empty.
 */
async function parseRequestBody(req: NextRequest, method: string, contentType: string): Promise<{ rawBody: string; payload: Record<string, any> }> {
  let rawBody = '';
  let payload: Record<string, any> = {};

  // GET query params (always extracted)
  const queryParams: Record<string, string> = {};
  req.nextUrl.searchParams.forEach((value, key) => {
    queryParams[key] = value;
  });

  // For GET/HEAD, query params ARE the payload
  if (method === 'GET' || method === 'HEAD') {
    rawBody = req.nextUrl.search || '';
    payload = { ...queryParams };
    return { rawBody, payload };
  }

  // For methods with body, try parsing in order of priority
  // 1. Try multipart/form-data
  if (contentType.includes('multipart/form-data')) {
    try {
      const formData = await req.formData();
      const entries: string[] = [];
      formData.forEach((value, key) => {
        if (typeof value === 'string') {
          let decodedVal = value;
          try { decodedVal = decodeURIComponent(value.replace(/\+/g, ' ')); } catch {}
          payload[key] = decodedVal;
          entries.push(`${key}=${value}`);
        }
      });
      rawBody = entries.join('&');
      console.log(`[WEBHOOK] Parsed as multipart/form-data with ${Object.keys(payload).length} fields`);
    } catch (err) {
      console.warn('[WEBHOOK] multipart/form-data parse failed, falling through:', err);
    }
  }

  // 2. If not parsed yet, read raw body text
  if (Object.keys(payload).length === 0) {
    try {
      rawBody = await req.text();
    } catch (err) {
      console.warn('[WEBHOOK] Could not read body text:', err);
      rawBody = '';
    }

    const trimmedBody = rawBody.trim();

    if (trimmedBody.length > 0) {
      // 2a. Try JSON first (regardless of Content-Type — Tasker often misconfigures)
      try {
        const parsed = JSON.parse(trimmedBody);
        if (typeof parsed === 'object' && parsed !== null) {
          payload = parsed;
          console.log('[WEBHOOK] Parsed body as JSON');
        } else {
          // JSON parsed but to a primitive — wrap it
          payload = { value: parsed, raw_screen: trimmedBody, source: 'json_primitive' };
        }
      } catch {
        // Not JSON, continue
      }

      // 2b. Try URL-encoded form data
      if (Object.keys(payload).length === 0 && trimmedBody.includes('=')) {
        try {
          const params = new URLSearchParams(trimmedBody);
          const entries = Array.from(params.entries());
          if (entries.length > 0) {
            const firstKey = entries[0][0];
            if (!firstKey.startsWith('{') && !firstKey.startsWith('[')) {
              for (const [key, value] of entries) {
                let dk = key, dv = value;
                try { dk = decodeURIComponent(key.replace(/\+/g, ' ')); dv = decodeURIComponent(value.replace(/\+/g, ' ')); } catch {}
                payload[dk] = dv;
              }
              console.log(`[WEBHOOK] Parsed as URL-encoded form data with ${entries.length} fields`);
            }
          }
        } catch {}
      }

      // 2c. Fallback: treat entire body as raw notification text
      if (Object.keys(payload).length === 0) {
        console.log(`[WEBHOOK] Treating body as raw notification text (${trimmedBody.length} bytes)`);
        payload = { raw_screen: trimmedBody, source: 'raw_text' };
      }
    }
  }

  // 3. Merge query params into payload as fallback
  payload = { ...queryParams, ...payload };

  return { rawBody, payload };
}

/**
 * Store a webhook event in the database — NEVER throws, always returns.
 */
async function storeWebhookEvent(data: {
  source: string;
  utr?: string | null;
  google_txn_id?: string | null;
  amount?: number | null;
  paid_at?: string | null;
  raw_payload: any;
  signature_valid: boolean;
  matched_txn_id?: string | null;
  processed: boolean;
  note: string;
  payment_type?: string;
  sender_name?: string | null;
  payment_method?: string | null;
  payment_app?: string | null;
  customer_paid?: number | null;
  mdr_gst?: number | null;
  amount_received?: number | null;
  request_headers: any;
  request_ip: string;
  user_agent: string;
  content_type: string;
  request_method: string;
}): Promise<number> {
  try {
    const result = await db.run(
      `INSERT INTO webhook_events (source, utr, google_txn_id, amount, paid_at, raw_payload, signature_valid, matched_txn_id, processed, note, payment_type, sender_name, payment_method, payment_app, customer_paid, mdr_gst, amount_received, request_headers, request_ip, user_agent, content_type, request_method) VALUES (?, ?, ?, ?, ?, ?::jsonb, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?::jsonb, ?, ?, ?, ?)`,
      [
        data.source || 'unknown',
        data.utr || null,
        data.google_txn_id || null,
        data.amount ?? null,
        data.paid_at || null,
        JSON.stringify(data.raw_payload || {}),
        data.signature_valid,
        data.matched_txn_id || null,
        data.processed,
        data.note,
        data.payment_type || 'unknown',
        data.sender_name || null,
        data.payment_method || null,
        data.payment_app || null,
        data.customer_paid ?? null,
        data.mdr_gst ?? null,
        data.amount_received ?? null,
        JSON.stringify(data.request_headers || {}),
        data.request_ip,
        data.user_agent,
        data.content_type,
        data.request_method,
      ]
    );
    return result.lastID;
  } catch (dbErr) {
    console.error('[WEBHOOK] ✗ DB insert failed:', dbErr);
    return 0;
  }
}

/**
 * Main Webhook Handler — accepts ALL HTTP methods, ALL content types, ALL formats.
 * NEVER rejects a request. Every request is logged to webhook_events.
 * Signature verification is informational only — never blocks.
 */
async function handleWebhook(req: NextRequest): Promise<NextResponse> {
  const method = req.method;
  const { requestHeaders, requestIp, userAgent, contentType } = extractRequestMeta(req);

  console.log(`[WEBHOOK] ← ${method} /api/webhooks/bank | IP: ${requestIp} | UA: ${userAgent} | CT: ${contentType}`);

  // GET with no params = health check
  const queryParams: Record<string, string> = {};
  req.nextUrl.searchParams.forEach((value, key) => { queryParams[key] = value; });
  if (method === 'GET' && Object.keys(queryParams).length === 0) {
    return NextResponse.json({
      status: 'ok',
      endpoint: '/api/webhooks/bank',
      method,
      accepts: 'ALL methods (GET/POST/PUT/PATCH/DELETE), ALL content types, ALL formats',
      description: 'Universal webhook receiver for GPay Business / Tasker / any payment notification.',
      timestamp: new Date().toISOString(),
    }, { headers: CORS_HEADERS });
  }

  // Parse body — NEVER throws
  let rawBody = '';
  let payload: Record<string, any> = {};
  try {
    const parsed = await parseRequestBody(req, method, contentType);
    rawBody = parsed.rawBody;
    payload = parsed.payload;
  } catch (err) {
    console.error('[WEBHOOK] Body parse error (non-blocking):', err);
    payload = { error: 'body_parse_failed', raw_preview: rawBody.substring(0, 2000) };
  }

  console.log(`[WEBHOOK] Payload keys: ${Object.keys(payload).join(', ') || '(empty)'} | Raw length: ${rawBody.length}`);

  // If payload is STILL empty — log it and return 200 (never reject)
  if (!payload || Object.keys(payload).length === 0) {
    console.warn('[WEBHOOK] Empty payload received — logging as empty_request');
    const eventId = await storeWebhookEvent({
      source: 'unknown',
      raw_payload: { note: 'Empty body/params received', raw_body_preview: rawBody.substring(0, 2000), query: queryParams },
      signature_valid: true,
      processed: false,
      note: `Empty payload received. Method: ${method}, Content-Type: ${contentType}`,
      request_headers: requestHeaders,
      request_ip: requestIp,
      user_agent: userAgent,
      content_type: contentType,
      request_method: method,
    });
    return NextResponse.json({ status: 'logged_empty', id: eventId }, { status: 200, headers: CORS_HEADERS });
  }

  // Top-level try/catch — NEVER let the handler crash
  try {
    // Signature verification — INFORMATIONAL ONLY, never blocks
    const signature = req.headers.get('x-webhook-signature') || '';
    const secret = process.env.WEBHOOK_SECRET || '';
    let signatureValid = true; // Default to true — accept everything

    if (secret && signature && signature !== 'debug-test') {
      try {
        const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
        signatureValid = crypto.timingSafeEqual(
          Buffer.from(expected, 'hex'),
          Buffer.from(signature, 'hex')
        );
      } catch {
        signatureValid = false;
      }
      if (!signatureValid) {
        console.warn('[WEBHOOK] Signature mismatch (non-blocking — still accepting)');
      }
    }

    // Parse payment data from payload
    const parsed = parseBankWebhookPayload(payload);
    console.log(`[WEBHOOK] Parsed → UTR: ${parsed.utr || 'N/A'} | Amount: ${parsed.amount} | Sender: ${parsed.sender_name || 'N/A'} | Source: ${parsed.source}`);

    // Clean numeric values
    const paidAtStr = (parsed.paid_at instanceof Date && !isNaN(parsed.paid_at.getTime())) ? parsed.paid_at.toISOString() : null;
    const finalAmount = (parsed.amount !== null && parsed.amount !== undefined && !isNaN(parsed.amount)) ? parsed.amount : null;
    const customerPaid = (parsed.customer_paid !== null && parsed.customer_paid !== undefined && !isNaN(parsed.customer_paid)) ? parsed.customer_paid : null;
    const mdrGst = (parsed.mdr_gst !== null && parsed.mdr_gst !== undefined && !isNaN(parsed.mdr_gst)) ? parsed.mdr_gst : null;
    const amountReceived = (parsed.amount_received !== null && parsed.amount_received !== undefined && !isNaN(parsed.amount_received)) ? parsed.amount_received : null;

    // No UTR extracted — log and return 200
    if (!parsed.utr) {
      console.log('[WEBHOOK] No UTR extracted — logging as received (no_utr)');
      const eventId = await storeWebhookEvent({
        source: parsed.source || 'unknown',
        amount: finalAmount,
        paid_at: paidAtStr,
        raw_payload: payload,
        signature_valid: signatureValid,
        processed: false,
        note: 'Received — no UTR could be extracted from payload',
        payment_type: parsed.payment_type,
        sender_name: parsed.sender_name,
        payment_method: parsed.payment_method,
        payment_app: parsed.payment_app,
        customer_paid: customerPaid,
        mdr_gst: mdrGst,
        amount_received: amountReceived,
        request_headers: requestHeaders,
        request_ip: requestIp,
        user_agent: userAgent,
        content_type: contentType,
        request_method: method,
      });
      return NextResponse.json({ status: 'logged_no_utr', id: eventId }, { status: 200, headers: CORS_HEADERS });
    }

    // Find matching transaction by UTR
    const transaction = await db.get(
      `SELECT ztake_order_id, amount, status, vendor_id, callback_url, merchant_order_id, currency, customer_name, webhook_verified FROM orders WHERE utr = ?`,
      [parsed.utr]
    );

    // Helper for building store params
    const buildStoreData = (matchedTxnId: string | null, isProcessed: boolean, note: string) => ({
      source: parsed.source || '',
      utr: parsed.utr,
      google_txn_id: parsed.google_txn_id,
      amount: finalAmount,
      paid_at: paidAtStr,
      raw_payload: payload,
      signature_valid: signatureValid,
      matched_txn_id: matchedTxnId,
      processed: isProcessed,
      note,
      payment_type: parsed.payment_type,
      sender_name: parsed.sender_name,
      payment_method: parsed.payment_method,
      payment_app: parsed.payment_app,
      customer_paid: customerPaid,
      mdr_gst: mdrGst,
      amount_received: amountReceived,
      request_headers: requestHeaders,
      request_ip: requestIp,
      user_agent: userAgent,
      content_type: contentType,
      request_method: method,
    });

    // Idempotency — already verified
    if (transaction?.webhook_verified === true || transaction?.webhook_verified === 1) {
      console.log(`[WEBHOOK] Duplicate — UTR ${parsed.utr} already verified for order ${transaction.ztake_order_id}`);
      await storeWebhookEvent(buildStoreData(transaction.ztake_order_id, true, 'Duplicate — already webhook-verified'));
      return NextResponse.json({ status: 'already_processed' }, { status: 200, headers: CORS_HEADERS });
    }

    // Matched — auto-verify
    if (transaction) {
      try {
        console.log(`[WEBHOOK] ✓ UTR ${parsed.utr} matched to order ${transaction.ztake_order_id} — auto-verifying`);

        const expectedAmount = Number(transaction.amount);
        const receivedAmount = finalAmount !== null ? Number(finalAmount) : expectedAmount;
        const amountMatches = expectedAmount === receivedAmount;

        let note = 'Auto-verified via webhook UTR match';
        if (!amountMatches) {
          console.warn(`[WEBHOOK] ⚠ Amount mismatch: expected ₹${expectedAmount}, received ₹${receivedAmount}`);
          note = `Auto-verified but amount mismatch: expected ₹${expectedAmount}, received ₹${receivedAmount}`;
        }

        // Update order
        await db.run(
          `UPDATE orders SET status = 'Succeeded', amount = ?, payment_time = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP, webhook_verified = true, webhook_verified_at = CURRENT_TIMESTAMP, verification_source = 'webhook' WHERE ztake_order_id = ?`,
          [receivedAmount, transaction.ztake_order_id]
        );

        // Sync payments table
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

          // Emit WebSocket event
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

            // Telegram alert
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

        await storeWebhookEvent(buildStoreData(transaction.ztake_order_id, true, note));
        return NextResponse.json({ status: 'verified', transaction_id: transaction.ztake_order_id }, { status: 200, headers: CORS_HEADERS });
      } catch (err) {
        console.error('[WEBHOOK] ✗ Error processing matched transaction:', err);
        await storeWebhookEvent(buildStoreData(transaction.ztake_order_id, false, `Processing error: ${err instanceof Error ? err.message : String(err)}`));
        return NextResponse.json({ error: 'Failed to process' }, { status: 500, headers: CORS_HEADERS });
      }
    }

    // No matching transaction — log as unmatched (still 200)
    console.log(`[WEBHOOK] No matching order for UTR ${parsed.utr} — logging as unmatched`);
    const eventId = await storeWebhookEvent(buildStoreData(null, false, `No PENDING transaction found for UTR: ${parsed.utr}`));
    return NextResponse.json({ status: 'logged_unmatched', id: eventId }, { status: 200, headers: CORS_HEADERS });

  } catch (topLevelErr) {
    // CRITICAL: Log error, store event, NEVER crash
    console.error('[WEBHOOK] ✗ CRITICAL top-level error:', topLevelErr);
    const eventId = await storeWebhookEvent({
      source: payload?.source || 'error',
      raw_payload: payload || {},
      signature_valid: true,
      processed: false,
      note: `CRITICAL ERROR: ${topLevelErr instanceof Error ? topLevelErr.message : String(topLevelErr)}`,
      request_headers: requestHeaders,
      request_ip: requestIp,
      user_agent: userAgent,
      content_type: contentType,
      request_method: method,
    });
    return NextResponse.json({ status: 'error_logged', id: eventId, error: 'Internal processing error' }, { status: 200, headers: CORS_HEADERS });
  }
}

// Export HTTP method handlers — ALL methods accepted
export async function GET(req: NextRequest) { return handleWebhook(req); }
export async function POST(req: NextRequest) { return handleWebhook(req); }
export async function PUT(req: NextRequest) { return handleWebhook(req); }
export async function PATCH(req: NextRequest) { return handleWebhook(req); }
export async function DELETE(req: NextRequest) { return handleWebhook(req); }

export async function OPTIONS() {
  return NextResponse.json({}, { status: 200, headers: CORS_HEADERS });
}
