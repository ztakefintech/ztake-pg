const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function createTestUser() {
  const client = await pool.connect();
  
  try {
    console.log('🧪 Creating test user for Google OAuth...\n');
    
    const testEmail = 'test@example.com';
    const testBusinessName = 'Test Business';
    const testContactName = 'Test User';
    const testUpiId = 'test@upi';
    
    // Check if user already exists
    const existingUser = await client.query(
      'SELECT * FROM vendors WHERE email = $1',
      [testEmail]
    );
    
    if (existingUser.rows.length > 0) {
      console.log('✅ Test user already exists:');
      console.log(`   Email: ${existingUser.rows[0].email}`);
      console.log(`   Business: ${existingUser.rows[0].business_name}`);
      console.log(`   Approved: ${existingUser.rows[0].is_approved ? 'Yes' : 'No'}`);
      
      // Ask if user wants to approve the existing user
      const args = process.argv.slice(2);
      if (args.includes('--approve')) {
        await client.query(
          'UPDATE vendors SET is_approved = true WHERE email = $1',
          [testEmail]
        );
        console.log('✅ Test user approved!');
      } else {
        console.log('\n💡 To approve this user, run:');
        console.log('   node scripts/create-test-user.js --approve');
      }
      return;
    }
    
    // Create new test user
    const result = await client.query(`
      INSERT INTO vendors (
        email, 
        password_hash, 
        business_name, 
        contact_name, 
        upi_id, 
        is_approved,
        vendor_code
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `, [
      testEmail,
      'dummy_hash', // We'll use Google OAuth, so password doesn't matter
      testBusinessName,
      testContactName,
      testUpiId,
      true, // Approve by default for testing
      'TEST01' // Test vendor code
    ]);
    
    const newUser = result.rows[0];
    console.log('✅ Test user created successfully!');
    console.log(`   ID: ${newUser.id}`);
    console.log(`   Email: ${newUser.email}`);
    console.log(`   Business: ${newUser.business_name}`);
    console.log(`   Contact: ${newUser.contact_name}`);
    console.log(`   Approved: ${newUser.is_approved ? 'Yes' : 'No'}`);
    console.log(`   Vendor Code: ${newUser.vendor_code}`);
    
    console.log('\n🧪 Testing Instructions:');
    console.log('1. Make sure your Google OAuth is configured');
    console.log('2. Start your development server: npm run dev');
    console.log('3. Go to http://localhost:3000/login');
    console.log('4. Click "Continue with Google"');
    console.log('5. Use the Google account that matches: test@example.com');
    console.log('6. You should be redirected to the dashboard');
    
  } catch (error) {
    console.error('❌ Error creating test user:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

createTestUser();
