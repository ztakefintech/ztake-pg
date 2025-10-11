const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

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

    // Check if vendor_code column exists
    const columnCheck = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'vendors' AND column_name = 'vendor_code'
    `);

    if (columnCheck.rows.length > 0) {
      console.log('✅ vendor_code column already exists');
    } else {
      // Add vendor_code column to vendors table
      await client.query(`
        ALTER TABLE vendors 
        ADD COLUMN vendor_code VARCHAR(6)
      `);
      console.log('✅ Added vendor_code column to vendors table');
    }

    // Generate vendor codes for existing vendors that don't have them
    console.log('🔄 Generating vendor codes for existing vendors...');
    const vendorsWithoutCode = await client.query(`
      SELECT id FROM vendors WHERE vendor_code IS NULL OR vendor_code = ''
    `);

    if (vendorsWithoutCode.rows.length > 0) {
      console.log(`Found ${vendorsWithoutCode.rows.length} vendors without codes`);

      for (const vendor of vendorsWithoutCode.rows) {
        let attempts = 0;
        let newCode;
        let codeExists = true;

        // Generate unique code
        while (codeExists && attempts < 100) {
          const letter1 = String.fromCharCode(65 + Math.floor(Math.random() * 26));
          const letter2 = String.fromCharCode(65 + Math.floor(Math.random() * 26));
          const num1 = Math.floor(Math.random() * 10);
          const num2 = Math.floor(Math.random() * 10);
          const num3 = Math.floor(Math.random() * 10);
          const num4 = Math.floor(Math.random() * 10);
          
          newCode = `${letter1}${letter2}${num1}${num2}${num3}${num4}`;
          
          // Check if code exists
          const existingCode = await client.query(
            'SELECT id FROM vendors WHERE vendor_code = $1',
            [newCode]
          );
          
          codeExists = existingCode.rows.length > 0;
          attempts++;
        }

        if (!codeExists) {
          await client.query(
            'UPDATE vendors SET vendor_code = $1 WHERE id = $2',
            [newCode, vendor.id]
          );
          console.log(`✅ Generated vendor code ${newCode} for vendor ID ${vendor.id}`);
        } else {
          console.log(`❌ Failed to generate unique code for vendor ID ${vendor.id}`);
        }
      }
    } else {
      console.log('✅ All vendors already have vendor codes');
    }

    // Add unique constraint to vendor_code if it doesn't exist
    try {
      await client.query(`
        ALTER TABLE vendors 
        ADD CONSTRAINT vendors_vendor_code_unique UNIQUE (vendor_code)
      `);
      console.log('✅ Added unique constraint to vendor_code');
    } catch (error) {
      if (error.message.includes('already exists')) {
        console.log('✅ Unique constraint already exists');
      } else {
        throw error;
      }
    }

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
