import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware';

export const POST = withAuth(async (request: NextRequest) => {
  try {
    // The middleware already validates the token
    // We just need to return a success response
    // The client will clear the token from localStorage
    
    const response = NextResponse.json({ 
      success: true, 
      message: 'Logged out successfully' 
    });
    
    return response;
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { success: false, error: 'Logout failed' }, 
      { status: 500 }
    );
  }
});
