const { Pool } = require('pg');

async function createNewTestPayout() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_on7qfUuh5jmM@ep-small-cloud-a1axg124-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require'
  });

  try {
    const client = await pool.connect();
    
    console.log('Creating new test payout with external callback URL...');
    
    // Insert a new test payout record
    const result = await client.query(`
      INSERT INTO payouts (
        vendor_id, amount, currency, beneficiary_name, beneficiary_account, 
        beneficiary_ifsc, reference_id, status, external_callback_url, 
        created_at, updated_at
      ) VALUES (
        1, 2000.00, 'INR', 'Test User 2', '9876543210', 
        'HDFC0001234', 'PAYOUT_TEST_CALLBACK_002', 'initiated', 
        'https://webhook.site/cd68de8b-a811-4f08-b1fb-316decdaa30e',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
      ) RETURNING id
    `);
    
    console.log('✅ New test payout created with ID:', result.rows[0].id);
    
    client.release();
  } catch (error) {
    console.error('❌ Error creating new test payout:', error.message);
  } finally {
    await pool.end();
  }
}

createNewTestPayout();
