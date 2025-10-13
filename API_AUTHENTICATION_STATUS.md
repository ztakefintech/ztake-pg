# API Authentication Status Summary

## Overview
This document provides a comprehensive overview of the authentication requirements for all API endpoints in the payment gateway system. **All vendor-facing endpoints now require API key authentication with vendor code validation for enhanced security.**

## Authentication Types

### 1. **API Key + Vendor Code Authentication** (Primary Method)
- **NEW**: Requires API key in Authorization header as `Bearer pk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`
- **NEW**: Requires vendor code in request body or query parameters
- **NEW**: Validates API key belongs to the specified vendor
- Used for all vendor operations (orders, payouts, payments, etc.)
- API key format: `pk_` + 32 alphanumeric characters
- Vendor code format: 2 uppercase letters + 4 digits (e.g., `AB1234`)

### 2. **withAuth** - Vendor Authentication (Legacy)
- Requires valid vendor JWT token
- Used for vendor-specific operations
- Token must be provided in Authorization header as `Bearer <token>`
- **Note**: Being phased out in favor of API key authentication

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

### 🔐 **Vendor Endpoints** (API Key + Vendor Code Required)
| Endpoint | Method | Auth Type | Vendor Code | Description |
|----------|--------|-----------|-------------|-------------|
| `/api/vendor/orders` | GET | API Key + Vendor Code | Query Param | Get vendor orders |
| `/api/vendor/payments` | GET | API Key + Vendor Code | Query Param | Get vendor payments |
| `/api/vendor/payouts` | GET/POST | API Key + Vendor Code | Query/Body | Manage vendor payouts |
| `/api/vendor/payouts/balance` | GET | API Key + Vendor Code | Query Param | Get payout balance |
| `/api/vendor/payouts/recharges` | GET/POST | API Key + Vendor Code | Query/Body | Manage recharges |
| `/api/vendor/settlements` | GET/POST | API Key + Vendor Code | Query/Body | Manage settlements |
| `/api/vendor/profile` | GET/PUT | API Key + Vendor Code | Query/Body | Manage vendor profile |
| `/api/vendor/payment-info` | GET | API Key + Vendor Code | Query Param | Get payment info |
| `/api/vendor/payment-details` | GET | API Key + Vendor Code | Query Param | Get payment details |
| `/api/vendor/stats` | GET | API Key + Vendor Code | Query Param | Get vendor statistics |

### 🔑 **V1 API Endpoints** (API Key + Vendor Code Required)
| Endpoint | Method | Auth Type | Vendor Code | Description |
|----------|--------|-----------|-------------|-------------|
| `/api/v1/orders` | POST | API Key + Vendor Code | Body Required | Create orders |
| `/api/v1/orders/[orderId]` | GET | API Key + Vendor Code | Query Param | Get order details |
| `/api/v1/orders/[orderId]/submit-utr` | POST | API Key + Vendor Code | Query Param | Submit UTR for order |
| `/api/payments/check` | POST | API Key + Vendor Code | Body Required | Check payment status |

### 🔑 **Legacy API Key Endpoints** (withApiKeyAuth)
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

### 🌐 **Public Endpoints** (No Authentication)
| Endpoint | Method | Auth Type | Rate Limit | Description |
|----------|--------|-----------|------------|-------------|
| `/api/auth/login` | POST | Public | authRateLimit | Vendor login |
| `/api/auth/register` | POST | Public | authRateLimit | Vendor registration |
| `/api/auth/google` | POST | Public | authRateLimit | Google OAuth |
| `/api/auth/check-email` | POST | Public | - | Check email availability |
| `/api/auth/logout` | POST | withAuth | - | Logout (requires auth) |
| `/api/public/payment-callback` | POST | Public | - | Payment callback webhook |
| `/api/public/payment-widget` | GET | Public | - | Payment widget |

## Authentication Flow

### 1. **API Key + Vendor Code Authentication** (Primary Method)
```
1. Admin creates API key for vendor via /api/admin/api-keys
2. Use API key in Authorization: Bearer pk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx header
3. Provide vendor code in request body or query parameters
4. System validates API key exists and belongs to specified vendor
5. Operation proceeds only if both validations pass
```

### 2. **Vendor Authentication** (Legacy)
```
1. POST /api/auth/login with email/password
2. Receive JWT token
3. Use token in Authorization: Bearer <token> header
4. Token expires after configured time
```

### 3. **API Key Authentication** (Legacy)
```
1. Admin creates API key via /api/admin/api-keys
2. Use API key in Authorization: Bearer <api_key> header
3. API key has associated vendor permissions
4. API keys can be revoked by admin
```

### 4. **Admin Authentication**
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
