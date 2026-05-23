import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database';
import { sendMessage } from '@/lib/zibot';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

async function handleRequest(req: NextRequest, method: 'GET' | 'POST') {
  try {
    const { searchParams } = new URL(req.url);
    
    // Read raw body first for POST to prevent body stream already read issues
    let rawBody = '';
    if (method === 'POST') {
      try {
        rawBody = await req.text();
      } catch (err) {}
    }

    // Webhook Signature verification
    const signature = req.headers.get('x-webhook-signature') || req.headers.get('stripe-signature') || '';
    const webhookSecret = 'whsec_fLuwlo6Bmwg5HsghMo/jBjSOVaknlJ19Klpr4pvisMY=';

    if (signature && method === 'POST') {
      let signatureValid = false;
      const expectedHex = crypto.createHmac('sha256', webhookSecret).update(rawBody).digest('hex');
      const expectedBase64 = crypto.createHmac('sha256', webhookSecret).update(rawBody).digest('base64');
      
      try {
        if (crypto.timingSafeEqual(Buffer.from(expectedHex), Buffer.from(signature))) {
          signatureValid = true;
        }
      } catch {}
      
      try {
        if (crypto.timingSafeEqual(Buffer.from(expectedBase64), Buffer.from(signature))) {
          signatureValid = true;
        }
      } catch {}

      // Support Stripe-style (t=timestamp, v1=signature)
      if (!signatureValid && signature.includes('v1=')) {
        const parts = signature.split(',');
        const t = parts.find(p => p.startsWith('t='))?.substring(2);
        const v1 = parts.find(p => p.startsWith('v1='))?.substring(3);
        if (t && v1) {
          const signedPayload = `${t}.${rawBody}`;
          const stripeHmac = crypto.createHmac('sha256', webhookSecret).update(signedPayload).digest('hex');
          if (stripeHmac === v1) {
            signatureValid = true;
          }
        }
      }

      if (!signatureValid) {
        return NextResponse.json({ error: 'Invalid webhook signature.' }, { status: 401 });
      }
    }
    
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
        const body = rawBody ? JSON.parse(rawBody) : {};
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
