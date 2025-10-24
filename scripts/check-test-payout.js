const { Pool } = require('pg');

async function checkTestPayout() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_on7qfUuh5jmM@ep-small-cloud-a1axg124-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require'
  });

  try {
    const client = await pool.connect();
    
    console.log('Checking test payout record...');
    
    const result = await client.query(`
      SELECT id, reference_id, status, external_callback_url, amount, beneficiary_name
      FROM payouts 
      WHERE reference_id = 'PAYOUT_TEST_CALLBACK_001'
    `);
    
    if (result.rows.length > 0) {
      console.log('✅ Test payout found:');
      console.log(JSON.stringify(result.rows[0], null, 2));
    } else {
      console.log('❌ Test payout not found');
    }
    
    client.release();
  } catch (error) {
    console.error('❌ Error checking test payout:', error.message);
  } finally {
    await pool.end();
  }
}

checkTestPayout();
