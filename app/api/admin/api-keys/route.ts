import { NextRequest } from 'next/server';
import { AuthService } from '@/lib/auth';
import { createApiKeySchema, validateRequest } from '@/lib/validation';
import { withAuth, createApiResponse, createErrorResponse, AuthenticatedRequest } from '@/lib/middleware';

// Ensure dynamic rendering due to header/auth usage in middleware
export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function createApiKey(req: AuthenticatedRequest) {
  if (req.method !== 'POST') {
    return createErrorResponse('Method not allowed', 405);
  }

  try {
    const body = await req.json();
    const validatedData = validateRequest(createApiKeySchema, body);

    const vendorId = (req.vendor as any)?.id || null;
    const { apiKey, keyId } = await AuthService.createApiKey(validatedData.key_name, vendorId ?? undefined);

    return createApiResponse({
      message: 'API key created successfully',
      api_key: apiKey,
      key_id: keyId,
      key_name: validatedData.key_name,
      note: 'Store this API key securely. It will not be shown again.'
    }, 201);

  } catch (error) {
    console.error('Create API key error:', error);
    return createErrorResponse(
      error instanceof Error ? error.message : 'Failed to create API key',
      500
    );
  }
}

// For now, we'll use vendor auth for admin functions
// In production, you'd want separate admin authentication
export const POST = withAuth(createApiKey);
