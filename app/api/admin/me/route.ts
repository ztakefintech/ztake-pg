import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-middleware';
import { AuthService } from '@/lib/auth';

// GET /api/admin/me - Get current admin user info
export const GET = requireAdmin(async (req: NextRequest) => {
  try {
    const admin = req.headers.get('x-admin-id') ? 
      JSON.parse(req.headers.get('x-admin-id')!) : null;

    if (!admin) {
      return NextResponse.json(
        { error: 'Admin not found' },
        { status: 404 }
      );
    }

    // Get full admin details from database
    const adminDetails = await AuthService.getAdminUserById(admin.id);
    
    if (!adminDetails) {
      return NextResponse.json(
        { error: 'Admin not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ 
      admin: {
        id: adminDetails.id,
        email: adminDetails.email,
        name: adminDetails.name,
        role: adminDetails.role,
        permissions: adminDetails.permissions || {},
        is_active: adminDetails.is_active,
        created_at: adminDetails.created_at
      }
    });
  } catch (error) {
    console.error('Error fetching current admin:', error);
    return NextResponse.json(
      { error: 'Failed to fetch admin info' },
      { status: 500 }
    );
  }
});
