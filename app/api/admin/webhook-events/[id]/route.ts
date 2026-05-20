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

      const event = await db.get(
        `SELECT 
          id, received_at, source, utr, google_txn_id, amount, paid_at,
          signature_valid, matched_txn_id, processed, note, raw_payload,
          payment_type, sender_name, payment_method, payment_app,
          customer_paid, mdr_gst, amount_received,
          request_headers, request_ip, user_agent, content_type
        FROM webhook_events WHERE id = ?`,
        [id]
      );

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
