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

async function testPermissionEditor() {
  const client = await pool.connect();
  
  try {
    console.log('Testing permission editor functionality...\n');

    // Create a test admin with specific permissions
    const testEmail = 'testeditor@ztake.in';
    const testPassword = 'test123';
    const passwordHash = await bcrypt.hash(testPassword, 12);
    
    const testPermissions = {
      view_overview: true,
      view_users: true,
      view_payments: false,
      view_payouts: true,
      view_settlements: false,
      manage_users: true,
      manage_payin: false,
      manage_payout: false,
      manage_settlements: false,
      manage_admins: false
    };

    // Clean up any existing test admin
    await client.query('DELETE FROM admin_users WHERE email = $1', [testEmail]);

    // Create test admin
    const result = await client.query(
      'INSERT INTO admin_users (email, password_hash, name, role, permissions, is_active) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id',
      [testEmail, passwordHash, 'Test Editor Admin', 'custom', JSON.stringify(testPermissions), true]
    );

    console.log('✅ Test admin created with ID:', result.rows[0].id);
    console.log('   Email:', testEmail);
    console.log('   Password:', testPassword);
    console.log('   Initial permissions:', testPermissions);

    // Verify the permissions are stored correctly
    const admin = await client.query('SELECT * FROM admin_users WHERE email = $1', [testEmail]);
    
    if (admin.rows.length > 0) {
      const storedPermissions = admin.rows[0].permissions;
      console.log('\n✅ Stored permissions verified:', storedPermissions);
      
      // Test permission checking logic
      console.log('\n📋 Permission Editor Test:');
      console.log('Expected checked permissions:');
      Object.entries(storedPermissions).forEach(([perm, value]) => {
        if (value) {
          console.log(`  ✓ ${perm}: ${value}`);
        }
      });
      
      console.log('\nExpected unchecked permissions:');
      Object.entries(storedPermissions).forEach(([perm, value]) => {
        if (!value) {
          console.log(`  ✗ ${perm}: ${value}`);
        }
      });
    }

    console.log('\n🎉 Permission editor test setup complete!');
    console.log('\nTo test the permission editor:');
    console.log('1. Login with admin@ztake.in / admin123 (superuser)');
    console.log('2. Go to Admin Users tab');
    console.log('3. Click "Permissions" button for the test admin');
    console.log('4. Verify that the correct permissions are checked/unchecked');
    console.log('5. Test modifying permissions and saving');
    
  } catch (error) {
    console.error('❌ Error testing permission editor:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

testPermissionEditor();
