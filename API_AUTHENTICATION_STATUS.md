# API Authentication Status Summary

## Overview
This document provides a comprehensive overview of the authentication requirements for all API endpoints in the payment gateway system.

## Authentication Types

### 1. **PK Authentication** (Secret Key)
- Requires PK (secret key) generated from settings page
- Used for order creation (primary method)
- PK must be provided in Authorization header as `Bearer <pk_secret_key>`
- Validates against `vendors.secret_key` database field

### 2. **withAuth** - Vendor Authentication
- Requires valid vendor JWT token
- Used for vendor-specific operations
- Token must be provided in Authorization header as `Bearer <token>`

### 3. **withApiKeyAuth** - API Key Authentication  
- Requires valid API key
- Used for external integrations
- API key must be provided in Authorization header as `Bearer <api_key>`

### 4. **requireAdmin** - Admin Authentication
- Requires admin JWT token
- Used for administrative operations
- Token must be provided in Authorization header as `Bearer <admin_token>`

### 5. **requirePermission** - Permission-based Authentication
- Requires admin token with specific permissions
- Used for granular admin operations
- Token must have required permission level

### 6. **Public** - No Authentication Required
- No authentication required
- Used for public-facing operations
- May have rate limiting for security

## Endpoint Authentication Status

### 🔐 **Vendor Endpoints** (requireAuth)
| Endpoint | Method | Auth Type | Description |
|----------|--------|-----------|-------------|
| `/api/vendor/orders` | GET | withAuth | Get vendor orders |
| `/api/vendor/payments` | GET | withAuth | Get vendor payments |
| `/api/vendor/payouts` | GET/POST | withAuth | Manage vendor payouts |
| `/api/vendor/payouts/balance` | GET | withAuth | Get payout balance |
| `/api/vendor/payouts/recharges` | GET/POST | withAuth | Manage recharges |
| `/api/vendor/settlements` | GET/POST | withAuth | Manage settlements |
| `/api/vendor/profile` | GET/PUT | withAuth | Manage vendor profile |
| `/api/vendor/payment-info` | GET | withAuth | Get payment info |
| `/api/vendor/stats` | GET | withAuth | Get vendor statistics |

### 🔑 **API Key Endpoints** (withApiKeyAuth)
| Endpoint | Method | Auth Type | Description |
|----------|--------|-----------|-------------|
| `/api/payments/update` | POST | withApiKeyAuth | Update payment status |
| `/api/payments/status` | POST | withApiKeyAuth | Update payment status |
| `/api/vendor/cashfree/proxy` | ALL | withApiKeyAuth | Cashfree proxy operations |
| `/api/vendor/cashfree/beneficiaries` | POST | withApiKeyAuth | Manage beneficiaries |
| `/api/vendor/cashfree/transfers` | POST | withApiKeyAuth | Process transfers |
| `/api/vendor/cashfree/quick-payout` | POST | withApiKeyAuth | Quick payout |
| `/api/vendor/bot-token-secure` | GET | withApiKeyAuth | Get secure bot token |
| `/api/admin/api-keys` | POST | withAuth | Create API keys |

### 👑 **Admin Endpoints** (requireAdmin/requirePermission)
| Endpoint | Method | Auth Type | Permission | Description |
|----------|--------|-----------|------------|-------------|
| `/api/admin/me` | GET | requireAdmin | - | Get admin profile |
| `/api/admin/admins` | GET/POST/PATCH/DELETE | requirePermission | manage_admins | Manage admin users |
| `/api/admin/users` | GET/PATCH/DELETE | requirePermission | manage_users | Manage users |
| `/api/admin/orders` | GET | requirePermission | view_payments | View orders |
| `/api/admin/payments` | GET | requirePermission | view_payments | View payments |
| `/api/admin/payouts` | GET/PATCH | requirePermission | view_payout/manage_payout | Manage payouts |
| `/api/admin/settlements` | GET/PATCH | requirePermission | view_settlements/manage_settlements | Manage settlements |
| `/api/admin/recharges` | GET/PATCH | requireAdmin | - | Manage recharges |
| `/api/admin/stats` | GET | requirePermission | view_overview | View statistics |
| `/api/admin/vendor-assignments` | GET/POST/DELETE | requirePermission | manage_admins | Manage vendor assignments |
| `/api/admin/submit-utr` | POST | requireAdmin | - | Submit UTR |
| `/api/admin/permissions` | GET | requirePermission | manage_admins | Get permissions |
| `/api/events/poll` | GET/POST | requireAdmin | - | Event polling |

