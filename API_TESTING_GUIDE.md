# API Testing Guide

## Overview
This guide explains how to test all the ztake APIs. Each vendor will have different endpoints based on their vendor ID.

## Base URL
- **Development**: `http://localhost:3000`
- **Production**: `https://your-domain.com`

## Testing Tools
- **Postman** (Recommended)
- **curl** (Command line)
- **Browser** (for GET requests)
- **Built-in API Tester** (in Settings page)

---

## 1. Authentication APIs

### Vendor Registration
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "business_name": "Test Store",
    "contact_name": "John Doe",
    "email": "test@example.com",
    "phone": "+1234567890",
    "upi_id": "teststore@paytm",
    "password": "testpassword123"
  }'
```

### Vendor Login
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "testpassword123"
  }'
```

**Response:**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "vendor": {
    "id": 1,
    "business_name": "Test Store",
    "email": "test@example.com",
    "upi_id": "teststore@paytm"
  }
}
```

---

## 2. Public APIs (No Authentication)

### Check Payment Status
**Note:** This endpoint now requires `order_id` and only processes succeeded payments. The `order_id` is added to the database only when payment is successful and checked for the first time.
```bash
curl -X POST http://localhost:3000/api/payments/check \
  -H "Content-Type: application/json" \
  -d '{
    "utr": "690518190930",
    "vendor_id": 1,
    "order_id": "ord_12345"
  }'
```

**Response (Success):**
```json
{
  "payment": {
    "id": 1,
    "order_id": "ord_12345",
    "utr": "690518190930",
    "amount": 100.00,
    "status": "completed",
    "payment_status": "Succeeded",
    "checked_status": true,
    "checked_at": "2024-01-15T10:30:00Z",
    "created_at": "2024-01-15T10:25:00Z",
    "updated_at": "2024-01-15T10:30:00Z",
    "vendor": {
      "id": 1,
      "business_name": "Test Store",
      "contact_name": "John Doe",
      "upi_id": "teststore@paytm"
    }
  },
  "message": "UTR checked successfully"
}
```

**Response (Already Checked):**
```json
{
  "payment": { ... },
  "message": "UTR has already been checked"
}
```

**Response (Not Succeeded):**
```json
{
  "payment": { ... },
  "message": "Payment not succeeded, cannot be checked"
}
```

### Get Vendor Payment Details
```bash
# Replace 1 with your actual vendor ID
curl "http://localhost:3000/api/vendor/payment-details?vendor_id=1"
```

### Payment Widget API
```bash
# JSON format
curl "http://localhost:3000/api/public/payment-widget?vendor_id=1&format=json"

# HTML format
curl "http://localhost:3000/api/public/payment-widget?vendor_id=1&format=html"

# Widget format
curl "http://localhost:3000/api/public/payment-widget?vendor_id=1&format=widget&theme=dark&size=large"
```

---

## 3. Vendor APIs (Requires JWT Token)

### Get Payment Information
```bash
# Replace YOUR_JWT_TOKEN with actual token from login
curl -X GET http://localhost:3000/api/vendor/payment-info \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Get Payment History
```bash
curl -X GET "http://localhost:3000/api/vendor/payments?page=1&limit=10" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Update Profile
```bash
curl -X PUT http://localhost:3000/api/vendor/profile \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "business_name": "Updated Store Name",
    "contact_name": "Updated Contact",
    "phone": "+1234567890",
    "upi_id": "updated@paytm"
  }'
```

---

## 4. Bot Integration APIs (Requires API Key)

### Create API Key
```bash
curl -X POST http://localhost:3000/api/admin/api-keys \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "key_name": "Test Bot"
  }'
```

### Update Payment
**Note:** This endpoint now accepts `order_id` as a required field and `payment_status` as optional (defaults to 'Succeeded').
```bash
# Replace YOUR_API_KEY with actual API key
curl -X POST http://localhost:3000/api/payments/update \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "utr": "690518190930",
    "amount": 100.00,
    "vendor_id": 1,
    "order_id": "ord_12345",
    "payment_status": "Succeeded"
  }'
```

**Response:**
```json
{
  "message": "Payment updated successfully",
  "payment": {
    "id": 1,
    "utr": "690518190930",
    "amount": 100.00,
    "status": "completed",
    "payment_status": "Succeeded",
    "created_at": "2024-01-15T10:25:00Z",
    "vendor": {
      "id": 1,
      "business_name": "Test Store",
      "contact_name": "John Doe",
      "upi_id": "teststore@paytm"
    }
  }
}
```

---

## 5. Testing with Postman

### Setup
1. Create a new Postman collection
2. Set base URL: `http://localhost:3000`
3. Create environment variables:
   - `base_url`: `http://localhost:3000`
   - `jwt_token`: (from login response)
   - `api_key`: (from API key creation)
   - `vendor_id`: (your vendor ID)

### Test Flow
1. **Register** → Get vendor ID
2. **Login** → Get JWT token
3. **Create API Key** → Get API key
4. **Test all endpoints** with proper authentication

---

## 6. Testing Scenarios

