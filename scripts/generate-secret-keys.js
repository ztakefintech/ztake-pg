const { Pool } = require('pg');
const crypto = require('crypto');

console.log('Generating secret keys for existing vendors...');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

function generateSecretKey() {
  const prefix = 'sk_live_';
  const randomBytes = crypto.randomBytes(32);
  const randomString = randomBytes.toString('hex');
  return prefix + randomString;
}

async function generateSecretKeys() {
  const client = await pool.connect();
  
  try {
    console.log('Connected to PostgreSQL database.');
    
    // Get all vendors without secret keys
    const vendors = await client.query(
      'SELECT id, vendor_code, business_name FROM vendors WHERE secret_key IS NULL'
    );
    
    console.log(`Found ${vendors.rows.length} vendors without secret keys`);
    
    for (const vendor of vendors.rows) {
      let secretKey;
      let isUnique = false;
      let attempts = 0;
      const maxAttempts = 10;
      
      do {
        secretKey = generateSecretKey();
        const existingKey = await client.query(
          'SELECT id FROM vendors WHERE secret_key = $1',
          [secretKey]
        );
        isUnique = existingKey.rows.length === 0;
        attempts++;
      } while (!isUnique && attempts < maxAttempts);
      
      if (!isUnique) {
        console.error(`Failed to generate unique secret key for vendor ${vendor.id}`);
        continue;
      }
      
      // Update vendor with secret key
      await client.query(
        'UPDATE vendors SET secret_key = $1 WHERE id = $2',
        [secretKey, vendor.id]
      );
      
      console.log(`✅ Generated secret key for ${vendor.business_name} (${vendor.vendor_code}): ${secretKey}`);
    }
    
    console.log('✅ Secret key generation completed');
    
  } catch (error) {
    console.error('Error generating secret keys:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

generateSecretKeys();
