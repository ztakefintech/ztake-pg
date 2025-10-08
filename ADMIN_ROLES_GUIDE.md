# Admin Role Management System

This guide explains the admin role management system implemented in the ZTake application.

## Overview

The admin system now supports role-based access control with different permission levels for managing the platform. Main admins can create sub-admins with specific roles and permissions.

## Admin Roles

### 1. Superuser
- **Description**: Full access to all features and admin management
- **Permissions**: All permissions enabled
- **Use Case**: Main platform administrators

### 2. View Only
- **Description**: Read-only access to all data
- **Permissions**: 
  - View overview dashboard
  - View users
  - View payments
  - View payouts
  - View settlements
- **Use Case**: Monitoring and reporting

### 3. Manage Users
- **Description**: User management capabilities
- **Permissions**:
  - View overview dashboard
  - View users
  - Manage users (create, update, delete)
- **Use Case**: Customer support and user management

### 4. Manage Payin
- **Description**: Payment processing management
- **Permissions**:
  - View overview dashboard
  - View payments
  - Manage payin operations
- **Use Case**: Payment processing team

### 5. Manage Payout
- **Description**: Payout management capabilities
- **Permissions**:
  - View overview dashboard
  - View payouts
  - Manage payout operations
- **Use Case**: Payout processing team

### 6. Manage Settlements
- **Description**: Settlement management capabilities
- **Permissions**:
  - View overview dashboard
  - View settlements
  - Manage settlement operations
- **Use Case**: Settlement processing team

## Database Schema

### admin_users Table
```sql
CREATE TABLE admin_users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name VARCHAR(255) NOT NULL,
  role VARCHAR(50) DEFAULT 'view_only',
  permissions JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_by INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES admin_users (id)
);
```

### admin_sessions Table
```sql
CREATE TABLE admin_sessions (
  id SERIAL PRIMARY KEY,
  admin_id INTEGER NOT NULL,
  token_hash VARCHAR(255) UNIQUE NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (admin_id) REFERENCES admin_users (id) ON DELETE CASCADE
);
```

## API Endpoints

### Admin Management
- `GET /api/admin/admins` - List all admin users (requires `manage_admins` permission)
- `POST /api/admin/admins` - Create new admin user (requires `manage_admins` permission)
- `PATCH /api/admin/admins` - Update admin user (requires `manage_admins` permission)
- `DELETE /api/admin/admins` - Delete admin user (requires `manage_admins` permission)

### Protected Routes
All existing admin routes now use permission-based middleware:
- `/api/admin/stats` - Requires `view_overview`
- `/api/admin/users` - GET requires `view_users`, PATCH/DELETE requires `manage_users`
- `/api/admin/payments` - Requires `view_payments`
- `/api/admin/payouts` - GET requires `view_payouts`, PATCH requires `manage_payout`
- `/api/admin/settlements` - GET requires `view_settlements`, PATCH requires `manage_settlements`

## Setup Instructions

### 1. Initialize Database
The database tables are automatically created when the application starts.

### 2. Create First Admin User
Run the initialization script to create the first superuser:

```bash
node scripts/create-admin.js
```

This creates:
- Email: `admin@ztake.com`
- Password: `admin123`
- Role: `superuser`

**⚠️ Important**: Change the password after first login!

### 3. Create Additional Admins
1. Login with the superuser account
2. Navigate to the "Admin Users" tab
3. Click "Create Admin"
4. Fill in the details and select the appropriate role
5. The new admin will be created with default permissions for their role

## Permission System

### How Permissions Work
1. Each admin user has a `role` and `permissions` JSON object
2. The `role` determines default permissions
3. `permissions` can be customized per user
4. Superusers have all permissions regardless of the permissions object

### Permission Names
- `view_overview` - Access to overview dashboard
- `view_users` - View user data
- `view_payments` - View payment data
- `view_payouts` - View payout data
- `view_settlements` - View settlement data
- `manage_users` - Create, update, delete users
- `manage_payin` - Manage payment processing
- `manage_payout` - Manage payout processing
- `manage_settlements` - Manage settlement processing
- `manage_admins` - Manage admin users

## Security Features

1. **Password Hashing**: All passwords are hashed using bcrypt
2. **JWT Tokens**: Admin sessions use JWT tokens with 24-hour expiration
3. **Permission Middleware**: All admin routes are protected by permission checks
4. **Role Validation**: Database enforces valid role values
5. **Active Status**: Admins can be deactivated without deletion

## Migration from Legacy System

The system maintains backward compatibility with the legacy admin authentication:
1. First tries the new admin user system
2. Falls back to environment variable credentials
3. Legacy admins get superuser permissions

## UI Features

### Admin Dashboard
- New "Admin Users" tab for managing admins
- Role-based UI elements (only show relevant tabs based on permissions)
- Create/Update/Delete admin users
- Activate/Deactivate admin accounts
- Role-based color coding for easy identification

### Admin User Management
- Create new admins with specific roles
- Update admin details and permissions
- Deactivate admins (soft delete)
- View admin creation history

## Best Practices

1. **Principle of Least Privilege**: Give admins only the permissions they need
2. **Regular Audits**: Review admin permissions periodically
3. **Strong Passwords**: Enforce strong password policies
4. **Monitor Activity**: Keep track of admin actions
5. **Backup Access**: Always maintain at least one superuser account

## Troubleshooting

### Common Issues

1. **Permission Denied**: Check if the admin has the required permission
2. **Login Issues**: Verify admin is active and credentials are correct
3. **Database Errors**: Ensure database tables are properly created
4. **Token Expired**: Admin needs to re-login after 24 hours

### Debug Steps

1. Check admin user exists: `SELECT * FROM admin_users WHERE email = 'admin@example.com'`
2. Verify permissions: Check the `permissions` JSON object
3. Check active status: Ensure `is_active = true`
4. Verify role: Check the `role` field matches expected values

## Future Enhancements

- Audit logging for admin actions
- Two-factor authentication
- Session management
- Permission inheritance
- Custom permission sets
- Admin activity monitoring
