import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-middleware';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    requireAdmin(request);

    const body = await request.json();
    const { utr, amount, vendor_id, payment_status } = body || {};

    if (!utr || !amount || !vendor_id) {
      return NextResponse.json({ error: 'utr, amount, vendor_id are required' }, { status: 400 });
    }

    const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || request.nextUrl.origin;
    const apiKey = process.env.TEST_SECRET;
    if (!apiKey) {
      return NextResponse.json({ error: 'Server API key not configured' }, { status: 500 });
    }

    const targetUrl = `${apiBase}/api/payments/update`;
    const res = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({ utr, amount, vendor_id, ...(payment_status ? { payment_status } : {}) })
    });

    const json = await res.json().catch(() => ({}));
    return NextResponse.json(json, { status: res.status });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to submit UTR' }, { status: 500 });
  }
}


