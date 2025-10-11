# Google OAuth Configuration Guide

## Setup Instructions

1. **Create Google OAuth Application:**
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select existing one
   - Enable Google+ API
   - Go to "Credentials" → "Create Credentials" → "OAuth 2.0 Client IDs"
   - Set application type to "Web application"
   - Add authorized redirect URIs:
     - `http://localhost:3000` (for development)
     - `https://yourdomain.com` (for production)

2. **Environment Variables:**
   Add these to your `.env.local` file:
   ```
   NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_google_client_id_here
   GOOGLE_CLIENT_SECRET=your_google_client_secret_here
   ```

3. **Database Migration:**
   Run the database initialization script to add the new columns:
   ```bash
   node scripts/init-db.js
   ```

4. **Admin Panel:**
   - Access admin panel to approve users
   - Set `is_approved = true` for approved users
   - Users with `is_approved = false` will see the access denied page

## Features Implemented

✅ **Google OAuth Integration**
- Secure Google login with access token verification
- Automatic user profile fetching from Google
- Proper error handling and validation

✅ **User Approval System**
- `is_approved` field in vendors table
- `google_id` field for linking Google accounts
- Access denied page for unapproved users

✅ **Professional UI**
- Modern access denied page with contact information
- Loading states for Google OAuth
- Proper error messaging

✅ **Security Features**
- Rate limiting on OAuth endpoints
- Token validation and verification
- Secure redirect handling

## Usage

1. **For Users:**
   - Click "Continue with Google" on login page
   - If approved: Redirected to dashboard
   - If not approved: Shown access denied page with contact info

2. **For Admins:**
   - Access admin panel to manage user approvals
   - Set approval status for new users
   - Monitor Google OAuth logins

## Testing

1. **Test Approved User:**
   - Set `is_approved = true` in database
   - Try Google login - should redirect to dashboard

2. **Test Unapproved User:**
   - Set `is_approved = false` in database
   - Try Google login - should show access denied page

3. **Test New User:**
   - Use Google account not in database
   - Should show access denied page with contact info
