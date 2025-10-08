import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from './auth';

export function verifyAdminToken(request: NextRequest) {
  const token = request.cookies.get('admin-token')?.value;
  
  if (!token) {
    return null;
  }

  return AuthService.verifyAdminToken(token);
}

export function requireAdmin(handler: (req: NextRequest) => Promise<NextResponse>) {
  return async (req: NextRequest): Promise<NextResponse> => {
    try {
      const admin = verifyAdminToken(req);
      
      if (!admin) {
        return NextResponse.json(
          { error: 'Admin authentication required' },
          { status: 401 }
        );
      }

      return handler(req);
    } catch (error) {
      console.error('Admin auth middleware error:', error);
      return NextResponse.json(
        { error: 'Admin authentication failed' },
        { status: 401 }
      );
    }
  };
}
