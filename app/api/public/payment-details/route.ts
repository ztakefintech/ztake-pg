import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database';
import { QRCodeService } from '@/lib/qr-generator';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const vendorIdParam = searchParams.get('vendor_id');

    if (!vendorIdParam) {
      return NextResponse.json({ success: false, error: 'vendor_id is required' }, { status: 400 });
    }

    const vendorId = Number(vendorIdParam);
    if (!Number.isFinite(vendorId) || vendorId <= 0) {
      return NextResponse.json({ success: false, error: 'Invalid vendor_id' }, { status: 400 });
    }

    const vendor = await db.get(
      'SELECT id, business_name, upi_id, bank_name, bank_account_number, bank_account_holder, bank_ifsc FROM vendors WHERE id = ? LIMIT 1',
      [vendorId]
    );

    if (!vendor) {
      return NextResponse.json({ success: false, error: 'Vendor not found' }, { status: 404 });
    }

    const amountParam = searchParams.get('amount');
    const amount = amountParam ? Number(amountParam) : null;

    let qrCodeDataUrl: string | null = null;
    if (vendor.upi_id) {
      try {
        if (amount && amount > 0) {
          qrCodeDataUrl = await QRCodeService.generateQRCode(vendor.upi_id, vendor.business_name || '', amount);
        } else {
          const qr = await QRCodeService.generateQRCodeForVendor(vendor.upi_id, vendor.business_name || '');
          qrCodeDataUrl = qr.qrCodeUrl;
        }
      } catch (e) {
        console.error('QR generation error in payment-details API:', e);
      }
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          qr_code: qrCodeDataUrl,
          upi_id: vendor.upi_id || null,
          bank_name: vendor.bank_name || null,
          bank_account_number: vendor.bank_account_number || null,
          bank_account_holder: vendor.bank_account_holder || null,
          bank_ifsc: vendor.bank_ifsc || null,
        },
      },
      {
        headers: {
          'Cache-Control': 'public, max-age=300',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}


