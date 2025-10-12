import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from './auth';
import { db } from './database';
import { authRateLimit, apiRateLimit, paymentUpdateRateLimit } from './rate-limit';

export interface AuthenticatedRequest extends NextRequest {
  vendor?: {
    id: number;
    vendor_code?: string;
    email: string;
    business_name: string;
    contact_name: string;
    phone?: string;
    upi_id: string;
    bot_token?: string;
    chat_id?: string;
  };
  apiKey?: {
    keyId: number;
    keyName: string;
  };
}

export function withAuth(handler: (req: AuthenticatedRequest) => Promise<NextResponse>) {
  return async (req: NextRequest): Promise<NextResponse> => {
    try {
      const authHeader = req.headers.get('authorization');
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return NextResponse.json(
          { error: 'Authorization header required' },
          { status: 401 }
        );
      }

      const token = authHeader.substring(7);
      const tokenPayload = AuthService.verifyVendorToken(token);

      if (!tokenPayload) {
        return NextResponse.json(
          { error: 'Invalid or expired token' },
          { status: 401 }
        );
      }

      // Fetch complete vendor data from database
      const vendor = await db.get(
        'SELECT id, vendor_code, email, business_name, contact_name, phone, upi_id, bot_token, chat_id, bank_name, bank_account_number, bank_account_holder, bank_ifsc, cashfree_app_id, cashfree_secret_key, cashfree_payout_client_id, cashfree_payout_client_secret, cashfree_env FROM vendors WHERE id = ?',
        [tokenPayload.id]
      );

      if (!vendor) {
        return NextResponse.json(
          { error: 'Vendor not found' },
          { status: 401 }
        );
      }

      (req as AuthenticatedRequest).vendor = vendor;
      return handler(req as AuthenticatedRequest);
    } catch (error) {
      console.error('Auth middleware error:', error);
      return NextResponse.json(
        { error: 'Authentication failed' },
        { status: 401 }
      );
    }
  };
}

export function withApiKeyAuth(handler: (req: AuthenticatedRequest) => Promise<NextResponse>) {
  return async (req: NextRequest): Promise<NextResponse> => {
    try {
      const authHeader = req.headers.get('authorization');
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return NextResponse.json(
          { error: 'API key required' },
          { status: 401 }
        );
      }

      const apiKey = authHeader.substring(7);
      const keyInfo = await AuthService.verifyApiKeyFromDb(apiKey);

      if (!keyInfo) {
        return NextResponse.json(
          { error: 'Invalid API key' },
          { status: 401 }
        );
      }

      (req as AuthenticatedRequest).apiKey = {
        keyId: keyInfo.keyId,
        keyName: keyInfo.keyName
      } as any;
      // Also attach vendor if linked to this API key
      if ((keyInfo as any).vendorId) {
        const vendor = await db.get(
          'SELECT id, vendor_code, email, business_name, contact_name, phone, upi_id, bot_token, chat_id, bank_name, bank_account_number, bank_account_holder, bank_ifsc, cashfree_app_id, cashfree_secret_key, cashfree_payout_client_id, cashfree_payout_client_secret, cashfree_env FROM vendors WHERE id = ?',
          [(keyInfo as any).vendorId]
        );
        if (vendor) {
          (req as AuthenticatedRequest).vendor = vendor;
        }
      }
      return handler(req as AuthenticatedRequest);
    } catch (error) {
      return NextResponse.json(
        { error: 'API key authentication failed' },
        { status: 401 }
      );
    }
  };
}

export function withRateLimit(rateLimiter: (req: NextRequest) => { success: boolean; message?: string; resetTime?: number }) {
  return (handler: (req: NextRequest) => Promise<NextResponse>) => {
    return async (req: NextRequest): Promise<NextResponse> => {
      const rateLimitResult = rateLimiter(req);
      
      if (!rateLimitResult.success) {
        return NextResponse.json(
          { 
            error: rateLimitResult.message,
            resetTime: rateLimitResult.resetTime
          },
          { 
            status: 429,
            headers: {
              'Retry-After': rateLimitResult.resetTime ? 
                Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000).toString() : 
                '60'
            }
          }
        );
      }

      return handler(req);
    };
  };
}

export function createApiResponse(data: any, status: number = 200) {
  return NextResponse.json(data, { status });
}

export function createErrorResponse(message: string, status: number = 400) {
  return NextResponse.json({ error: message }, { status });
}
