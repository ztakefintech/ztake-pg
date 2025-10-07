import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/auth';
import { validateRequest, adminLoginSchema } from '@/lib/validation';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, password } = validateRequest(adminLoginSchema, body);

    const isValid = await AuthService.verifyAdminCredentials(username, password);
    
    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid admin credentials' },
        { status: 401 }
      );
    }

    const token = AuthService.generateAdminToken({
      username,
      role: 'admin'
    });

    const response = NextResponse.json({
      message: 'Admin login successful',
      token
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
