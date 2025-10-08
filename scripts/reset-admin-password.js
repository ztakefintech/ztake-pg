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

async function resetAdminPassword() {
  const client = await pool.connect();
  
  try {
    console.log('Resetting admin password...\n');

    const email = 'admin@ztake.in';
    const newPassword = 'admin123';
    const passwordHash = await bcrypt.hash(newPassword, 12);
    
    const result = await client.query(
      'UPDATE admin_users SET password_hash = $1 WHERE email = $2 RETURNING id, email, name',
      [passwordHash, email]
    );
    
    if (result.rows.length > 0) {
      console.log('✅ Admin password updated successfully!');
      console.log('Email:', result.rows[0].email);
      console.log('Name:', result.rows[0].name);
      console.log('New Password:', newPassword);
    } else {
      console.log('❌ Admin not found');
    }
    
  } catch (error) {
    console.error('❌ Error resetting password:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

resetAdminPassword();
