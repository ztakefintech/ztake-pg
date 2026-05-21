import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database';
import { requirePermission } from '@/lib/admin-middleware';

export const dynamic = 'force-dynamic';

/**
 * Check if the payment_webhooks table exists.
 */
async function paymentWebhooksTableExists(): Promise<boolean> {
  try {
    const result = await db.get(
      `SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'payment_webhooks'
      ) as table_exists`
    );
    return result?.table_exists === true;
  } catch {
    return false;
  }
}

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

    // Check if payment_webhooks table exists for UNION query
    const hasPaymentWebhooks = await paymentWebhooksTableExists();

    let events: any[];
    let total: number;

    if (hasPaymentWebhooks && status === 'all') {
      // UNION query: merge webhook_events + payment_webhooks for complete view
      // payment_webhooks has different columns, so we map them to webhook_events schema
      events = await db.all(`
        (
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
          ${whereClause}
        )
        UNION ALL
        (
          SELECT 
            pw.id + 1000000 as id,
            pw.received_at,
            COALESCE(pw.source, 'tasker') as source,
            pw.upi_transaction_id as utr,
            pw.google_transaction_id as google_txn_id,
            CASE 
              WHEN pw.amount ~ '^[₹\\s]*[0-9,.]+'
              THEN CAST(REGEXP_REPLACE(pw.amount, '[^0-9.]', '', 'g') AS DECIMAL(12,2))
              ELSE NULL
            END as amount,
            NULL as paid_at,
            true as signature_valid,
            NULL as matched_txn_id,
            false as processed,
            CONCAT('From payment_webhooks | Customer: ', COALESCE(pw.customer, 'N/A')) as note,
            COALESCE(pw.full_payload, '{}'::jsonb) as raw_payload,
            'unknown' as payment_type,
            pw.customer as sender_name,
            NULL as payment_method,
            NULL as payment_app,
            NULL as customer_paid,
            NULL as mdr_gst,
            NULL as amount_received,
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
            AND we.utr = pw.upi_transaction_id
          )
        )
        ORDER BY received_at DESC
        LIMIT ? OFFSET ?
      `, [...filterParams, limit, offset]);

      // Count total events from both tables
      const totalResult = await db.get(`
        SELECT (
          (SELECT COUNT(*) FROM webhook_events ${whereClause}) +
          (SELECT COUNT(*) FROM payment_webhooks pw WHERE NOT EXISTS (
            SELECT 1 FROM webhook_events we 
            WHERE we.utr IS NOT NULL 
            AND we.utr = pw.upi_transaction_id
          ))
        ) as total
      `, filterParams);
      total = parseInt(totalResult?.total || '0');
    } else {
      // Standard query from webhook_events only (for filtered views or no payment_webhooks table)
      events = await db.all(`
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
      total = parseInt(totalResult?.total || '0');
    }

    const totalPages = Math.ceil(total / limit);

    return NextResponse.json({
      events,
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
