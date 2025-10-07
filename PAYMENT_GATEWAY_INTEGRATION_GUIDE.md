# Payment Gateway Integration Guide

This comprehensive guide explains how to integrate the ztake payment gateway system for UPI payment verification, management, and widget embedding on external websites.

## Overview

The ztake payment gateway provides multiple integration methods for seamless UPI payment processing:

### Core Features
- **Popup Integration**: Verify UTR payments without leaving your website
- **API Integration**: Direct API calls for payment management
- **Widget Integration**: Embeddable payment widgets with QR codes
- **Real-time Verification**: Automatic polling and status updates
- **Multi-vendor Support**: Support for multiple vendors with API key authentication
- **Cross-domain Support**: Secure cross-origin communication

### Integration Methods
1. **Popup Method**: User-friendly popup for payment verification
2. **Direct API**: RESTful API for programmatic payment management
3. **Widget Embedding**: QR code widgets for payment collection
4. **Webhook Support**: Real-time payment status notifications

## Base URLs

### Gateway Domain
```
https://your-gateway-domain.com
```

### API Endpoints
```
https://your-gateway-domain.com/api
```

### Public Endpoints
```
https://your-gateway-domain.com/public
```

## API Endpoints Reference

### Public Endpoints (No Authentication Required)

#### 1. Payment Verification Popup
**Endpoint**: `GET /public/redirect`  
**Description**: Opens payment verification popup for UTR checking

**Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `method` | string | Yes | Must be `postmessage` for popup integration |
| `origin` | string | Yes | Your website's origin for security |
| `utr` | string | No | Pre-filled UTR (if not provided, user enters it) |
| `amount` | number | No | Payment amount (displayed to user) |
| `vendor_id` | number | No | Vendor ID (defaults to 1) |
| `poll_ms` | number | No | Polling interval in milliseconds (min: 1000, default: 3000) |
| `timeout_ms` | number | No | Timeout in milliseconds (min: 10000, default: 180000) |

#### 2. Payment Widget
**Endpoint**: `GET /public/payment-widget`  
**Description**: Get payment widget data with QR code

**Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `vendor_id` | number | Yes | Vendor ID |
| `format` | string | No | Response format: `json`, `html`, `widget` (default: `json`) |
| `theme` | string | No | Widget theme: `light`, `dark`, `auto` (default: `light`) |
| `size` | string | No | Widget size: `small`, `medium`, `large` (default: `medium`) |

#### 3. Payment Check (Public)
**Endpoint**: `POST /api/payments/check`  
**Description**: Check payment status by UTR

**Request Body**:
```json
{
  "utr": "1234567890",
  "vendor_id": 1
}
```

### Authenticated Endpoints (API Key Required)

#### 4. Create Payment
**Endpoint**: `POST /api/payments/update`  
**Description**: Create a new payment record

**Headers**: `Authorization: Bearer YOUR_API_KEY`

**Request Body**:
```json
{
  "utr": "1234567890",
  "amount": 100.50,
  "vendor_id": 1,
  "payment_status": "Succeeded"
}
```

#### 5. Update Payment Status
**Endpoint**: `POST /api/payments/status`  
**Description**: Update payment status

**Headers**: `Authorization: Bearer YOUR_API_KEY`

**Request Body**:
```json
{
  "utr": "1234567890",
  "payment_status": "Succeeded"
}
```

#### 6. Get Vendor Payments
**Endpoint**: `GET /api/vendor/payments`  
**Description**: Get payments for authenticated vendor

**Headers**: `Authorization: Bearer YOUR_API_KEY`

**Query Parameters**:
| Parameter | Type | Description |
|-----------|------|-------------|
| `page` | number | Page number (default: 1) |
| `limit` | number | Items per page (default: 10) |

#### 7. Get Payment Info
**Endpoint**: `GET /api/vendor/payment-info`  
**Description**: Get vendor payment information including QR code

