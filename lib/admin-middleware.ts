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

      // Add admin info to request headers for use in handlers
      req.headers.set('x-admin-id', JSON.stringify(admin));

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

export function requirePermission(permission: string) {
  return function(handler: (req: NextRequest) => Promise<NextResponse>) {
    return async (req: NextRequest): Promise<NextResponse> => {
      try {
        const admin = verifyAdminToken(req);
        
        if (!admin) {
          return NextResponse.json(
            { error: 'Admin authentication required' },
            { status: 401 }
          );
        }

        if (!AuthService.hasPermission(admin, permission)) {
          return NextResponse.json(
            { error: 'Insufficient permissions' },
            { status: 403 }
          );
        }

        // Add admin info to request headers for use in handlers
        req.headers.set('x-admin-id', JSON.stringify(admin));

        return handler(req);
      } catch (error) {
        console.error('Admin permission middleware error:', error);
        return NextResponse.json(
          { error: 'Admin authentication failed' },
          { status: 401 }
        );
      }
    };
  };
}