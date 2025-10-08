import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/admin-middleware';
import { AuthService } from '@/lib/auth';

// GET /api/admin/permissions - Get all available permissions
export const GET = requirePermission('manage_admins')(async (req: NextRequest) => {
  try {
    const permissions = AuthService.getAllPermissions();
    return NextResponse.json({ permissions });
  } catch (error) {
    console.error('Error fetching permissions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch permissions' },
      { status: 500 }
    );
  }
});
