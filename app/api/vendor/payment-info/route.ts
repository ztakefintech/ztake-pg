import { NextRequest } from 'next/server';
import { withAuth, createApiResponse, createErrorResponse, AuthenticatedRequest } from '@/lib/middleware';
import { QRCodeService } from '@/lib/qr-generator';

// Ensure dynamic rendering due to header/auth usage in middleware
export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function handler(req: AuthenticatedRequest) {
  if (req.method !== 'GET') {
    return createErrorResponse('Method not allowed', 405);
  }

  try {
    const vendor = req.vendor! as any;
    
    // Generate QR code for the vendor's UPI ID
    const qrData = await QRCodeService.generateQRCodeForVendor(vendor.upi_id, vendor.business_name || '');

    return createApiResponse({
      qr_code_url: qrData.qrCodeUrl,
      upi_id: qrData.upiId,
      upi_url: qrData.upiUrl,
      vendor_id: vendor.id,
      // Bank details
      bank_name: vendor.bank_name || null,
      bank_account_holder: vendor.bank_account_holder || null,
      bank_account_number: vendor.bank_account_number || null,
      bank_ifsc: vendor.bank_ifsc || null,
      // Bot details/status
      bot_token_present: Boolean(vendor.bot_token),
      chat_id_present: Boolean(vendor.chat_id),
      is_bot_live: Boolean(vendor.bot_token && vendor.chat_id)
    });
  } catch (error) {
    console.error('Get payment info error:', error);
    return createErrorResponse('Failed to fetch payment information', 500);
  }
}

export const GET = withAuth(handler);
