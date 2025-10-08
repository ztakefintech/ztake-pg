const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const databaseUrl = process.env.DATABASE_URL?.replace(/['"]/g, '');

const pool = new Pool({
  connectionString: databaseUrl,
  ssl: process.env.NODE_ENV === 'production' ? {
    rejectUnauthorized: false
  } : false
});

async function testPermissionUI() {
  const client = await pool.connect();
  
  try {
    console.log('Testing permission-based UI...\n');

    // Test 1: Create a view-only admin
    console.log('1. Creating view-only admin...');
    const viewOnlyPassword = 'view123';
    const viewOnlyHash = await bcrypt.hash(viewOnlyPassword, 12);
    
    const viewOnlyPermissions = {
      view_overview: true,
      view_users: true,
      view_payments: true,
      view_payouts: true,
      view_settlements: true,
      manage_users: false,
      manage_payin: false,
      manage_payout: false,
      manage_settlements: false,
      manage_admins: false
    };

    await client.query(
      'INSERT INTO admin_users (email, password_hash, name, role, permissions, is_active) VALUES ($1, $2, $3, $4, $5, $6)',
      ['viewonly@ztake.in', viewOnlyHash, 'View Only Admin', 'custom', JSON.stringify(viewOnlyPermissions), true]
    );

    console.log('✅ View-only admin created');
    console.log('   Email: viewonly@ztake.in');
    console.log('   Password: view123');
    console.log('   Permissions: View only (no manage permissions)');

    // Test 2: Create a limited admin with specific permissions
    console.log('\n2. Creating limited admin...');
    const limitedPassword = 'limited123';
    const limitedHash = await bcrypt.hash(limitedPassword, 12);
    
    const limitedPermissions = {
      view_overview: true,
      view_users: true,
      view_payments: true,
      view_payouts: true,
      view_settlements: true,
      manage_users: true,
      manage_payin: false,
      manage_payout: false,
      manage_settlements: false,
      manage_admins: false
    };

    await client.query(
      'INSERT INTO admin_users (email, password_hash, name, role, permissions, is_active) VALUES ($1, $2, $3, $4, $5, $6)',
      ['limited@ztake.in', limitedHash, 'Limited Admin', 'custom', JSON.stringify(limitedPermissions), true]
    );

    console.log('✅ Limited admin created');
    console.log('   Email: limited@ztake.in');
    console.log('   Password: limited123');
    console.log('   Permissions: Can view all + manage users only');

    // Test 3: Verify superuser has all permissions
    console.log('\n3. Checking superuser permissions...');
    const superuser = await client.query('SELECT * FROM admin_users WHERE role = $1', ['superuser']);
    
    if (superuser.rows.length > 0) {
      const admin = superuser.rows[0];
      console.log('✅ Superuser found:', admin.name);
      console.log('   Email:', admin.email);
      console.log('   Has all permissions:', Object.values(admin.permissions).every(p => p === true));
    }

    console.log('\n🎉 Permission-based UI test setup complete!');
    console.log('\nYou can now test the UI with different admin accounts:');
    console.log('1. Superuser: admin@ztake.in / admin123 (all permissions)');
    console.log('2. View Only: viewonly@ztake.in / view123 (view only)');
    console.log('3. Limited: limited@ztake.in / limited123 (view all + manage users)');
    console.log('\nExpected behavior:');
    console.log('- View Only: Should see "View Only" text instead of action buttons');
    console.log('- Limited: Should see action buttons only for user management');
    console.log('- Superuser: Should see all action buttons and tabs');
    
  } catch (error) {
    console.error('❌ Error testing permission UI:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

testPermissionUI();
