const { Pool } = require('pg');

console.log('Adding vendor_code column to existing database...');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function addVendorCodeColumn() {
  const client = await pool.connect();
  
  try {
    console.log('Connected to PostgreSQL database.');

    // Add vendor_code column to vendors table if it doesn't exist
    await client.query(`
      ALTER TABLE vendors 
      ADD COLUMN IF NOT EXISTS vendor_code VARCHAR(6)
    `);
    console.log('✅ Added vendor_code column to vendors table');

    // Generate vendor codes for existing vendors that don't have them
    console.log('🔄 Generating vendor codes for existing vendors...');
    await client.query(`
      DO $$
      DECLARE
        vendor_record RECORD;
        new_code VARCHAR(6);
        code_exists BOOLEAN;
        attempts INTEGER;
      BEGIN
        FOR vendor_record IN 
          SELECT id FROM vendors WHERE vendor_code IS NULL OR vendor_code = ''
        LOOP
          attempts := 0;
          LOOP
            attempts := attempts + 1;
            -- Generate a random vendor code (2 letters + 4 numbers)
            new_code := chr(65 + floor(random() * 26)::int) || 
                       chr(65 + floor(random() * 26)::int) ||
                       floor(random() * 10)::text ||
                       floor(random() * 10)::text ||
                       floor(random() * 10)::text ||
                       floor(random() * 10)::text;
            
            -- Check if code already exists
            SELECT EXISTS(SELECT 1 FROM vendors WHERE vendor_code = new_code) INTO code_exists;
            
            -- Exit loop if code is unique or if we've tried too many times
            EXIT WHEN NOT code_exists OR attempts > 100;
          END LOOP;
          
          -- Update vendor with new code
          UPDATE vendors SET vendor_code = new_code WHERE id = vendor_record.id;
          RAISE NOTICE 'Generated vendor code % for vendor ID %', new_code, vendor_record.id;
        END LOOP;
      END $$;
    `);
    console.log('✅ Generated vendor codes for all existing vendors');

    // Add unique constraint to vendor_code
    await client.query(`
      ALTER TABLE vendors 
      ADD CONSTRAINT IF NOT EXISTS vendors_vendor_code_unique UNIQUE (vendor_code)
    `);
    console.log('✅ Added unique constraint to vendor_code');

    // Verify the changes
    const result = await client.query(`
      SELECT COUNT(*) as total_vendors, 
             COUNT(vendor_code) as vendors_with_codes
      FROM vendors
    `);
    
    const stats = result.rows[0];
    console.log(`📊 Database stats:`);
    console.log(`   Total vendors: ${stats.total_vendors}`);
    console.log(`   Vendors with codes: ${stats.vendors_with_codes}`);

    if (stats.total_vendors == stats.vendors_with_codes) {
      console.log('✅ All vendors now have vendor codes!');
    } else {
      console.log('⚠️  Some vendors still missing vendor codes');
    }

    console.log('✅ Migration completed successfully!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

addVendorCodeColumn().catch(console.error);
