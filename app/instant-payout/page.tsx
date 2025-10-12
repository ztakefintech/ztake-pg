'use client';

import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/lib/context';
import { useRouter } from 'next/navigation';
import Layout from '@/components/Layout';

export default function DemoPage() {
  const { vendor, token, isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();

  // Shared
  useEffect(() => {
    if (!authLoading && !isAuthenticated) router.push('/login');
  }, [authLoading, isAuthenticated, router]);

  // Pay-in demo state
  const [qrCode, setQrCode] = useState<string>('');
  const [businessName, setBusinessName] = useState<string>('');
  const [orderId, setOrderId] = useState<string>('');
  const [merchantOrderId, setMerchantOrderId] = useState<string>('DEMO-' + Math.random().toString(36).slice(2, 8).toUpperCase());
  const [amount, setAmount] = useState<string>('100');
  const [customerName, setCustomerName] = useState<string>('Demo Customer');
  const [utr, setUtr] = useState<string>('');
  const [payinMsg, setPayinMsg] = useState<string>('');
  const [payinErr, setPayinErr] = useState<string>('');
  const callbackToken = useMemo(() => (vendor ? `vendor-${vendor.vendor_code}` : 'default'), [vendor]);

  // Payout demo state (bank transfer only)
  const [payoutAmt, setPayoutAmt] = useState<string>('50');
  const [beneficiaryName, setBeneficiaryName] = useState<string>('');
  const [beneficiaryAccount, setBeneficiaryAccount] = useState<string>('');
  const [beneficiaryIfsc, setBeneficiaryIfsc] = useState<string>('');
  const [payoutMsg, setPayoutMsg] = useState<string>('');
  const [payoutErr, setPayoutErr] = useState<string>('');

  // Callback events
  const [events, setEvents] = useState<any[]>([]);
  const [payoutEvents, setPayoutEvents] = useState<any[]>([]);

  useEffect(() => {
    if (!vendor) return;
    const id = setInterval(async () => {
      const res = await fetch(`/api/public/payment-callback?token=${callbackToken}`);
      const json = await res.json();
      setEvents(json?.data?.events || []);
    }, 2000);
    return () => clearInterval(id);
  }, [vendor, callbackToken]);

  // Fetch payout callback events
  useEffect(() => {
    if (!vendor) return;
    const id = setInterval(async () => {
      const res = await fetch(`/api/public/payment-callback?token=${callbackToken}&type=payout`);
      const json = await res.json();
      setPayoutEvents(json?.data?.events || []);
    }, 2000);
    return () => clearInterval(id);
  }, [vendor, callbackToken]);

  // Fetch QR code
  useEffect(() => {
    if (!vendor) return;
    (async () => {
      try {
        const response = await fetch(`/api/vendor/payment-details?vendor_code=${vendor.vendor_code}`);
        const data = await response.json();
        if (data.success && data.data.qr_code) {
          setQrCode(data.data.qr_code);
          setBusinessName(data.data.business_name);
        }
      } catch {}
    })();
  }, [vendor]);

  const createOrder = async () => {
    setPayinErr(''); setPayinMsg(''); setOrderId('');
    try {
      const base = typeof window !== 'undefined' ? window.location.origin : '';
      const res = await fetch('/api/v1/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          merchantOrderId,
          amount: Number(amount),
          currency: 'INR',
          customerName,
          returnUrl: `${base}/public/test-result.html`,
          callbackUrl: `${base}/api/public/payment-callback?token=${encodeURIComponent(callbackToken)}`
        })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Failed to create order');
      setOrderId(json.ztakeOrderId);
      setPayinMsg('Order created');
    } catch (e: any) {
      setPayinErr(e.message || 'Error creating order');
    }
  };

  const submitUtr = async () => {
    setPayinErr(''); setPayinMsg('');
    if (!orderId) { setPayinErr('Create order first'); return; }
    if (!utr.trim()) { setPayinErr('Enter UTR'); return; }
    try {
      const res = await fetch(`/api/v1/orders/${orderId}/submit-utr`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ utr: utr.trim() })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Submit UTR failed');
      setPayinMsg(`UTR submitted, status: ${json.status}`);
    } catch (e: any) {
      setPayinErr(e.message || 'Error submitting UTR');
    }
  };

  const createPayout = async () => {
    setPayoutErr(''); setPayoutMsg('');
    try {
      const res = await fetch('/api/vendor/payouts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          amount: Number(payoutAmt),
          currency: 'INR',
          beneficiary_name: beneficiaryName || null,
          beneficiary_account: beneficiaryAccount || null,
          beneficiary_ifsc: beneficiaryIfsc || null
        })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Failed to create payout');
      setPayoutMsg('Payout created');
    } catch (e: any) {
      setPayoutErr(e.message || 'Error creating payout');
    }
  };

  // Defer auth-based returns until after all hooks are declared
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }
  if (!isAuthenticated) return null;

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Instant Payout</h1>
          <p className="text-gray-600">Test payment and payout functionality with real-time callbacks.</p>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Pay-in Card */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-xl font-semibold mb-4">Pay-in</h2>
            <p className="text-gray-600 mb-4">Create order, submit UTR, and observe callback events.</p>
            <div className="mb-4 text-center">
              {qrCode ? (
                <img src={qrCode} alt="Payment QR" className="w-48 h-48 inline-block border rounded" />
              ) : (
                <div className="w-48 h-48 inline-flex items-center justify-center bg-gray-100 rounded">No QR</div>
              )}
              <div className="text-sm text-gray-700 mt-2">{businessName}</div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input className="border rounded px-3 py-2" value={merchantOrderId} onChange={(e) => setMerchantOrderId(e.target.value)} placeholder="Merchant Order ID" />
              <input className="border rounded px-3 py-2" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Amount" />
              <input className="border rounded px-3 py-2 md:col-span-2" value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Customer Name" />
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={createOrder} className="bg-indigo-600 text-white px-4 py-2 rounded">Create Order</button>
              <button onClick={submitUtr} className="bg-blue-600 text-white px-4 py-2 rounded">Submit UTR</button>
            </div>
            {orderId && (
              <div className="mt-2 text-sm">
                <span className="text-gray-600">Order ID:</span> <span className="font-mono">{orderId}</span>
              </div>
            )}
            {(payinMsg || payinErr) && (
              <div className={`mt-3 p-2 rounded ${payinErr ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>{payinErr || payinMsg}</div>
            )}
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">UTR</label>
              <div className="flex gap-2">
                <input className="border rounded px-3 py-2 flex-1" value={utr} onChange={(e) => setUtr(e.target.value)} placeholder="Enter UTR" />
              </div>
            </div>
            <div className="mt-6">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold">Callback Events</h3>
                <span className="text-xs text-gray-500">token: {callbackToken}</span>
              </div>
              <div className="border rounded p-2 h-56 overflow-auto bg-gray-50 text-xs">
                {events.length === 0 ? (
                  <div className="text-gray-500">No callbacks yet</div>
                ) : (
                  events.map((e, idx) => (
                    <div key={idx} className="mb-2">
                      <div className="text-gray-600">{new Date(e.receivedAt).toLocaleString()}</div>
                      <pre className="overflow-auto">{JSON.stringify(e.payload, null, 2)}</pre>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Payout Card */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-xl font-semibold mb-4">Payout</h2>
            <p className="text-gray-600 mb-4">Create a payout to bank account (transfer).</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input className="border rounded px-3 py-2" value={payoutAmt} onChange={(e) => setPayoutAmt(e.target.value)} placeholder="Amount" />
              <input className="border rounded px-3 py-2" value={beneficiaryName} onChange={(e) => setBeneficiaryName(e.target.value)} placeholder="Beneficiary Name" />
              <input className="border rounded px-3 py-2 md:col-span-2" value={beneficiaryAccount} onChange={(e) => setBeneficiaryAccount(e.target.value)} placeholder="Account Number" />
              <input className="border rounded px-3 py-2" value={beneficiaryIfsc} onChange={(e) => setBeneficiaryIfsc(e.target.value.toUpperCase())} placeholder="IFSC" />
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={createPayout} className="bg-indigo-600 text-white px-4 py-2 rounded">Create Payout</button>
              <a className="px-4 py-2 rounded border" href="/payouts">View Payouts</a>
            </div>
            {(payoutMsg || payoutErr) && (
              <div className={`mt-3 p-2 rounded ${payoutErr ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>{payoutErr || payoutMsg}</div>
            )}
            <div className="mt-6">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold">Callback Events</h3>
                <span className="text-xs text-gray-500">token: {callbackToken}</span>
              </div>
              <div className="border rounded p-2 h-56 overflow-auto bg-gray-50 text-xs">
                {payoutEvents.length === 0 ? (
                  <div className="text-gray-500">No callbacks yet</div>
                ) : (
                  payoutEvents.map((e, idx) => (
                    <div key={idx} className="mb-2">
                      <div className="text-gray-600">{new Date(e.receivedAt).toLocaleString()}</div>
                      <pre className="overflow-auto">{JSON.stringify(e.payload, null, 2)}</pre>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
