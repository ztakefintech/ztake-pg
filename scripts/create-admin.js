const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const databaseUrl = process.env.DATABASE_URL?.replace(/['"]/g, ''); // Remove quotes if present

console.log('Connecting to database...');
console.log('Database URL:', databaseUrl ? 'Set' : 'Not set');

const pool = new Pool({
  connectionString: databaseUrl,
  ssl: process.env.NODE_ENV === 'production' ? {
    rejectUnauthorized: false
  } : false
});

async function createAdmin() {
  let client;
  try {
    client = await pool.connect();
    console.log('✅ Connected to database successfully');
    // Check if admin users already exist
    const existingAdmins = await client.query('SELECT COUNT(*) FROM admin_users');
    if (existingAdmins.rows[0].count > 0) {
      console.log('Admin users already exist. Skipping creation.');
      return;
    }

    // Create the first superuser admin
    const password = 'ztake2025'; // Change this in production
    const passwordHash = await bcrypt.hash(password, 12);
    
    const permissions = {
      view_overview: true,
      view_users: true,
      view_payments: true,
      view_payouts: true,
      view_settlements: true,
      manage_users: true,
      manage_payin: true,
      manage_payout: true,
      manage_settlements: true,
      manage_admins: true
    };

    const result = await client.query(
      'INSERT INTO admin_users (email, password_hash, name, role, permissions, is_active) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id',
      ['admin@ztake.in', passwordHash, 'Super Admin', 'superuser', JSON.stringify(permissions), true]
    );

    console.log('✅ Admin user created successfully!');
    console.log('Email: admin@ztake.in');
    console.log('Password: ztake2025');
    console.log('Role: superuser');
    console.log('Admin ID:', result.rows[0].id);
    console.log('\n⚠️  Please change the password after first login!');
    
  } catch (error) {
    console.error('Error creating admin user:', error);
  } finally {
    if (client) {
      client.release();
    }
    await pool.end();
  }
}

createAdmin();
