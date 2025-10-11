const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function testGoogleUserCreation() {
  const client = await pool.connect();
  
  try {
    console.log('🧪 Testing Google OAuth User Creation...\n');
    
    // Check if test user already exists
    const existingUser = await client.query(
      'SELECT * FROM vendors WHERE email = $1',
      ['test-google@example.com']
    );
    
    if (existingUser.rows.length > 0) {
      console.log('✅ Test Google user already exists:');
      console.log(`   ID: ${existingUser.rows[0].id}`);
      console.log(`   Email: ${existingUser.rows[0].email}`);
      console.log(`   Business: ${existingUser.rows[0].business_name}`);
      console.log(`   Approved: ${existingUser.rows[0].is_approved ? 'Yes' : 'No'}`);
      console.log(`   Google ID: ${existingUser.rows[0].google_id || 'Not set'}`);
      
      // Ask if user wants to delete and recreate
      const args = process.argv.slice(2);
      if (args.includes('--recreate')) {
        await client.query('DELETE FROM vendors WHERE email = $1', ['test-google@example.com']);
        console.log('🗑️ Deleted existing test user');
      } else {
        console.log('\n💡 To recreate this user, run:');
        console.log('   node scripts/test-google-user.js --recreate');
        return;
      }
    }
    
    // Create new test Google user
    const vendorCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    const googleId = 'test_google_id_' + Math.random().toString(36).substring(2, 15);
    
    const result = await client.query(`
      INSERT INTO vendors (
        vendor_code,
        email,
        password_hash,
        business_name,
        contact_name,
        phone,
        upi_id,
        is_approved,
        google_id,
        created_at,
        updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING *
    `, [
      vendorCode,
      'test-google@example.com',
      'google_oauth_user',
      'Test Google User',
      'Test Google User',
      null,
      'test-google@example.com@upi',
      false, // Not approved by default
      googleId
    ]);
    
    const newUser = result.rows[0];
    console.log('✅ Test Google user created successfully!');
    console.log(`   ID: ${newUser.id}`);
    console.log(`   Email: ${newUser.email}`);
    console.log(`   Business: ${newUser.business_name}`);
    console.log(`   Contact: ${newUser.contact_name}`);
    console.log(`   Approved: ${newUser.is_approved ? 'Yes' : 'No'}`);
    console.log(`   Google ID: ${newUser.google_id}`);
    console.log(`   Vendor Code: ${newUser.vendor_code}`);
    console.log(`   UPI ID: ${newUser.upi_id}`);
    
    console.log('\n🧪 Testing Instructions:');
    console.log('1. Make sure your Google OAuth is configured');
    console.log('2. Start your development server: npm run dev');
    console.log('3. Go to http://localhost:3000/login');
    console.log('4. Click "Continue with Google"');
    console.log('5. Use a Google account that matches: test-google@example.com');
    console.log('6. You should see the access denied page with "Account Created!" message');
    console.log('7. Check the admin dashboard to see the new user');
    
    console.log('\n🔧 Admin Dashboard:');
    console.log('1. Go to http://localhost:3000/admin');
    console.log('2. Login as admin');
    console.log('3. Go to "Users" tab');
    console.log('4. Look for the test user with "Pending" status');
    console.log('5. Click "Approve" to approve the user');
    console.log('6. Try Google login again - should work now!');
    
  } catch (error) {
    console.error('❌ Error creating test Google user:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

testGoogleUserCreation();
