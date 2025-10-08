'use client';

import React, { useState } from 'react';
import { useAuth } from '@/lib/context';
import { FiKey, FiCopy, FiEye, FiEyeOff, FiPlus } from 'react-icons/fi';

export default function ApiKeyManager() {
  const { token, vendor } = useAuth();
  const [keyName, setKeyName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [newApiKey, setNewApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);

  const handleCreateApiKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!keyName.trim()) return;

    setIsCreating(true);
    setError('');
    setSuccess('');
    setNewApiKey('');

    try {
      const response = await fetch('/api/admin/api-keys', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ key_name: keyName.trim() }),
      });

      const data = await response.json();

      if (response.ok) {
        setNewApiKey(data.api_key);
        setSuccess('API key created successfully!');
        setKeyName('');
      } else {
        setError(data.error || 'Failed to create API key');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setSuccess('API key copied to clipboard!');
      setTimeout(() => setSuccess(''), 2000);
    } catch (err) {
      setError('Failed to copy to clipboard');
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">API Key Management</h1>
        <p className="text-gray-600">Create and manage API keys for bot integration</p>
      </div>

      <div className="card">
        <form onSubmit={handleCreateApiKey} className="space-y-4">
          <div className="form-group">
            <label htmlFor="key_name" className="form-label">
              API Key Name
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FiKey className="h-5 w-5 text-gray-400" />
              </div>
              <input
                id="key_name"
                name="key_name"
                type="text"
                required
                className="input-field pl-10"
                placeholder="Enter a name for this API key"
                value={keyName}
                onChange={(e) => setKeyName(e.target.value)}
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Choose a descriptive name to identify this API key (e.g., "Payment Bot", "Webhook Service")
            </p>
          </div>

          <button
            type="submit"
            disabled={isCreating || !keyName.trim()}
            className="btn-primary w-full flex items-center justify-center space-x-2"
          >
            <FiPlus />
            <span>{isCreating ? 'Creating...' : 'Create API Key'}</span>
          </button>
        </form>

        {error && (
          <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-600">{error}</p>
          </div>
        )}

        {success && !newApiKey && (
          <div className="mt-4 bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-green-600">{success}</p>
          </div>
        )}

        {newApiKey && (
          <div className="mt-6 space-y-4">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-yellow-800 mb-2">New API Key Created</h3>
              <p className="text-yellow-700 text-sm mb-3">
                Store this API key securely. It will not be shown again.
              </p>
              
              <div className="bg-white rounded-lg p-3 border">
                <div className="flex items-center space-x-2">
                  <input
                    type={showApiKey ? 'text' : 'password'}
                    value={newApiKey}
                    readOnly
                    className="flex-1 font-mono text-sm bg-transparent border-none outline-none"
                  />
                  <button
                    onClick={() => setShowApiKey(!showApiKey)}
                    className="p-1 text-gray-500 hover:text-gray-700"
                  >
                    {showApiKey ? <FiEyeOff /> : <FiEye />}
                  </button>
                  <button
                    onClick={() => copyToClipboard(newApiKey)}
                    className="p-1 text-gray-500 hover:text-gray-700"
                  >
                    <FiCopy />
                  </button>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-semibold text-blue-800 mb-2">Usage Instructions</h4>
              <div className="text-sm text-blue-700 space-y-2">
                <p>1. Use this API key in the Authorization header:</p>
                <code className="block bg-blue-100 p-2 rounded text-xs">
                  Authorization: Bearer {newApiKey.substring(0, 20)}...
                </code>
                <p>2. Use it to update payment information via the API:</p>
                <code className="block bg-blue-100 p-2 rounded text-xs">
                  POST /api/payments/update
                </code>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="mt-8 space-y-6 hidden">
        {/* Base URL Information */}
        <div className="card bg-blue-50 border-blue-200">
          <h2 className="text-lg font-semibold text-blue-800 mb-4">Base URL Information</h2>
          <div className="space-y-3">
            <div>
              <h3 className="font-medium text-blue-800 mb-2">Development Environment</h3>
              <code className="block bg-blue-100 p-3 rounded text-sm font-mono">
                http://localhost:3000
              </code>
            </div>
            <div>
              <h3 className="font-medium text-blue-800 mb-2">Production Environment</h3>
              <code className="block bg-blue-100 p-3 rounded text-sm font-mono">
                https://your-domain.com
              </code>
            </div>
            <div className="text-sm text-blue-700">
              <p><strong>Note:</strong> Replace <code>your-domain.com</code> with your actual production domain.</p>
              <p><strong>Your Vendor ID:</strong> <code className="bg-blue-200 px-2 py-1 rounded font-mono">{vendor?.id || 'N/A'}</code> - Use this in all vendor-specific endpoints</p>
            </div>
          </div>
        </div>

        {/* Bot Integration APIs */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Bot Integration APIs</h2>
          <div className="space-y-6 text-sm">
            <div>
              <h3 className="font-medium text-gray-900 mb-2">Update Payment (Requires API Key)</h3>
              <p className="text-gray-600 mb-2">Endpoint: <code className="bg-gray-100 px-2 py-1 rounded">POST /api/payments/update</code></p>
              <p className="text-gray-600 mb-2">Headers: <code className="bg-gray-100 px-2 py-1 rounded">Authorization: Bearer YOUR_API_KEY</code></p>
              <p className="text-gray-600 mb-2">Description: Updates payment status when a UTR is received from payment gateway</p>
              <p className="text-gray-600 mb-2">Body:</p>
              <pre className="bg-gray-100 p-3 rounded text-xs overflow-x-auto">
{`{
  "utr": "690518190930",
  "amount": 100.00,
  "vendor_id": ${vendor?.id || 'YOUR_VENDOR_ID'},
  "order_id": "ord_12345",
  "payment_status": "Succeeded"
}`}
              </pre>
              <p className="text-gray-600 mb-2">Required Fields:</p>
              <ul className="text-gray-600 ml-4 space-y-1">
                <li>• <code className="bg-gray-100 px-1 rounded">utr</code> (string) - Unique Transaction Reference number from payment gateway (numeric only)</li>
                <li>• <code className="bg-gray-100 px-1 rounded">amount</code> (number) - Payment amount in decimal format</li>
                <li>• <code className="bg-gray-100 px-1 rounded">vendor_id</code> (number) - Vendor ID who received the payment</li>
              </ul>
              <p className="text-gray-600 mb-2">Optional Fields:</p>
              <ul className="text-gray-600 ml-4 space-y-1">
                <li>• <code className="bg-gray-100 px-1 rounded">order_id</code> (string) - Unique order identifier from your frontend (optional for bot updates)</li>
                <li>• <code className="bg-gray-100 px-1 rounded">payment_status</code> (string) - Payment status: "Succeeded", "Pending", or "Failed" (defaults to "Succeeded")</li>
              </ul>
              <p className="text-gray-600 mt-2">Success Response:</p>
              <pre className="bg-gray-100 p-3 rounded text-xs overflow-x-auto">
{`{
  "success": true,
  "message": "Payment updated successfully",
  "payment": {
    "id": 1,
    "utr": "690518190930",
    "amount": 100.00,
    "status": "completed",
    "vendor_id": ${vendor?.id || 'YOUR_VENDOR_ID'},
    "created_at": "2024-01-01T00:00:00Z",
    "updated_at": "2024-01-01T00:00:00Z"
  }
}`}
              </pre>
              <p className="text-gray-600 mt-2">Error Responses:</p>
              <pre className="bg-gray-100 p-3 rounded text-xs overflow-x-auto">
{`// Invalid API Key
{
  "success": false,
  "error": "Invalid API key"
}

// Duplicate UTR
{
  "success": false,
  "error": "UTR already exists"
}

// Invalid vendor
{
  "success": false,
  "error": "Vendor not found"
}

// Validation error
{
  "success": false,
  "error": "Validation failed",
  "details": "utr is required"
}`}
              </pre>
            </div>
          </div>
        </div>

        {/* Public APIs */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Public APIs (No Authentication Required)</h2>
          <div className="space-y-6 text-sm">
            <div>
              <h3 className="font-medium text-gray-900 mb-2">Check Payment Status by UTR</h3>
              <p className="text-gray-600 mb-2">Endpoint: <code className="bg-gray-100 px-2 py-1 rounded">POST /api/payments/check</code></p>
              <p className="text-gray-600 mb-2">Description: Check payment status and add order_id for successful payments. Only processes succeeded payments and can only be checked once.</p>
              <p className="text-gray-600 mb-2">Body:</p>
              <pre className="bg-gray-100 p-3 rounded text-xs overflow-x-auto">
{`{
  "utr": "690518190930",
  "vendor_id": ${vendor?.id || 'YOUR_VENDOR_ID'},
  "order_id": "ord_12345"
}`}
              </pre>
              <p className="text-gray-600 mb-2">Required Fields:</p>
              <ul className="text-gray-600 ml-4 space-y-1">
                <li>• <code className="bg-gray-100 px-1 rounded">utr</code> (string) - Unique Transaction Reference number to check (numeric only)</li>
                <li>• <code className="bg-gray-100 px-1 rounded">vendor_id</code> (number) - Vendor ID who received the payment</li>
                <li>• <code className="bg-gray-100 px-1 rounded">order_id</code> (string) - Unique order identifier from your frontend</li>
              </ul>
              <p className="text-gray-600 mt-2">Success Response (Payment Checked):</p>
              <pre className="bg-gray-100 p-3 rounded text-xs overflow-x-auto">
{`{
  "payment": {
    "id": 1,
    "order_id": "ord_12345",
    "utr": "690518190930",
    "amount": 100.00,
    "status": "completed",
    "payment_status": "Succeeded",
    "checked_status": true,
    "checked_at": "2024-01-01T00:00:00Z",
    "created_at": "2024-01-01T00:00:00Z",
    "updated_at": "2024-01-01T00:00:00Z",
    "vendor": {
      "id": ${vendor?.id || 'YOUR_VENDOR_ID'},
      "business_name": "${vendor?.business_name || 'Your Store'}",
      "contact_name": "${vendor?.contact_name || 'John Doe'}",
      "upi_id": "${vendor?.upi_id || 'yourstore@paytm'}"
    }
  },
  "message": "UTR checked successfully"
}`}
              </pre>
              <p className="text-gray-600 mt-2">Response (Already Checked):</p>
              <pre className="bg-gray-100 p-3 rounded text-xs overflow-x-auto">
{`{
  "payment": { ... },
  "message": "UTR has already been checked"
}`}
              </pre>
              <p className="text-gray-600 mt-2">Response (Not Succeeded):</p>
              <pre className="bg-gray-100 p-3 rounded text-xs overflow-x-auto">
{`{
  "payment": { ... },
  "message": "Payment not succeeded, cannot be checked"
}`}
              </pre>
              <p className="text-gray-600 mt-2">Error Responses:</p>
              <pre className="bg-gray-100 p-3 rounded text-xs overflow-x-auto">
{`// Payment not found
{
  "error": "Payment not found for this vendor"
}

// Validation error
{
  "error": "Validation failed",
  "details": "utr is required"
}

// Invalid UTR format
{
  "error": "Invalid UTR format"
}`}
              </pre>
              <p className="text-gray-600 mt-2">Important Notes:</p>
              <ul className="text-gray-600 ml-4 space-y-1">
                <li>• Only succeeded payments can be checked and have order_id added</li>
                <li>• Each payment can only be checked once</li>
                <li>• Order ID is added to the database only when payment is successful and checked for the first time</li>
                <li>• Use this endpoint to verify payment completion and add order tracking</li>
              </ul>
              <p className="text-gray-600 mt-2">Use Cases:</p>
              <ul className="text-gray-600 ml-4 space-y-1">
                <li>• Verify payment completion before order fulfillment</li>
                <li>• Add order tracking to successful payments</li>
                <li>• Check payment status in customer support</li>
                <li>• Integration with order management systems</li>
              </ul>
            </div>

            <div>
              <h3 className="font-medium text-gray-900 mb-2">Get Vendor Payment Details</h3>
              <p className="text-gray-600 mb-2">Endpoint: <code className="bg-gray-100 px-2 py-1 rounded">GET /api/vendor/payment-details?vendor_id={vendor?.id || 'YOUR_VENDOR_ID'}</code></p>
              <p className="text-gray-600 mt-2">Response:</p>
              <pre className="bg-gray-100 p-3 rounded text-xs overflow-x-auto">
{`{
  "success": true,
  "data": {
    "vendor_id": ${vendor?.id || 'YOUR_VENDOR_ID'},
    "business_name": "${vendor?.business_name || 'Your Store'}",
    "upi_id": "${vendor?.upi_id || 'yourstore@paytm'}",
    "qr_code": "base64_image_data",
    "created_at": "2024-01-01T00:00:00Z"
  }
}`}
              </pre>
            </div>

            <div>
              <h3 className="font-medium text-gray-900 mb-2">Payment Widget API</h3>
              <p className="text-gray-600 mb-2">Endpoint: <code className="bg-gray-100 px-2 py-1 rounded">GET /api/public/payment-widget?vendor_id={vendor?.id || 'YOUR_VENDOR_ID'}&format=json&theme=light&size=medium</code></p>
              <p className="text-gray-600 mb-2">Parameters:</p>
              <ul className="text-gray-600 ml-4 space-y-1">
                <li>• <code className="bg-gray-100 px-1 rounded">vendor_id</code> (required) - Vendor ID</li>
                <li>• <code className="bg-gray-100 px-1 rounded">format</code> - json, html, or widget</li>
                <li>• <code className="bg-gray-100 px-1 rounded">theme</code> - light, dark, or auto</li>
                <li>• <code className="bg-gray-100 px-1 rounded">size</code> - small, medium, or large</li>
              </ul>
              <p className="text-gray-600 mt-2">Example HTML Embed:</p>
              <pre className="bg-gray-100 p-3 rounded text-xs overflow-x-auto">
{`<iframe src="/api/public/payment-widget?vendor_id=${vendor?.id || 'YOUR_VENDOR_ID'}&format=html" 
        width="400" height="500" frameborder="0">
</iframe>`}
              </pre>
            </div>
          </div>
        </div>

        {/* Vendor APIs */}
        {/* <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Vendor APIs (Requires JWT Token)</h2>
          <div className="space-y-6 text-sm">
            <div>
              <h3 className="font-medium text-gray-900 mb-2">Get Payment Information</h3>
              <p className="text-gray-600 mb-2">Endpoint: <code className="bg-gray-100 px-2 py-1 rounded">GET /api/vendor/payment-info</code></p>
              <p className="text-gray-600 mb-2">Headers: <code className="bg-gray-100 px-2 py-1 rounded">Authorization: Bearer YOUR_JWT_TOKEN</code></p>
              <p className="text-gray-600 mt-2">Response:</p>
              <pre className="bg-gray-100 p-3 rounded text-xs overflow-x-auto">
{`{
  "qr_code_url": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...",
  "upi_id": "john@paytm",
  "upi_url": "upi://pay?pa=john@paytm&pn=Vendor&cu=INR",
  "vendor_id": 1
}`}
              </pre>
            </div>

            <div>
              <h3 className="font-medium text-gray-900 mb-2">Get Payment History</h3>
              <p className="text-gray-600 mb-2">Endpoint: <code className="bg-gray-100 px-2 py-1 rounded">GET /api/vendor/payments?page=1&limit=10</code></p>
              <p className="text-gray-600 mb-2">Headers: <code className="bg-gray-100 px-2 py-1 rounded">Authorization: Bearer YOUR_JWT_TOKEN</code></p>
              <p className="text-gray-600 mt-2">Response:</p>
              <pre className="bg-gray-100 p-3 rounded text-xs overflow-x-auto">
{`{
  "success": true,
  "payments": [
    {
      "id": 1,
      "utr": "690518190930",
      "amount": 100.00,
      "status": "completed",
      "created_at": "2024-01-01T00:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 1,
    "pages": 1
  }
}`}
              </pre>
            </div>

            <div>
              <h3 className="font-medium text-gray-900 mb-2">Update Profile</h3>
              <p className="text-gray-600 mb-2">Endpoint: <code className="bg-gray-100 px-2 py-1 rounded">PUT /api/vendor/profile</code></p>
              <p className="text-gray-600 mb-2">Headers: <code className="bg-gray-100 px-2 py-1 rounded">Authorization: Bearer YOUR_JWT_TOKEN</code></p>
              <p className="text-gray-600 mb-2">Body:</p>
              <pre className="bg-gray-100 p-3 rounded text-xs overflow-x-auto">
{`{
  "business_name": "Updated Business Name",
  "contact_name": "Updated Contact",
  "phone": "+1234567890",
  "upi_id": "updated@paytm"
}`}
              </pre>
            </div>
          </div>
        </div> */}

        {/* Authentication APIs */}
        {/* <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Authentication APIs</h2>
          <div className="space-y-6 text-sm">
            <div>
              <h3 className="font-medium text-gray-900 mb-2">Vendor Registration</h3>
              <p className="text-gray-600 mb-2">Endpoint: <code className="bg-gray-100 px-2 py-1 rounded">POST /api/auth/register</code></p>
              <p className="text-gray-600 mb-2">Body:</p>
              <pre className="bg-gray-100 p-3 rounded text-xs overflow-x-auto">
{`{
  "business_name": "My Business",
  "contact_name": "John Doe",
  "email": "john@example.com",
  "phone": "+1234567890",
  "upi_id": "john@paytm",
  "password": "securepassword"
}`}
              </pre>
            </div>

            <div>
              <h3 className="font-medium text-gray-900 mb-2">Vendor Login</h3>
              <p className="text-gray-600 mb-2">Endpoint: <code className="bg-gray-100 px-2 py-1 rounded">POST /api/auth/login</code></p>
              <p className="text-gray-600 mb-2">Body:</p>
              <pre className="bg-gray-100 p-3 rounded text-xs overflow-x-auto">
{`{
  "email": "john@example.com",
  "password": "securepassword"
}`}
              </pre>
              <p className="text-gray-600 mt-2">Response:</p>
              <pre className="bg-gray-100 p-3 rounded text-xs overflow-x-auto">
{`{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "vendor": {
    "id": 1,
    "business_name": "My Business",
    "email": "john@example.com",
    "upi_id": "john@paytm"
  }
}`}
              </pre>
            </div>
          </div>
        </div> */}

        {/* Integration Examples */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Integration Examples</h2>
          <div className="space-y-6 text-sm">
            <div>
              <h3 className="font-medium text-gray-900 mb-2">Complete Payment Flow</h3>
              <p className="text-gray-600 mb-2">Here's how to integrate the complete payment flow:</p>
              <div className="space-y-3">
                <div className="bg-gray-50 p-3 rounded">
                  <h4 className="font-medium text-gray-800 mb-1">1. Customer makes payment</h4>
                  <p className="text-gray-600 text-xs">Customer pays using UPI to your UPI ID: <code className="bg-gray-200 px-1 rounded">${vendor?.upi_id || 'yourstore@paytm'}</code></p>
                </div>
                <div className="bg-gray-50 p-3 rounded">
                  <h4 className="font-medium text-gray-800 mb-1">2. Payment gateway webhook</h4>
                  <p className="text-gray-600 text-xs">Your payment gateway sends webhook with UTR and amount</p>
                  <pre className="bg-gray-100 p-2 rounded text-xs mt-2">
{`POST /api/payments/update
Authorization: Bearer YOUR_API_KEY
{
  "utr": "690518190930",
  "amount": 100.00,
  "vendor_id": ${vendor?.id || 'YOUR_VENDOR_ID'}
}`}
                  </pre>
                </div>
                <div className="bg-gray-50 p-3 rounded">
                  <h4 className="font-medium text-gray-800 mb-1">3. Customer verifies payment</h4>
                  <p className="text-gray-600 text-xs">Customer provides UTR to verify payment</p>
                  <pre className="bg-gray-100 p-2 rounded text-xs mt-2">
{`POST /api/payments/check
{
  "utr": "690518190930"
}`}
                  </pre>
                </div>
                <div className="bg-gray-50 p-3 rounded">
                  <h4 className="font-medium text-gray-800 mb-1">4. Order fulfillment</h4>
                  <p className="text-gray-600 text-xs">If payment is verified, fulfill the order</p>
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-medium text-gray-900 mb-2">Testing with cURL</h3>
              <p className="text-gray-600 mb-2">Test the APIs using cURL commands:</p>
              <div className="space-y-3">
                <div>
                  <h4 className="font-medium text-gray-800 mb-1">Update Payment:</h4>
                  <pre className="bg-gray-100 p-2 rounded text-xs overflow-x-auto">
{`curl -X POST http://localhost:3000/api/payments/update \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -d '{
    "utr": "690518190930",
    "amount": 100.00,
    "vendor_id": ${vendor?.id || 'YOUR_VENDOR_ID'}
  }'`}
                  </pre>
                </div>
                <div>
                  <h4 className="font-medium text-gray-800 mb-1">Check Payment:</h4>
                  <pre className="bg-gray-100 p-2 rounded text-xs overflow-x-auto">
{`curl -X POST http://localhost:3000/api/payments/check \\
  -H "Content-Type: application/json" \\
  -d '{
    "utr": "690518190930"
  }'`}
                  </pre>
                </div>
                <div>
                  <h4 className="font-medium text-gray-800 mb-1">Get Vendor Details:</h4>
                  <pre className="bg-gray-100 p-2 rounded text-xs overflow-x-auto">
{`curl "http://localhost:3000/api/vendor/payment-details?vendor_id=${vendor?.id || 'YOUR_VENDOR_ID'}"`}
                  </pre>
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-medium text-gray-900 mb-2">Rate Limiting</h3>
              <p className="text-gray-600 mb-2">All APIs have rate limiting to prevent abuse:</p>
              <ul className="text-gray-600 ml-4 space-y-1">
                <li>• <strong>Update Payment:</strong> 100 requests per minute per API key</li>
                <li>• <strong>Check Payment:</strong> 60 requests per minute per IP</li>
                <li>• <strong>Vendor APIs:</strong> 30 requests per minute per JWT token</li>
                <li>• <strong>Public APIs:</strong> 20 requests per minute per IP</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
