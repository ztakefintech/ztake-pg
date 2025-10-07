import { NextRequest, NextResponse } from 'next/server';
import { demoCallbackStore } from '@/lib/callback-store';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get('token') || 'default';
    const body = await req.json().catch(() => ({}));
    demoCallbackStore.append(token, body);
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ success: false }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get('token') || 'default';
  return NextResponse.json({ success: true, data: { events: demoCallbackStore.list(token) } });
}


