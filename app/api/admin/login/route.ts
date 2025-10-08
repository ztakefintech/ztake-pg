import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/auth';
import { validateRequest, adminLoginSchema } from '@/lib/validation';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, password } = validateRequest(adminLoginSchema, body);

    // Try new admin system first (username can be email)
    let admin = await AuthService.verifyAdminCredentials(username, password);
    
    // Fallback to legacy admin credentials
    if (!admin) {
      const isValidLegacy = await AuthService.verifyLegacyAdminCredentials(username, password);
      if (isValidLegacy) {
        // Create a legacy admin payload
        admin = {
          id: 0,
          email: username,
          name: 'Legacy Admin',
          role: 'superuser',
          permissions: AuthService.getDefaultPermissions('superuser')
        };
      }
    }
    
    if (!admin) {
      return NextResponse.json(
        { error: 'Invalid admin credentials' },
        { status: 401 }
      );
    }

    const token = AuthService.generateAdminToken(admin);

    const response = NextResponse.json({
      message: 'Admin login successful',
      token,
      admin: {
        id: admin.id,
        email: admin.email,
        name: admin.name,
        role: admin.role
      }
    });

    // Set HTTP-only cookie
    response.cookies.set('admin-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 // 24 hours
    });

    return response;
  } catch (error) {
    console.error('Admin login error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Invalid request' },
      { status: 400 }
    );
  }
}
