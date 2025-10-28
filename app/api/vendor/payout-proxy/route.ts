import { NextRequest, NextResponse } from 'next/server';
import { withAuth, createErrorResponse, AuthenticatedRequest } from '@/lib/middleware';
import { db } from '@/lib/database';

async function handleProxy(req: AuthenticatedRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const path = searchParams.get('path');
    
    if (!path) {
      return createErrorResponse('Path query parameter is required', 400);
    }

    // Get vendor's Cashfree credentials
    const vendor = await db.get(
      'SELECT cashfree_app_id, cashfree_secret_key, cashfree_payout_client_id, cashfree_payout_client_secret, cashfree_env FROM vendors WHERE id = ?',
      [req.vendor!.id]
    );

    if (!vendor) {
      return createErrorResponse('Vendor not found', 404);
    }

    // Determine the base URL based on environment
    const baseUrl = vendor.cashfree_env === 'production' 
      ? 'https://api.cashfree.com/payout/v1'
      : 'https://payout-gamma.cashfree.com';

    const url = `${baseUrl}${path}`;
    
    // Get the request body if method is POST/PUT/PATCH
    let body = null;
    if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
      try {
        body = await req.json();
      } catch {
        // No body or invalid JSON
      }
    }

    // Forward the request to Cashfree
    const cashfreeResponse = await fetch(url, {
      method: req.method,
      headers: {
        'Content-Type': 'application/json',
        'X-Client-Id': vendor.cashfree_app_id || '',
        'X-Client-Secret': vendor.cashfree_secret_key || '',
        'X-Idempotency-Key': req.headers.get('X-Idempotency-Key') || ''
      },
      body: body ? JSON.stringify(body) : undefined
    });

    const responseData = await cashfreeResponse.text();
    
    // Return the exact response from Cashfree
    return new NextResponse(responseData, {
      status: cashfreeResponse.status,
      headers: {
        'Content-Type': cashfreeResponse.headers.get('Content-Type') || 'application/json'
      }
    });

  } catch (error) {
    console.error('Proxy error:', error);
    return createErrorResponse('Proxy request failed', 500);
  }
}

async function handler(req: AuthenticatedRequest) {
  return handleProxy(req);
}

export const GET = withAuth(handler);
export const POST = withAuth(handler);
export const PUT = withAuth(handler);
export const DELETE = withAuth(handler);
export const PATCH = withAuth(handler);
export const HEAD = withAuth(handler);
export const OPTIONS = withAuth(handler);
