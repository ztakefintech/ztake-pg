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

async function checkAdmins() {
  const client = await pool.connect();
  
  try {
    console.log('Checking admin users in database...\n');

    const result = await client.query('SELECT id, email, name, role, permissions FROM admin_users ORDER BY id');
    
    console.log(`Found ${result.rows.length} admin users:`);
    result.rows.forEach((admin, index) => {
      console.log(`\n${index + 1}. ID: ${admin.id}`);
      console.log(`   Email: ${admin.email}`);
      console.log(`   Name: ${admin.name}`);
      console.log(`   Role: ${admin.role}`);
      console.log(`   Permissions:`, admin.permissions);
    });
    
  } catch (error) {
    console.error('❌ Error checking admins:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

checkAdmins();
