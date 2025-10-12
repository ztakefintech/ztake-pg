import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database';
import { AuthService } from '@/lib/auth';
import { createApiResponse, createErrorResponse } from '@/lib/middleware';
import { withRateLimit } from '@/lib/middleware';
import { authRateLimit } from '@/lib/rate-limit';
import { generateVendorId } from '@/lib/utils';

interface GoogleUserInfo {
  id: string;
  email: string;
  name: string;
  picture?: string;
  verified_email: boolean;
}

async function handler(req: NextRequest) {
  if (req.method !== 'POST') {
    return createErrorResponse('Method not allowed', 405);
  }

  try {
    const { accessToken } = await req.json();

    if (!accessToken) {
      console.error('Google OAuth: No access token provided');
      return createErrorResponse('Access token is required', 400);
    }

    console.log('Google OAuth: Verifying access token...');

    // Verify the Google access token and get user info
    const googleResponse = await fetch(
      `https://www.googleapis.com/oauth2/v2/userinfo?access_token=${accessToken}`
    );

    if (!googleResponse.ok) {
      const errorText = await googleResponse.text();
      console.error('Google OAuth: Token verification failed:', googleResponse.status, errorText);
      return createErrorResponse('Invalid Google access token', 401);
    }

    const googleUser: GoogleUserInfo = await googleResponse.json();
    console.log('Google OAuth: User info retrieved:', { email: googleUser.email, verified: googleUser.verified_email });

    if (!googleUser.verified_email) {
      return createErrorResponse('Google email is not verified', 400);
    }

    // Check if user exists in our database
    const existingVendor = await db.get(
      'SELECT id, vendor_code, email, business_name, contact_name, phone, upi_id, is_approved, google_id FROM vendors WHERE email = $1 OR google_id = $2',
      [googleUser.email, googleUser.id]
    );

    if (!existingVendor) {
      // User doesn't exist - create new user in database
      console.log('Google OAuth: Creating new user:', googleUser.email);
      
      try {
        // Generate unique vendor code using proper pattern
        let vendorCode: string;
        let isUnique = false;
        let attempts = 0;
        const maxAttempts = 10;

        do {
          vendorCode = generateVendorId();
          const existingCode = await db.get(
            'SELECT id FROM vendors WHERE vendor_code = $1',
            [vendorCode]
          );
          isUnique = !existingCode;
          attempts++;
        } while (!isUnique && attempts < maxAttempts);

        if (!isUnique) {
          throw new Error('Failed to generate unique vendor code');
        }
        
        // Create new vendor with Google OAuth data
        const result = await db.run(`
          INSERT INTO vendors (
            vendor_code,
            email,
            password_hash,
            business_name,
            contact_name,
            phone,
            upi_id,
            is_approved,
            google_id,
            created_at,
            updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        `, [
          vendorCode,
          googleUser.email,
          'google_oauth_user', // Placeholder password hash for Google OAuth users
          googleUser.name || 'Google User',
          googleUser.name || 'Google User',
          null, // Phone not available from Google
          `${googleUser.email}@upi`, // Generate UPI ID from email
          false, // Not approved by default
          googleUser.id
        ]);

        const newVendorId = result.lastID;
        console.log('Google OAuth: New user created with ID:', newVendorId);

        // Return access denied response for new user (needs approval)
        return NextResponse.json({
          success: false,
          requiresApproval: true,
          message: 'Your account has been created and is pending approval. Please contact support.',
          email: googleUser.email,
          name: googleUser.name,
          userId: newVendorId
        }, { status: 403 });
      } catch (createError) {
        console.error('Google OAuth: Failed to create user:', createError);
        return NextResponse.json({
          success: false,
          requiresApproval: true,
          message: 'Failed to create account. Please contact support.',
          email: googleUser.email,
          name: googleUser.name
        }, { status: 500 });
      }
    }

    // Check if user is approved
    if (!existingVendor.is_approved) {
      return NextResponse.json({
        success: false,
        requiresApproval: true,
        message: 'Your account is pending approval. Please contact support.',
        email: existingVendor.email,
        name: existingVendor.contact_name
      }, { status: 403 });
    }

    // Update Google ID if not already set
    if (!existingVendor.google_id) {
      await db.run(
        'UPDATE vendors SET google_id = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        [googleUser.id, existingVendor.id]
      );
    }

    // Generate JWT token for approved user
    const token = AuthService.generateVendorToken({
      id: existingVendor.id,
      email: existingVendor.email,
      business_name: existingVendor.business_name
    });

    return createApiResponse({
      message: 'Google login successful',
      token,
      vendor: {
        id: existingVendor.id,
        vendor_code: existingVendor.vendor_code,
        email: existingVendor.email,
        business_name: existingVendor.business_name,
        contact_name: existingVendor.contact_name,
        phone: existingVendor.phone,
        upi_id: existingVendor.upi_id
      }
    });

  } catch (error) {
    console.error('Google OAuth error:', error);
    return createErrorResponse(
      error instanceof Error ? error.message : 'Google login failed',
      500
    );
  }
}

export const POST = withRateLimit(authRateLimit)(handler);
