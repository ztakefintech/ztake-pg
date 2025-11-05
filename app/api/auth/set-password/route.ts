import { NextRequest } from 'next/server';
import { db } from '@/lib/database';
import { AuthService } from '@/lib/auth';
import { withAuth, createApiResponse, createErrorResponse, AuthenticatedRequest } from '@/lib/middleware';
import { withRateLimit } from '@/lib/middleware';
import { authRateLimit } from '@/lib/rate-limit';
import Joi from 'joi';

const setPasswordSchema = Joi.object({
  password: Joi.string().min(8).max(128)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^\w\s])/)
    .required()
    .messages({
      'string.pattern.base': 'Password must contain at least one lowercase letter, one uppercase letter, one number, and one special character',
      'string.min': 'Password must be at least 8 characters long'
    }),
  currentPassword: Joi.string().optional()
});

async function handler(req: AuthenticatedRequest) {
  if (req.method !== 'POST') {
    return createErrorResponse('Method not allowed', 405);
  }

  try {
    const body = await req.json();
    const { error, value } = setPasswordSchema.validate(body, {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      const errorMessages = error.details.map(detail => detail.message).join('; ');
      return createErrorResponse(errorMessages, 400);
    }

    const { password, currentPassword } = value;

    // Get vendor details including password_hash and google_id
    const vendor = await db.get(
      'SELECT id, email, password_hash, google_id FROM vendors WHERE id = ?',
      [req.vendor!.id]
    );

    if (!vendor) {
      return createErrorResponse('Vendor not found', 404);
    }

    // Check if user is a Google OAuth user with placeholder password
    const isGoogleOAuthUser = vendor.google_id && vendor.password_hash === 'google_oauth_user';

    // If not a Google OAuth user, require current password for verification
    if (!isGoogleOAuthUser) {
      if (!currentPassword) {
        return createErrorResponse('Current password is required', 400);
      }

      const isValidPassword = await AuthService.verifyPassword(
        currentPassword,
        vendor.password_hash
      );

      if (!isValidPassword) {
        return createErrorResponse('Current password is incorrect', 401);
      }
    }

    // Hash the new password
    const passwordHash = await AuthService.hashPassword(password);

    // Update password in database
    await db.run(
      'UPDATE vendors SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [passwordHash, vendor.id]
    );

    return createApiResponse({
      message: isGoogleOAuthUser 
        ? 'Password set successfully. You can now login with email and password.'
        : 'Password updated successfully'
    });

  } catch (error) {
    console.error('Set password error:', error);
    return createErrorResponse(
      error instanceof Error ? error.message : 'Failed to set password',
      500
    );
  }
}

export const POST = withRateLimit(authRateLimit)(withAuth(handler));