**Headers**: `Authorization: Bearer YOUR_API_KEY`

#### 8. Get Payment Details
**Endpoint**: `GET /api/vendor/payment-details?vendor_id=1`  
**Description**: Get detailed payment information for a vendor

**Query Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `vendor_id` | number | Yes | Vendor ID |

### Admin Endpoints (Admin Authentication Required)

#### 9. Get All Payments
**Endpoint**: `GET /api/admin/payments`  
**Description**: Get all payments with filtering and pagination

**Query Parameters**:
| Parameter | Type | Description |
|-----------|------|-------------|
| `page` | number | Page number (default: 1) |
| `limit` | number | Items per page (default: 50) |
| `status` | string | Filter by payment status |
| `vendor_id` | number | Filter by vendor ID |

## Authentication

### API Key Authentication
Most endpoints require API key authentication. Include the API key in the Authorization header:

```http
Authorization: Bearer YOUR_API_KEY
```

### Getting API Keys
1. Register as a vendor on the platform
2. Log in to your vendor dashboard
3. Navigate to API Keys section
4. Generate a new API key
5. Store the key securely (it won't be shown again)

### Rate Limiting
- **Public endpoints**: 100 requests per minute per IP
- **Authenticated endpoints**: 1000 requests per minute per API key
- **Payment updates**: 10 requests per minute per API key

## Response Formats

### Success Response
```json
{
  "success": true,
  "data": { ... },
  "message": "Operation completed successfully"
}
```

### Error Response
```json
{
  "success": false,
  "error": "Error message",
  "details": "Additional error details"
}
```

### Payment Response
```json
{
  "success": true,
  "payment": {
    "id": 123,
    "utr": "1234567890",
    "amount": 100.50,
    "status": "completed",
    "payment_status": "Succeeded",
    "checked_status": true,
    "checked_at": "2024-01-15T10:30:00Z",
    "created_at": "2024-01-15T10:25:00Z",
    "updated_at": "2024-01-15T10:30:00Z",
    "vendor": {
      "id": 1,
      "business_name": "Example Store",
      "contact_name": "John Doe",
      "upi_id": "store@paytm"
    }
  },
  "message": "UTR checked successfully"
}
```

## Basic Integration

### Step 1: Open Payment Popup

```javascript
function openPaymentPopup(utr = null, amount = null) {
  const gatewayUrl = 'https://your-gateway-domain.com/public/redirect';
  const params = new URLSearchParams({
    method: 'postmessage',
    origin: window.location.origin
  });
  
  // Add optional parameters
  if (utr) params.set('utr', utr);
  if (amount) params.set('amount', amount);
  
  const popupUrl = `${gatewayUrl}?${params.toString()}`;
  
  // Open popup window
  const popup = window.open(
    popupUrl,
    'payment-verification',
    'width=520,height=720,scrollbars=yes,resizable=yes,left=' + 
    (screen.width/2 - 260) + ',top=' + (screen.height/2 - 360)
  );
  
  return popup;
}
```

### Step 2: Listen for Results

```javascript
function setupPaymentListener() {
  window.addEventListener('message', (event) => {
    // Verify origin for security
    if (event.origin !== 'https://your-gateway-domain.com') return;
    
    if (event.data.type === 'payment_result') {
      const { success, utr, status, amount, message } = event.data.payload;
      
      if (success) {
        handlePaymentSuccess({ utr, amount, status });
      } else {
        handlePaymentError({ utr, status, message });
      }
    }
  });
}

function handlePaymentSuccess(payment) {
  console.log('Payment successful:', payment);
  // Update UI, redirect to success page, etc.
  showSuccessMessage(`Payment of ₹${payment.amount} verified successfully!`);
}

function handlePaymentError(payment) {
  console.log('Payment failed:', payment);
  
  if (payment.message && payment.message.includes('Payment not found')) {
    showErrorMessage('Payment not found, please try after sometime');
  } else {
    showErrorMessage(`Payment verification failed: ${payment.message}`);
  }
}
```

### Step 3: Complete Integration

```html
<!DOCTYPE html>
<html>
<head>
  <title>Payment Verification</title>
  <style>
    .payment-section {
      max-width: 400px;
      margin: 50px auto;
      padding: 20px;
      border: 1px solid #ddd;
      border-radius: 8px;
    }
    .btn {
      background: #007bff;
      color: white;
      padding: 10px 20px;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      margin: 5px;
    }
    .btn:hover { background: #0056b3; }
    .message {
      padding: 10px;
      margin: 10px 0;
      border-radius: 4px;
    }
    .success { background: #d4edda; color: #155724; }
    .error { background: #f8d7da; color: #721c24; }
    .warning { background: #fff3cd; color: #856404; }
  </style>
</head>
<body>
  <div class="payment-section">
    <h2>Payment Verification</h2>
    
    <div>
      <label>UTR (optional):</label>
      <input type="text" id="utr-input" placeholder="Enter UTR number">
    </div>
    
    <div>
      <label>Amount (optional):</label>
      <input type="number" id="amount-input" placeholder="Enter amount">
    </div>
    
    <button class="btn" onclick="verifyPayment()">Verify Payment</button>
    
    <div id="message-container"></div>
  </div>

  <script>
    // Setup payment listener
    setupPaymentListener();
    
    function verifyPayment() {
      const utr = document.getElementById('utr-input').value.trim();
      const amount = document.getElementById('amount-input').value.trim();
      
      // Clear previous messages
      clearMessages();
      
      // Open popup
      const popup = openPaymentPopup(utr || null, amount || null);
      
      if (!popup) {
        showErrorMessage('Popup blocked. Please allow popups for this site.');
        return;
      }
      
      // Check if popup was closed manually
      const checkClosed = setInterval(() => {
        if (popup.closed) {
          clearInterval(checkClosed);
          showWarningMessage('Payment verification cancelled.');
        }
      }, 1000);
    }
    
    function openPaymentPopup(utr = null, amount = null) {
      const gatewayUrl = 'https://your-gateway-domain.com/public/redirect';
      const params = new URLSearchParams({
        method: 'postmessage',
        origin: window.location.origin
      });
      
      if (utr) params.set('utr', utr);
      if (amount) params.set('amount', amount);
      
      const popupUrl = `${gatewayUrl}?${params.toString()}`;
      
      return window.open(
        popupUrl,
        'payment-verification',
        'width=520,height=720,scrollbars=yes,resizable=yes,left=' + 
        (screen.width/2 - 260) + ',top=' + (screen.height/2 - 360)
      );
    }
    
    function setupPaymentListener() {
      window.addEventListener('message', (event) => {
        if (event.origin !== 'https://your-gateway-domain.com') return;
        
        if (event.data.type === 'payment_result') {
          const { success, utr, status, amount, message } = event.data.payload;
          
          if (success) {
            showSuccessMessage(`Payment of ₹${amount || 'unknown amount'} verified successfully! UTR: ${utr}`);
          } else {
            if (message && message.includes('Payment not found')) {
              showWarningMessage('Payment not found, please try after sometime');
            } else {
              showErrorMessage(`Payment verification failed: ${message || status}`);
            }
          }
        }
      });
    }
    
    function showSuccessMessage(text) {
      showMessage(text, 'success');
    }
    
    function showErrorMessage(text) {
      showMessage(text, 'error');
    }
    
    function showWarningMessage(text) {
      showMessage(text, 'warning');
    }
    
    function showMessage(text, type) {
      const container = document.getElementById('message-container');
      container.innerHTML = `<div class="message ${type}">${text}</div>`;
    }
    
    function clearMessages() {
      document.getElementById('message-container').innerHTML = '';
    }
  </script>
</body>
</html>
```

## Widget Integration

### Payment Widget Embedding

The payment widget allows you to embed QR codes and payment information directly into your website.

#### 1. JSON Widget Data
```javascript
// Fetch widget data
async function getPaymentWidget(vendorId) {
  const response = await fetch(
    `https://your-gateway-domain.com/api/public/payment-widget?vendor_id=${vendorId}&format=json`
  );
  return await response.json();
}

