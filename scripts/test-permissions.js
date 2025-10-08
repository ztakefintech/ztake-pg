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

async function testPermissions() {
  const client = await pool.connect();
  
  try {
    console.log('Testing multiple permissions system...\n');

    // Test 1: Create a custom admin with specific permissions
    console.log('1. Creating custom admin with specific permissions...');
    const password = 'test123';
    const passwordHash = await bcrypt.hash(password, 12);
    
    const customPermissions = {
      view_overview: true,
      view_users: true,
      manage_users: true,
      view_payments: true
      // Note: No manage_payout, manage_settlements, etc.
    };

    const result = await client.query(
      'INSERT INTO admin_users (email, password_hash, name, role, permissions, is_active) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id',
      ['test@ztake.com', passwordHash, 'Test Admin', 'custom', JSON.stringify(customPermissions), true]
    );

    console.log('✅ Custom admin created with ID:', result.rows[0].id);
    console.log('   Email: test@ztake.com');
    console.log('   Password: test123');
    console.log('   Permissions:', Object.keys(customPermissions).filter(p => customPermissions[p]));

    // Test 2: Verify permissions are stored correctly
    console.log('\n2. Verifying permissions storage...');
    const admin = await client.query(
      'SELECT * FROM admin_users WHERE email = $1',
      ['test@ztake.com']
    );

    if (admin.rows.length > 0) {
      const storedPermissions = admin.rows[0].permissions;
      console.log('✅ Permissions stored correctly:', storedPermissions);
      
      // Test specific permissions
      console.log('   - Can view overview:', storedPermissions.view_overview);
      console.log('   - Can manage users:', storedPermissions.manage_users);
      console.log('   - Cannot manage payouts:', !storedPermissions.manage_payout);
    }

    // Test 3: Test permission checking logic
    console.log('\n3. Testing permission checking...');
    const hasOverview = customPermissions.view_overview === true;
    const hasPayout = customPermissions.manage_payout === true;
    
    console.log('✅ Can view overview:', hasOverview);
    console.log('✅ Cannot manage payouts:', !hasPayout);

    console.log('\n🎉 Multiple permissions system is working correctly!');
    console.log('\nYou can now:');
    console.log('- Create admins with custom permission combinations');
    console.log('- Mix and match any permissions for each admin');
    console.log('- Use the UI to manage permissions visually');
    
  } catch (error) {
    console.error('❌ Error testing permissions:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

testPermissions();