### 🔐 **PK Authentication Endpoints** (requireSecretKey)
| Endpoint | Method | Auth Type | Rate Limit | Description |
|----------|--------|-----------|------------|-------------|
| `/api/v1/orders` | POST | PK Required | orderCreationRateLimit | Create orders (PK from settings page) |

### 🌐 **Public Endpoints** (No Authentication)
| Endpoint | Method | Auth Type | Rate Limit | Description |
|----------|--------|-----------|------------|-------------|
| `/api/payments/check` | POST | Public | apiRateLimit | Check payment status |
| `/api/auth/login` | POST | Public | authRateLimit | Vendor login |
| `/api/auth/register` | POST | Public | authRateLimit | Vendor registration |
| `/api/auth/google` | POST | Public | authRateLimit | Google OAuth |
| `/api/auth/check-email` | POST | Public | - | Check email availability |
| `/api/auth/logout` | POST | withAuth | - | Logout (requires auth) |
| `/api/public/payment-callback` | POST | Public | - | Payment callback webhook |
| `/api/public/payment-widget` | GET | Public | - | Payment widget |

## Authentication Flow

### 1. **PK Authentication** (Primary for Order Creation)
```
1. Generate PK from vendor settings page
2. Use PK in Authorization: Bearer <pk_secret_key> header
3. PK validated against vendors.secret_key database field
4. Order associated with authenticated vendor
```

### 2. **Vendor Authentication**
```
1. POST /api/auth/login with email/password
2. Receive JWT token
3. Use token in Authorization: Bearer <token> header
4. Token expires after configured time
```

### 2. **API Key Authentication**
```
1. Admin creates API key via /api/admin/api-keys
2. Use API key in Authorization: Bearer <api_key> header
3. API key has associated vendor permissions
4. API keys can be revoked by admin
```

### 3. **Admin Authentication**
```
1. Admin login via admin interface
2. Receive admin JWT token
3. Use token in Authorization: Bearer <admin_token> header
4. Token includes permission levels
```

## Security Features

### Rate Limiting
- **Authentication endpoints**: 5 attempts/15min
- **API endpoints**: 100 requests/min
- **Payment operations**: 10 updates/min
- **Order creation**: 20 orders/min
- **Payout creation**: 5 payouts/min
- **Admin operations**: 30 actions/min

### Progressive Blocking
- IPs blocked after repeated violations
- Different block durations for different operations
- Violation count persistence across windows

### Token Security
- JWT tokens with expiration
- Secure token generation
- Token revocation capability
- Permission-based access control

## Updated Amount Limits

### Order Creation
- **Minimum**: ₹100
- **Maximum**: ₹1,00,000
- **Currency**: INR, USD, EUR

### Payment Processing
- **Minimum**: ₹100
- **Maximum**: ₹1,00,000
- **Precision**: 2 decimal places

### Payout Creation
- **Minimum**: ₹100
- **Maximum**: ₹1,00,000
- **Currency**: INR only

## Recommendations

### For External Integrations
1. Use API keys for automated operations
2. Implement proper error handling for auth failures
3. Respect rate limits to avoid blocking
4. Use HTTPS for all API calls

### For Admin Operations
1. Use admin tokens with appropriate permissions
2. Implement proper session management
3. Monitor admin activity logs
4. Regular token rotation

### For Public Endpoints
1. Implement client-side validation
2. Use rate limiting on client side
3. Monitor for abuse patterns
4. Implement CAPTCHA for sensitive operations

## Error Handling

### Authentication Errors
- `401 Unauthorized`: Invalid or missing token
- `403 Forbidden`: Insufficient permissions
- `429 Too Many Requests`: Rate limit exceeded
- `423 Locked`: IP temporarily blocked

### Validation Errors
- `400 Bad Request`: Invalid input data
- `422 Unprocessable Entity`: Validation failed
- Detailed error messages for debugging

## Monitoring

### Recommended Monitoring
1. Authentication failure rates
2. Rate limit violations
3. API key usage patterns
4. Admin action logs
5. Suspicious activity detection

### Alert Thresholds
1. High authentication failure rate
2. Multiple rate limit violations from same IP
3. Unusual API usage patterns
4. Admin permission escalation attempts
5. Failed payment processing attempts

This authentication system provides comprehensive security while maintaining usability for legitimate users and integrations.
