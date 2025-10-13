# Vendor API (Pay-in and Payout)

This document describes vendor-facing APIs only. All statuses are normalized to: `pending`, `success`, `failed`.

## 🔐 **NEW SECURITY REQUIREMENTS**

**All vendor endpoints now require:**
- **API Key**: `Authorization: Bearer pk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx` (32 characters after "pk_")
- **Vendor Code**: Must be provided in request body or query parameters
- **Format**: Vendor code must be 2 uppercase letters + 4 digits (e.g., `AB1234`)

- Base URL: `${NEXT_PUBLIC_BASE_URL}` from your environment.

## Pay-in

### Create Order
- Method: `POST`
- Path: `/api/v1/orders`
- Headers: `Authorization: Bearer pk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`
- Body:
```json
{
  "merchantOrderId": "ORD-12345",
  "amount": 499.50,
  "currency": "INR",
  "customerName": "Jane Doe",
  "returnUrl": "https://merchant.example.com/return",
  "callbackUrl": "https://merchant.example.com/callback",
  "vendorCode": "AB1234"
}
```
- Success Response 200:
```json
{
  "status": "success",
  "merchantOrderId": "ORD-12345",
  "ztakeOrderId": "ZTKXXXXXXYYYYYY",
  "paymentUrl": "https://<base>/orders/ZTKXXXXXXYYYYYY",
  "vendorId": 123,
  "vendorCode": "AB1234",
  "authMethod": "api_key_vendor_code"
}
```

### List Orders (vendor)
- Method: `GET`
- Path: `/api/vendor/orders?vendorCode=AB1234`
- Headers: `Authorization: Bearer pk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`
- Query: `vendorCode` (required), `page` (default 1), `limit` (default 10)
- Response 200:
```json
{
  "orders": [
    {
      "ztake_order_id": "ZTK...",
      "merchant_order_id": "ORD-12345",
      "amount": 499.5,
      "currency": "INR",
      "customer_name": "Jane Doe",
      "status": "pending|success|failed",
      "utr": "1234567890",
      "created_at": "2025-01-01T00:00:00.000Z"
    }
  ],
  "pagination": { "page": 1, "limit": 10, "total": 1, "totalPages": 1 },
  "statusCounts": { "Success": 0, "Pending": 1, "Failed": 0 }
}
```

### Vendor Webhooks (configure)
- Method: `GET|PUT`
- Path: `/api/vendor/webhooks`
- Headers: `Authorization: Bearer <token>`
- GET Response 200:
```json
{ "payin_url": "https://...", "payout_url": "https://..." }
```
- PUT Body:
```json
{ "payin_url": "https://merchant.example.com/payin", "payout_url": "https://merchant.example.com/payout" }
```

### Pay-in Webhook Event (from Ztake to vendor)
- Event: `order_status_changed`
- Body example:
```json
{
  "type": "order_status_changed",
  "orderId": "ZTKXXXXXXYYYYYY",
  "merchantOrderId": "ORD-12345",
  "amount": 499.5,
  "currency": "INR",
  "status": "pending|success|failed",
  "utr": "1234567890",
  "timestamp": "2025-01-01T00:00:00.000Z"
}
```

## Payout

### Create Payout
- Method: `POST`
- Path: `/api/vendor/payouts`
- Headers: `Authorization: Bearer pk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`
- Body (one of bank or UPI required):
```json
{
  "amount": 1500.00,
  "currency": "INR",
  "beneficiary_name": "John Doe",
  "beneficiary_account": "123456789012",
  "beneficiary_ifsc": "HDFC0001234",
  "beneficiary_upi": "john@upi",
  "reference_id": "PAYOUT-001",
  "remarks": "Vendor settlement",
  "vendorCode": "AB1234"
}
```
- Success Response 200:
```json
{
  "success": true,
  "message": "Payout request created",
  "payout": {
    "id": 101,
    "amount": 1500,
    "currency": "INR",
    "beneficiary_name": "John Doe",
    "beneficiary_account": "123456789012",
    "beneficiary_ifsc": "HDFC0001234",
    "beneficiary_upi": "john@upi",
    "reference_id": "PAYOUT-001",
    "remarks": "Vendor settlement",
    "status": "pending",
    "created_at": "2025-01-01T00:00:00.000Z"
  },
  "authMethod": "api_key_vendor_code"
}
```

### List Payouts (vendor)
- Method: `GET`
- Path: `/api/vendor/payouts?vendorCode=AB1234`
- Headers: `Authorization: Bearer pk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`
- Query: `vendorCode` (required), `page`, `limit`
- Response 200:
```json
{
  "success": true,
  "payouts": [
    {
      "id": 101,
      "amount": 1500,
      "currency": "INR",
      "beneficiary_name": "John Doe",
      "beneficiary_account": "123456789012",
      "beneficiary_ifsc": "HDFC0001234",
      "beneficiary_upi": "john@upi",
      "reference_id": "PAYOUT-001",
      "remarks": "Vendor settlement",
      "status": "pending|success|failed",
      "provider_payout_id": "CF-XYZ",
      "admin_notes": null,
      "created_at": "2025-01-01T00:00:00.000Z",
      "updated_at": "2025-01-01T00:05:00.000Z"
    }
  ],
  "pagination": { "page": 1, "limit": 10, "total": 1, "totalPages": 1 },
  "statusCounts": { "Success": 0, "Pending": 1, "Failed": 0 },
  "vendorCode": "AB1234"
}
```

