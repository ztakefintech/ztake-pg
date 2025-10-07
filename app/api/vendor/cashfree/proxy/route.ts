import { NextRequest, NextResponse } from 'next/server';
import { withApiKeyAuth, createApiResponse, createErrorResponse, AuthenticatedRequest } from '@/lib/middleware';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function getCashfreeBase(env?: string) {
  const normalized = (env || '').toLowerCase();
  const isProd = normalized === 'prod' || normalized === 'production' || normalized === 'live';
  // Payout provider v2 base URLs
  // Test: https://sandbox.cashfree.com/payout
  // Prod: https://api.cashfree.com/payout
  return isProd ? 'https://api.cashfree.com/payout' : 'https://sandbox.cashfree.com/payout';
}

async function handler(req: AuthenticatedRequest) {
  try {
    const vendor = req.vendor as any;
    if (!vendor) {
      return createErrorResponse('API key not linked to a vendor', 401);
    }
    const { cashfree_payout_client_id, cashfree_payout_client_secret, cashfree_env } = vendor || {};

    if (!cashfree_payout_client_id || !cashfree_payout_client_secret) {
      return createErrorResponse(' payout credentials not configured', 400);
    }

    const { searchParams, pathname } = new URL(req.url);
    const path = searchParams.get('path');
    if (!path) {
      return createErrorResponse('Missing path query parameter', 400);
    }

    const base = getCashfreeBase(cashfree_env);
    const url = `${base}${path.startsWith('/') ? '' : '/'}${path}`;

    // 1) Use client-provided CF token if sent, else obtain via authorize
    console.log('[CF][proxy] vendor_id:', vendor?.id, 'env:', vendor?.cashfree_env, 'path:', path);
    const clientProvidedAuth = req.headers.get('x-cf-authorization');
    const clientProvidedToken = req.headers.get('x-cf-token');
    let bearer: string | null = null;
    if (clientProvidedAuth && clientProvidedAuth.toLowerCase().startsWith('bearer ')) {
      bearer = clientProvidedAuth.substring(7);
    } else if (clientProvidedToken) {
      bearer = clientProvidedToken;
    } else {
      console.log('[CF][proxy] authorizing at:', `${base}/v1/authorize`);
      const forwardCf: Record<string, string> = {};
      req.headers.forEach((value, key) => {
        const lower = key.toLowerCase();
        if (lower.startsWith('x-cf-')) {
          forwardCf[key] = value;
        }
      });
      const authResp = await fetch(`${base}/v1/authorize`, {
        method: 'POST',
        headers: {
          'X-Client-Id': cashfree_payout_client_id,
          'X-Client-Secret': cashfree_payout_client_secret,
          'Accept': 'application/json',
          ...forwardCf
        }
      });
      const authText = await authResp.text();
      let authJson: any = undefined;
      try { authJson = authText ? JSON.parse(authText) : undefined; } catch {}
      console.log('[CF][proxy] auth status:', authResp.status, 'hasData:', !!authJson);
      const token = authJson?.data?.token || authJson?.token;
      if (!authResp.ok || !token) {
        return createErrorResponse('Failed to authorize with payout provider', 401);
      }
      bearer = token;
    }

    const headers: Record<string, string> = {
      'Authorization': `Bearer ${bearer}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'X-Client-Id': cashfree_payout_client_id,
      'X-Client-Secret': cashfree_payout_client_secret
    };
    const apiVersion = req.headers.get('x-api-version');
    if (apiVersion) {
      headers['X-Api-Version'] = apiVersion;
    }
    console.log('[CF][proxy] forwarding to:', url);

    // Forward optional idempotency header if provided by client
    const idempotencyKey = req.headers.get('x-idempotency-key') || req.headers.get('X-Idempotency-Key');
    if (idempotencyKey) {
      headers['X-Idempotency-Key'] = idempotencyKey;
    }

    // Forward any X-Cf-* headers for signature/IP-based 2FA compliance
    req.headers.forEach((value, key) => {
      const lower = key.toLowerCase();
      if (lower.startsWith('x-cf-')) {
        headers[key] = value;
      }
    });

    // Forward method and body
    const method = req.method || 'GET';
    let body: any = undefined;
    if (method !== 'GET' && method !== 'HEAD') {
      const text = await req.text();
      body = text || undefined;
    }

    const resp = await fetch(url, {
      method,
      headers,
      body
    });

    const contentType = resp.headers.get('content-type') || '';
    const raw = await resp.text();
    console.log('[CF][proxy] resp status:', resp.status, 'len:', raw?.length ?? 0);

    // Return exactly what the payout provider returns (status + body)
    return new NextResponse(raw, {
      status: resp.status,
      headers: {
        'Content-Type': contentType
      }
    });
  } catch (error) {
    console.error(' proxy error:', error);
    return createErrorResponse('Failed to proxy request', 500);
  }
}

export const GET = withApiKeyAuth(handler);
export const POST = withApiKeyAuth(handler);
export const PUT = withApiKeyAuth(handler);
export const DELETE = withApiKeyAuth(handler);
export const PATCH = withApiKeyAuth(handler);
export const HEAD = withApiKeyAuth(handler);
export const OPTIONS = withApiKeyAuth(handler);


