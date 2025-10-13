import { NextRequest, NextResponse } from 'next/server';
import { withAuth, createApiResponse, createErrorResponse, AuthenticatedRequest } from '@/lib/middleware';
import { db } from '@/lib/database';
import { validateRequest } from '@/lib/validation';
import crypto from 'crypto';

// Generate a secure secret key
function generateSecretKey(): string {
  const prefix = 'sk_live_';
  const randomBytes = crypto.randomBytes(24);
  const randomString = randomBytes.toString('hex');
  return prefix + randomString;
}

export const GET = withAuth(async (req: AuthenticatedRequest) => {
  try {
    const vendorId = req.vendor!.id;
    
    // Check if vendor already has a secret key
    const existingVendor = await db.get(
      'SELECT secret_key FROM vendors WHERE id = ?',
      [vendorId]
    );
    
    if (existingVendor?.secret_key) {
      return createApiResponse({
        success: true,
        data: {
          secret_key: existingVendor.secret_key,
          message: 'Secret key already exists'
        }
      });
    }
    
    // Generate new secret key
    let secretKey: string;
    let isUnique = false;
    let attempts = 0;
    const maxAttempts = 10;
    
    do {
      secretKey = generateSecretKey();
      const existingKey = await db.get(
        'SELECT id FROM vendors WHERE secret_key = ?',
        [secretKey]
      );
      isUnique = !existingKey;
      attempts++;
    } while (!isUnique && attempts < maxAttempts);
    
    if (!isUnique) {
      return createErrorResponse('Failed to generate unique secret key', 500);
    }
    
    // Save secret key to database
    await db.run(
      'UPDATE vendors SET secret_key = ? WHERE id = ?',
      [secretKey, vendorId]
    );
    
    return createApiResponse({
      success: true,
      data: {
        secret_key: secretKey,
        message: 'Secret key generated successfully'
      }
    });
    
  } catch (error) {
    console.error('Generate secret key error:', error);
    return createErrorResponse('Failed to generate secret key', 500);
  }
});

export const POST = withAuth(async (req: AuthenticatedRequest) => {
  try {
    const vendorId = req.vendor!.id;
    
    // Generate new secret key (regenerate)
    let secretKey: string;
    let isUnique = false;
    let attempts = 0;
    const maxAttempts = 10;
    
    do {
      secretKey = generateSecretKey();
      const existingKey = await db.get(
        'SELECT id FROM vendors WHERE secret_key = ?',
        [secretKey]
      );
      isUnique = !existingKey;
      attempts++;
    } while (!isUnique && attempts < maxAttempts);
    
    if (!isUnique) {
      return createErrorResponse('Failed to generate unique secret key', 500);
    }
    
    // Save new secret key to database (overwrites existing)
    await db.run(
      'UPDATE vendors SET secret_key = ? WHERE id = ?',
      [secretKey, vendorId]
    );
    
    return createApiResponse({
      success: true,
      data: {
        secret_key: secretKey,
        message: 'Secret key regenerated successfully'
      }
    });
    
  } catch (error) {
    console.error('Regenerate secret key error:', error);
    return createErrorResponse('Failed to regenerate secret key', 500);
  }
});

export const PUT = withAuth(async (req: AuthenticatedRequest) => {
  try {
    const vendorId = req.vendor!.id;
    const body = await req.json().catch(() => ({}));
    const providedKey = (body?.secret_key || '').toString();

    // Validate secret key format: must start with sk_, length <= 64, allowed chars
    if (!providedKey || !providedKey.startsWith('sk_') || providedKey.length > 64 || !/^[A-Za-z0-9_\-]+$/.test(providedKey)) {
      return createErrorResponse('Invalid secret key format', 400);
    }

    // Ensure uniqueness
    const existing = await db.get(
      'SELECT id FROM vendors WHERE secret_key = ? AND id <> ?',
      [providedKey, vendorId]
    );
    if (existing) {
      return createErrorResponse('Secret key already in use', 409);
    }

    // Save to DB
    await db.run(
      'UPDATE vendors SET secret_key = ? WHERE id = ?',
      [providedKey, vendorId]
    );

    return createApiResponse({
      success: true,
      data: {
        secret_key: providedKey,
        message: 'Secret key saved successfully'
      }
    });
  } catch (error) {
    console.error('Save secret key error:', error);
    return createErrorResponse('Failed to save secret key', 500);
  }
});
