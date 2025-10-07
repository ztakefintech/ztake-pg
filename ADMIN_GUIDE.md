# Admin Dashboard Guide

## Overview
The admin dashboard provides comprehensive management capabilities for the ztake payment tracking system. It allows administrators to monitor all users, track payments, and manage the system.

## Access
- **URL**: `/admin`
- **Login URL**: `/admin/login`
- **Default Credentials**:
  - Username: `admin`
  - Password: `admin123`

## Features

### 1. Overview Dashboard
- **Total Users**: Displays the total number of registered vendors
- **Total Payments**: Shows the total number of payments processed
- **Payment Status Breakdown**: Visual breakdown of payment statuses (Succeeded, Failed, Pending)
- **Recent Payments**: List of the 10 most recent payments
- **Top Vendors**: Vendors ranked by payment count and total amount
- **Daily Trends**: Payment trends over the last 30 days

### 2. User Management
- **View All Users**: Complete list of all registered vendors
- **User Details**: Business name, contact information, email, UPI ID, and registration date
- **Delete Users**: Remove users and all their associated payments
- **Search and Filter**: Easy navigation through user data

### 3. Payment Tracking
- **All Payments**: Complete list of all payments across all vendors
- **Payment Details**: UTR, amount, status, business information, and timestamps
- **Status Filtering**: Filter payments by status (Pending, Succeeded, Failed)
- **Vendor Filtering**: Filter payments by specific vendor
- **Pagination**: Efficient handling of large payment datasets

## Security

### Authentication
- Admin credentials are stored in environment variables
- JWT-based authentication with 24-hour token expiration
- HTTP-only cookies for secure token storage
- Automatic logout on token expiration

### Environment Variables
```env
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin123
ADMIN_SECRET=admin-secret-key-change-in-production-2024
```

### Access Control
- All admin routes are protected by authentication middleware
- Admin tokens are verified on every request
- Automatic redirection to login page for unauthenticated users

## API Endpoints

### Authentication
- `POST /api/admin/login` - Admin login
- `POST /api/admin/logout` - Admin logout

### Data Management
- `GET /api/admin/stats` - Dashboard statistics
- `GET /api/admin/users` - Get all users
- `DELETE /api/admin/users?id={id}` - Delete user
- `GET /api/admin/payments` - Get all payments with pagination

## Usage Instructions

1. **Login**: Navigate to `/admin/login` and enter admin credentials
2. **Dashboard**: After login, you'll be redirected to the main dashboard
3. **Navigation**: Use the tabs to switch between Overview, Users, and Payments
4. **User Management**: In the Users tab, you can view and delete users
5. **Payment Tracking**: In the Payments tab, you can monitor all payments
6. **Logout**: Click the logout button to end your admin session

## Customization

### Changing Admin Credentials
Update the environment variables in `.env.local`:
```env
ADMIN_USERNAME=your-new-username
ADMIN_PASSWORD=your-new-password
ADMIN_SECRET=your-new-secret-key
```

### Adding New Features
The admin system is modular and can be extended by:
- Adding new API routes in `app/api/admin/`
- Creating new components in `components/`
- Updating the dashboard in `components/AdminDashboard.tsx`

## Troubleshooting

### Common Issues
1. **Login Failed**: Check if admin credentials are correctly set in environment variables
2. **Access Denied**: Ensure you're logged in and your session hasn't expired
3. **Data Not Loading**: Check if the database connection is working properly

### Logs
Check the server console for detailed error messages and debugging information.

## Security Best Practices

1. **Change Default Credentials**: Always change the default admin username and password
2. **Strong Secret Key**: Use a strong, unique secret key for JWT signing
3. **Environment Security**: Never commit `.env.local` to version control
4. **Regular Updates**: Keep admin credentials updated regularly
5. **Access Monitoring**: Monitor admin access logs for suspicious activity
