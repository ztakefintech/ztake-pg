import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database';
import { requirePermission } from '@/lib/admin-middleware';

export const dynamic = 'force-dynamic';

export const GET = requirePermission('view_payments')(
  async (req: NextRequest, { params }: { params: { id: string } }) => {
    try {
      const id = parseInt(params.id);
      
      if (isNaN(id)) {
        return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
      }

      let event;
      if (id >= 1000000) {
        const rawId = id - 1000000;
        event = await db.get(
          `SELECT 
            pw.id + 1000000 as id,
            pw.received_at,
            COALESCE(pw.source, 'tasker') as source,
            pw.upi_transaction_id as utr,
            pw.google_transaction_id as google_txn_id,
            NULL::decimal as amount,
            NULL::timestamp as paid_at,
            true as signature_valid,
            NULL as matched_txn_id,
            false as processed,
            pw.customer as note,
            COALESCE(pw.full_payload, '{}'::jsonb) as raw_payload,
            'unknown' as payment_type,
            pw.customer as sender_name,
            NULL as payment_method,
            NULL as payment_app,
            NULL::decimal as customer_paid,
            NULL::decimal as mdr_gst,
            NULL::decimal as amount_received,
            COALESCE(pw.request_headers, '{}'::jsonb) as request_headers,
            NULL as request_ip,
            NULL as user_agent,
            NULL as content_type,
            COALESCE(pw.request_method, 'POST') as request_method
          FROM payment_webhooks pw WHERE pw.id = ?`,
          [rawId]
        );
      } else {
        event = await db.get(
          `SELECT 
            id, received_at, source, utr, google_txn_id, amount, paid_at,
            signature_valid, matched_txn_id, processed, note, raw_payload,
            payment_type, sender_name, payment_method, payment_app,
            customer_paid, mdr_gst, amount_received,
            request_headers, request_ip, user_agent, content_type, request_method
          FROM webhook_events WHERE id = ?`,
          [id]
        );
      }

      if (!event) {
        return NextResponse.json({ error: 'Webhook event not found' }, { status: 404 });
      }

      return NextResponse.json({ event });
    } catch (error) {
      console.error('Get webhook event detail error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch webhook event detail' },
        { status: 500 }
      );
    }
  }
);
