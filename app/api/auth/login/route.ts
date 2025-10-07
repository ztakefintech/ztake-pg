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

    // Find vendor by email
    const vendor = await db.get(
      'SELECT id, email, password_hash, business_name, contact_name, phone, upi_id FROM vendors WHERE email = ?',
      [validatedData.email]
    );

    if (!vendor) {
      return createErrorResponse('Invalid email or password', 401);
    }

    // Verify password
    const isValidPassword = await AuthService.verifyPassword(
      validatedData.password,
      vendor.password_hash
    );

    if (!isValidPassword) {
      return createErrorResponse('Invalid email or password', 401);
    }

    // Generate JWT token
    const token = AuthService.generateVendorToken({
      id: vendor.id,
      email: vendor.email,
      business_name: vendor.business_name
    });

    return createApiResponse({
      message: 'Login successful',
      token,
      vendor: {
        id: vendor.id,
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
