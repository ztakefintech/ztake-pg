const { Pool } = require('pg');

async function addPayoutColumns() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_on7qfUuh5jmM@ep-small-cloud-a1axg124-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require'
  });

  try {
    const client = await pool.connect();
    
    console.log('Adding missing columns to payouts table...');
    
    await client.query(`
      ALTER TABLE payouts 
      ADD COLUMN IF NOT EXISTS utr VARCHAR(64),
      ADD COLUMN IF NOT EXISTS failure_reason TEXT,
      ADD COLUMN IF NOT EXISTS processed_at TIMESTAMP,
      ADD COLUMN IF NOT EXISTS acknowledged_at TIMESTAMP,
      ADD COLUMN IF NOT EXISTS webhook_data JSONB,
      ADD COLUMN IF NOT EXISTS external_callback_url TEXT
    `);
    
    console.log('✅ Successfully added missing columns to payouts table');
    
    // Verify the columns exist
    const result = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'payouts' 
      AND column_name IN ('utr', 'failure_reason', 'processed_at', 'acknowledged_at', 'webhook_data', 'external_callback_url')
    `);
    
    console.log('Added columns:', result.rows.map(row => row.column_name));
    
    client.release();
  } catch (error) {
    console.error('❌ Error adding columns:', error.message);
  } finally {
    await pool.end();
  }
}

addPayoutColumns();