// Usage
const widgetData = await getPaymentWidget(1);
console.log(widgetData.data.qr_code); // Base64 QR code
console.log(widgetData.data.upi_id); // UPI ID
```

#### 2. HTML Widget
```html
<!-- Embed HTML widget directly -->
<iframe 
  src="https://your-gateway-domain.com/api/public/payment-widget?vendor_id=1&format=html&theme=light&size=medium"
  width="400" 
  height="500"
  frameborder="0">
</iframe>
```

#### 3. JavaScript Widget
```html
<!-- Include widget script -->
<script src="https://your-gateway-domain.com/api/public/payment-widget?vendor_id=1&format=widget&theme=light&size=medium"></script>

<!-- Widget container -->
<div id="payment-widget-container"></div>

<script>
// Widget is automatically injected into the container
// Or use manually:
const widget = PaymentWidget.create();
document.body.appendChild(widget);
</script>
```

#### 4. Custom Widget Implementation
```javascript
async function createCustomWidget(vendorId, containerId) {
  const response = await fetch(
    `https://your-gateway-domain.com/api/public/payment-widget?vendor_id=${vendorId}&format=json`
  );
  const data = await response.json();
  
  if (data.success) {
    const container = document.getElementById(containerId);
    container.innerHTML = `
      <div class="payment-widget">
        <h3>${data.data.business_name}</h3>
        ${data.data.qr_code ? `
          <img src="data:image/png;base64,${data.data.qr_code}" 
               alt="UPI QR Code" 
               class="qr-code">
        ` : ''}
        ${data.data.upi_id ? `
          <p>UPI ID: <strong>${data.data.upi_id}</strong></p>
        ` : ''}
      </div>
    `;
  }
}
```

### Widget Themes and Sizes

#### Themes
- **light**: White background with dark text
- **dark**: Dark background with light text  
- **auto**: Automatically adapts to system theme

#### Sizes
- **small**: 192x192px QR code
- **medium**: 256x256px QR code (default)
- **large**: 320x320px QR code

## API Integration Examples

### Example 1: Direct API Integration

```javascript
class PaymentGateway {
  constructor(apiKey, baseUrl = 'https://your-gateway-domain.com') {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
  }

