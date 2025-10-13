# Vendor API (Pay-in and Payout)

This document describes vendor-facing APIs only. All statuses are normalized to: `pending`, `success`, `failed`.

- Auth: Send your key in `Authorization: Bearer <PK|API_KEY|JWT>`.
- Base URL: `${NEXT_PUBLIC_BASE_URL}` from your environment.

## Pay-in

### Create Order
- Method: `POST`
- Path: `/api/v1/orders`
- Headers: `Authorization: Bearer <token>`
- Body:
```json
{
  "merchantOrderId": "ORD-12345",
  "amount": 499.50,
  "currency": "INR",
  "customerName": "Jane Doe",
  "returnUrl": "https://merchant.example.com/return",
  "callbackUrl": "https://merchant.example.com/callback",
  "vendorCode": "AB1234" // optional if token identifies vendor
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
  "vendorCode": "AB1234"
}
```

### List Orders (vendor)
- Method: `GET`
- Path: `/api/vendor/orders`
- Headers: `Authorization: Bearer <token>`
- Query: `page` (default 1), `limit` (default 10)
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
- Headers: `Authorization: Bearer <token>`
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
  "remarks": "Vendor settlement"
}
```
- Success Response 200:
```json
{
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
  }
}
```

### List Payouts (vendor)
- Method: `GET`
- Path: `/api/vendor/payouts`
- Headers: `Authorization: Bearer <token>`
- Query: `page`, `limit`
- Response 200:
```json
{
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
  "statusCounts": { "Success": 0, "Pending": 1, "Failed": 0 }
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

## Notes
- Status normalization:
  - Pay-in status maps internally to many values but exposed as `pending`, `success`, or `failed` only.
  - Payout status maps internally to many values but exposed as `pending`, `success`, or `failed` only.
- Rate limits may apply.
