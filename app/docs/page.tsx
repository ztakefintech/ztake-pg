import Layout from '@/components/Layout';

export default function DocsPage() {
  return (
    <Layout>
      <div className="max-w-5xl mx-auto py-8 prose">
        <h1>API Documentation</h1>
        <p>Use this platform as a middleware without exposing your keys to end users.</p>

        <h2>Ztake Proxy (Vendor Auth Required)</h2>
        <p>
          Configure your Ztake payout credentials in <code>/profile</code>. Then call the proxy to forward any Ztake Payout API request.
        </p>
        <pre><code>{`POST /api/vendor/payout-proxy?path=/v2/transfers
Authorization: Bearer <jwt>
Content-Type: application/json

{ "transfer_id": "your-ref", "amount": 100.0 }`}
        </code></pre>
        <p>Query param <code>path</code> is appended to Ztake base URL based on your environment (sandbox/prod).</p>

        <h3>Response</h3>
        <p>Returns exactly what Ztake returns (status and body) so your integration remains unchanged.</p>

        <h2>Payout Logs</h2>
        <p>List your payout requests (created via your flows):</p>
        <pre><code>{`GET /api/vendor/payouts
Authorization: Bearer <jwt>`}
        </code></pre>

        <p>Create a payout request entry (optional if you track on your side):</p>
        <pre><code>{`POST /api/vendor/payouts
Authorization: Bearer <jwt>
Content-Type: application/json

{
  "amount": 100.0,
  "currency": "INR",
  "beneficiary_name": "Rahul",
  "beneficiary_account": "1234567890",
  "beneficiary_ifsc": "HDFC0001234",
  "beneficiary_upi": "rahul@upi",
  "reference_id": "REF-123",
  "remarks": "Vendor payout"
}`}
        </code></pre>

        <h2>Transactions</h2>
        <p>Use existing endpoints for payments under <code>/api/payments/*</code> and vendor transactions under <code>/api/vendor/payments</code>.</p>
      </div>
    </Layout>
  );
}
