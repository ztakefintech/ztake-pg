import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database';

// Force dynamic so it always runs fresh
export const dynamic = 'force-dynamic';

export async function POST(_req: NextRequest) {
  try {
    // Delete orders that are still Pending after 24 hours
    const result = await db.run(
      `DELETE FROM orders 
       WHERE (status IN ('Pending','PENDING','Failed','FAILED'))
         AND created_at < (NOW() - INTERVAL '24 hours')`
    );

    return NextResponse.json({ success: true, deleted: result.changes || 0 });
  } catch (error) {
    console.error('Orders cleanup error:', error);
    return NextResponse.json({ success: false, error: 'Failed to cleanup orders' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  // Optional GET to preview what would be deleted
  try {
    const rows = await db.all(
      `SELECT ztake_order_id, merchant_order_id, status, created_at 
       FROM orders 
       WHERE (status IN ('Pending','PENDING','Failed','FAILED'))
         AND created_at < (NOW() - INTERVAL '24 hours')
       ORDER BY created_at ASC LIMIT 200`
    );
    return NextResponse.json({ success: true, candidates: rows, count: rows.length });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to fetch candidates' }, { status: 500 });
  }
}


