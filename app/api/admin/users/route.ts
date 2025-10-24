import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/database';
import { requirePermission, getVendorFilterForAdmin } from '@/lib/admin-middleware';

// Ensure dynamic rendering due to cookie-based admin auth
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const GET = requirePermission('view_users')(async (request: NextRequest) => {
  try {
    // Get admin info from headers
    const adminData = request.headers.get('x-admin-id');
    const admin = adminData ? JSON.parse(adminData) : null;
    
    if (!admin) {
      return NextResponse.json({ error: 'Admin authentication required' }, { status: 401 });
    }

    // Get vendor filter for this admin
    const vendorFilter = await getVendorFilterForAdmin(admin.id);

    const users = vendorFilter.params.length > 0
      ? await db.all(`
          SELECT 
            id,
            email,
            business_name,
            contact_name,
            phone,
            upi_id,
            website,
            kyc_status,
            payout_balance,
            payout_recharge_bank_name,
            payout_recharge_account_number,
            payout_recharge_account_holder,
            payout_recharge_ifsc,
            is_approved,
            google_id,
            cashfree_app_id,
            cashfree_secret_key,
            cashfree_payout_client_id,
            cashfree_payout_client_secret,
            cashfree_env,
            created_at,
            updated_at
          FROM vendors 
          WHERE id IN (${vendorFilter.params.map((_, i) => `$${i + 1}`).join(', ')})
          ORDER BY created_at DESC
        `, vendorFilter.params)
      : await db.all(`
          SELECT 
            id,
            email,
            business_name,
            contact_name,
            phone,
            upi_id,
            website,
            kyc_status,
            payout_balance,
            payout_recharge_bank_name,
            payout_recharge_account_number,
            payout_recharge_account_holder,
            payout_recharge_ifsc,
            is_approved,
            google_id,
            cashfree_app_id,
            cashfree_secret_key,
            cashfree_payout_client_id,
            cashfree_payout_client_secret,
            cashfree_env,
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
});

export const PATCH = requirePermission('manage_users')(async (request: NextRequest) => {
  try {
    const body = await request.json().catch(() => ({}));
    const { 
      id, 
      payout_recharge_bank_name, 
      payout_recharge_account_number, 
      payout_recharge_account_holder, 
      payout_recharge_ifsc,
      is_approved,
      kyc_status,
      cashfree_app_id,
      cashfree_secret_key,
      cashfree_payout_client_id,
      cashfree_payout_client_secret,
      cashfree_env
    } = body || {};
    
    if (!id) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Build dynamic update query based on provided fields
    const updates = [];
    const values = [];
    
    if (payout_recharge_bank_name !== undefined) {
      updates.push('payout_recharge_bank_name = ?');
      values.push(payout_recharge_bank_name || null);
    }
    
    if (payout_recharge_account_number !== undefined) {
      updates.push('payout_recharge_account_number = ?');
      values.push(payout_recharge_account_number || null);
    }
    
    if (payout_recharge_account_holder !== undefined) {
      updates.push('payout_recharge_account_holder = ?');
      values.push(payout_recharge_account_holder || null);
    }
    
    if (payout_recharge_ifsc !== undefined) {
      updates.push('payout_recharge_ifsc = ?');
      values.push(payout_recharge_ifsc || null);
    }
    
    if (is_approved !== undefined) {
      updates.push('is_approved = ?');
      values.push(is_approved);
    }

    if (kyc_status !== undefined) {
      updates.push('kyc_status = ?');
      values.push(String(kyc_status));
    }

    if (cashfree_app_id !== undefined) {
      updates.push('cashfree_app_id = ?');
      values.push(cashfree_app_id || null);
    }

    if (cashfree_secret_key !== undefined) {
      updates.push('cashfree_secret_key = ?');
      values.push(cashfree_secret_key || null);
    }

    if (cashfree_payout_client_id !== undefined) {
      updates.push('cashfree_payout_client_id = ?');
      values.push(cashfree_payout_client_id || null);
    }

    if (cashfree_payout_client_secret !== undefined) {
      updates.push('cashfree_payout_client_secret = ?');
      values.push(cashfree_payout_client_secret || null);
    }

    if (cashfree_env !== undefined) {
      updates.push('cashfree_env = ?');
      values.push(cashfree_env || 'sandbox');
    }
    
    if (updates.length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }
    
    updates.push('updated_at = CURRENT_TIMESTAMP');
    values.push(Number(id));
    
    await db.run(
      `UPDATE vendors SET ${updates.join(', ')} WHERE id = ?`,
      values
    );
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Update user error:', error);
    return NextResponse.json({ error: 'Failed to update vendor' }, { status: 500 });
  }
});

export const DELETE = requirePermission('manage_users')(async (request: NextRequest) => {
  try {
    
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
});
