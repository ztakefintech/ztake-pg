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
  const [secretKey, setSecretKey] = useState<string>('');
  const [showSecretKey, setShowSecretKey] = useState<boolean>(false);
  const callbackToken = useMemo(() => (vendor ? `vendor-${vendor.vendor_code}` : 'default'), [vendor]);

  // Payout demo state (bank transfer only)
  const [payoutAmt, setPayoutAmt] = useState<string>('50');
  const [beneficiaryName, setBeneficiaryName] = useState<string>('');
  const [beneficiaryAccount, setBeneficiaryAccount] = useState<string>('');
  const [beneficiaryIfsc, setBeneficiaryIfsc] = useState<string>('');
  const [beneficiaryEmail, setBeneficiaryEmail] = useState<string>('');
  const [beneficiaryPhone, setBeneficiaryPhone] = useState<string>('');
  const [payoutMsg, setPayoutMsg] = useState<string>('');
  const [payoutErr, setPayoutErr] = useState<string>('');
  const [payoutBalance, setPayoutBalance] = useState<number>(0);
  const [balanceLoading, setBalanceLoading] = useState<boolean>(false);

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

  // Fetch balance when secret key changes
  useEffect(() => {
    if (secretKey) {
      fetchBalance();
    }
  }, [secretKey]);

  // Fetch QR code (use authenticated vendor endpoint)
  useEffect(() => {
    if (!vendor || !token) return;
    (async () => {
      try {
        const response = await fetch(`/api/vendor/payment-info`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await response.json();
        const payload = data?.data || data; // handle both wrapped and direct
        if (response.ok && (payload.qr_code_url || payload.qrCodeUrl)) {
          setQrCode(payload.qr_code_url || payload.qrCodeUrl);
          setBusinessName(vendor.business_name || '');
        }
      } catch {}
    })();
  }, [vendor, token]);

  // Optional: Auto-fetch secret key (commented out for manual input)
  // useEffect(() => {
  //   if (!vendor || !token) return;
  //   (async () => {
  //     try {
  //       const response = await fetch('/api/vendor/secret-key', {
  //         headers: { Authorization: `Bearer ${token}` }
  //       });
  //       const data = await response.json();
  //       if (data.success && data.data.secret_key) {
  //         setSecretKey(data.data.secret_key);
  //       }
  //     } catch (error) {
  //       console.error('Failed to fetch secret key:', error);
  //     }
  //   })();
  // }, [vendor, token]);

  const createOrder = async () => {
    setPayinErr(''); setPayinMsg(''); setOrderId('');
    if (!secretKey) {
      setPayinErr('Please enter your secret key above to create orders.');
      return;
    }
    try {
      const base = typeof window !== 'undefined' ? window.location.origin : '';
      const res = await fetch('/api/instant-payin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${secretKey}` },
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
      setPayinMsg('Order pending');
    } catch (e: any) {
      setPayinErr(e.message || 'Error creating order');
    }
  };

  const submitUtr = async () => {
    setPayinErr(''); setPayinMsg('');
    if (!orderId) { setPayinErr('Create order first'); return; }
    if (!utr.trim()) { setPayinErr('Enter UTR'); return; }
    if (!secretKey) { setPayinErr('Enter secret key'); return; }
    try {
      const res = await fetch(`/api/instant-payin/${orderId}/submit-utr`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${secretKey}`
        },
        body: JSON.stringify({ utr: utr.trim() })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Submit UTR failed');
      setPayinMsg(`UTR submitted, status: ${json.status || json.message}`);
    } catch (e: any) {
      setPayinErr(e.message || 'Error submitting UTR');
    }
  };


  const fetchBalance = async () => {
    if (!secretKey) return;
    setBalanceLoading(true);
    try {
      const res = await fetch('/api/instant-payout/balance', {
        headers: { Authorization: `Bearer ${secretKey}` }
      });
      const json = await res.json();
      console.log('Balance API response:', json);
      if (res.ok) {
        setPayoutBalance(json.balance || 0);
        console.log('Set payout balance to:', json.balance || 0);
      } else {
        console.error('Balance API error:', json);
      }
    } catch (e) {
      console.error('Failed to fetch balance:', e);
    } finally {
      setBalanceLoading(false);
    }
  };

  const createPayout = async () => {
    setPayoutErr(''); setPayoutMsg('');
    if (!secretKey) { setPayoutErr('Enter secret key'); return; }
    if (!beneficiaryEmail) { setPayoutErr('Enter beneficiary email'); return; }
    if (!beneficiaryPhone) { setPayoutErr('Enter beneficiary phone'); return; }
    try {
      const res = await fetch('/api/instant-payout', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json', 
          Authorization: `Bearer ${secretKey}` 
        },
        body: JSON.stringify({
          amount: Number(payoutAmt),
          currency: 'INR',
          beneficiary_name: beneficiaryName || null,
          beneficiary_account: beneficiaryAccount || null,
          beneficiary_ifsc: beneficiaryIfsc || null,
          email: beneficiaryEmail,
          phone: beneficiaryPhone
        })
      });
      const json = await res.json();
      if (!res.ok) {
        if (json.details) {
          setPayoutErr(`${json.error}: ${json.details}`);
        } else {
          setPayoutErr(json?.error || 'Failed to create payout');
        }
        return;
      }
      setPayoutMsg('Payout created successfully!');
      // Refresh balance after successful payout
      fetchBalance();
    } catch (e: any) {
      setPayoutErr(e.message || 'Error creating payout');
    }
  };

  // Defer auth-based returns until after all hooks are declared
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-800 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }
  if (!isAuthenticated) return null;

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Instant Payout</h1>
          <p className="text-gray-600 dark:text-gray-400">Test payment and payout functionality with real-time callbacks.</p>
        </div>

        {/* Common Secret Key (PK) Section for both Pay-in and Payout */}
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Secret Key (PK)</label>
          <div className="relative">
            <input 
              className="border rounded px-3 py-2 w-full font-mono text-sm pr-10" 
              value={secretKey} 
              onChange={(e) => setSecretKey(e.target.value)} 
              placeholder="Enter your secret key (sk_live_...)" 
              type={showSecretKey ? "text" : "password"}
            />
            <button
              type="button"
              onClick={() => setShowSecretKey(!showSecretKey)}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
            >
              {showSecretKey ? '🙈' : '👁️'}
            </button>
          </div>
          <div className="flex flex-wrap gap-3 items-center mt-2">
            <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
              {secretKey ? <span className="text-green-600">✓</span> : <span className="text-orange-600">⚠</span>}
              <span>{secretKey ? 'Secret key entered' : 'Enter secret key to create orders and payouts'}</span>
            </div>
            <div className="ml-auto flex items-center gap-3">
              <button
                type="button"
                onClick={async () => {
                  if (!token) return;
                  try {
                    // First check if a key already exists in DB
                    const getRes = await fetch('/api/vendor/secret-key', {
                      headers: { Authorization: `Bearer ${token}` }
                    });
                    const getData = await getRes.json();
                    if (getRes.ok && getData?.success && getData?.data?.secret_key) {
                      setSecretKey(getData.data.secret_key);
                      setPayinMsg('Loaded existing secret key');
                      setPayinErr('');
                      return;
                    }

                    // If not exists, generate a new key
                    const response = await fetch('/api/vendor/secret-key', {
                      method: 'POST',
                      headers: { Authorization: `Bearer ${token}` }
                    });
                    const data = await response.json();
                    if (response.ok && data?.success && data?.data?.secret_key) {
                      setSecretKey(data.data.secret_key);
                      setPayinMsg('Secret key generated successfully');
                      setPayinErr('');
                    } else {
                      setPayinErr(data?.error || 'Failed to generate secret key');
                    }
                  } catch (error) {
                    setPayinErr('Failed to generate secret key');
                  }
                }}
                className="text-xs text-blue-600 hover:text-blue-800 underline"
              >
                Generate New Key
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (!token || !secretKey) return;
                  try {
                    const response = await fetch('/api/vendor/secret-key', {
                      method: 'PUT',
                      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                      body: JSON.stringify({ secret_key: secretKey })
                    });
                    const data = await response.json();
                    if (data.success) {
                      setPayinMsg('Secret key saved');
                      setPayinErr('');
                    } else {
                      setPayinErr(data?.error || 'Failed to save secret key');
                    }
                  } catch (error) {
                    setPayinErr('Failed to save secret key');
                  }
                }}
                className="text-xs text-green-600 hover:text-green-800 underline"
              >
                Save Key
              </button>
              <button
                type="button"
                onClick={fetchBalance}
                className="text-xs text-indigo-600 hover:text-indigo-800 underline"
                disabled={balanceLoading || !secretKey}
              >
                Refresh Balance
              </button>
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Pay-in Card */}
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-6">
            <h2 className="text-xl font-semibold mb-4">Pay-in</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">Create order, submit UTR, and observe callback events.</p>
            <div className="mb-4 text-center">
              {qrCode ? (
                <img src={qrCode} alt="Payment QR" className="w-48 h-48 inline-block border rounded" />
              ) : (
                <div className="w-48 h-48 inline-flex items-center justify-center bg-gray-100 dark:bg-gray-800 rounded">No QR</div>
              )}
              <div className="text-sm text-gray-700 dark:text-gray-300 mt-2">{businessName}</div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input className="border rounded px-3 py-2" value={merchantOrderId} onChange={(e) => setMerchantOrderId(e.target.value)} placeholder="Merchant Order ID" />
              <input className="border rounded px-3 py-2" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Amount" />
              <input className="border rounded px-3 py-2 md:col-span-2" value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Customer Name" />
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={createOrder} className="bg-indigo-600 text-white px-4 py-2 rounded" disabled={!secretKey}>
                Create Order
              </button>
              <button onClick={submitUtr} className="bg-blue-600 text-white px-4 py-2 rounded">Submit UTR</button>
           
            </div>
            {orderId && (
              <div className="mt-2 text-sm">
                <span className="text-gray-600 dark:text-gray-400">Order ID:</span> <span className="font-mono">{orderId}</span>
              </div>
            )}
            {(payinMsg || payinErr) && (
              <div className={`mt-3 p-2 rounded ${payinErr ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>{payinErr || payinMsg}</div>
            )}
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">UTR</label>
              <div className="flex gap-2">
                <input className="border rounded px-3 py-2 flex-1" value={utr} onChange={(e) => setUtr(e.target.value)} placeholder="Enter UTR" />
              </div>
            </div>
            <div className="mt-6">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold">Callback Events</h3>
                <span className="text-xs text-gray-500 dark:text-gray-400">token: {callbackToken}</span>
              </div>
              <div className="border rounded p-2 h-56 overflow-auto bg-gray-50 dark:bg-gray-800 text-xs">
                {events.length === 0 ? (
                  <div className="text-gray-500 dark:text-gray-400">No callbacks yet</div>
                ) : (
                  events.map((e, idx) => (
                    <div key={idx} className="mb-2">
                      <div className="text-gray-600 dark:text-gray-400">{new Date(e.receivedAt).toLocaleString()}</div>
                      <pre className="overflow-auto">{JSON.stringify(e.payload, null, 2)}</pre>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Payout Card */}
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-6">
            <h2 className="text-xl font-semibold mb-4">Payout</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">Create a payout to bank account (transfer).</p>
            
            {/* Balance Display */}
            <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Available Balance:</span>
                <div className="flex items-center gap-2">
                  {balanceLoading ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-indigo-600"></div>
                  ) : (
                    <span className="text-lg font-bold text-indigo-600">₹{payoutBalance.toLocaleString()}</span>
                  )}
                  <button 
                    onClick={fetchBalance} 
                    className="text-xs text-indigo-600 hover:text-indigo-800 underline"
                    disabled={balanceLoading}
                  >
                    Refresh
                  </button>
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input className="border rounded px-3 py-2" value={payoutAmt} onChange={(e) => setPayoutAmt(e.target.value)} placeholder="Amount" />
              <input className="border rounded px-3 py-2" value={beneficiaryName} onChange={(e) => setBeneficiaryName(e.target.value)} placeholder="Beneficiary Name" />
              <input className="border rounded px-3 py-2 md:col-span-2" value={beneficiaryAccount} onChange={(e) => setBeneficiaryAccount(e.target.value)} placeholder="Account Number" />
              <input className="border rounded px-3 py-2" value={beneficiaryIfsc} onChange={(e) => setBeneficiaryIfsc(e.target.value.toUpperCase())} placeholder="IFSC" />
              <input className="border rounded px-3 py-2" type="email" value={beneficiaryEmail} onChange={(e) => setBeneficiaryEmail(e.target.value)} placeholder="Beneficiary Email" />
              <input className="border rounded px-3 py-2" type="tel" value={beneficiaryPhone} onChange={(e) => setBeneficiaryPhone(e.target.value)} placeholder="Beneficiary Phone" />
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
                <span className="text-xs text-gray-500 dark:text-gray-400">token: {callbackToken}</span>
              </div>
              <div className="border rounded p-2 h-56 overflow-auto bg-gray-50 dark:bg-gray-800 text-xs">
                {payoutEvents.length === 0 ? (
                  <div className="text-gray-500 dark:text-gray-400">No callbacks yet</div>
                ) : (
                  payoutEvents.map((e, idx) => (
                    <div key={idx} className="mb-2">
                      <div className="text-gray-600 dark:text-gray-400">{new Date(e.receivedAt).toLocaleString()}</div>
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
