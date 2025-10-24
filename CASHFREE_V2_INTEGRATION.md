# Cashfree V2 Complete Payout Integration

This document describes the new Cashfree V2 integration that provides a complete payout solution with automatic beneficiary creation and transfer initiation.

## Overview

The new integration uses [Cashfree V2 APIs](https://www.cashfree.com/docs/api-reference/payouts/v2/payouts-api-v2-new) to provide a streamlined payout experience that:

1. **Creates beneficiaries automatically** using the V2 Beneficiary API
2. **Initiates transfers immediately** using the V2 Transfers API
3. **Handles both bank transfers and UPI transfers**
4. **Provides comprehensive validation and error handling**
5. **Integrates with the existing database and event system**

## API Endpoint

### POST `/api/vendor/cashfree/v2/complete-payout`

Creates a payout with automatic beneficiary creation and transfer initiation using Cashfree V2 APIs.

#### Authentication
- Requires API key authentication via `Authorization: Bearer <api_key>` header
- Vendor must have Cashfree credentials configured in the admin dashboard

#### Request Body

```json
{
  "amount": 1000,
  "currency": "INR",
  "remarks": "Payment for services",
  "reference_id": "PAYOUT_123456789",
  "beneficiary_name": "John Doe",
  "beneficiary_id": "BENE_123456",
  "email": "john@example.com",
  "phone": "9876543210",
  "bank_account_number": "1234567890",
  "bank_ifsc": "HDFC0001234",
  "callback_url": "https://your-domain.com/webhook"
}
```

#### Required Fields
- `amount`: Payout amount (1-100000)
- `beneficiary_name`: Name of the beneficiary
- `bank_account_number`: Bank account number
- `bank_ifsc`: IFSC code

#### Optional Fields
- `currency`: Currency code (default: "INR")
- `remarks`: Additional remarks
- `reference_id`: Custom reference ID (auto-generated if not provided)
- `beneficiary_id`: Custom beneficiary ID (auto-generated if not provided)
- `email`: Beneficiary email
- `phone`: Beneficiary phone number
- `callback_url`: Webhook URL for status updates

#### Beneficiary ID Handling
- **You can pass any `beneficiary_id`** or leave it empty
- If not provided, it will be **auto-generated** using the format: `{vendor_id}-{bank_account_number}-{timestamp}`
- The beneficiary ID is **sanitized** to contain only alphanumeric characters and underscores (max 40 chars)
- **Each beneficiary ID must be unique** per vendor
- If you pass a custom ID, make sure it's unique for that vendor

#### Response

**Success (200)**
```json
{
  "success": true,
  "message": "Payout initiated successfully using Cashfree V2",
  "payout": {
    "id": 123,
    "reference_id": "PAYOUT_123456789",
    "amount": 1000,
    "currency": "INR",
    "status": "initiated",
    "beneficiary_name": "John Doe",
    "beneficiary_account": "1234567890",
    "cashfree_transfer_id": "CF_TRANSFER_123",
    "created_at": "2024-01-01T12:00:00Z"
  },
  "beneficiary": {
    "id": "BENE_123456",
    "name": "John Doe",
    "account": "1234567890"
  },
  "provider": {
    "beneficiary": { /* Cashfree beneficiary response */ },
    "transfer": { /* Cashfree transfer response */ }
  }
}
```

**Error (400/500)**
```json
{
  "error": "Error message",
  "details": "Additional error details",
  "provider": { /* Cashfree error response */ }
}
```

## Frontend Integration

### React Component

A complete React component is available at `components/CashfreeV2PayoutForm.tsx` that provides:

- **Form validation** with real-time error feedback
- **Bank transfer and UPI transfer** options
- **Address details** collection
- **Callback URL** configuration
- **Success/error handling** with toast notifications
- **Response display** with payout details

### Usage Example

```tsx
import CashfreeV2PayoutForm from '@/components/CashfreeV2PayoutForm';

function PayoutPage() {
  return (
    <div>
      <h1>Create Payout</h1>
      <CashfreeV2PayoutForm />
    </div>
  );
}
```

### Page Integration

A complete page is available at `app/cashfree-v2-payout/page.tsx` that includes:

- Authentication checks
- Layout integration
- Error handling
- Loading states

## Features

### 1. Automatic Beneficiary Creation
- Creates beneficiaries using Cashfree V2 Beneficiary API
- Supports both bank account and UPI beneficiaries
- Handles beneficiary ID generation and validation
- Stores beneficiary details for future use

### 2. Immediate Transfer Initiation
- Initiates transfers using Cashfree V2 Transfers API
- Supports both bank transfers and UPI transfers
- Handles transfer ID generation and validation
- Provides real-time status updates

### 3. Comprehensive Validation
- **Amount validation**: 1-100000 range
- **Beneficiary validation**: Name, account details, contact info
- **Bank validation**: Account number and IFSC format
- **UPI validation**: UPI ID format
- **Phone validation**: Indian mobile number format
- **Email validation**: Standard email format
- **Pincode validation**: Indian pincode format

### 4. Database Integration
- Creates payout records in the existing `payouts` table
- Stores raw request and response data
- Tracks Cashfree transfer IDs
- Maintains audit trail

### 5. Event System Integration
- Emits payout created events
- Sends Telegram admin alerts
- Supports WebSocket notifications
- Handles callback URLs

### 6. Error Handling
- Comprehensive error messages
- Provider-specific error details
- Graceful fallback handling
- Detailed logging

## Configuration

### Vendor Setup

Vendors must have Cashfree credentials configured in the admin dashboard:

1. **App ID**: Cashfree application ID
2. **Secret Key**: Cashfree secret key
3. **Payout Client ID**: Cashfree payout client ID
4. **Payout Client Secret**: Cashfree payout client secret
5. **Environment**: Sandbox or Production

### Admin Configuration

Admins can configure Cashfree credentials for vendors using the new "Vendors" tab in the admin dashboard:

1. Navigate to Admin Dashboard → Vendors
2. Click "Configure" or "Edit" for any vendor
3. Enter Cashfree credentials
4. Select environment (Sandbox/Production)
5. Save configuration

## Testing

### Test Page

A test page is available at `app/test-cashfree-v2/page.tsx` for testing the endpoint:

1. Replace `YOUR_API_KEY_HERE` with a valid API key
2. Ensure vendor has Cashfree credentials configured
3. Click "Test Complete Payout" button
4. Review response in the JSON display

### Test Data

```json
{
  "amount": 100,
  "currency": "INR",
  "beneficiary_name": "Test Beneficiary",
  "bank_account_number": "1234567890",
  "bank_ifsc": "HDFC0001234",
  "email": "test@example.com",
  "phone": "9876543210",
  "remarks": "Test payout via Cashfree V2",
  "reference_id": "TEST_123456789"
}
```

## Error Codes

| Code | Description | Solution |
|------|-------------|----------|
| 400 | Validation Error | Check request body format and required fields |
| 400 | Insufficient Balance | Ensure vendor has sufficient payout balance |
| 400 | Beneficiary Creation Failed | Check beneficiary details and Cashfree credentials |
| 400 | Transfer Initiation Failed | Check transfer details and Cashfree credentials |
| 401 | Authentication Required | Provide valid API key |
| 500 | Internal Server Error | Check server logs and Cashfree service status |

## Webhooks

The integration supports callback URLs for payout status updates:

### Callback Payload

```json
{
  "payout_id": 123,
  "reference_id": "PAYOUT_123456789",
  "cf_transfer_id": "CF_TRANSFER_123",
  "status": "initiated",
  "amount": 1000,
  "currency": "INR",
  "beneficiary_name": "John Doe",
  "beneficiary_account": "1234567890",
  "timestamp": "2024-01-01T12:00:00Z"
}
```

## Security

- **API Key Authentication**: All requests require valid API keys
- **Input Validation**: Comprehensive validation prevents malicious input
- **SQL Injection Protection**: Parameterized queries prevent SQL injection
- **XSS Protection**: Input sanitization prevents XSS attacks
- **Rate Limiting**: Built-in rate limiting prevents abuse

## Monitoring

- **Comprehensive Logging**: All operations are logged with detailed context
- **Error Tracking**: Errors are tracked with stack traces and context
- **Performance Monitoring**: Response times and success rates are monitored
- **Admin Alerts**: Telegram alerts notify admins of important events

## Future Enhancements

- **Batch Payouts**: Support for multiple payouts in a single request
- **Scheduled Payouts**: Support for scheduled payout execution
- **Payout Templates**: Reusable payout templates for common scenarios
- **Advanced Analytics**: Detailed payout analytics and reporting
- **Webhook Retry**: Automatic webhook retry with exponential backoff
