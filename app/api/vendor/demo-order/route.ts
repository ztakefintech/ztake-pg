import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database';
import { withAuth, type AuthenticatedRequest } from '@/lib/middleware';
import { QRCodeService } from '@/lib/qr-generator';
import QRCode from 'qrcode';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function generateOrderId(): string {
  const randomPart = Math.random().toString(36).substring(2, 8).toUpperCase();
  const timePart = Date.now().toString().slice(-6);
  return `ZTK${timePart}${randomPart}`;
}

async function handler(req: AuthenticatedRequest) {
  if (req.method !== 'POST') {
    return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const vendorId = req.vendor!.id;
    const body = await req.json();
    const amount = Number(body.amount);
    const customerName = String(body.customerName || 'Demo Customer').trim();

    if (isNaN(amount) || amount < 5) {
      return NextResponse.json({ error: 'Amount must be at least ₹5' }, { status: 400 });
    }

    // Fetch vendor details from database
    const vendor = await db.get(
      'SELECT id, business_name, upi_id, vendor_code FROM vendors WHERE id = ? LIMIT 1',
      [vendorId]
    );

    if (!vendor) {
      return NextResponse.json({ error: 'Vendor not found' }, { status: 404 });
    }

    if (!vendor.upi_id) {
      return NextResponse.json({ error: 'UPI ID is not configured in settings. Please configure your UPI ID first.' }, { status: 400 });
    }

    const ztakeOrderId = generateOrderId();
    const merchantOrderId = `DEMO-${Date.now()}`;

    await db.run(
      `INSERT INTO orders (
        ztake_order_id, order_code, merchant_order_id, amount, original_amount, currency, customer_name, 
        return_url, callback_url, status, vendor_id, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, 'INR', ?, '/demo', '/demo', 'order_created', ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      [
        ztakeOrderId,
        ztakeOrderId,
        merchantOrderId,
        amount,
        amount,
        customerName,
        vendorId
      ]
    );

    // Generate UPI URL and dynamic QR Code representing this amount
    const upiUrl = QRCodeService.createUPIUrl(vendor.upi_id, vendor.business_name || '', amount);
    let qrCodeUrl: string | null = null;
    try {
      qrCodeUrl = await QRCodeService.generateQRCode(vendor.upi_id, vendor.business_name || '', amount);
    } catch (e) {
      console.error('Failed to generate QR code for demo payin order:', e);
    }

    // Generate public payment page URL and its QR code
    const origin = req.nextUrl.origin;
    const payPageUrl = `${origin}/pay/${ztakeOrderId}`;
    let pageQrCodeUrl: string | null = null;
    try {
      pageQrCodeUrl = await QRCode.toDataURL(payPageUrl, { width: 256, margin: 1 });
    } catch (e) {
      console.error('Failed to generate QR code for pay page URL:', e);
    }

    return NextResponse.json({
      success: true,
      ztakeOrderId,
      amount,
      customerName,
      status: 'order_created',
      upiUrl,
      qrCodeUrl,
      payPageUrl,
      pageQrCodeUrl,
      upiId: vendor.upi_id
    });
  } catch (error) {
    console.error('Demo order creation error:', error);
    return NextResponse.json({ error: 'Failed to create demo order' }, { status: 500 });
  }
}

export const POST = withAuth(handler);
