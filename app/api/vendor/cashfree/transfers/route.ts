import { NextRequest, NextResponse } from 'next/server';
import { withApiKeyAuth, createApiResponse, createErrorResponse, AuthenticatedRequest } from '@/lib/middleware';
import { db } from '@/lib/database';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function getCashfreeBase(env?: string) {
  const normalized = (env || '').toLowerCase();
  const isProd = normalized === 'prod' || normalized === 'production' || normalized === 'live';
  return isProd ? 'https://api.cashfree.com/payout' : 'https://sandbox.cashfree.com/payout';
}

async function callCashfree(base: string, path: string, method: string, headers: Record<string, string>, body?: any) {
  const url = `${base}${path.startsWith('/') ? '' : '/'}${path}`;
  const resp = await fetch(url, {
    method,
    headers: { 'Accept': 'application/json', 'Content-Type': 'application/json', ...headers },
    body: body ? JSON.stringify(body) : undefined
  });
  const text = await resp.text();
  let json: any = undefined; try { json = text ? JSON.parse(text) : undefined; } catch {}
  return { status: resp.status, json, text };
}

async function getBearerToken(base: string, clientId: string, clientSecret: string, forward: Headers): Promise<string | null> {
  const pass: Record<string, string> = {}; forward.forEach((v, k) => { if (k.toLowerCase().startsWith('x-cf-')) pass[k] = v; });
  const resp = await fetch(`${base}/v1/authorize`, { method: 'POST', headers: { 'X-Client-Id': clientId, 'X-Client-Secret': clientSecret, 'Accept': 'application/json', ...pass } });
  const text = await resp.text(); try { const j = text ? JSON.parse(text) : undefined; return resp.ok ? (j?.data?.token || j?.token || null) : null; } catch { return null; }
}

async function handler(req: AuthenticatedRequest) {
  if (req.method !== 'POST') return createErrorResponse('Method not allowed', 405);

  const vendor = (req.vendor as any) || {};
  const { cashfree_payout_client_id, cashfree_payout_client_secret, cashfree_env } = vendor;
  if (!cashfree_payout_client_id || !cashfree_payout_client_secret) return createErrorResponse('Payout credentials not configured', 400);

  const base = getCashfreeBase(cashfree_env);
  // Token not required per provided reference when using client id/secret headers

  const body = await req.json();
  const { transfer_id, transfer_amount, beneficiary_id, transfer_remarks, beneficiary_name, bank_account_number, bank_ifsc, callback_url } = body || {};
  if (!transfer_id || !transfer_amount || !(beneficiary_id || (bank_account_number && bank_ifsc && beneficiary_name))) {
    return createErrorResponse('Provide transfer_id, transfer_amount and either beneficiary_id or (beneficiary_name + bank_account_number + bank_ifsc)', 400);
  }

  const headers: Record<string, string> = {
    'X-Client-Id': cashfree_payout_client_id,
    'X-Client-Secret': cashfree_payout_client_secret
  };
  const apiVersion = req.headers.get('x-api-version'); if (apiVersion) headers['X-Api-Version'] = apiVersion;
  req.headers.forEach((v, k) => { if (k.toLowerCase().startsWith('x-cf-')) headers[k] = v; });

  const payload: any = {
    transfer_id,
    transfer_amount: Number(transfer_amount),
    beneficiary_details: beneficiary_id ? { beneficiary_id } : {
      beneficiary_name,
      beneficiary_instrument_details: {
        bank_account_number,
        bank_ifsc
      }
    },
    ...(transfer_remarks ? { transfer_remarks } : {})
  };

  let resp = await callCashfree(base, '/transfers', 'POST', headers, payload);
  const msg = (resp.json && (resp.json.message || '')) || '';
  if (resp.status === 404 || resp.status === 405 || /invalid request url|method/i.test(msg)) {
    resp = await callCashfree(base, '/transfers', 'POST', headers, payload);
  }

  if (resp.status >= 200 && resp.status < 300 && (resp.json?.status || '').toUpperCase() !== 'ERROR') {
    // Persist payout record
    try {
      const statusText = (resp.json?.status || '').toString();
      const cfTransferId = resp.json?.cf_transfer_id || null;
      const currency = 'INR';
      // Upsert by vendor_id + reference_id
      const existing = await db.get(
        'SELECT id FROM payouts WHERE vendor_id = ? AND reference_id = ?',
        [vendor.id, transfer_id]
      );
      const rawRequest = {
        transfer: {
          transfer_id,
          transfer_amount: Number(transfer_amount),
          beneficiary_id,
          beneficiary_name,
          bank_account_number,
          bank_ifsc,
          transfer_remarks
        }
      };
      if (existing?.id) {
        await db.run(
          `UPDATE payouts
           SET amount = ?, currency = ?, remarks = ?, status = ?, cashfree_payout_id = ?, raw_request = ?, raw_response = ?, updated_at = CURRENT_TIMESTAMP
           WHERE id = ?`,
          [Number(transfer_amount), currency, transfer_remarks || null, statusText || 'initiated', cfTransferId, JSON.stringify(rawRequest), JSON.stringify(resp.json || resp.text || null), existing.id]
        );
      } else {
        await db.run(
          `INSERT INTO payouts (vendor_id, amount, currency, beneficiary_name, beneficiary_account, beneficiary_ifsc, beneficiary_upi, reference_id, remarks, status, cashfree_payout_id, raw_request, raw_response)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            vendor.id,
            Number(transfer_amount),
            currency,
            beneficiary_name || null,
            bank_account_number || null,
            bank_ifsc || null,
            null,
            transfer_id,
            transfer_remarks || null,
            statusText || 'initiated',
            cfTransferId,
            JSON.stringify(rawRequest),
            JSON.stringify(resp.json || resp.text || null)
          ]
        );
      }
    } catch (e) {
      console.error('Failed to persist payout:', e);
    }

    // Send callback for initial ACK as well (RECEIVED/APPROVAL_PENDING/etc.)
    try {
      if (callback_url) {
        await fetch(callback_url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            transfer_id,
            cf_transfer_id: resp.json?.cf_transfer_id,
            status: resp.json?.status,
            status_code: resp.json?.status_code,
            status_description: resp.json?.status_description,
            beneficiary_details: resp.json?.beneficiary_details,
            transfer_amount: resp.json?.transfer_amount,
            transfer_utr: resp.json?.transfer_utr,
            fundsource_id: resp.json?.fundsource_id,
            event_time: new Date().toISOString()
          })
        });
      }
    } catch (e) {
      console.error('Callback dispatch failed:', e);
    }
    return createApiResponse({ message: 'Transfer initiated', provider: resp.json }, 200);
  }
  return createErrorResponse(resp.json?.message || 'Failed to initiate transfer', 400);
}

export const POST = withApiKeyAuth(handler);


