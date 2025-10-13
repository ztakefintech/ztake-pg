const { Pool } = require('pg');

console.log('Adding test balance to vendor account...');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function addTestBalance() {
  const client = await pool.connect();
  
  try {
    console.log('Connected to PostgreSQL database.');
    
    // Get vendor with secret key (for instant payout testing)
    const vendor = await client.query(
      'SELECT id, vendor_code, business_name, payout_balance FROM vendors WHERE secret_key IS NOT NULL LIMIT 1'
    );
    
    if (vendor.rows.length === 0) {
      console.log('❌ No vendor with secret key found');
      return;
    }
    
    const vendorData = vendor.rows[0];
    const currentBalance = Number(vendorData.payout_balance || 0);
    const testBalance = 10000; // Add 10,000 INR for testing
    
    console.log(`Current balance for ${vendorData.business_name} (${vendorData.vendor_code}): ₹${currentBalance}`);
    
    // Add test balance
    await client.query(
      'UPDATE vendors SET payout_balance = COALESCE(payout_balance, 0) + $1 WHERE id = $2',
      [testBalance, vendorData.id]
    );
    
    console.log(`✅ Added ₹${testBalance} to ${vendorData.business_name} (${vendorData.vendor_code})`);
    console.log(`New balance: ₹${currentBalance + testBalance}`);
    
  } catch (error) {
    console.error('Error adding test balance:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

addTestBalance();
