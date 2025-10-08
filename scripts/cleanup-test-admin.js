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

async function cleanupTestAdmin() {
  const client = await pool.connect();
  
  try {
    console.log('Cleaning up test admin...');
    
    await client.query('DELETE FROM admin_users WHERE email = $1', ['test@ztake.com']);
    console.log('✅ Test admin cleaned up');
    
  } catch (error) {
    console.error('❌ Error cleaning up:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

cleanupTestAdmin();
