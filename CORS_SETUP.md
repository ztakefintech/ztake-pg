# CORS Setup for ztake Payments API

## Overview

This document explains the CORS (Cross-Origin Resource Sharing) configuration for the ztake Payments API to allow external applications to access the API endpoints.

## Problem Solved

The error you encountered:
```
Access to fetch at 'https://ztake.vercel.app/api/payments/check' from origin 'https://zundo-one.vercel.app' has been blocked by CORS policy: Response to preflight request doesn't pass access control check: No 'Access-Control-Allow-Origin' header is present on the requested resource.
```

## Solution Implemented

### 1. Global CORS Middleware (`middleware.ts`)

- Automatically adds CORS headers to all API routes (`/api/*`)
- Handles preflight OPTIONS requests
- Allows all origins (`*`) for maximum compatibility

### 2. CORS Utility (`lib/cors.ts`)

- Reusable CORS configuration functions
- Different presets for different use cases:
  - `publicCors`: For public endpoints
  - `apiCors`: For general API endpoints
  - `secureCors`: For restricted origins only

### 3. Updated API Routes

All payment-related API routes now include proper CORS headers:

- `/api/payments/check` - Check payment status
- `/api/payments/status` - Update payment status
- `/api/payments/update` - Create/update payments
- `/api/public/payment-widget` - Public payment widget
- `/api/vendor/payment-details` - Vendor payment details

## CORS Headers Applied

```http
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With
Access-Control-Max-Age: 86400
```

## Testing CORS

### 1. Test from Browser Console

```javascript
// Test the payments/check endpoint
fetch('https://ztake.vercel.app/api/payments/check', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    utr: 'your-utr-here'
  })
})
.then(response => response.json())
.then(data => console.log(data))
.catch(error => console.error('Error:', error));
```

### 2. Test with cURL

```bash
# Test preflight request
curl -X OPTIONS https://ztake.vercel.app/api/payments/check \
  -H "Origin: https://zundo-one.vercel.app" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type" \
  -v

# Test actual request
curl -X POST https://ztake.vercel.app/api/payments/check \
  -H "Content-Type: application/json" \
  -H "Origin: https://zundo-one.vercel.app" \
  -d '{"utr": "your-utr-here"}' \
  -v
```

## Security Considerations

### Current Setup (Open)
- Allows all origins (`*`)
- Suitable for public APIs
- Maximum compatibility

### For Production (Recommended)
If you need more security, update the middleware to restrict origins:

```typescript
// In middleware.ts
response.headers.set('Access-Control-Allow-Origin', 'https://zundo-one.vercel.app');
```

Or use the `secureCors` utility for specific routes:

```typescript
export const POST = secureCors(handler);
```

## Supported Origins

The current setup allows requests from:
- `https://zundo-one.vercel.app` (your external app)
- `https://ztake.vercel.app` (your API domain)
- `http://localhost:3000` (local development)
- Any other origin (due to `*` wildcard)

## Troubleshooting

### Common Issues

1. **Still getting CORS errors?**
   - Clear browser cache
   - Check if the API is deployed with the latest changes
   - Verify the request is going to the correct endpoint

2. **Preflight requests failing?**
   - Ensure OPTIONS method is handled
   - Check that all required headers are included

3. **Credentials not working?**
   - Set `Access-Control-Allow-Credentials: true` in headers
   - Use specific origins instead of `*`

### Debug Steps

1. Check browser Network tab for the actual request
2. Look for OPTIONS request (preflight)
3. Verify response headers include CORS headers
4. Test with different tools (Postman, cURL, etc.)

## API Endpoints with CORS

| Endpoint | Method | CORS | Description |
|----------|--------|------|-------------|
| `/api/payments/check` | POST | ✅ | Check payment status by UTR |
| `/api/payments/status` | POST | ✅ | Update payment status |
| `/api/payments/update` | POST | ✅ | Create/update payment |
| `/api/public/payment-widget` | GET | ✅ | Get payment widget |
| `/api/vendor/payment-details` | GET | ✅ | Get vendor payment details |

## Next Steps

1. Deploy the updated API to Vercel
2. Test from your external application
3. Monitor for any CORS-related issues
4. Consider implementing origin restrictions for production

The CORS setup is now complete and should resolve the access issues from external applications!

