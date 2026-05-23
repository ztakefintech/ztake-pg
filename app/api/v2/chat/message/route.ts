import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database';
import { sendMessage } from '@/lib/zibot';

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Authorization required. Use: Authorization: Bearer pk_yourkey' }, { status: 401 });
    }

    const secretKey = authHeader.substring(7);
    const vendor = await db.get(
      'SELECT id, business_name FROM vendors WHERE secret_key = $1 AND is_approved = true',
      [secretKey]
    );
    if (!vendor) {
      return NextResponse.json({ error: 'Invalid API key or vendor not approved' }, { status: 401 });
    }

    const body = await req.json();
    const { message, session_id } = body;

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return NextResponse.json({ error: 'message is required and must be a non-empty string' }, { status: 400 });
    }
    if (message.length > 1000) {
      return NextResponse.json({ error: 'message must be under 1000 characters' }, { status: 400 });
    }

    const anthropicKey = process.env.ANTHROPIC_API_KEY;
    if (!anthropicKey) {
      return NextResponse.json({ error: 'Chatbot not configured. Contact support.' }, { status: 503 });
    }

    const result = await sendMessage(
      vendor.id,
      session_id || '',
      message.trim(),
      anthropicKey
    );

    return NextResponse.json({
      success: true,
      reply: result.reply,
      session_id: result.sessionId,
      bot_name: 'ZiBot'
    });
  } catch (error) {
    console.error('ZiBot message error:', error);
    return NextResponse.json({ error: 'Failed to process message' }, { status: 500 });
  }
}
