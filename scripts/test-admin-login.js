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

async function testAdminLogin() {
  const client = await pool.connect();
  
  try {
    console.log('Testing admin login...\n');

    // Test with admin@ztake.in
    const email = 'admin@ztake.in';
    const password = 'admin123';
    
    console.log(`Testing login for: ${email}`);
    
    const admin = await client.query('SELECT * FROM admin_users WHERE email = $1', [email]);
    
    if (admin.rows.length === 0) {
      console.log('❌ Admin not found in database');
      return;
    }
    
    const adminData = admin.rows[0];
    console.log('✅ Admin found:', adminData.name, adminData.role);
    console.log('Permissions:', adminData.permissions);
    
    // Test password verification
    const isValid = await bcrypt.compare(password, adminData.password_hash);
    console.log('Password valid:', isValid);
    
    if (isValid) {
      console.log('✅ Admin login would succeed');
      console.log('Has manage_admins permission:', adminData.permissions.manage_admins);
    } else {
      console.log('❌ Admin login would fail - wrong password');
    }
    
  } catch (error) {
    console.error('❌ Error testing admin login:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

testAdminLogin();
