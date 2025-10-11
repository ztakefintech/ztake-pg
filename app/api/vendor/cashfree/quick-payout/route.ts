import { NextRequest, NextResponse } from 'next/server';
import { withApiKeyAuth, createApiResponse, createErrorResponse, AuthenticatedRequest } from '@/lib/middleware';
import { db } from '@/lib/database';
import { generatePayoutId } from '@/lib/utils';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function getCashfreeBase(env?: string) {
  const normalized = (env || '').toLowerCase();
  const isProd = normalized === 'prod' || normalized === 'production' || normalized === 'live';
  // Cashfree Payouts v2 base URLs
  return isProd ? 'https://api.cashfree.com/payout' : 'https://sandbox.cashfree.com/payout';
}

function sanitizeBeneId(input: string) {
  return input.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 64);
}

async function callCashfree(base: string, path: string, method: string, headers: Record<string, string>, body?: any) {
  const url = `${base}${path.startsWith('/') ? '' : '/'}${path}`;
  console.log('[CF][call] url:', url, 'method:', method);
  console.log('[CF][call] headers:', Object.keys(headers).reduce((acc: any, k: string) => {
    const v = (headers as any)[k];
    // mask tokens and secrets
    if (/authorization|secret|token/i.test(k)) acc[k] = typeof v === 'string' ? v.slice(0, 10) + '***' : '***';
    else acc[k] = v;
    return acc;
  }, {}));
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
  console.log('[CF][resp]', url, 'status:', resp.status, 'len:', text?.length ?? 0);
  let json: any = undefined;
  try {
    json = text ? JSON.parse(text) : undefined;
  } catch {
    // keep text
  }
  return { status: resp.status, headers: resp.headers, text, json };
}
async function getBearerToken(base: string, clientId: string, clientSecret: string, extraHeaders?: Headers): Promise<string | null> {
  console.log('[CF][auth] authorizing to:', `${base}/v1/authorize`);
  const forwardCf: Record<string, string> = {};
  if (extraHeaders) {
    extraHeaders.forEach((value, key) => {
      const lower = key.toLowerCase();
      if (lower.startsWith('x-cf-')) {
        forwardCf[key] = value;
      }
    });
  }
  const resp = await fetch(`${base}/v1/authorize`, {
    method: 'POST',
    headers: {
      'X-Client-Id': clientId,
      'X-Client-Secret': clientSecret,
      'Accept': 'application/json',
      ...forwardCf
    }
  });
  const text = await resp.text();
  console.log('[CF][auth] status:', resp.status, 'len:', text?.length ?? 0);
  try {
    const json = text ? JSON.parse(text) : undefined;
    const token = json?.data?.token || json?.token || null;
    if (!token) {
      console.log('[CF][auth] no token in body (first200):', (text || '').slice(0, 200));
    }
    return resp.ok ? token : null;
  } catch {
    console.log('[CF][auth] non-JSON body (first200):', (text || '').slice(0, 200));
    return null;
  }
}


