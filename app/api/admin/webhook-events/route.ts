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
    
    // Build WHERE clause for the CTE query
    let whereClause = 'WHERE 1=1';
    if (status === 'matched') {
      whereClause += ` AND matched_txn_id IS NOT NULL AND processed = true`;
    } else if (status === 'unmatched') {
      whereClause += ` AND matched_txn_id IS NULL AND signature_valid = true`;
    } else if (status === 'invalid') {
      whereClause += ` AND signature_valid = false`;
    }

    const sqlQuery = `
      WITH unified_events AS (
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
          request_method,
          'webhook_events' as table_source
        FROM webhook_events
        
        UNION ALL
        
        SELECT 
          pw.id + 1000000 as id,
          pw.received_at,
          COALESCE(pw.source, 'tasker') as source,
          pw.upi_transaction_id as utr,
          pw.google_transaction_id as google_txn_id,
          CAST(NULLIF(REGEXP_REPLACE(pw.amount, '[^0-9\\.]', '', 'g'), '') AS decimal) as amount,
          NULL::timestamp as paid_at,
          true as signature_valid,
          NULL as matched_txn_id,
          false as processed,
          pw.customer as note,
          (COALESCE(pw.full_payload, '{}'::jsonb) || jsonb_build_object(
            'raw_screen', pw.raw_screen,
            'amount', pw.amount,
            'time', pw.time,
            'customer', pw.customer,
            'upi_transaction_id', pw.upi_transaction_id,
            'google_transaction_id', pw.google_transaction_id,
            'source', pw.source,
            'timestamp', pw.timestamp
          )) as raw_payload,
          'unknown' as payment_type,
          pw.customer as sender_name,
          NULL as payment_method,
          NULL as payment_app,
          CAST(NULLIF(REGEXP_REPLACE(pw.amount, '[^0-9\\.]', '', 'g'), '') AS decimal) as customer_paid,
          NULL::decimal as mdr_gst,
          CAST(NULLIF(REGEXP_REPLACE(pw.amount, '[^0-9\\.]', '', 'g'), '') AS decimal) as amount_received,
          COALESCE(pw.request_headers, '{}'::jsonb) as request_headers,
          NULL as request_ip,
          NULL as user_agent,
          NULL as content_type,
          COALESCE(pw.request_method, 'POST') as request_method,
          'payment_webhooks' as table_source
        FROM payment_webhooks pw
        WHERE NOT EXISTS (
          SELECT 1 FROM webhook_events we 
          WHERE we.utr IS NOT NULL 
          AND pw.upi_transaction_id IS NOT NULL
          AND we.utr = pw.upi_transaction_id
        )
      )
      SELECT * FROM unified_events
      ${whereClause}
      ORDER BY received_at DESC
      LIMIT ? OFFSET ?
    `;

    const totalQuery = `
      WITH unified_events AS (
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
          request_method,
          'webhook_events' as table_source
        FROM webhook_events
        
        UNION ALL
        
        SELECT 
          pw.id + 1000000 as id,
          pw.received_at,
          COALESCE(pw.source, 'tasker') as source,
          pw.upi_transaction_id as utr,
          pw.google_transaction_id as google_txn_id,
          CAST(NULLIF(REGEXP_REPLACE(pw.amount, '[^0-9\\.]', '', 'g'), '') AS decimal) as amount,
          NULL::timestamp as paid_at,
          true as signature_valid,
          NULL as matched_txn_id,
          false as processed,
          pw.customer as note,
          (COALESCE(pw.full_payload, '{}'::jsonb) || jsonb_build_object(
            'raw_screen', pw.raw_screen,
            'amount', pw.amount,
            'time', pw.time,
            'customer', pw.customer,
            'upi_transaction_id', pw.upi_transaction_id,
            'google_transaction_id', pw.google_transaction_id,
            'source', pw.source,
            'timestamp', pw.timestamp
          )) as raw_payload,
          'unknown' as payment_type,
          pw.customer as sender_name,
          NULL as payment_method,
          NULL as payment_app,
          CAST(NULLIF(REGEXP_REPLACE(pw.amount, '[^0-9\\.]', '', 'g'), '') AS decimal) as customer_paid,
          NULL::decimal as mdr_gst,
          CAST(NULLIF(REGEXP_REPLACE(pw.amount, '[^0-9\\.]', '', 'g'), '') AS decimal) as amount_received,
          COALESCE(pw.request_headers, '{}'::jsonb) as request_headers,
          NULL as request_ip,
          NULL as user_agent,
          NULL as content_type,
          COALESCE(pw.request_method, 'POST') as request_method,
          'payment_webhooks' as table_source
        FROM payment_webhooks pw
        WHERE NOT EXISTS (
          SELECT 1 FROM webhook_events we 
          WHERE we.utr IS NOT NULL 
          AND pw.upi_transaction_id IS NOT NULL
          AND we.utr = pw.upi_transaction_id
        )
      )
      SELECT COUNT(*) as total FROM unified_events
      ${whereClause}
    `;

    const events = await db.all(sqlQuery, [limit, offset]);
    const totalResult = await db.get(totalQuery);
    
    const total = parseInt(totalResult?.total || '0');
    const totalPages = Math.ceil(total / limit);

    return NextResponse.json({
      events,
      taskerWebhookKey: process.env.TASKER_WEBHOOK_KEY || '',
      pagination: {
        page,
        limit,
        total,
        totalPages,
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
