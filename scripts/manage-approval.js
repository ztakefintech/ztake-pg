const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function manageUserApproval() {
  const client = await pool.connect();
  
  try {
    console.log('🔐 ZTake User Approval Manager\n');
    
    // Get command line arguments
    const args = process.argv.slice(2);
    const command = args[0];
    
    switch (command) {
      case 'list':
        await listUsers(client);
        break;
      case 'approve':
        const email = args[1];
        if (!email) {
          console.error('❌ Please provide email address');
          console.log('Usage: node scripts/manage-approval.js approve user@example.com');
          process.exit(1);
        }
        await approveUser(client, email);
        break;
      case 'reject':
        const rejectEmail = args[1];
        if (!rejectEmail) {
          console.error('❌ Please provide email address');
          console.log('Usage: node scripts/manage-approval.js reject user@example.com');
          process.exit(1);
        }
        await rejectUser(client, rejectEmail);
        break;
      case 'status':
        const statusEmail = args[1];
        if (!statusEmail) {
          console.error('❌ Please provide email address');
          console.log('Usage: node scripts/manage-approval.js status user@example.com');
          process.exit(1);
        }
        await checkUserStatus(client, statusEmail);
        break;
      default:
        showHelp();
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

async function listUsers(client) {
  console.log('📋 All Users:\n');
  
  const result = await client.query(`
    SELECT 
      id, 
      email, 
      business_name, 
      contact_name, 
      is_approved,
      google_id,
      created_at
    FROM vendors 
    ORDER BY created_at DESC
  `);
  
  if (result.rows.length === 0) {
    console.log('No users found.');
    return;
  }
  
  console.log('ID | Email | Business Name | Contact | Approved | Google ID | Created');
  console.log('---|-------|---------------|---------|----------|-----------|--------');
  
  result.rows.forEach(user => {
    const approved = user.is_approved ? '✅ Yes' : '❌ No';
    const googleId = user.google_id ? '🔗 Yes' : '❌ No';
    const created = new Date(user.created_at).toLocaleDateString();
    
    console.log(
      `${user.id.toString().padEnd(2)} | ${user.email.padEnd(20)} | ${user.business_name.padEnd(15)} | ${user.contact_name.padEnd(8)} | ${approved.padEnd(9)} | ${googleId.padEnd(10)} | ${created}`
    );
  });
  
  console.log(`\nTotal users: ${result.rows.length}`);
}

async function approveUser(client, email) {
  console.log(`🔓 Approving user: ${email}`);
  
  const result = await client.query(
    'UPDATE vendors SET is_approved = true, updated_at = CURRENT_TIMESTAMP WHERE email = $1 RETURNING *',
    [email]
  );
  
  if (result.rows.length === 0) {
    console.log('❌ User not found');
    return;
  }
  
  const user = result.rows[0];
  console.log('✅ User approved successfully!');
  console.log(`   Business: ${user.business_name}`);
  console.log(`   Contact: ${user.contact_name}`);
  console.log(`   Email: ${user.email}`);
}

async function rejectUser(client, email) {
  console.log(`🔒 Rejecting user: ${email}`);
  
  const result = await client.query(
    'UPDATE vendors SET is_approved = false, updated_at = CURRENT_TIMESTAMP WHERE email = $1 RETURNING *',
    [email]
  );
  
  if (result.rows.length === 0) {
    console.log('❌ User not found');
    return;
  }
  
  const user = result.rows[0];
  console.log('❌ User rejected successfully!');
  console.log(`   Business: ${user.business_name}`);
  console.log(`   Contact: ${user.contact_name}`);
  console.log(`   Email: ${user.email}`);
}

async function checkUserStatus(client, email) {
  console.log(`🔍 Checking status for: ${email}`);
  
  const result = await client.query(
    'SELECT * FROM vendors WHERE email = $1',
    [email]
  );
  
  if (result.rows.length === 0) {
    console.log('❌ User not found');
    return;
  }
  
  const user = result.rows[0];
  const approved = user.is_approved ? '✅ Approved' : '❌ Not Approved';
  const googleId = user.google_id ? `🔗 ${user.google_id}` : '❌ No Google ID';
  
  console.log('📊 User Status:');
  console.log(`   Email: ${user.email}`);
  console.log(`   Business: ${user.business_name}`);
  console.log(`   Contact: ${user.contact_name}`);
  console.log(`   Status: ${approved}`);
  console.log(`   Google ID: ${googleId}`);
  console.log(`   Created: ${new Date(user.created_at).toLocaleString()}`);
  console.log(`   Updated: ${new Date(user.updated_at).toLocaleString()}`);
}

function showHelp() {
  console.log(`
🔐 ZTake User Approval Manager

Commands:
  list                    - List all users and their approval status
  approve <email>         - Approve a user by email
  reject <email>          - Reject a user by email  
  status <email>          - Check user status by email

Examples:
  node scripts/manage-approval.js list
  node scripts/manage-approval.js approve user@example.com
  node scripts/manage-approval.js reject user@example.com
  node scripts/manage-approval.js status user@example.com
  `);
}

manageUserApproval();
