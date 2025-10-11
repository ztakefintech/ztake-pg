import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/admin-middleware';
import { db } from '@/lib/database';

// GET /api/admin/vendor-assignments - Get vendor assignments for an admin
export const GET = requirePermission('manage_admins')(async (req: NextRequest) => {
  try {
    const { searchParams } = new URL(req.url);
    const adminId = searchParams.get('admin_id');
    
    if (!adminId) {
      return NextResponse.json(
        { error: 'Admin ID is required' },
        { status: 400 }
      );
    }

    // Get assigned vendors for the admin
    const assignedVendors = await db.all(`
      SELECT 
        ava.vendor_id,
        v.business_name,
        v.contact_name,
        v.email,
        ava.created_at
      FROM admin_vendor_assignments ava
      JOIN vendors v ON ava.vendor_id = v.id
      WHERE ava.admin_id = $1
      ORDER BY v.business_name
    `, [adminId]);

    // Get all vendors for selection
    const allVendors = await db.all(`
      SELECT id, business_name, contact_name, email
      FROM vendors
      ORDER BY business_name
    `);

    return NextResponse.json({ 
      assignedVendors,
      allVendors 
    });
  } catch (error) {
    console.error('Error fetching vendor assignments:', error);
    return NextResponse.json(
      { error: 'Failed to fetch vendor assignments' },
      { status: 500 }
    );
  }
});

// POST /api/admin/vendor-assignments - Assign vendors to an admin
export const POST = requirePermission('manage_admins')(async (req: NextRequest) => {
  try {
    const { admin_id, vendor_ids } = await req.json();
    
    if (!admin_id || !Array.isArray(vendor_ids)) {
      return NextResponse.json(
        { error: 'Admin ID and vendor IDs array are required' },
        { status: 400 }
      );
    }

    // First, remove all existing assignments for this admin
    await db.run(`
      DELETE FROM admin_vendor_assignments 
      WHERE admin_id = $1
    `, [admin_id]);

    // Then add new assignments
    if (vendor_ids.length > 0) {
      for (const vendorId of vendor_ids) {
        await db.run(`
          INSERT INTO admin_vendor_assignments (admin_id, vendor_id)
          VALUES ($1, $2)
        `, [admin_id, vendorId]);
      }
    }

    return NextResponse.json({ 
      message: 'Vendor assignments updated successfully' 
    });
  } catch (error) {
    console.error('Error updating vendor assignments:', error);
    return NextResponse.json(
      { error: 'Failed to update vendor assignments' },
      { status: 500 }
    );
  }
});

// DELETE /api/admin/vendor-assignments - Remove vendor assignment
export const DELETE = requirePermission('manage_admins')(async (req: NextRequest) => {
  try {
    const { searchParams } = new URL(req.url);
    const adminId = searchParams.get('admin_id');
    const vendorId = searchParams.get('vendor_id');
    
    if (!adminId || !vendorId) {
      return NextResponse.json(
        { error: 'Admin ID and Vendor ID are required' },
        { status: 400 }
      );
    }

    await db.run(`
      DELETE FROM admin_vendor_assignments 
      WHERE admin_id = $1 AND vendor_id = $2
    `, [adminId, vendorId]);

    return NextResponse.json({ 
      message: 'Vendor assignment removed successfully' 
    });
  } catch (error) {
    console.error('Error removing vendor assignment:', error);
    return NextResponse.json(
      { error: 'Failed to remove vendor assignment' },
      { status: 500 }
    );
  }
});
