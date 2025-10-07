import { NextRequest } from 'next/server';
import { db } from '@/lib/database';
import { withAuth, createApiResponse, createErrorResponse, AuthenticatedRequest } from '@/lib/middleware';
import { updateVendorProfileSchema, validateRequest } from '@/lib/validation';

// Ensure dynamic rendering due to header/auth usage in middleware
export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function getProfile(req: AuthenticatedRequest) {
  try {
    const vendor = await db.get(
      'SELECT id, email, business_name, contact_name, phone, upi_id, bank_name, bank_account_number, bank_account_holder, bank_ifsc, bot_token, chat_id, created_at FROM vendors WHERE id = ?',
      [req.vendor!.id]
    );

    if (!vendor) {
      return createErrorResponse('Vendor not found', 404);
    }

    return createApiResponse({
      vendor: {
        id: vendor.id,
        email: vendor.email,
        business_name: vendor.business_name,
        contact_name: vendor.contact_name,
        phone: vendor.phone,
        upi_id: vendor.upi_id,
        bank_name: vendor.bank_name,
        bank_account_number: vendor.bank_account_number,
        bank_account_holder: vendor.bank_account_holder,
        bank_ifsc: vendor.bank_ifsc,
        bot_token: vendor.bot_token,
        chat_id: vendor.chat_id,
        created_at: vendor.created_at
      }
    });
  } catch (error) {
    console.error('Get profile error:', error);
    return createErrorResponse('Failed to fetch profile', 500);
  }
}

async function updateProfile(req: AuthenticatedRequest) {
  try {
    const body = await req.json();
    const validatedData = validateRequest(updateVendorProfileSchema, body);

    // Build dynamic update query
    const updateFields: string[] = [];
    const updateValues: any[] = [];

    Object.entries(validatedData).forEach(([key, value]) => {
      if (value !== undefined) {
        updateFields.push(`${key} = ?`);
        updateValues.push(value);
      }
    });

    if (updateFields.length === 0) {
      return createErrorResponse('No valid fields to update', 400);
    }

    updateFields.push('updated_at = CURRENT_TIMESTAMP');
    updateValues.push(req.vendor!.id);

    await db.run(
      `UPDATE vendors SET ${updateFields.join(', ')} WHERE id = ?`,
      updateValues
    );

    // Fetch updated vendor data
    const updatedVendor = await db.get(
      'SELECT id, email, business_name, contact_name, phone, upi_id, bank_name, bank_account_number, bank_account_holder, bank_ifsc, bot_token, chat_id, cashfree_app_id, cashfree_secret_key, cashfree_payout_client_id, cashfree_payout_client_secret, cashfree_env, updated_at FROM vendors WHERE id = ?',
      [req.vendor!.id]
    );

    return createApiResponse({
      message: 'Profile updated successfully',
      vendor: updatedVendor
    });
  } catch (error) {
    console.error('Update profile error:', error);
    return createErrorResponse(
      error instanceof Error ? error.message : 'Failed to update profile',
      500
    );
  }
}

async function handler(req: AuthenticatedRequest) {
  if (req.method === 'GET') {
    return getProfile(req);
  } else if (req.method === 'PUT') {
    return updateProfile(req);
  } else {
    return createErrorResponse('Method not allowed', 405);
  }
}

export const GET = withAuth(handler);
export const PUT = withAuth(handler);
