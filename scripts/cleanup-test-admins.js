const { Pool } = require('pg');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const databaseUrl = process.env.DATABASE_URL?.replace(/['"]/g, '');

const pool = new Pool({
  connectionString: databaseUrl,
  ssl: process.env.NODE_ENV === 'production' ? {
    rejectUnauthorized: false
  } : false
});

async function cleanupTestAdmins() {
  const client = await pool.connect();
  
  try {
    console.log('Cleaning up test admins...');
    
    await client.query('DELETE FROM admin_users WHERE email IN ($1, $2)', ['viewonly@ztake.in', 'limited@ztake.in']);
    console.log('✅ Test admins cleaned up');
    
  } catch (error) {
    console.error('❌ Error cleaning up:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

cleanupTestAdmins();
