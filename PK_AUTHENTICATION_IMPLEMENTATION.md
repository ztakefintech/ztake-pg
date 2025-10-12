# PK (Secret Key) Authentication Implementation

## Overview
The order creation API now requires a PK (Secret Key) for authentication. The PK is generated from the vendor's settings page and must be provided in the Authorization header.

## Implementation Details

### 1. **PK Validation Schema**
```typescript
export const pkValidationSchema = Joi.string()
  .pattern(/^[a-zA-Z0-9_-]{32,64}$/)
  .required()
  .messages({
    'string.pattern.base': 'PK must be 32-64 characters and contain only letters, numbers, underscores, and hyphens',
    'any.required': 'PK is required in Authorization header'
  });
```

### 2. **Authentication Flow**
1. **PK Validation**: Validates PK format (32-64 characters, alphanumeric + underscore/hyphen)
2. **Database Lookup**: Searches for vendor with matching `secret_key`
3. **Fallback Authentication**: If PK not found, tries API key and JWT token
4. **Vendor Association**: Associates order with authenticated vendor

### 3. **Order Creation API Changes**

#### **Endpoint**: `POST /api/v1/orders`

#### **Headers Required**:
```
Authorization: Bearer <pk_secret_key>
Content-Type: application/json
```

#### **Request Body**:
```json
{
  "merchantOrderId": "ORDER_123",
  "amount": 1000,
  "currency": "INR",
  "customerName": "John Doe",
  "returnUrl": "https://merchant.com/return",
  "callbackUrl": "https://merchant.com/callback",
  "vendorCode": "AB1234" // Optional fallback
}
```

#### **Authentication Priority**:
1. **PK (Secret Key)** - Primary authentication method
2. **API Key** - Fallback for existing integrations
3. **JWT Token** - Fallback for session-based auth
4. **Vendor Code** - Fallback from request body

### 4. **Error Responses**

#### **Missing Authorization Header**:
```json
{
  "error": "Authorization header with Bearer token is required"
}
```
**Status**: `401 Unauthorized`

#### **Invalid PK Format**:
```json
{
  "error": "Invalid PK format in Authorization header"
}
```
**Status**: `401 Unauthorized`

#### **Invalid PK or Vendor Not Found**:
```json
{
  "error": "Invalid PK or vendor not found"
}
```
**Status**: `401 Unauthorized`

### 5. **PK Generation Process**

#### **Settings Page Integration**:
- PK is generated in vendor settings page
- Stored in `vendors.secret_key` database field
- Should be 32-64 characters long
- Contains only alphanumeric characters, underscores, and hyphens

#### **PK Format Examples**:
- ✅ `sk_live_51H1234567890abcdef1234567890abcdef1234567890abcdef1234567890`
- ✅ `pk_test_1234567890abcdef1234567890abcdef1234567890abcdef1234567890`
- ✅ `secret_key_1234567890abcdef1234567890abcdef1234567890abcdef1234567890`

### 6. **Security Features**

#### **PK Validation**:
- Format validation (32-64 characters)
- Character set validation (alphanumeric + underscore/hyphen)
- Database lookup for existence
- Vendor association verification

#### **Rate Limiting**:
- Order creation rate limit: 20 orders/minute
- Progressive blocking after violations
- IP-based tracking

#### **Input Sanitization**:
- All input fields sanitized
- XSS prevention
- SQL injection prevention

### 7. **Database Schema**

#### **Vendors Table**:
```sql
CREATE TABLE vendors (
  id INTEGER PRIMARY KEY,
  secret_key VARCHAR(64) UNIQUE, -- PK storage
  vendor_code VARCHAR(6) UNIQUE,
  -- other fields...
);
```

### 8. **Integration Examples**

#### **cURL Example**:
```bash
curl -X POST https://api.ztake.com/api/v1/orders \
  -H "Authorization: Bearer sk_live_51H1234567890abcdef1234567890abcdef1234567890abcdef1234567890" \
  -H "Content-Type: application/json" \
  -d '{
    "merchantOrderId": "ORDER_123",
    "amount": 1000,
    "currency": "INR",
    "customerName": "John Doe",
    "returnUrl": "https://merchant.com/return",
    "callbackUrl": "https://merchant.com/callback"
  }'
```

#### **JavaScript Example**:
```javascript
const response = await fetch('/api/v1/orders', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer sk_live_51H1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    merchantOrderId: 'ORDER_123',
    amount: 1000,
    currency: 'INR',
    customerName: 'John Doe',
    returnUrl: 'https://merchant.com/return',
    callbackUrl: 'https://merchant.com/callback'
  })
});
```

#### **Python Example**:
```python
import requests

headers = {
    'Authorization': 'Bearer sk_live_51H1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
    'Content-Type': 'application/json'
}

data = {
    'merchantOrderId': 'ORDER_123',
    'amount': 1000,
    'currency': 'INR',
    'customerName': 'John Doe',
    'returnUrl': 'https://merchant.com/return',
    'callbackUrl': 'https://merchant.com/callback'
}

response = requests.post('/api/v1/orders', headers=headers, json=data)
```

### 9. **Migration Guide**

#### **For Existing Integrations**:
1. **API Key Users**: Continue using API keys (fallback supported)
2. **JWT Token Users**: Continue using JWT tokens (fallback supported)
3. **New Integrations**: Use PK authentication for better security

#### **PK Implementation Steps**:
1. Generate PK in vendor settings page
2. Store PK securely in your application
3. Include PK in Authorization header
4. Test with order creation API
5. Monitor for authentication errors

### 10. **Best Practices**

#### **PK Security**:
- Store PK securely (environment variables, secure vaults)
- Never expose PK in client-side code
- Rotate PKs regularly
- Monitor PK usage for anomalies

#### **Error Handling**:
- Implement proper error handling for 401 responses
- Log authentication failures
- Implement retry logic with exponential backoff
- Monitor rate limit responses

#### **Testing**:
- Test with valid PK
- Test with invalid PK format
- Test with non-existent PK
- Test rate limiting scenarios

## Conclusion

The PK authentication system provides:
- **Enhanced Security**: Strong secret key authentication
- **Backward Compatibility**: Fallback to existing auth methods
- **Comprehensive Validation**: Format and existence validation
- **Rate Limiting**: Protection against abuse
- **Clear Error Messages**: Detailed error responses for debugging

This implementation ensures secure order creation while maintaining compatibility with existing integrations.
