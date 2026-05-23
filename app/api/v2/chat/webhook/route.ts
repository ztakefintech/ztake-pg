import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database';
import { sendMessage } from '@/lib/zibot';

export const dynamic = 'force-dynamic';

async function handleRequest(req: NextRequest, method: 'GET' | 'POST') {
  try {
    const { searchParams } = new URL(req.url);
    
    // 1. Resolve API key (header or query)
    const keyQuery = searchParams.get('key') || searchParams.get('apiKey') || searchParams.get('api_key') || searchParams.get('secret_key');
    const authHeader = req.headers.get('authorization');
    let secretKey = '';
    
    if (authHeader?.startsWith('Bearer ')) {
      secretKey = authHeader.substring(7);
    } else if (keyQuery) {
      secretKey = keyQuery;
    }

    if (!secretKey) {
      return NextResponse.json({ error: 'Authorization required. Pass secret key in Authorization header or key query param.' }, { status: 401 });
    }

    // 2. Fetch vendor details
    const vendor = await db.get(
      'SELECT id, business_name FROM vendors WHERE secret_key = $1 AND is_approved = true',
      [secretKey]
    );
    if (!vendor) {
      return NextResponse.json({ error: 'Invalid API key or vendor not approved' }, { status: 401 });
    }

    // 3. Resolve request inputs (message & session_id)
    let message = '';
    let sessionId = '';
    let responseFormat = searchParams.get('format') || '';

    if (method === 'GET') {
      message = searchParams.get('message') || searchParams.get('msg') || searchParams.get('text') || searchParams.get('query') || '';
      sessionId = searchParams.get('session_id') || searchParams.get('sessionId') || searchParams.get('session') || '';
    } else {
      // POST request
      try {
        const body = await req.json().catch(() => ({}));
        message = body.message || body.msg || body.text || body.query || searchParams.get('message') || searchParams.get('msg') || '';
        sessionId = body.session_id || body.sessionId || body.session || searchParams.get('session_id') || '';
        if (body.format) {
          responseFormat = body.format;
        }
      } catch (err) {
        // Fallback to query params if JSON parsing fails
        message = searchParams.get('message') || '';
        sessionId = searchParams.get('session_id') || '';
      }
    }

    if (!message || message.trim().length === 0) {
      return NextResponse.json({ error: 'message parameter is required' }, { status: 400 });
    }

    const anthropicKey = process.env.ANTHROPIC_API_KEY;
    if (!anthropicKey) {
      return NextResponse.json({ error: 'Chatbot not configured on server. Contact support.' }, { status: 503 });
    }

    // 4. Send query to Claude
    const result = await sendMessage(
      vendor.id,
      sessionId,
      message.trim(),
      anthropicKey
    );

    // 5. Output rendering (Raw Text vs JSON)
    if (responseFormat.toLowerCase() === 'text' || responseFormat.toLowerCase() === 'plain') {
      return new NextResponse(result.reply, {
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'x-session-id': result.sessionId
        }
      });
    }

    return NextResponse.json({
      success: true,
      reply: result.reply,
      session_id: result.sessionId,
      bot_name: 'ZiBot'
    });

  } catch (error) {
    console.error('ZiBot webhook handler error:', error);
    return NextResponse.json({ error: 'Failed to process chat webhook' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  return handleRequest(req, 'GET');
}

export async function POST(req: NextRequest) {
  return handleRequest(req, 'POST');
}
