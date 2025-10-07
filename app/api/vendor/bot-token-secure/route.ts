import { NextRequest } from 'next/server';
import { db } from '@/lib/database';
import { withApiKeyAuth, createApiResponse, createErrorResponse, AuthenticatedRequest } from '@/lib/middleware';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

async function handler(req: AuthenticatedRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const vendorId = searchParams.get('vendor_id');

    if (!vendorId) {
      return createErrorResponse('Vendor ID is required', 400);
    }

    // Get vendor's bot token and chat_id
    const vendor = await db.get(
      'SELECT id, business_name, bot_token, chat_id FROM vendors WHERE id = ?',
      [vendorId]
    );

    if (!vendor) {
      return createErrorResponse('Vendor not found', 404);
    }

    if (!vendor.bot_token) {
      return createErrorResponse('Bot token not configured for this vendor', 404);
    }

    return createApiResponse({
      vendor_id: vendor.id,
      business_name: vendor.business_name,
      bot_token: vendor.bot_token,
      chat_id: vendor.chat_id
    });
  } catch (error) {
    console.error('Get bot token error:', error);
    return createErrorResponse('Failed to fetch bot token', 500);
  }
}

export const GET = withApiKeyAuth(handler);