async function handler(req: AuthenticatedRequest) {
  if (req.method !== 'POST') {
    return createErrorResponse('Method not allowed', 405);
  }

  try {
    const vendor = req.vendor as any;
    const { cashfree_payout_client_id, cashfree_payout_client_secret, cashfree_env } = vendor || {};
    console.log('[CF][qp] vendor_id:', vendor?.id, 'env:', cashfree_env);
    if (!cashfree_payout_client_id || !cashfree_payout_client_secret) {
      return createErrorResponse(' payout credentials not configured', 400);
    }

    const base = getCashfreeBase(cashfree_env);
    const body = await req.json();
    const {
      amount,
      currency = 'INR',
      transferMode = 'banktransfer',
      remarks,
      reference_id,
      beneficiary,
      callback_url
    } = body || {};

    if (!amount || isNaN(Number(amount))) {
      return createErrorResponse('Invalid amount', 400);
    }
    if (!beneficiary || typeof beneficiary !== 'object') {
      return createErrorResponse('Missing beneficiary', 400);
    }

    const { name, email, phone, bankAccount, ifsc, address1, city, state, pincode, upi } = beneficiary;

    // Determine beneId deterministically per vendor + destination
    const destinationKey = bankAccount ? `${bankAccount}-${ifsc || ''}` : (upi || '');
    if (!destinationKey) {
      return createErrorResponse('Provide bankAccount+ifsc or upi in beneficiary', 400);
    }
    const beneId = sanitizeBeneId(`${vendor.id}-${destinationKey}`);

    // Use client-provided CF token if available, else obtain via authorize
    const clientProvidedAuth = req.headers.get('x-cf-authorization');
    const clientProvidedToken = req.headers.get('x-cf-token');
    let token: string | null = null;
    if (clientProvidedAuth && clientProvidedAuth.toLowerCase().startsWith('bearer ')) {
      token = clientProvidedAuth.substring(7);
    } else if (clientProvidedToken) {
      token = clientProvidedToken;
    } else {
      token = await getBearerToken(base, cashfree_payout_client_id, cashfree_payout_client_secret, req.headers);
    }
    console.log('[CF][qp] tokenSource:', clientProvidedAuth || clientProvidedToken ? 'client' : 'server-auth', 'hasToken:', !!token);
    if (!token) {
      return createErrorResponse('Failed to authorize with payout provider', 401);
    }

    const commonHeaders: Record<string, string> = {
      'Authorization': `Bearer ${token}`,
      'X-Client-Id': cashfree_payout_client_id,
      'X-Client-Secret': cashfree_payout_client_secret
    };
    // Forward API version if provided by client
    const apiVersion = req.headers.get('x-api-version');
    if (apiVersion) {
      (commonHeaders as any)['X-Api-Version'] = apiVersion;
    }

    // Forward any X-Cf-* headers from client for signature/IP-based 2FA compliance
    req.headers.forEach((value, key) => {
      const lower = key.toLowerCase();
      if (lower.startsWith('x-cf-')) {
        (commonHeaders as any)[key] = value;
      }
    });

    // 1) Ensure beneficiary exists (V2 Beneficiaries)
    let beneCreated = false;
    if (bankAccount && ifsc) {
      const benePayload: any = {
        bene_id: beneId,
        name,
        email,
        phone,
        bank: {
          account_number: bankAccount,
          ifsc
        },
        address: {
          line1: address1 || 'NA',
          city: city || 'NA',
          state: state || 'NA',
          pincode: pincode || '000000'
        }
      };
      let createResp = await callCashfree(base, '/v2/beneficiaries', 'POST', commonHeaders, benePayload);
      // Fallback if API expects PUT upsert pattern
      const msgStr1 = (createResp.json && (createResp.json.message || '')) || '';
      if (createResp.status === 404 || createResp.status === 405 || /invalid request url|method/i.test(msgStr1)) {
        console.log('[CF][qp] bene fallback: PUT /v2/beneficiaries/{bene_id}');
        const putPath = `/v2/beneficiaries/${encodeURIComponent(beneId)}`;
        const putBody = { ...benePayload } as any;
        delete putBody.bene_id;
        createResp = await callCashfree(base, putPath, 'PUT', commonHeaders, putBody);
      }
      console.log('[CF][qp] bene create status:', createResp.status, 'resp:', createResp.json || createResp.text);
      // If already exists, proceed; else on success proceed; on other errors, stop
      if (createResp.status >= 200 && createResp.status < 300) {
        beneCreated = true;
      } else {
        const msg = (createResp.json && (createResp.json.message || createResp.json.sub_code)) || createResp.text;
        const alreadyExists = typeof msg === 'string' && /exist/i.test(msg);
        if (!alreadyExists) {
          return createErrorResponse(`Beneficiary creation failed: ${msg || createResp.status}`, 400);
        }
      }
    }

    // 2) Initiate transfer
    const transferId = reference_id || generatePayoutId();
    const idempotencyKey = req.headers.get('x-idempotency-key') || transferId;

    const transferHeaders = { ...commonHeaders, 'X-Idempotency-Key': idempotencyKey };
    const transferPayload: any = {
      transfer_id: transferId,
      transfer_amount: Number(amount),
      beneficiary_details: { beneficiary_id: beneId },
      transfer_remarks: remarks || 'Quick payout'
    };

    let transferResp = await callCashfree(base, '/v2/transfers', 'POST', transferHeaders, transferPayload);
    const msgStr2 = (transferResp.json && (transferResp.json.message || '')) || '';
    if (transferResp.status === 404 || transferResp.status === 405 || /invalid request url|method/i.test(msgStr2)) {
      console.log('[CF][qp] transfer fallback: POST /transfers');
      transferResp = await callCashfree(base, '/transfers', 'POST', transferHeaders, transferPayload);
    }
    const isHttpOk = transferResp.status >= 200 && transferResp.status < 300;
    const isBusinessOk = transferResp.json && typeof transferResp.json.status === 'string'
      ? transferResp.json.status.toUpperCase() !== 'ERROR'
      : true; // default to true if field missing
    const isOk = isHttpOk && isBusinessOk;
    console.log('[CF][qp] transfer status:', transferResp.status, 'bizOk:', isBusinessOk, 'resp:', transferResp.json || transferResp.text);

    // 3) Persist in payouts table regardless of success for traceability
    try {
      await db.run(
        `INSERT INTO payouts (vendor_id, amount, currency, beneficiary_name, beneficiary_account, beneficiary_ifsc, beneficiary_upi, reference_id, remarks, status, cashfree_payout_id, raw_request, raw_response)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          vendor.id,
          Number(amount),
          currency,
          name || null,
          bankAccount || null,
          ifsc || null,
          upi || null,
          transferId,
          remarks || null,
          isOk ? 'initiated' : 'failed',
          (transferResp.json && (transferResp.json.data?.transfer?.transfer_id || transferResp.json.transfer_id)) || null,
          JSON.stringify({ beneficiary: { ...beneficiary, beneId }, transfer: transferPayload }),
          transferResp.text || null
        ]
      );
    } catch (e) {
      // best effort logging
    }

    if (isOk) {
      // Optional callback when SUCCESS/COMPLETED
      try {
        const status = (transferResp.json?.status || '').toString().toUpperCase();
        const statusCode = (transferResp.json?.status_code || '').toString().toUpperCase();
        if (callback_url && status === 'SUCCESS' && statusCode === 'COMPLETED') {
          await fetch(callback_url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              transfer_id: transferId,
              cf_transfer_id: transferResp.json?.cf_transfer_id,
              status: transferResp.json?.status,
              status_code: transferResp.json?.status_code,
              status_description: transferResp.json?.status_description,
              beneficiary_details: transferResp.json?.beneficiary_details,
              transfer_amount: transferResp.json?.transfer_amount,
              transfer_utr: transferResp.json?.transfer_utr,
              fundsource_id: transferResp.json?.fundsource_id,
              event_time: new Date().toISOString()
            })
          });
        }
      } catch (e) {
        console.error('Callback dispatch failed:', e);
      }
      return createApiResponse({ message: 'Transfer initiated', beneId, transferId, provider: transferResp.json }, 200);
    }

    const errMsg = (transferResp.json && (transferResp.json.message || transferResp.json.subCode || transferResp.json.sub_code)) || transferResp.text;
    return createErrorResponse(`Transfer failed: ${errMsg || transferResp.status}`, 400);
  } catch (error) {
    return createErrorResponse('Quick payout failed', 500);
  }
}

export const POST = withApiKeyAuth(handler);