### Scenario 1: New Vendor Onboarding
```bash
# 1. Register
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"business_name": "New Store", "contact_name": "Jane Doe", "email": "jane@example.com", "phone": "+1234567890", "upi_id": "newstore@paytm", "password": "password123"}'

# 2. Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "jane@example.com", "password": "password123"}'

# 3. Get payment info (use token from step 2)
curl -X GET http://localhost:3000/api/vendor/payment-info \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Scenario 2: Website Integration
```bash
# 1. Get vendor details for website
curl "http://localhost:3000/api/vendor/payment-details?vendor_id=1"

# 2. Get HTML widget
curl "http://localhost:3000/api/public/payment-widget?vendor_id=1&format=html&theme=light&size=medium"
```

### Scenario 3: Bot Integration
```bash
# 1. Create API key
curl -X POST http://localhost:3000/api/admin/api-keys \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"key_name": "Payment Bot"}'

# 2. Update payment
curl -X POST http://localhost:3000/api/payments/update \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"utr": "690518190930", "amount": 100.00, "vendor_id": 1, "order_id": "ord_12345", "payment_status": "Succeeded"}'

# 3. Check payment status
curl -X POST http://localhost:3000/api/payments/check \
  -H "Content-Type: application/json" \
  -d '{"utr": "690518190930", "vendor_id": 1, "order_id": "ord_12345"}'
```

---

## 7. Error Testing

### Invalid Authentication
```bash
# Test with invalid token
curl -X GET http://localhost:3000/api/vendor/payment-info \
  -H "Authorization: Bearer invalid_token"
```

### Invalid Parameters
```bash
# Test with invalid vendor ID
curl "http://localhost:3000/api/vendor/payment-details?vendor_id=999"
```

### Missing Required Fields
```bash
# Test registration without required fields
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"business_name": "Test Store"}'
```

---

## 8. Rate Limiting Testing

### Test Rate Limits
```bash
# Make multiple requests quickly to test rate limiting
for i in {1..10}; do
  curl -X POST http://localhost:3000/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email": "test@example.com", "password": "wrongpassword"}'
done
```

---

## 9. CORS Testing

### Test CORS from Browser
```javascript
// Test from browser console
fetch('http://localhost:3000/api/vendor/payment-details?vendor_id=1')
  .then(response => response.json())
  .then(data => console.log(data));
```

---

## 10. Vendor-Specific Testing

### Each Vendor Has Different Endpoints
- **Vendor ID 1**: `?vendor_id=1`
- **Vendor ID 2**: `?vendor_id=2`
- **Vendor ID 3**: `?vendor_id=3`

### Example for Different Vendors
```bash
# Vendor 1
curl "http://localhost:3000/api/vendor/payment-details?vendor_id=1"

# Vendor 2
curl "http://localhost:3000/api/vendor/payment-details?vendor_id=2"

# Vendor 3
curl "http://localhost:3000/api/vendor/payment-details?vendor_id=3"
```

---

## 11. Response Validation

### Check Response Structure
```bash
# Validate JSON response
curl -s "http://localhost:3000/api/vendor/payment-details?vendor_id=1" | jq '.'

# Check specific fields
curl -s "http://localhost:3000/api/vendor/payment-details?vendor_id=1" | jq '.data.business_name'
```

---

## 12. Performance Testing

### Load Testing
```bash
# Test with multiple concurrent requests
for i in {1..50}; do
  curl -s "http://localhost:3000/api/vendor/payment-details?vendor_id=1" &
done
wait
```

---

## Common Issues and Solutions

### 1. CORS Errors
- **Issue**: Browser blocks requests
- **Solution**: Use proper CORS headers or test from server

### 2. Authentication Errors
- **Issue**: 401 Unauthorized
- **Solution**: Check token format and expiry

### 3. Validation Errors
- **Issue**: 400 Bad Request
- **Solution**: Check request body format and required fields

### 4. Rate Limiting
- **Issue**: 429 Too Many Requests
- **Solution**: Wait and retry with proper intervals

### 5. Order ID Issues
- **Issue**: "Payment not found for this vendor" when checking payment
- **Solution**: Ensure payment exists with matching UTR and vendor_id, and payment_status is 'Succeeded'
- **Issue**: "Order ID does not match for this UTR"
- **Solution**: Use the correct order_id that matches the payment record

### 6. Payment Check Issues
- **Issue**: "Payment not succeeded, cannot be checked"
- **Solution**: Only succeeded payments can be checked and have order_id added
- **Issue**: "UTR has already been checked"
- **Solution**: Each payment can only be checked once

---

## Testing Checklist

- [ ] Registration works
- [ ] Login returns valid JWT
- [ ] JWT authentication works
- [ ] API key creation works
- [ ] API key authentication works
- [ ] All public endpoints work
- [ ] All vendor endpoints work
- [ ] All bot endpoints work
- [ ] Error handling works
- [ ] Rate limiting works
- [ ] CORS works
- [ ] Different vendor IDs work
- [ ] Response formats are correct
- [ ] Order ID validation works
- [ ] Payment check only works for succeeded payments
- [ ] Order ID is only added once per payment
- [ ] Check payment requires order_id parameter
