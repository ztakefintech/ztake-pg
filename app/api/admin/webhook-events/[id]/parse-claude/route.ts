import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database';
import { requirePermission } from '@/lib/admin-middleware';
import { parsePayloadWithClaude } from '@/lib/webhooks/claude-parser';
import { eventStore } from '@/lib/event-store';
import { sendTelegramAdminAlert } from '@/lib/telegram';

export const dynamic = 'force-dynamic';

export const POST = requirePermission('view_payments')(
  async (req: NextRequest, { params }: { params: { id: string } }) => {
    try {
      const id = parseInt(params.id);
      
      if (isNaN(id)) {
        return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
      }

      const apiKey = process.env.ANTHROPIC_API_KEY;
      if (!apiKey) {
        return NextResponse.json(
          { error: 'Claude API key is not configured on the server.' },
          { status: 503 }
        );
      }

      let originalEvent: any = null;
      let isTaskerTable = false;

      // 1. Fetch the original webhook payload
      if (id >= 1000000) {
        isTaskerTable = true;
        const rawId = id - 1000000;
        originalEvent = await db.get(
          `SELECT id, received_at, amount, customer, time, raw_screen, upi_transaction_id, google_transaction_id, source, timestamp, full_payload, request_headers, request_method 
           FROM payment_webhooks WHERE id = ?`,
          [rawId]
        );
      } else {
        originalEvent = await db.get(
          `SELECT id, received_at, source, utr, google_txn_id, amount, paid_at, raw_payload, signature_valid, matched_txn_id, processed, note, request_headers, request_ip, user_agent, content_type, request_method 
           FROM webhook_events WHERE id = ?`,
          [id]
        );
      }

      if (!originalEvent) {
        return NextResponse.json({ error: 'Webhook event not found' }, { status: 404 });
      }

      // 2. Determine raw data to parse
      let payloadToParse: any = null;
      if (isTaskerTable) {
        payloadToParse = originalEvent.full_payload || {};
        if (typeof payloadToParse === 'string') {
          try { payloadToParse = JSON.parse(payloadToParse); } catch {}
        }
        if (!payloadToParse || Object.keys(payloadToParse).length === 0) {
          payloadToParse = {
            raw_screen: originalEvent.raw_screen,
            amount: originalEvent.amount,
            customer: originalEvent.customer,
            upi_transaction_id: originalEvent.upi_transaction_id,
            google_transaction_id: originalEvent.google_transaction_id,
            source: originalEvent.source
          };
        }
      } else {
        payloadToParse = originalEvent.raw_payload || {};
        if (typeof payloadToParse === 'string') {
          try { payloadToParse = JSON.parse(payloadToParse); } catch {}
        }
      }

      // 3. Parse with Claude AI
      console.log(`[CLAUDE ADMIN PARSE] Invoking Claude AI for event ID: ${id}...`);
      const claudeParsed = await parsePayloadWithClaude(payloadToParse);
      console.log(`[CLAUDE ADMIN PARSE] Claude parsed UTR: ${claudeParsed.utr} | Amount: ${claudeParsed.amount}`);

      // 4. Order Matching & Verification
      let matched = false;
      let matchedOrderId: string | null = null;
      let note = 'Manually parsed via Claude AI';

      if (claudeParsed.utr) {
        const transaction = await db.get(
          `SELECT ztake_order_id, amount, status, vendor_id, callback_url, merchant_order_id, currency, customer_name, webhook_verified FROM orders WHERE utr = ?`,
          [claudeParsed.utr]
        );

        if (transaction) {
          matched = true;
          matchedOrderId = transaction.ztake_order_id;

          if (transaction.webhook_verified === true || transaction.webhook_verified === 1) {
            note = `Matched order ${transaction.ztake_order_id} (Already webhook-verified)`;
          } else {
            try {
              const expectedAmount = Number(transaction.amount);
              const receivedAmount = claudeParsed.amount !== null ? Number(claudeParsed.amount) : expectedAmount;
              const amountMatches = expectedAmount === receivedAmount;

              note = amountMatches
                ? `Auto-verified order ${transaction.ztake_order_id} via Claude UTR match`
                : `Auto-verified order ${transaction.ztake_order_id} but amount mismatch (expected ₹${expectedAmount}, received ₹${receivedAmount})`;

              // Update order status to Succeeded
              await db.run(
                `UPDATE orders SET status = 'Succeeded', amount = ?, payment_time = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP, webhook_verified = true, webhook_verified_at = CURRENT_TIMESTAMP, verification_source = 'webhook_claude' WHERE ztake_order_id = ?`,
                [receivedAmount, transaction.ztake_order_id]
              );

              // Sync payments table
              if (transaction.vendor_id) {
                const existingPayment = await db.get(
                  `SELECT id FROM payments WHERE utr = ? AND vendor_id = ?`,
                  [claudeParsed.utr, transaction.vendor_id]
                );
                if (existingPayment) {
                  await db.run(
                    `UPDATE payments SET order_id = ?, amount = ?, payment_status = 'Succeeded', checked_status = TRUE, checked_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
                    [transaction.ztake_order_id, receivedAmount, existingPayment.id]
                  );
                } else {
                  await db.run(
                    `INSERT INTO payments (order_id, utr, amount, vendor_id, status, payment_status, checked_status, checked_at) VALUES (?, ?, ?, ?, 'completed', 'Succeeded', TRUE, CURRENT_TIMESTAMP)`,
                    [transaction.ztake_order_id, claudeParsed.utr, receivedAmount, transaction.vendor_id]
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
                      utr: claudeParsed.utr,
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
                    '<b>🔔 Pay-in Payment Succeeded (Claude AI Match)</b>',
                    `• Vendor: ${vendor.business_name || `Vendor #${vendor.id}`} (${vendor.vendor_code || '-'})`,
                    `• Amount: ₹${receivedAmount} ${transaction.currency || 'INR'}`,
                    `• Customer: ${transaction.customer_name || 'Anonymous'}`,
                    `• Merchant Order ID: ${transaction.merchant_order_id || '-'}`,
                    `• Ztake Order ID: ${transaction.ztake_order_id}`,
                    `• UTR: ${claudeParsed.utr}`,
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
                  utr: claudeParsed.utr,
                  status: 'SUCCESS',
                  paymentTime: new Date().toISOString()
                };
                fetch(transaction.callback_url, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(successPayload)
                }).catch((err) => {
                  console.error('[CLAUDE WEBHOOK] Callback error:', err);
                });
              }
            } catch (err) {
              console.error('[CLAUDE WEBHOOK] Error processing order:', err);
              note = `Error verifying matched order: ${err instanceof Error ? err.message : String(err)}`;
            }
          }
        } else {
          note = `Unmatched UTR: ${claudeParsed.utr} (No pending order found)`;
        }
      } else {
        note = 'No UTR extracted from payload by Claude AI';
      }

      // 5. Update/Save parsed data to database
      let finalEventId = id;
      const paidAtStr = claudeParsed.paid_at ? new Date(claudeParsed.paid_at).toISOString() : null;

      if (isTaskerTable) {
        // Migrate Tasker table entry to unified webhook_events
        let reqHeaders = originalEvent.request_headers || {};
        if (typeof reqHeaders === 'string') {
          try { reqHeaders = JSON.parse(reqHeaders); } catch {}
        }
        
        const insertRes = await db.run(
          `INSERT INTO webhook_events (
            received_at, source, utr, google_txn_id, amount, paid_at, raw_payload, 
            signature_valid, matched_txn_id, processed, note, payment_type, sender_name, 
            payment_method, payment_app, customer_paid, mdr_gst, amount_received, 
            request_headers, request_ip, user_agent, content_type, request_method
          ) VALUES (?, ?, ?, ?, ?, ?, ?::jsonb, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?::jsonb, ?, ?, ?, ?)`,
          [
            originalEvent.received_at || new Date().toISOString(),
            originalEvent.source || 'tasker_claude',
            claudeParsed.utr,
            claudeParsed.google_txn_id,
            claudeParsed.amount,
            paidAtStr,
            JSON.stringify(payloadToParse),
            true, // signature valid override
            matchedOrderId,
            matched,
            note,
            claudeParsed.payment_type,
            claudeParsed.sender_name,
            claudeParsed.payment_method,
            claudeParsed.payment_app,
            claudeParsed.amount, // customer paid
            0, // fees
            claudeParsed.amount, // net amount received
            JSON.stringify(reqHeaders),
            'Tasker Ingest',
            'Tasker Agent',
            'application/json',
            originalEvent.request_method || 'POST'
          ]
        );

        finalEventId = insertRes.lastID;

        // Delete from fallback tasker table to prevent duplicate listings
        const rawId = id - 1000000;
        await db.run(`DELETE FROM payment_webhooks WHERE id = ?`, [rawId]);
        console.log(`[CLAUDE ADMIN PARSE] Migrated payment_webhooks #${rawId} to webhook_events #${finalEventId}`);
      } else {
        // Update existing webhook_events row
        await db.run(
          `UPDATE webhook_events SET 
            utr = ?, 
            google_txn_id = ?, 
            amount = ?, 
            paid_at = ?, 
            matched_txn_id = ?, 
            processed = ?, 
            note = ?, 
            payment_type = ?, 
            sender_name = ?, 
            payment_method = ?, 
            payment_app = ?, 
            customer_paid = ?, 
            amount_received = ? 
           WHERE id = ?`,
          [
            claudeParsed.utr || originalEvent.utr,
            claudeParsed.google_txn_id || originalEvent.google_txn_id,
            claudeParsed.amount !== null ? claudeParsed.amount : originalEvent.amount,
            paidAtStr || originalEvent.paid_at,
            matchedOrderId || originalEvent.matched_txn_id,
            matched || originalEvent.processed,
            note,
            claudeParsed.payment_type !== 'unknown' ? claudeParsed.payment_type : originalEvent.payment_type,
            claudeParsed.sender_name || originalEvent.sender_name,
            claudeParsed.payment_method || originalEvent.payment_method,
            claudeParsed.payment_app || originalEvent.payment_app,
            claudeParsed.amount !== null ? claudeParsed.amount : originalEvent.customer_paid,
            claudeParsed.amount !== null ? claudeParsed.amount : originalEvent.amount_received,
            id
          ]
        );
      }

      // Fetch the updated event to return
      const updatedEvent = await db.get(
        `SELECT id, received_at, source, utr, google_txn_id, amount, paid_at,
                signature_valid, matched_txn_id, processed, note, raw_payload,
                payment_type, sender_name, payment_method, payment_app,
                customer_paid, mdr_gst, amount_received,
                request_headers, request_ip, user_agent, content_type, request_method
         FROM webhook_events WHERE id = ?`,
        [finalEventId]
      );

      return NextResponse.json({
        success: true,
        message: note,
        matched,
        event: updatedEvent
      });

    } catch (error) {
      console.error('[CLAUDE ADMIN PARSE] Error manually parsing event:', error);
      return NextResponse.json(
        { error: 'Failed to parse payload with Claude AI', details: error instanceof Error ? error.message : 'Unknown' },
        { status: 500 }
      );
    }
  }
);
