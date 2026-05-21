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
    
    // Build WHERE clause with ? placeholders — convertQuery() handles $N conversion
    let whereClause = 'WHERE 1=1';
    const filterParams: any[] = [];
    
    if (status === 'matched') {
      whereClause += ` AND matched_txn_id IS NOT NULL AND processed = true`;
    } else if (status === 'unmatched') {
      whereClause += ` AND matched_txn_id IS NULL AND signature_valid = true`;
    } else if (status === 'invalid') {
      whereClause += ` AND signature_valid = false`;
    }

    // Query events with consistent ? placeholders
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
        content_type
      FROM webhook_events
      ${whereClause}
      ORDER BY received_at DESC
      LIMIT ? OFFSET ?
    `, [...filterParams, limit, offset]);

    // Count total events with same filters
    const totalResult = await db.get(`
      SELECT COUNT(*) as total
      FROM webhook_events
      ${whereClause}
    `, filterParams);

    const total = parseInt(totalResult?.total || '0');
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
