import { NextRequest } from 'next/server';
import { db } from '@/lib/database';
import { AuthService } from '@/lib/auth';
import { vendorRegistrationSchema, validateRequest } from '@/lib/validation';
import { withRateLimit, createApiResponse, createErrorResponse } from '@/lib/middleware';
import { authRateLimit } from '@/lib/rate-limit';

async function handler(req: NextRequest) {
  if (req.method !== 'POST') {
    return createErrorResponse('Method not allowed', 405);
  }

  try {
    const body = await req.json();
    const validatedData = validateRequest(vendorRegistrationSchema, body);

    // Check if vendor already exists
    const existingVendor = await db.get(
      'SELECT id FROM vendors WHERE email = ?',
      [validatedData.email]
    );

    if (existingVendor) {
      return createErrorResponse('Vendor with this email already exists', 409);
    }

    // Hash password
    const passwordHash = await AuthService.hashPassword(validatedData.password);

    // Create vendor
    const result = await db.run(
      `INSERT INTO vendors (email, password_hash, business_name, contact_name, phone, upi_id) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        validatedData.email,
        passwordHash,
        validatedData.business_name,
        validatedData.contact_name,
        validatedData.phone || null,
        validatedData.upi_id
      ]
    );

    // Generate JWT token
    const token = AuthService.generateVendorToken({
      id: result.lastID,
      email: validatedData.email,
      business_name: validatedData.business_name
    });

    return createApiResponse({
      message: 'Vendor registered successfully',
      token,
      vendor: {
        id: result.lastID,
        email: validatedData.email,
        business_name: validatedData.business_name,
        contact_name: validatedData.contact_name,
        phone: validatedData.phone,
        upi_id: validatedData.upi_id
      }
    }, 201);

  } catch (error) {
    console.error('Registration error:', error);
    return createErrorResponse(
      error instanceof Error ? error.message : 'Registration failed',
      500
    );
  }
}

export const POST = withRateLimit(authRateLimit)(handler);
