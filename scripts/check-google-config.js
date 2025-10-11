// Google OAuth Configuration Checker
// Run this script to verify your Google OAuth setup

const fs = require('fs');
const path = require('path');

function checkGoogleOAuthConfig() {
  console.log('🔍 Checking Google OAuth Configuration...\n');
  
  // Check for .env.local file
  const envPath = path.join(process.cwd(), '.env.local');
  if (!fs.existsSync(envPath)) {
    console.log('❌ .env.local file not found');
    console.log('   Create a .env.local file in your project root');
    return false;
  }
  
  // Read environment variables
  const envContent = fs.readFileSync(envPath, 'utf8');
  const lines = envContent.split('\n');
  
  let hasClientId = false;
  let hasClientSecret = false;
  
  lines.forEach(line => {
    if (line.startsWith('NEXT_PUBLIC_GOOGLE_CLIENT_ID=')) {
      hasClientId = true;
      const clientId = line.split('=')[1];
      if (clientId && clientId.trim() !== '') {
        console.log('✅ NEXT_PUBLIC_GOOGLE_CLIENT_ID is set');
      } else {
        console.log('❌ NEXT_PUBLIC_GOOGLE_CLIENT_ID is empty');
      }
    }
    if (line.startsWith('GOOGLE_CLIENT_SECRET=')) {
      hasClientSecret = true;
      const clientSecret = line.split('=')[1];
      if (clientSecret && clientSecret.trim() !== '') {
        console.log('✅ GOOGLE_CLIENT_SECRET is set');
      } else {
        console.log('❌ GOOGLE_CLIENT_SECRET is empty');
      }
    }
  });
  
  if (!hasClientId) {
    console.log('❌ NEXT_PUBLIC_GOOGLE_CLIENT_ID not found in .env.local');
  }
  
  if (!hasClientSecret) {
    console.log('❌ GOOGLE_CLIENT_SECRET not found in .env.local');
  }
  
  console.log('\n📋 Required Environment Variables:');
  console.log('NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_google_client_id_here');
  console.log('GOOGLE_CLIENT_SECRET=your_google_client_secret_here');
  
  console.log('\n🔧 Google Cloud Console Setup:');
  console.log('1. Go to https://console.cloud.google.com/');
  console.log('2. Create a new project or select existing');
  console.log('3. Enable Google+ API');
  console.log('4. Go to "Credentials" → "Create Credentials" → "OAuth 2.0 Client IDs"');
  console.log('5. Set application type to "Web application"');
  console.log('6. Add authorized redirect URIs:');
  console.log('   - http://localhost:3000 (for development)');
  console.log('   - https://yourdomain.com (for production)');
  
  return hasClientId && hasClientSecret;
}

function checkDatabaseConfig() {
  console.log('\n🗄️ Checking Database Configuration...\n');
  
  const envPath = path.join(process.cwd(), '.env.local');
  if (!fs.existsSync(envPath)) {
    console.log('❌ .env.local file not found');
    return false;
  }
  
  const envContent = fs.readFileSync(envPath, 'utf8');
  const lines = envContent.split('\n');
  
  let hasDatabaseUrl = false;
  
  lines.forEach(line => {
    if (line.startsWith('DATABASE_URL=')) {
      hasDatabaseUrl = true;
      const dbUrl = line.split('=')[1];
      if (dbUrl && dbUrl.trim() !== '') {
        console.log('✅ DATABASE_URL is set');
      } else {
        console.log('❌ DATABASE_URL is empty');
      }
    }
  });
  
  if (!hasDatabaseUrl) {
    console.log('❌ DATABASE_URL not found in .env.local');
    console.log('   Add: DATABASE_URL=your_postgresql_connection_string');
  }
  
  return hasDatabaseUrl;
}

function main() {
  console.log('🚀 ZTake Google OAuth Configuration Checker\n');
  
  const oauthConfig = checkGoogleOAuthConfig();
  const dbConfig = checkDatabaseConfig();
  
  console.log('\n📊 Configuration Summary:');
  console.log(`Google OAuth: ${oauthConfig ? '✅ Ready' : '❌ Not Ready'}`);
  console.log(`Database: ${dbConfig ? '✅ Ready' : '❌ Not Ready'}`);
  
  if (oauthConfig && dbConfig) {
    console.log('\n🎉 All configurations are ready!');
    console.log('You can now test Google OAuth login.');
  } else {
    console.log('\n⚠️ Please fix the configuration issues above before testing.');
  }
  
  console.log('\n🧪 Testing Steps:');
  console.log('1. Start your development server: npm run dev');
  console.log('2. Go to http://localhost:3000/login');
  console.log('3. Click "Continue with Google"');
  console.log('4. Check browser console for any errors');
  console.log('5. Check server logs for detailed error messages');
}

main();
