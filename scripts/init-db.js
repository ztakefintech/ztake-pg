const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

console.log('Initializing PostgreSQL database...');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function initializeDatabase() {
  const client = await pool.connect();
  
  try {
    console.log('Connected to PostgreSQL database.');

    // Create vendors table
    await client.query(`
      CREATE TABLE IF NOT EXISTS vendors (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        business_name VARCHAR(255) NOT NULL,
        contact_name VARCHAR(255) NOT NULL,
        phone VARCHAR(20),
        upi_id VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Vendors table created successfully');

    // Create payments table
    await client.query(`
      CREATE TABLE IF NOT EXISTS payments (
        id SERIAL PRIMARY KEY,
        order_id VARCHAR(255) UNIQUE,
        utr VARCHAR(255) UNIQUE NOT NULL,
        amount DECIMAL(10,2) NOT NULL,
        vendor_id INTEGER NOT NULL,
        status VARCHAR(50) DEFAULT 'pending',
        payment_status VARCHAR(20) DEFAULT 'Pending' CHECK (payment_status IN ('Pending', 'Succeeded', 'Failed')),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (vendor_id) REFERENCES vendors (id)
      )
    `);
    console.log('✅ Payments table created successfully');

    // Create API keys table
    await client.query(`
      CREATE TABLE IF NOT EXISTS api_keys (
        id SERIAL PRIMARY KEY,
        key_name VARCHAR(255) NOT NULL,
        key_hash VARCHAR(255) UNIQUE NOT NULL,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ API keys table created successfully');

    // Add order_id column to existing table if needed
    await client.query(`
      ALTER TABLE payments 
      ADD COLUMN IF NOT EXISTS order_id VARCHAR(255)
    `);
    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS payments_order_id_key ON payments(order_id)
    `);

    console.log('✅ Database initialization completed successfully!');
    console.log('🔗 Connected to Neon PostgreSQL database');
    
  } catch (error) {
    console.error('Error initializing database:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

initializeDatabase();
