import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database';
import { requireAdmin } from '@/lib/admin-middleware';

// Ensure dynamic rendering due to cookie-based admin auth
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    requireAdmin(request);

    const users = await db.all(`
      SELECT 
        id,
        email,
        business_name,
        contact_name,
        phone,
        upi_id,
        created_at,
        updated_at
      FROM vendors 
      ORDER BY created_at DESC
    `);

    return NextResponse.json({ users });
  } catch (error) {
    console.error('Get users error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch users' },
      { status: error instanceof Error && error.message.includes('Admin authentication') ? 401 : 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    requireAdmin(request);
    
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('id');
    
    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // First delete related payments
    await db.run('DELETE FROM payments WHERE vendor_id = ?', [userId]);
    
    // Then delete the user
    const result = await db.run('DELETE FROM vendors WHERE id = ?', [userId]);
    
    if (result.changes === 0) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete user' },
      { status: error instanceof Error && error.message.includes('Admin authentication') ? 401 : 500 }
    );
  }
}
