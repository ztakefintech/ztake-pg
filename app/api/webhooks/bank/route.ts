import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database';
import { parseBankWebhookPayload } from '@/lib/webhooks/parse-bank-payload';
import crypto from 'crypto';

// Disable body parser — read raw for signature verification
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  let rawBody = '';
  let payload: any = {};

  // 1. Read raw body
  try {
    rawBody = await req.text();
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

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
    if (!secret) console.warn('WEBHOOK_SECRET not set – skipping signature verification');
    signatureValid = true;
  }

  if (!signatureValid) {
    await db.run(
      `INSERT INTO webhook_events (source, raw_payload, signature_valid, processed, note) VALUES (?, ?, ?, ?, ?)`,
      [payload.source || 'unknown', JSON.stringify(payload), false, false, 'Invalid or missing webhook signature']
    );
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  // 3. Parse payload
  const parsed = parseBankWebhookPayload(payload);

  // 4. If no UTR extracted, log and return 200
  if (!parsed.utr) {
    await db.run(
      `INSERT INTO webhook_events (source, amount, paid_at, raw_payload, signature_valid, processed, note) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        parsed.source || 'unknown',
        parsed.amount,
        parsed.paid_at ? parsed.paid_at.toISOString() : null,
        JSON.stringify(payload),
        true,
        false,
        'Could not extract UTR from raw_screen'
      ]
    );
    return NextResponse.json({ status: 'logged_no_utr' }, { status: 200 });
  }

  // 5. Find matching PENDING transaction by UTR
  const transaction = await db.get(
    `SELECT ztake_order_id, webhook_verified FROM orders WHERE utr = ?`,
    [parsed.utr]
  );

  // 6. Idempotency — if already verified, skip silently
  if (transaction?.webhook_verified === true || transaction?.webhook_verified === 1) {
    await db.run(
      `INSERT INTO webhook_events (source, utr, google_txn_id, amount, paid_at, raw_payload, signature_valid, matched_txn_id, processed, note) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        parsed.source || '',
        parsed.utr,
        parsed.google_txn_id,
        parsed.amount,
        parsed.paid_at ? parsed.paid_at.toISOString() : null,
        JSON.stringify(payload),
        true,
        transaction.ztake_order_id,
        true,
        'Duplicate — already webhook-verified'
      ]
    );
    return NextResponse.json({ status: 'already_processed' }, { status: 200 });
  }

  // 7. Matched — auto-verify
  if (transaction) {
    try {
      // Begin transaction? SQLite supports BEGIN/COMMIT, but for pg we might just use sequential await since we don't have transaction helper exposed in Database class
      // It's safer to just run sequential queries
      await db.run(
        `UPDATE orders SET status = 'Succeeded', payment_time = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP, webhook_verified = true, webhook_verified_at = CURRENT_TIMESTAMP, verification_source = 'webhook' WHERE ztake_order_id = ?`,
        [transaction.ztake_order_id]
      );

      await db.run(
        `INSERT INTO webhook_events (source, utr, google_txn_id, amount, paid_at, raw_payload, signature_valid, matched_txn_id, processed, note) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          parsed.source || '',
          parsed.utr,
          parsed.google_txn_id,
          parsed.amount,
          parsed.paid_at ? parsed.paid_at.toISOString() : null,
          JSON.stringify(payload),
          true,
          transaction.ztake_order_id,
          true,
          'Auto-verified via webhook UTR match'
        ]
      );

      return NextResponse.json({ status: 'verified', transaction_id: transaction.ztake_order_id }, { status: 200 });
    } catch (err) {
      console.error('Error processing matched transaction:', err);
      return NextResponse.json({ error: 'Failed to process' }, { status: 500 });
    }
  }

  // 8. No matching transaction found — log as unmatched
  await db.run(
    `INSERT INTO webhook_events (source, utr, google_txn_id, amount, paid_at, raw_payload, signature_valid, matched_txn_id, processed, note) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      parsed.source || '',
      parsed.utr,
      parsed.google_txn_id,
      parsed.amount,
      parsed.paid_at ? parsed.paid_at.toISOString() : null,
      JSON.stringify(payload),
      true,
      null,
      false,
      `No PENDING transaction found for UTR: ${parsed.utr}`
    ]
  );

  return NextResponse.json({ status: 'logged_unmatched' }, { status: 200 });
}
