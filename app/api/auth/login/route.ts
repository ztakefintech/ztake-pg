import { NextRequest } from 'next/server';
import { db } from '@/lib/database';
import { AuthService } from '@/lib/auth';
import { vendorLoginSchema, validateRequest } from '@/lib/validation';
import { withRateLimit, createApiResponse, createErrorResponse } from '@/lib/middleware';
import { authRateLimit } from '@/lib/rate-limit';

async function handler(req: NextRequest) {
  if (req.method !== 'POST') {
    return createErrorResponse('Method not allowed', 405);
  }

  try {
    const body = await req.json();
    const validatedData = validateRequest(vendorLoginSchema, body);

    // Find vendor by email, including google_id to check if they're a Google OAuth user
    const vendor = await db.get(
      'SELECT id, vendor_code, email, password_hash, business_name, contact_name, phone, upi_id, google_id FROM vendors WHERE email = ?',
      [validatedData.email]
    );

    if (!vendor) {
      return createErrorResponse('Invalid email or password', 401);
    }

    // Check if this is a Google OAuth user with placeholder password
    const isGoogleOAuthUser = vendor.google_id && vendor.password_hash === 'google_oauth_user';

    if (isGoogleOAuthUser) {
      // First-time email/password login for Google OAuth user - set their password
      console.log(`Setting password for Google OAuth user: ${vendor.email}`);
      const passwordHash = await AuthService.hashPassword(validatedData.password);
      
      // Update password hash in database
      await db.run(
        'UPDATE vendors SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [passwordHash, vendor.id]
      );

      console.log(`Password set successfully for Google OAuth user: ${vendor.email}`);
    } else {
      // Normal password verification for regular users or Google users who already set a password
      const isValidPassword = await AuthService.verifyPassword(
        validatedData.password,
        vendor.password_hash
      );

      if (!isValidPassword) {
        return createErrorResponse('Invalid email or password', 401);
      }
    }

    // Generate JWT token
    const token = AuthService.generateVendorToken({
      id: vendor.id,
      email: vendor.email,
      business_name: vendor.business_name
    });

    return createApiResponse({
      message: isGoogleOAuthUser 
        ? 'Password set successfully. Login successful.' 
        : 'Login successful',
      token,
      vendor: {
        id: vendor.id,
        vendor_code: vendor.vendor_code,
        email: vendor.email,
        business_name: vendor.business_name,
        contact_name: vendor.contact_name,
        phone: vendor.phone,
        upi_id: vendor.upi_id
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    return createErrorResponse(
      error instanceof Error ? error.message : 'Login failed',
      500
    );
  }
}

export const POST = withRateLimit(authRateLimit)(handler);
