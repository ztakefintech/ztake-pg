import { NextRequest } from 'next/server';
import { db } from '@/lib/database';
import { createApiResponse, createErrorResponse } from '@/lib/middleware';

async function handler(req: NextRequest) {
  if (req.method !== 'POST') {
    return createErrorResponse('Method not allowed', 405);
  }

  try {
    const { email } = await req.json();

    if (!email) {
      return createErrorResponse('Email is required', 400);
    }

    // Check if vendor exists and is approved
    const vendor = await db.get(
      'SELECT id, email, business_name, is_approved, google_id FROM vendors WHERE email = ?',
      [email]
    );

    if (!vendor) {
      return createApiResponse({
        exists: false,
        approved: false,
        hasGoogleId: false,
        message: 'Email not found'
      });
    }

    const isApproved = vendor.is_approved === true || vendor.is_approved === 1;
    const hasGoogleId = !!vendor.google_id;

    let message = '';
    if (hasGoogleId && !isApproved) {
      message = 'Email exists but not approved. Please use Google login.';
    } else if (hasGoogleId && isApproved) {
      message = 'Email is approved. Please use Google login.';
    } else if (!hasGoogleId && !isApproved) {
      message = 'Email exists but not approved';
    } else {
      message = 'Email is approved';
    }

    return createApiResponse({
      exists: true,
      approved: isApproved,
      hasGoogleId: hasGoogleId,
      message: message,
      vendor: {
        id: vendor.id,
        email: vendor.email,
        business_name: vendor.business_name
      }
    });

  } catch (error) {
    console.error('Check email error:', error);
    return createErrorResponse(
      error instanceof Error ? error.message : 'Failed to check email',
      500
    );
  }
}

export const POST = handler;
