const { Pool } = require('pg');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables from the root .env file
dotenv.config({ path: path.join(__dirname, '../../.env') });

const dbUrl = process.env.DATABASE_URL;

if (!dbUrl) {
  console.error('❌ DATABASE_URL environment variable is missing. Check your root .env file.');
  process.exit(1);
}

console.log('🔌 Connecting to Neon PostgreSQL...');

const pool = new Pool({
  connectionString: dbUrl,
  ssl: {
    rejectUnauthorized: false
  }
});

// Auto-run migration schema to ensure payment_webhooks table exists
async function initDb() {
  const queryText = `
    CREATE TABLE IF NOT EXISTS payment_webhooks (
      id SERIAL PRIMARY KEY,
      amount TEXT,
      customer TEXT,
      time TEXT,
      raw_screen TEXT,
      upi_transaction_id TEXT,
      google_transaction_id TEXT,
      source TEXT,
      timestamp TEXT,
      full_payload JSONB,
      request_headers JSONB,
      request_method TEXT DEFAULT 'POST',
      received_at TIMESTAMP DEFAULT NOW()
    );
  `;
  try {
    const client = await pool.connect();
    console.log('✅ Connected to Neon PostgreSQL database.');
    await client.query(queryText);
    
    // Add request_method migration column
    await client.query(`
      ALTER TABLE payment_webhooks 
      ADD COLUMN IF NOT EXISTS request_method TEXT DEFAULT 'POST'
    `);
    
    console.log('✅ payment_webhooks table verified/created successfully.');
    client.release();
  } catch (err) {
    console.error('❌ Database connection or initialization failed:', err.message);
    // Don't exit process so the server can attempt to reconnect or retry query
  }
}

initDb();

module.exports = pool;
