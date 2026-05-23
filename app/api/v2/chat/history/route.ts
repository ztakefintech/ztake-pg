import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Authorization required' }, { status: 401, headers: CORS_HEADERS });
    }
    const secretKey = authHeader.substring(7);
    const vendor = await db.get(
      'SELECT id FROM vendors WHERE secret_key = $1 AND is_approved = true',
      [secretKey]
    );
    if (!vendor) {
      return NextResponse.json({ error: 'Invalid API key' }, { status: 401, headers: CORS_HEADERS });
    }

    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get('session_id');
    if (!sessionId) {
      return NextResponse.json({ error: 'session_id query parameter required' }, { status: 400, headers: CORS_HEADERS });
    }

    const session = await db.get(
      'SELECT session_id, messages, created_at, updated_at FROM chat_sessions WHERE session_id = $1 AND vendor_id = $2',
      [sessionId, vendor.id]
    );

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404, headers: CORS_HEADERS });
    }

    return NextResponse.json({
      success: true,
      session_id: session.session_id,
      messages: session.messages,
      created_at: session.created_at,
      updated_at: session.updated_at
    }, { headers: CORS_HEADERS });
  } catch (error) {
    console.error('ZiBot history error:', error);
    return NextResponse.json({ error: 'Failed to fetch history' }, { status: 500, headers: CORS_HEADERS });
  }
}

export async function OPTIONS() {
  return NextResponse.json({}, { status: 200, headers: CORS_HEADERS });
}
