const { Pool } = require('pg');

async function createFreshTestPayout() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_on7qfUuh5jmM@ep-small-cloud-a1axg124-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require'
  });

  try {
    const client = await pool.connect();
    
    console.log('Creating fresh test payout...');
    
    // Insert a fresh test payout record with 'initiated' status
    const result = await client.query(`
      INSERT INTO payouts (
        vendor_id, amount, currency, beneficiary_name, beneficiary_account, 
        beneficiary_ifsc, reference_id, status, external_callback_url, 
        created_at, updated_at
      ) VALUES (
        1, 3000.00, 'INR', 'Fresh Test User', '1111111111', 
        'HDFC0001234', 'PAYOUT_FRESH_TEST_001', 'initiated', 
        'https://webhook.site/cd68de8b-a811-4f08-b1fb-316decdaa30e',
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
      ) RETURNING id
    `);
    
    console.log('✅ Fresh test payout created with ID:', result.rows[0].id);
    console.log('Reference ID: PAYOUT_FRESH_TEST_001');
    console.log('Status: initiated');
    console.log('External Callback URL: https://webhook.site/cd68de8b-a811-4f08-b1fb-316decdaa30e');
    
    client.release();
  } catch (error) {
    console.error('❌ Error creating fresh test payout:', error.message);
  } finally {
    await pool.end();
  }
}

createFreshTestPayout();
