const { Pool } = require('pg');

async function testExternalCallback() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_on7qfUuh5jmM@ep-small-cloud-a1axg124-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require'
  });

  try {
    const client = await pool.connect();
    
    console.log('Testing external callback functionality...');
    
    // Get the test payout record
    const payout = await client.query(`
      SELECT * FROM payouts 
      WHERE reference_id = 'PAYOUT_TEST_CALLBACK_002'
    `);
    
    if (payout.rows.length === 0) {
      console.log('❌ Test payout not found');
      return;
    }
    
    const payoutRecord = payout.rows[0];
    console.log('✅ Test payout found:');
    console.log('ID:', payoutRecord.id);
    console.log('Reference ID:', payoutRecord.reference_id);
    console.log('External Callback URL:', payoutRecord.external_callback_url);
    console.log('Status:', payoutRecord.status);
    
    // Test external callback
    if (payoutRecord.external_callback_url) {
      console.log('\n🔄 Testing external callback...');
      
      const externalCallbackPayload = {
        id: payoutRecord.id,
        reference_id: payoutRecord.reference_id,
        status: 'completed',
        amount: payoutRecord.amount,
        currency: payoutRecord.currency,
        beneficiary_name: payoutRecord.beneficiary_name,
        beneficiary_account: payoutRecord.beneficiary_account,
        beneficiary_ifsc: payoutRecord.beneficiary_ifsc,
        utr: 'UTR_TEST_123',
        failure_reason: null,
        status_code: null,
        status_description: null,
        cf_transfer_id: 'CF_TEST_123',
        updated_at: new Date().toISOString(),
        timestamp: new Date().toISOString()
      };
      
      console.log('Payload:', JSON.stringify(externalCallbackPayload, null, 2));
      
      try {
        const response = await fetch(payoutRecord.external_callback_url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'ZTake-Test/1.0'
          },
          body: JSON.stringify(externalCallbackPayload)
        });
        
        console.log('✅ External callback response:', response.status, response.statusText);
        const responseText = await response.text();
        console.log('Response body:', responseText);
        
      } catch (error) {
        console.error('❌ External callback error:', error.message);
      }
    } else {
      console.log('❌ No external callback URL found');
    }
    
    client.release();
  } catch (error) {
    console.error('❌ Error testing external callback:', error.message);
  } finally {
    await pool.end();
  }
}

testExternalCallback();
