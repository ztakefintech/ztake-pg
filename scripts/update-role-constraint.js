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

async function updateRoleConstraint() {
  const client = await pool.connect();
  
  try {
    console.log('Updating admin_users role constraint...');

    // Drop the existing constraint
    await client.query('ALTER TABLE admin_users DROP CONSTRAINT IF EXISTS admin_users_role_check');
    console.log('✅ Dropped existing constraint');

    // Add the new constraint with 'custom' role
    await client.query(`
      ALTER TABLE admin_users 
      ADD CONSTRAINT admin_users_role_check 
      CHECK (role IN ('superuser', 'view_only', 'manage_users', 'manage_payin', 'manage_payout', 'manage_settlements', 'custom'))
    `);
    console.log('✅ Added new constraint with custom role');

    console.log('🎉 Database schema updated successfully!');
    
  } catch (error) {
    console.error('❌ Error updating constraint:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

updateRoleConstraint();
