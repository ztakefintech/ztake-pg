'use client';

import { useState } from 'react';

export default function TestCashfreeV2Page() {
  const [response, setResponse] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const testPayout = async () => {
    setLoading(true);
    setResponse(null);

    try {
      const response = await fetch('/api/vendor/cashfree/v2/complete-payout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer YOUR_API_KEY_HERE' // Replace with actual API key
        },
        body: JSON.stringify({
          amount: 100,
          currency: 'INR',
          beneficiary_name: 'Test Beneficiary',
          bank_account_number: '1234567890',
          bank_ifsc: 'HDFC0001234',
          email: 'test@example.com',
          phone: '9876543210',
          remarks: 'Test payout via Cashfree V2',
          reference_id: `TEST_${Date.now()}`,
          callback_url: 'https://webhook.site/your-webhook-url'
        })
      });

      const data = await response.json();
      setResponse({ status: response.status, data });
    } catch (error) {
      setResponse({ error: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow p-6">
          <h1 className="text-2xl font-bold mb-4">Test Cashfree V2 Complete Payout</h1>
          <p className="text-gray-600 mb-6">
            This page tests the new Cashfree V2 complete payout endpoint that creates a beneficiary and initiates a transfer in one call.
          </p>

          <div className="space-y-4">
            <button
              onClick={testPayout}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Testing...' : 'Test Complete Payout'}
            </button>

            {response && (
              <div className="mt-6">
                <h3 className="text-lg font-semibold mb-2">Response:</h3>
                <pre className="bg-gray-100 p-4 rounded overflow-auto text-sm">
                  {JSON.stringify(response, null, 2)}
                </pre>
              </div>
            )}
          </div>

          <div className="mt-8 p-4 bg-yellow-50 border border-yellow-200 rounded">
            <h3 className="font-semibold text-yellow-800 mb-2">Note:</h3>
            <p className="text-yellow-700 text-sm">
              Make sure to replace 'YOUR_API_KEY_HERE' with a valid API key and ensure the vendor has Cashfree credentials configured.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