### Payout Webhook Event (from Ztake to vendor)
- Event: `payout_status_changed`
- Body example:
```json
{
  "type": "payout_status_changed",
  "payoutId": 101,
  "referenceId": "PAYOUT-001",
  "amount": 1500,
  "currency": "INR",
  "status": "pending|success|failed",
  "timestamp": "2025-01-01T00:05:00.000Z"
}
```

## Additional Endpoints

### Get Order Details
- Method: `GET`
- Path: `/api/v1/orders/ZTK2802033T89HJ?vendorCode=AB1234`
- Headers: `Authorization: Bearer pk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`
- Query: `vendorCode` (required)
- Response 200:
```json
{
  "success": true,
  "order": {
    "ztake_order_id": "ZTK2802033T89HJ",
    "merchant_order_id": "ORD-12345",
    "amount": 499.5,
    "currency": "INR",
    "customer_name": "Jane Doe",
    "return_url": "https://merchant.example.com/return",
    "callback_url": "https://merchant.example.com/callback",
    "status": "pending|success|failed",
    "utr": "1234567890",
    "payment_time": "2025-01-01T12:00:00.000Z",
    "vendor_id": 123,
    "created_at": "2025-01-01T00:00:00.000Z"
  }
}
```

### Submit UTR for Order
- Method: `POST`
- Path: `/api/v1/orders/ZTK2802033T89HJ/submit-utr`
- Headers: `Authorization: Bearer pk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`
- Body:
```json
{
  "utr": "690518190930"
}
```
- Response 200:
```json
{
  "success": true,
  "message": "UTR submitted successfully",
  "order_id": "ZTK2802033T89HJ",
  "utr": "690518190930"
}
```

### Check Payment Status
- Method: `POST`
- Path: `/api/payments/check`
- Headers: `Authorization: Bearer pk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`
- Body:
```json
{
  "utr": "690518190930",
  "vendor_code": "AB1234",
  "order_id": "ZTK2802033T89HJ"
}
```
- Response 200:
```json
{
  "success": true,
  "payment": {
    "id": 123,
    "order_id": "ZTK2802033T89HJ",
    "utr": "690518190930",
    "amount": 1000,
    "status": "completed",
    "payment_status": "Succeeded",
    "checked_status": true,
    "checked_at": "2025-01-01T12:00:00.000Z",
    "vendor": {
      "id": 456,
      "business_name": "Example Business",
      "contact_name": "John Doe",
      "upi_id": "business@upi"
    }
  },
  "message": "UTR checked successfully"
}
```

### Get Payment Details
- Method: `GET`
- Path: `/api/vendor/payment-details?vendor_code=AB1234`
- Headers: `Authorization: Bearer pk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`
- Query: `vendor_code` (required)
- Response 200:
```json
{
  "success": true,
  "data": {
    "vendor_id": 123,
    "vendor_code": "AB1234",
    "business_name": "Example Business",
    "upi_id": "business@upi",
    "bank_name": "State Bank of India",
    "bank_account_number": "1234567890",
    "bank_account_holder": "Example Business",
    "bank_ifsc": "SBIN0123456",
    "qr_code": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...",
    "created_at": "2025-01-01T00:00:00.000Z"
  }
}
```

## Error Handling

### Authentication Errors
- `401 Unauthorized`: Invalid or missing API key
- `403 Forbidden`: API key and vendor code mismatch
- `400 Bad Request`: Missing vendor code or invalid format

### Example Error Responses

**Invalid API Key:**
```json
{
  "error": "Invalid API key. The provided API key does not exist.",
  "details": "Please check your API key and try again"
}
```

**API Key/Vendor Mismatch:**
```json
{
  "error": "API key and vendor code mismatch.",
  "details": "The provided API key does not belong to the specified vendor"
}
```

**Missing Vendor Code:**
```json
{
  "error": "Vendor code is required as a query parameter.",
  "details": "Please provide vendorCode in the query string"
}
```

## Notes
- **Security**: All vendor endpoints now require API key + vendor code authentication
- **Status normalization**:
  - Pay-in status maps internally to many values but exposed as `pending`, `success`, or `failed` only.
  - Payout status maps internally to many values but exposed as `pending`, `success`, or `failed` only.
- **Rate limits**: May apply to prevent abuse
- **API Key Format**: Must start with `pk_` followed by 32 alphanumeric characters
- **Vendor Code Format**: Must be 2 uppercase letters + 4 digits (e.g., `AB1234`)
- **Cross-vendor Protection**: Vendors can only access their own data
