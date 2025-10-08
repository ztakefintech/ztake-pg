import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/admin-middleware';
import { AuthService } from '@/lib/auth';

// GET /api/admin/admins - Get all admin users
export const GET = requirePermission('manage_admins')(async (req: NextRequest) => {
  try {
    const admins = await AuthService.getAllAdminUsers();
    return NextResponse.json({ admins });
  } catch (error) {
    console.error('Error fetching admin users:', error);
    return NextResponse.json(
      { error: 'Failed to fetch admin users' },
      { status: 500 }
    );
  }
});

// POST /api/admin/admins - Create new admin user
export const POST = requirePermission('manage_admins')(async (req: NextRequest) => {
  try {
    const { email, password, name, role, permissions } = await req.json();
    
    if (!email || !password || !name || !role) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Check if admin already exists
    const existingAdmin = await AuthService.getAdminUserByEmail(email);
    if (existingAdmin) {
      return NextResponse.json(
        { error: 'Admin user already exists' },
        { status: 400 }
      );
    }

    // Get current admin ID for created_by
    const currentAdmin = req.headers.get('x-admin-id') ? 
      JSON.parse(req.headers.get('x-admin-id')!) : null;

    const adminId = await AuthService.createAdminUser(
      email, 
      password, 
      name, 
      role, 
      currentAdmin?.id
    );

    // If custom permissions are provided, update them
    if (permissions && role === 'custom') {
      await AuthService.updateAdminUser(adminId, { permissions });
    }

    return NextResponse.json({ 
      message: 'Admin user created successfully',
      adminId 
    });
  } catch (error) {
    console.error('Error creating admin user:', error);
    return NextResponse.json(
      { error: 'Failed to create admin user' },
      { status: 500 }
    );
  }
});

// PATCH /api/admin/admins - Update admin user
export const PATCH = requirePermission('manage_admins')(async (req: NextRequest) => {
  try {
    const { id, name, role, permissions, is_active } = await req.json();
    
    if (!id) {
      return NextResponse.json(
        { error: 'Admin ID is required' },
        { status: 400 }
      );
    }

    const updates: any = {};
    if (name !== undefined) updates.name = name;
    if (role !== undefined) updates.role = role;
    if (permissions !== undefined) updates.permissions = permissions;
    if (is_active !== undefined) updates.is_active = is_active;

    await AuthService.updateAdminUser(id, updates);

    return NextResponse.json({ 
      message: 'Admin user updated successfully' 
    });
  } catch (error) {
    console.error('Error updating admin user:', error);
    return NextResponse.json(
      { error: 'Failed to update admin user' },
      { status: 500 }
    );
  }
});

// DELETE /api/admin/admins - Delete admin user
export const DELETE = requirePermission('manage_admins')(async (req: NextRequest) => {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json(
        { error: 'Admin ID is required' },
        { status: 400 }
      );
    }

    await AuthService.deleteAdminUser(parseInt(id));

    return NextResponse.json({ 
      message: 'Admin user deleted successfully' 
    });
  } catch (error) {
    console.error('Error deleting admin user:', error);
    return NextResponse.json(
      { error: 'Failed to delete admin user' },
      { status: 500 }
    );
  }
});
