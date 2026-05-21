import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database';
import { requirePermission } from '@/lib/admin-middleware';

export const dynamic = 'force-dynamic';

export const GET = requirePermission('view_payments')(async (req: NextRequest) => {
  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const status = searchParams.get('status') || 'all';
    
    const offset = (page - 1) * limit;
    
    // Build WHERE clause
    let whereClause = 'WHERE 1=1';
    const filterParams: any[] = [];
    
    if (status === 'matched') {
      whereClause += ` AND matched_txn_id IS NOT NULL AND processed = true`;
    } else if (status === 'unmatched') {
      whereClause += ` AND matched_txn_id IS NULL AND signature_valid = true`;
    } else if (status === 'invalid') {
      whereClause += ` AND signature_valid = false`;
    }

    // Simple, reliable query from webhook_events only
    const events = await db.all(`
      SELECT 
        id,
        received_at,
        source,
        utr,
        google_txn_id,
        amount,
        paid_at,
        signature_valid,
        matched_txn_id,
        processed,
        note,
        raw_payload,
        payment_type,
        sender_name,
        payment_method,
        payment_app,
        customer_paid,
        mdr_gst,
        amount_received,
        request_headers,
        request_ip,
        user_agent,
        content_type,
        request_method
      FROM webhook_events
      ${whereClause}
      ORDER BY received_at DESC
      LIMIT ? OFFSET ?
    `, [...filterParams, limit, offset]);

    const totalResult = await db.get(`
      SELECT COUNT(*) as total
      FROM webhook_events
      ${whereClause}
    `, filterParams);

    const total = parseInt(totalResult?.total || '0');
    const totalPages = Math.ceil(total / limit);

    // Also try to fetch from payment_webhooks and append (best-effort, non-blocking)
    let extraEvents: any[] = [];
    if (status === 'all' && page === 1) {
      try {
        extraEvents = await db.all(`
          SELECT 
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
          FROM payment_webhooks pw
          WHERE NOT EXISTS (
            SELECT 1 FROM webhook_events we 
            WHERE we.utr IS NOT NULL 
            AND pw.upi_transaction_id IS NOT NULL
            AND we.utr = pw.upi_transaction_id
          )
          ORDER BY pw.received_at DESC
          LIMIT 50
        `);
      } catch (pwErr) {
        // payment_webhooks table may not exist — that's fine, just skip
        console.warn('Could not query payment_webhooks (table may not exist):', pwErr instanceof Error ? pwErr.message : pwErr);
      }
    }

    // Merge and sort
    let allEvents = [...events];
    if (extraEvents.length > 0) {
      // Mark extra events with table_source
      extraEvents = extraEvents.map(e => ({ ...e, table_source: 'payment_webhooks' }));
      allEvents = [...events, ...extraEvents]
        .sort((a, b) => new Date(b.received_at).getTime() - new Date(a.received_at).getTime())
        .slice(0, limit);
    }

    return NextResponse.json({
      events: allEvents,
      taskerWebhookKey: process.env.TASKER_WEBHOOK_KEY || '',
      pagination: {
        page,
        limit,
        total: total + extraEvents.length,
        totalPages: Math.ceil((total + extraEvents.length) / limit),
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    });
  } catch (error) {
    console.error('Get webhook events error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch webhook events', details: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    );
  }
});
