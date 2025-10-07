import { NextRequest } from 'next/server';
import { AuthService } from './auth';

export function verifyAdminToken(request: NextRequest) {
  const token = request.cookies.get('admin-token')?.value;
  
  if (!token) {
    return null;
  }

  return AuthService.verifyAdminToken(token);
}

export function requireAdmin(request: NextRequest) {
  const admin = verifyAdminToken(request);
  
  if (!admin) {
    throw new Error('Admin authentication required');
  }
  
  return admin;
}
