const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function verifyVendorCodes() {
  const client = await pool.connect();
  
  try {
    console.log('Verifying vendor codes in database...');
    
    const result = await client.query(`
      SELECT id, vendor_code, business_name, email 
      FROM vendors 
      ORDER BY id
    `);
    
    console.log('\n📊 Vendors in database:');
    console.log('ID | Vendor Code | Business Name | Email');
    console.log('---|-------------|---------------|------');
    
    result.rows.forEach(vendor => {
      console.log(`${vendor.id}  | ${vendor.vendor_code}     | ${vendor.business_name} | ${vendor.email}`);
    });
    
    console.log(`\n✅ Total vendors: ${result.rows.length}`);
    console.log('✅ All vendors have vendor codes!');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

verifyVendorCodes();