  async createPayment(utr, amount, vendorId, paymentStatus = 'Succeeded') {
    const response = await fetch(`${this.baseUrl}/api/payments/update`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: JSON.stringify({
        utr,
        amount,
        vendor_id: vendorId,
        payment_status: paymentStatus
      })
    });
    return await response.json();
  }

  async checkPayment(utr, vendorId) {
    const response = await fetch(`${this.baseUrl}/api/payments/check`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        utr,
        vendor_id: vendorId
      })
    });
    return await response.json();
  }

  async updatePaymentStatus(utr, status) {
    const response = await fetch(`${this.baseUrl}/api/payments/status`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: JSON.stringify({
        utr,
        payment_status: status
      })
    });
    return await response.json();
  }

  async getVendorPayments(page = 1, limit = 10) {
    const response = await fetch(
      `${this.baseUrl}/api/vendor/payments?page=${page}&limit=${limit}`,
      {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        }
      }
    );
    return await response.json();
  }
}

// Usage
const gateway = new PaymentGateway('your-api-key');

// Create a payment
const payment = await gateway.createPayment('1234567890', 100.50, 1);
console.log('Payment created:', payment);

// Check payment status
const status = await gateway.checkPayment('1234567890', 1);
console.log('Payment status:', status);
```

### Example 2: Node.js Server Integration

```javascript
const express = require('express');
const fetch = require('node-fetch');

