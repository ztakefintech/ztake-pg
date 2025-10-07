import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database';
import { AuthService } from '@/lib/auth';
import { withApiKeyAuth, type AuthenticatedRequest } from '@/lib/middleware';

function generateztakeOrderId(): string {
  const randomPart = Math.random().toString(36).substring(2, 8).toUpperCase();
  const timePart = Date.now().toString().slice(-6);
  return `ztk${timePart}${randomPart}`;
}

function isValidUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      merchantOrderId,
      amount,
      currency,
      customerName,
      returnUrl,
      callbackUrl,
      vendorId: vendorIdFromBody
    } = body || {};

    if (!merchantOrderId || typeof merchantOrderId !== 'string') {
      return NextResponse.json({ error: 'merchantOrderId is required' }, { status: 400 });
    }
    if (
      amount === undefined ||
      amount === null ||
      typeof amount !== 'number' ||
      !Number.isFinite(amount)
    ) {
      return NextResponse.json({ error: 'amount must be a number' }, { status: 400 });
    }
    if (!currency || typeof currency !== 'string') {
      return NextResponse.json({ error: 'currency is required' }, { status: 400 });
    }
    if (!customerName || typeof customerName !== 'string') {
      return NextResponse.json({ error: 'customerName is required' }, { status: 400 });
    }
    if (!returnUrl || typeof returnUrl !== 'string' || !isValidUrl(returnUrl)) {
      return NextResponse.json({ error: 'returnUrl must be a valid URL' }, { status: 400 });
    }
    if (!callbackUrl || typeof callbackUrl !== 'string' || !isValidUrl(callbackUrl)) {
      return NextResponse.json({ error: 'callbackUrl must be a valid URL' }, { status: 400 });
    }

    const ztakeOrderId = generateztakeOrderId();
    const paymentUrl = `${process.env.NEXT_PUBLIC_BASE_URL || ''}/orders/${ztakeOrderId}`;

    // Optional vendor association: prefer API key mapping vendor, else vendor JWT
    let vendorId: number | null = null;
    if (
      vendorIdFromBody !== undefined &&
      vendorIdFromBody !== null &&
      Number.isFinite(Number(vendorIdFromBody)) &&
      Number(vendorIdFromBody) > 0
    ) {
      vendorId = Number(vendorIdFromBody);
    }
    const authHeader = req.headers.get('authorization');
    if (!vendorId && authHeader && authHeader.startsWith('Bearer ')) {
      const bearer = authHeader.substring(7);
      const apiKeyInfo = await AuthService.verifyApiKeyFromDb(bearer);
      if (apiKeyInfo && apiKeyInfo.vendorId) {
        vendorId = apiKeyInfo.vendorId;
      } else {
        const payload = AuthService.verifyVendorToken(bearer);
        if (payload && (payload as any).id) {
          vendorId = (payload as any).id;
        }
      }
    }

    await db.run(
      `INSERT INTO orders (ztake_order_id, order_code, merchant_order_id, amount, currency, customer_name, return_url, callback_url, vendor_id, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'order_created')`,
      [ztakeOrderId, ztakeOrderId, merchantOrderId, amount, currency, customerName, returnUrl, callbackUrl, vendorId]
    );

    return NextResponse.json({
      status: 'success',
      merchantOrderId:merchantOrderId,
      ztakeOrderId:ztakeOrderId,
      paymentUrl,
      vendorId: vendorId
    });
  } catch (error) {
    console.error('Create order error:', error);
    return NextResponse.json({ error: 'Failed to create order' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 200);
    const offset = Math.max(parseInt(searchParams.get('offset') || '0', 10), 0);

    const orders = await db.all(
      `SELECT ztake_order_id, merchant_order_id, amount, currency, customer_name, status, utr, created_at
       FROM orders ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [limit, offset]
    );

    const countRow = await db.get(`SELECT COUNT(*) as count FROM orders`);

    return NextResponse.json({
      success: true,
      data: {
        orders,
        count: Number(countRow?.count || 0)
      }
    });
  } catch (error) {
    console.error('List orders error:', error);
    return NextResponse.json({ error: 'Failed to list orders' }, { status: 500 });
  }
}


