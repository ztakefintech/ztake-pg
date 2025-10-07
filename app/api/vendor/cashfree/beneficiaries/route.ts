import { NextRequest, NextResponse } from 'next/server';
import { withApiKeyAuth, createApiResponse, createErrorResponse, AuthenticatedRequest } from '@/lib/middleware';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function getCashfreeBase(env?: string) {
  const normalized = (env || '').toLowerCase();
  const isProd = normalized === 'prod' || normalized === 'production' || normalized === 'live';
  return isProd ? 'https://api.cashfree.com/payout' : 'https://sandbox.cashfree.com/payout';
}

function sanitizeBeneficiaryId(input: string) {
  // Cashfree error indicates strictly alphanumeric; strip others and cap at 40
  return (input || '').replace(/[^a-zA-Z0-9]/g, '').slice(0, 40);
}

async function callCashfree(base: string, path: string, method: string, headers: Record<string, string>, body?: any) {
  const url = `${base}${path.startsWith('/') ? '' : '/'}${path}`;
  const resp = await fetch(url, {
    method,
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      ...headers
    },
    body: body ? JSON.stringify(body) : undefined
  });
  const text = await resp.text();
  let json: any = undefined;
  try { json = text ? JSON.parse(text) : undefined; } catch {}
  return { status: resp.status, text, json };
}

async function getBearerToken(base: string, clientId: string, clientSecret: string, forward: Headers): Promise<string | null> {
  const passHeaders: Record<string, string> = {};
  forward.forEach((v, k) => { if (k.toLowerCase().startsWith('x-cf-')) passHeaders[k] = v; });
  const resp = await fetch(`${base}/v1/authorize`, {
    method: 'POST',
    headers: { 'X-Client-Id': clientId, 'X-Client-Secret': clientSecret, 'Accept': 'application/json', ...passHeaders }
  });
  const text = await resp.text();
  try { const j = text ? JSON.parse(text) : undefined; return resp.ok ? (j?.data?.token || j?.token || null) : null; } catch { return null; }
}

async function handler(req: AuthenticatedRequest) {
  if (req.method !== 'POST') return createErrorResponse('Method not allowed', 405);

  const vendor = (req.vendor as any) || {};
  const { cashfree_payout_client_id, cashfree_payout_client_secret, cashfree_env } = vendor;
  if (!cashfree_payout_client_id || !cashfree_payout_client_secret) {
    return createErrorResponse('Payout credentials not configured', 400);
  }

  const base = getCashfreeBase(cashfree_env);
  // Token not required for these flows; we will use client id/secret headers per docs

  const body = await req.json();
  const {
    beneficiary_id,
    beneficiary_name,
    email,
    phone,
    bank_account_number,
    bank_ifsc,
    vpa,
    address_line1,
    city,
    state,
    pincode
  } = body || {};

  const beneId = sanitizeBeneficiaryId(beneficiary_id || `${vendor.id}${bank_account_number || vpa || ''}`);
  if (!beneId) return createErrorResponse('beneficiary_id required (alphanumeric)', 400);

  // Build payload per provided spec
  const payload: any = {
    beneficiary_id: beneId,
    beneficiary_name,
    ...(email ? { email } : {}),
    beneficiary_instrument_details: vpa ? { vpa } : { bank_account: { account_number: bank_account_number, ifsc: bank_ifsc } },
    ...(phone ? { beneficiary_contact_details: { beneficiary_phone: phone } } : {}),
  };

  const headers: Record<string, string> = {
    'X-Client-Id': cashfree_payout_client_id,
    'X-Client-Secret': cashfree_payout_client_secret
  };
  const apiVersion = req.headers.get('x-api-version'); if (apiVersion) headers['X-Api-Version'] = apiVersion;
  req.headers.forEach((v, k) => { if (k.toLowerCase().startsWith('x-cf-')) headers[k] = v; });

  // Use /beneficiary (singular) per provided reference
  let resp = await callCashfree(base, '/beneficiary', 'POST', headers, payload);
  let msg = (resp.json && (resp.json.message || '')) || '';

  const businessOk = (resp.json?.status || '').toString().toUpperCase() !== 'ERROR';
  if (resp.status >= 200 && resp.status < 300 && businessOk) {
    return createApiResponse({ message: 'Beneficiary created', beneficiary_id: beneId, provider: resp.json }, 200);
  }
  return createErrorResponse(msg || 'Failed to create beneficiary', 400);
}

export const POST = withApiKeyAuth(handler);