const app = express();
app.use(express.json());

const GATEWAY_URL = 'https://your-gateway-domain.com';
const API_KEY = 'your-api-key';

// Webhook endpoint to receive payment notifications
app.post('/webhook/payment', async (req, res) => {
  try {
    const { utr, amount, vendor_id } = req.body;
    
    // Verify payment with gateway
    const response = await fetch(`${GATEWAY_URL}/api/payments/check`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        utr,
        vendor_id
      })
    });
    
    const result = await response.json();
    
    if (result.success && result.payment.payment_status === 'Succeeded') {
      // Process successful payment
      console.log('Payment successful:', result.payment);
      // Update your database, send confirmation email, etc.
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

// Create payment endpoint
app.post('/api/create-payment', async (req, res) => {
  try {
    const { utr, amount, vendor_id } = req.body;
    
    const response = await fetch(`${GATEWAY_URL}/api/payments/update`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`
      },
      body: JSON.stringify({
        utr,
        amount,
        vendor_id,
        payment_status: 'Succeeded'
      })
    });
    
    const result = await response.json();
    res.json(result);
  } catch (error) {
    console.error('Create payment error:', error);
    res.status(500).json({ error: 'Failed to create payment' });
  }
});

app.listen(3000, () => {
  console.log('Server running on port 3000');
});
```

## Advanced Integration Examples

### Example 1: E-commerce Checkout with Popup

```html
<!DOCTYPE html>
<html>
<head>
  <title>Checkout - Payment Verification</title>
  <style>
    .checkout-container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .order-summary { background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; }
    .payment-section { border: 2px solid #e9ecef; padding: 20px; border-radius: 8px; }
    .btn { background: #28a745; color: white; padding: 12px 24px; border: none; border-radius: 4px; cursor: pointer; }
    .btn:hover { background: #218838; }
    .btn:disabled { background: #6c757d; cursor: not-allowed; }
  </style>
</head>
<body>
  <div class="checkout-container">
    <h1>Complete Your Order</h1>
    
    <div class="order-summary">
      <h3>Order Summary</h3>
      <p>Item: Premium Subscription</p>
      <p>Amount: ₹999.00</p>
    </div>
    
    <div class="payment-section">
      <h3>Payment Verification</h3>
      <p>Please make payment using UPI and enter the UTR below:</p>
      
      <div style="margin: 15px 0;">
        <label>UTR Number:</label>
        <input type="text" id="utr-input" placeholder="Enter UTR from your UPI app" style="width: 100%; padding: 8px; margin: 5px 0;">
      </div>
      
      <button class="btn" id="verify-btn" onclick="verifyPayment()">Verify Payment</button>
      <div id="status-message"></div>
    </div>
  </div>

  <script>
    let currentPopup = null;
    
    // Setup payment listener
    window.addEventListener('message', (event) => {
      if (event.origin !== 'https://your-gateway-domain.com') return;
      
      if (event.data.type === 'payment_result') {
        const { success, utr, status, amount, message } = event.data.payload;
        
        if (success) {
          showStatus('Payment verified successfully! Redirecting...', 'success');
          // Redirect to success page
          setTimeout(() => {
            window.location.href = '/checkout/success?utr=' + utr;
          }, 2000);
        } else {
          if (message && message.includes('Payment not found')) {
            showStatus('Payment not found. Please check UTR and try again.', 'error');
          } else {
            showStatus('Payment verification failed: ' + (message || status), 'error');
          }
          enableVerifyButton();
        }
      }
    });
    
    function verifyPayment() {
      const utr = document.getElementById('utr-input').value.trim();
      
      if (!utr) {
        showStatus('Please enter UTR number', 'error');
        return;
      }
      
      if (!/^\d{10,20}$/.test(utr)) {
        showStatus('UTR must be 10-20 digits', 'error');
        return;
      }
      
      disableVerifyButton();
      showStatus('Opening payment verification...', 'info');
      
      // Open popup
      currentPopup = window.open(
        `https://your-gateway-domain.com/public/redirect?method=postmessage&origin=${encodeURIComponent(window.location.origin)}&utr=${utr}&amount=999.00`,
        'payment-verification',
        'width=520,height=720,scrollbars=yes,resizable=yes,left=' + (screen.width/2 - 260) + ',top=' + (screen.height/2 - 360)
      );
      
      if (!currentPopup) {
        showStatus('Popup blocked. Please allow popups and try again.', 'error');
        enableVerifyButton();
        return;
      }
      
      // Check if popup was closed manually
      const checkClosed = setInterval(() => {
        if (currentPopup.closed) {
          clearInterval(checkClosed);
          showStatus('Payment verification cancelled.', 'warning');
          enableVerifyButton();
        }
      }, 1000);
    }
    
    function showStatus(message, type) {
      const statusDiv = document.getElementById('status-message');
      statusDiv.innerHTML = `<div style="padding: 10px; margin: 10px 0; border-radius: 4px; background: ${
        type === 'success' ? '#d4edda' : 
        type === 'error' ? '#f8d7da' : 
        type === 'warning' ? '#fff3cd' : '#d1ecf1'
      }; color: ${
        type === 'success' ? '#155724' : 
        type === 'error' ? '#721c24' : 
        type === 'warning' ? '#856404' : '#0c5460'
      };">${message}</div>`;
    }
    
    function disableVerifyButton() {
      const btn = document.getElementById('verify-btn');
      btn.disabled = true;
      btn.textContent = 'Verifying...';
    }
    
    function enableVerifyButton() {
      const btn = document.getElementById('verify-btn');
      btn.disabled = false;
      btn.textContent = 'Verify Payment';
    }
  </script>
</body>
</html>
```

### Example 2: React Component Integration

```jsx
import React, { useState, useEffect } from 'react';

const PaymentVerification = ({ orderId, amount, onSuccess, onError }) => {
  const [utr, setUtr] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const handleMessage = (event) => {
      if (event.origin !== 'https://your-gateway-domain.com') return;
      
      if (event.data.type === 'payment_result') {
        const { success, utr, status, amount, message } = event.data.payload;
        
        setIsVerifying(false);
        
        if (success) {
          setMessage('Payment verified successfully!');
          onSuccess({ utr, amount, status });
        } else {
          const errorMsg = message && message.includes('Payment not found') 
            ? 'Payment not found, please try after sometime'
            : `Payment verification failed: ${message || status}`;
          setMessage(errorMsg);
          onError({ utr, status, message });
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [onSuccess, onError]);

  const handleVerify = () => {
    if (!utr.trim()) {
      setMessage('Please enter UTR number');
      return;
    }

    if (!/^\d{10,20}$/.test(utr)) {
      setMessage('UTR must be 10-20 digits');
      return;
    }

    setIsVerifying(true);
    setMessage('Opening payment verification...');

    const popup = window.open(
      `https://your-gateway-domain.com/public/redirect?method=postmessage&origin=${encodeURIComponent(window.location.origin)}&utr=${utr}&amount=${amount}`,
      'payment-verification',
      'width=520,height=720,scrollbars=yes,resizable=yes'
    );

    if (!popup) {
      setMessage('Popup blocked. Please allow popups and try again.');
      setIsVerifying(false);
    }
  };

  return (
    <div className="payment-verification">
      <h3>Payment Verification</h3>
      <p>Amount: ₹{amount}</p>
      
      <div>
        <label>UTR Number:</label>
        <input
          type="text"
          value={utr}
          onChange={(e) => setUtr(e.target.value)}
          placeholder="Enter UTR from your UPI app"
          disabled={isVerifying}
        />
      </div>
      
      <button 
        onClick={handleVerify} 
        disabled={isVerifying}
        className={isVerifying ? 'btn-disabled' : 'btn-primary'}
      >
        {isVerifying ? 'Verifying...' : 'Verify Payment'}
      </button>
      
      {message && (
        <div className={`message ${message.includes('success') ? 'success' : 'error'}`}>
          {message}
        </div>
      )}
    </div>
  );
};

export default PaymentVerification;
```

## Response Format

The popup sends this data structure via postMessage:

```javascript
{
  "type": "payment_result",
  "payload": {
    "success": true,                    // boolean: payment successful
    "utr": "1234567890",               // string: UTR number
    "status": "Succeeded",             // string: "Succeeded" | "Failed" | "Pending"
    "amount": "100.50",                // string: payment amount (if known)
    "message": "UTR checked successfully", // string: status message
    "raw": {                           // object: full API response
      "success": true,
      "message": "UTR checked successfully",
      "payment": {
        "id": 123,
        "utr": "1234567890",
        "amount": 100.50,
        "status": "completed",
        "payment_status": "Succeeded",
        "checked_status": true,
        "checked_at": "2024-01-15T10:30:00Z",
        "vendor": {
          "id": 1,
          "business_name": "Example Store",
          "contact_name": "John Doe",
          "upi_id": "store@paytm"
        }
      }
    }
  }
}
```

## Security Best Practices

1. **Always validate origin**: Check `event.origin` matches your gateway domain
2. **Validate UTR format**: Ensure UTR is 10-20 digits before opening popup
3. **Use HTTPS**: Always use HTTPS for both your site and gateway
4. **Handle popup blocking**: Check if popup was blocked and show appropriate message
5. **Set timeouts**: Configure appropriate polling intervals and timeouts
6. **Log events**: Log all payment attempts for audit purposes

## Error Handling

### Common Error Scenarios

#### 1. API Errors
```json
{
  "success": false,
  "error": "Payment not found for this vendor",
  "details": "UTR 1234567890 not found for vendor 1"
}
```

#### 2. Validation Errors
```json
{
  "success": false,
  "error": "Invalid parameters",
  "details": "UTR must be 10-20 digits"
}
```

#### 3. Authentication Errors
```json
{
  "success": false,
  "error": "Unauthorized",
  "details": "Invalid or missing API key"
}
```

#### 4. Rate Limit Errors
```json
{
  "success": false,
  "error": "Rate limit exceeded",
  "details": "Too many requests. Please try again later."
}
```

### Popup Error Handling

The popup handles these scenarios:
- **Payment not found**: Shows warning message and closes after 2 seconds
- **Payment successful/failed**: Shows result and closes after 1 second
- **Timeout**: Shows timeout message and closes
- **Network errors**: Continues polling until timeout
- **Invalid UTR**: Shows validation error and allows retry

### Error Response Codes

| Status Code | Description |
|-------------|-------------|
| 200 | Success |
| 400 | Bad Request - Invalid parameters |
| 401 | Unauthorized - Invalid API key |
| 404 | Not Found - Payment or vendor not found |
| 409 | Conflict - UTR already exists |
| 429 | Too Many Requests - Rate limit exceeded |
| 500 | Internal Server Error |

### Error Handling Best Practices

1. **Always check response status**: Verify `success` field in response
2. **Handle network errors**: Implement retry logic with exponential backoff
3. **Validate input**: Check UTR format before making API calls
4. **Log errors**: Log all errors for debugging and monitoring
5. **User-friendly messages**: Show meaningful error messages to users
6. **Graceful degradation**: Provide fallback options when services are unavailable

## Testing

### Test UTRs for Development

Use these test UTRs for development and testing:

| UTR | Expected Result | Description |
|-----|----------------|-------------|
| `1234567890` | Success | Test successful payment verification |
| `9999999999` | Payment not found | Test "payment not found" error |
| `1111111111` | Timeout | Test timeout scenario |
| `0000000000` | Invalid UTR | Test validation error |

### Testing Checklist

#### Popup Integration Testing
- [ ] Popup opens correctly with valid parameters
- [ ] UTR input validation works
- [ ] Payment verification polling functions
- [ ] Success/failure messages display correctly
- [ ] Popup closes automatically on completion
- [ ] Cross-origin communication works
- [ ] Error handling for network issues

#### API Integration Testing
- [ ] Authentication with valid API key
- [ ] Error handling for invalid API key
- [ ] Payment creation with valid data
- [ ] Payment status updates
- [ ] Rate limiting behavior
- [ ] Input validation
- [ ] Response format validation

#### Widget Integration Testing
- [ ] JSON widget data retrieval
- [ ] HTML widget rendering
- [ ] JavaScript widget injection
- [ ] Theme and size variations
- [ ] QR code generation
- [ ] Cross-browser compatibility

### Load Testing

For production deployments, test with:
- **Concurrent users**: 100+ simultaneous popup sessions
- **API calls**: 1000+ requests per minute
- **Long polling**: 3+ minute timeout scenarios
- **Network conditions**: Slow/intermittent connections

## Browser Compatibility

### Desktop Browsers
- **Chrome 90+**: Full support
- **Firefox 88+**: Full support
- **Safari 14+**: Full support
- **Edge 90+**: Full support

### Mobile Browsers
- **Chrome Mobile**: Full support (popup opens in new tab)
- **Safari Mobile**: Full support (popup opens in new tab)
- **Firefox Mobile**: Full support (popup opens in new tab)
- **Samsung Internet**: Full support (popup opens in new tab)

### Features by Browser
| Feature | Chrome | Firefox | Safari | Edge | Mobile |
|---------|--------|---------|--------|------|--------|
| Popup Integration | ✅ | ✅ | ✅ | ✅ | ✅* |
| PostMessage API | ✅ | ✅ | ✅ | ✅ | ✅ |
| Fetch API | ✅ | ✅ | ✅ | ✅ | ✅ |
| QR Code Display | ✅ | ✅ | ✅ | ✅ | ✅ |
| Widget Embedding | ✅ | ✅ | ✅ | ✅ | ✅ |

*Mobile browsers open popup in new tab instead of popup window

## Security Considerations

### Data Protection
- All API communications use HTTPS
- API keys are transmitted securely
- UTR numbers are validated and sanitized
- No sensitive data is stored in browser storage

### Cross-Origin Security
- Origin validation for postMessage communication
- CORS headers properly configured
- No sensitive data exposed in URL parameters

### Best Practices
1. **Validate all inputs** on both client and server
2. **Use HTTPS** for all communications
3. **Implement rate limiting** to prevent abuse
4. **Log security events** for monitoring
5. **Regular security audits** of integration code
6. **Keep API keys secure** and rotate regularly

## Troubleshooting

### Common Issues

#### Popup Not Opening
- Check if popup blockers are enabled
- Verify origin parameter is correct
- Ensure HTTPS is used

#### API Authentication Failing
- Verify API key is correct
- Check Authorization header format
- Ensure API key has proper permissions

#### Payment Not Found
- Verify UTR format (10-20 digits)
- Check vendor_id is correct
- Ensure payment exists in system

#### Widget Not Loading
- Check vendor_id parameter
- Verify network connectivity
- Check browser console for errors

### Debug Mode

Enable debug logging by adding `?debug=true` to popup URL:
```
https://your-gateway-domain.com/public/redirect?method=postmessage&origin=your-origin&debug=true
```

## Support

### Documentation
- API Reference: Available in vendor dashboard
- Integration Examples: See examples section above
- Changelog: Check platform updates

### Contact Support
- **Technical Issues**: Contact your gateway administrator
- **Integration Help**: Use the support portal in vendor dashboard
- **Emergency Support**: Available 24/7 for critical issues

### Community
- Join our developer community for tips and best practices
- Share integration examples and get feedback
- Stay updated on new features and improvements
