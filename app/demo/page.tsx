'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/context';
import Layout from '@/components/Layout';
import { 
  FiPlayCircle, 
  FiArrowLeft, 
  FiSmartphone, 
  FiCopy, 
  FiCheckCircle, 
  FiLoader, 
  FiDollarSign, 
  FiSend, 
  FiClock, 
  FiCheck, 
  FiUser, 
  FiAlertCircle 
} from 'react-icons/fi';

interface DemoOrder {
  ztakeOrderId: string;
  amount: number;
  customerName: string;
  upiUrl: string;
  qrCodeUrl: string;
  upiId: string;
  status: string;
}

export default function DemoPayinPage() {
  const { isAuthenticated, isLoading, token } = useAuth();
  const router = useRouter();

  // Page states
  const [step, setStep] = useState<'create' | 'pay' | 'polling' | 'succeeded' | 'failed'>('create');
  
  // Create Form State
  const [amount, setAmount] = useState('5.00');
  const [customerName, setCustomerName] = useState('Demo Customer');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  // Active Order State
  const [order, setOrder] = useState<DemoOrder | null>(null);
  
  // Pay Page State
  const [utr, setUtr] = useState('');
  const [submittingUtr, setSubmittingUtr] = useState(false);
  const [payNotice, setPayNotice] = useState<{ text: string; type: 'success' | 'warning' | 'error' } | null>(null);
  
  // Simulation State
  const [simulating, setSimulating] = useState(false);
  
  // Polling reference
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const pollingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, isLoading, router]);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      stopPolling();
    };
  }, []);

  const stopPolling = () => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
    if (pollingTimeoutRef.current) {
      clearTimeout(pollingTimeoutRef.current);
      pollingTimeoutRef.current = null;
    }
  };

  const copyToClipboard = async (value: string, message: string) => {
    try {
      await navigator.clipboard.writeText(value);
      showNotice(message, 'success');
    } catch {
      showNotice('Failed to copy', 'error');
    }
  };

  const showNotice = (text: string, type: 'success' | 'warning' | 'error' = 'warning') => {
    setPayNotice({ text, type });
    setTimeout(() => setPayNotice(null), 3000);
  };

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt < 5) {
      setCreateError('Amount must be at least ₹5');
      return;
    }

    setCreating(true);
    setCreateError('');
    try {
      const res = await fetch('/api/vendor/demo-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ amount: amt, customerName })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to create demo order');
      }

      setOrder({
        ztakeOrderId: data.ztakeOrderId,
        amount: data.amount,
        customerName: data.customerName,
        upiUrl: data.upiUrl,
        qrCodeUrl: data.qrCodeUrl,
        upiId: data.upiId,
        status: data.status
      });
      setUtr('');
      setStep('pay');
    } catch (err: any) {
      setCreateError(err.message || 'Error occurred. Please verify UPI ID is set in Profile/UPI credentials settings.');
    } finally {
      setCreating(false);
    }
  };

  // Submit UTR manually (triggers matching)
  const handleSubmitUtr = async () => {
    if (!order) return;
    if (!utr || utr.trim().length !== 12 || isNaN(Number(utr))) {
      showNotice('Please enter a valid 12-digit UPI UTR / Transaction ID', 'error');
      return;
    }

    setSubmittingUtr(true);
    try {
      const res = await fetch(`/api/v1/orders/${order.ztakeOrderId}/submit-utr`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ utr: utr.trim() })
      });
      
      const data = await res.json();

      if (!res.ok) {
        if (data?.code === 'UTR_ALREADY_USED') {
          showNotice('This UTR has already been used by another transaction.', 'error');
        } else if (data?.code === 'UTR_NOT_FOUND') {
          // UTR was submitted but no matching webhook has arrived yet. Start polling!
          showNotice('UTR submitted. Waiting for bank webhook to verify...', 'warning');
          startStatusPolling();
        } else {
          showNotice(data?.message || 'Failed to submit UTR', 'error');
        }
        return;
      }

      if (data?.verified) {
        setStep('succeeded');
      } else {
        showNotice('Payment submitted. Waiting for bank verification...', 'warning');
        startStatusPolling();
      }
    } catch (err: any) {
      showNotice(err.message || 'Error submitting UTR', 'error');
    } finally {
      setSubmittingUtr(false);
    }
  };

  // Simulate GPay Business bank notification webhook
  const handleSimulateWebhook = async () => {
    if (!order) return;
    if (!utr || utr.trim().length !== 12 || isNaN(Number(utr))) {
      showNotice('Please enter a 12-digit UTR first so we can simulate matching it!', 'error');
      return;
    }

    setSimulating(true);
    try {
      const nowStr = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
      const payload = {
        amount: `+ ₹${order.amount}`,
        time: nowStr,
        raw_screen: `Back|Show menu|Received from ${order.customerName}|${nowStr}|₹${order.amount} credited|See insights|Payment from PhonePe|Payment received from customer|Transaction details\nPayment method\nUPI\nUPI Transaction ID\n${utr.trim()}\nPaid via External app\nCustomer paid\n₹${order.amount}\nAmount you get\n₹${order.amount}`,
        source: 'gpay_business',
        timestamp: Math.floor(Date.now() / 1000).toString()
      };

      const res = await fetch('/api/webhooks/bank', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        throw new Error('Simulated Webhook failed to process');
      }

      showNotice('Webhook processed successfully! Checking status...', 'success');
      
      // Auto submit UTR or poll to confirm it matched!
      startStatusPolling();
    } catch (err: any) {
      showNotice(err.message || 'Simulation failed', 'error');
    } finally {
      setSimulating(false);
    }
  };

  // Status Polling logic
  const startStatusPolling = () => {
    if (!order) return;
    stopPolling();
    setStep('polling');

    // Poll every 3 seconds
    pollingIntervalRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/v1/orders/${order.ztakeOrderId}`);
        if (res.ok) {
          const body = await res.json();
          const currentOrder = body.data;
          
          if (currentOrder && (currentOrder.status === 'Succeeded' || currentOrder.status === 'SUCCEEDED' || currentOrder.status === 'completed')) {
            stopPolling();
            setStep('succeeded');
          }
        }
      } catch (e) {
        console.error('Polling error:', e);
      }
    }, 3000);

    // Timeout after 60 seconds
    pollingTimeoutRef.current = setTimeout(() => {
      stopPolling();
      setStep('pay');
      showNotice('Verification timed out. You can re-submit the UTR or simulate again.', 'error');
    }, 60000);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto space-y-6 transition-all duration-300">
        
        {/* Header section */}
        <div className="flex items-center justify-between bg-white dark:bg-gray-900 rounded-2xl shadow-sm p-6 border border-gray-100 dark:border-gray-800">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-indigo-50 dark:bg-indigo-950/40 rounded-xl">
              <FiPlayCircle className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white">Demo Payin Dashboard</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">Test and verify UPI QR payments, custom app links, and bank webhook matching.</p>
            </div>
          </div>
          {step !== 'create' && (
            <button 
              onClick={() => {
                stopPolling();
                setStep('create');
              }}
              className="flex items-center space-x-1.5 text-sm font-semibold text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              <FiArrowLeft />
              <span>New Test</span>
            </button>
          )}
        </div>

        {/* STEP 1: CREATE TEST PAYIN */}
        {step === 'create' && (
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-md p-8 border border-gray-100 dark:border-gray-800 space-y-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Configure Demo Payin</h2>
            <form onSubmit={handleCreateOrder} className="space-y-6 max-w-lg">
              
              <div className="form-group space-y-2">
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Transaction Amount (Min ₹5)
                </label>
                <div className="relative rounded-xl shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-gray-400 font-medium">₹</span>
                  </div>
                  <input
                    type="number"
                    step="0.01"
                    min="5"
                    max="100000"
                    required
                    className="w-full pl-8 pr-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                    placeholder="5.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-group space-y-2">
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Customer Name
                </label>
                <div className="relative rounded-xl shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FiUser className="text-gray-400" />
                  </div>
                  <input
                    type="text"
                    required
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                    placeholder="Customer Name"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                  />
                </div>
              </div>

              {createError && (
                <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-xl p-4 flex items-start gap-3">
                  <FiAlertCircle className="text-red-500 w-5 h-5 shrink-0 mt-0.5" />
                  <p className="text-sm text-red-600 dark:text-red-400 font-medium">{createError}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={creating}
                className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl transition-all shadow-md shadow-indigo-100 dark:shadow-none flex items-center justify-center space-x-2 disabled:opacity-50"
              >
                {creating ? (
                  <>
                    <FiLoader className="animate-spin" />
                    <span>Creating Transaction...</span>
                  </>
                ) : (
                  <>
                    <FiPlayCircle className="w-5 h-5" />
                    <span>Generate Payment QR</span>
                  </>
                )}
              </button>

            </form>
          </div>
        )}

        {/* STEP 2: ACTIVE CHECKOUT WIDGET */}
        {step === 'pay' && order && (
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            
            {/* Checkout Widget Left Column */}
            <div className="lg:col-span-3 bg-white dark:bg-gray-900 rounded-2xl shadow-md p-6 border border-gray-100 dark:border-gray-800 space-y-6">
              <div>
                <h2 className="text-lg font-bold text-gray-950 dark:text-white">Pay Order</h2>
                <p className="text-xs text-gray-500 dark:text-gray-400 font-mono mt-0.5">Order ID: {order.ztakeOrderId}</p>
              </div>

              {/* Order Info Row */}
              <div className="bg-slate-50 dark:bg-slate-800/40 rounded-xl p-4 grid grid-cols-2 gap-4 border border-slate-100 dark:border-slate-800">
                <div>
                  <span className="block text-xs text-gray-500">Customer</span>
                  <span className="font-semibold text-gray-900 dark:text-white">{order.customerName}</span>
                </div>
                <div>
                  <span className="block text-xs text-gray-500">Amount</span>
                  <span className="font-bold text-indigo-600 dark:text-indigo-400 text-lg">₹{order.amount.toFixed(2)}</span>
                </div>
              </div>

              {/* UPI Pay Widget */}
              <div className="bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/30 rounded-2xl p-5 space-y-4">
                <div className="text-center sm:text-left font-bold text-sm text-indigo-950 dark:text-indigo-300">Scan & Pay via UPI</div>
                
                <div className="flex flex-col sm:flex-row items-center gap-6">
                  {order.qrCodeUrl ? (
                    <div className="bg-white p-2 rounded-xl border border-indigo-100 shadow-sm shrink-0">
                      <img src={order.qrCodeUrl} alt="UPI Payment QR" className="w-36 h-36" />
                    </div>
                  ) : (
                    <div className="w-36 h-36 bg-gray-100 rounded-xl flex items-center justify-center text-xs text-gray-400">QR Generation Failed</div>
                  )}

                  <div className="space-y-3 w-full">
                    <div>
                      <span className="block text-xs text-gray-500">UPI Address / VPA</span>
                      <div className="flex items-center gap-2 mt-1">
                        <code className="bg-white dark:bg-gray-800 px-2.5 py-1.5 rounded-lg border text-sm font-mono text-gray-900 dark:text-white block w-full truncate">{order.upiId}</code>
                        <button 
                          onClick={() => copyToClipboard(order.upiId, 'UPI ID copied!')}
                          className="p-2.5 bg-white dark:bg-gray-800 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                          title="Copy UPI ID"
                        >
                          <FiCopy className="text-gray-600 dark:text-gray-300" />
                        </button>
                      </div>
                    </div>
                    
                    {/* Pay via UPI apps deep-links */}
                    <div>
                      <span className="block text-xs text-gray-500 mb-2">Open directly in app:</span>
                      <div className="grid grid-cols-2 gap-2">
                        <a 
                          href={order.upiUrl}
                          className="flex items-center justify-center space-x-1.5 py-2 px-3 bg-white dark:bg-gray-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg text-xs font-semibold text-gray-700 dark:text-gray-300 transition-colors"
                        >
                          <FiSmartphone className="text-indigo-500" />
                          <span>Any UPI App</span>
                        </a>
                        <a 
                          href={order.upiUrl.replace('upi://', 'phonepe://')}
                          className="flex items-center justify-center space-x-1.5 py-2 px-3 bg-purple-50 hover:bg-purple-100/80 rounded-lg text-xs font-semibold text-purple-700 transition-colors border border-purple-100"
                        >
                          <span>PhonePe</span>
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* UTR Input Form */}
              <div className="space-y-3">
                <label className="block text-sm font-bold text-gray-800 dark:text-gray-200">Submit UTR / UPI Ref Number</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    maxLength={12}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-mono text-sm focus:ring-2 focus:ring-indigo-500 outline-none placeholder:text-gray-400"
                    placeholder="e.g. 039518224994"
                    value={utr}
                    onChange={(e) => setUtr(e.target.value.replace(/[^0-9]/g, ''))}
                  />
                  <button
                    onClick={handleSubmitUtr}
                    disabled={submittingUtr || utr.trim().length !== 12}
                    className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl transition-all shadow-md shadow-indigo-100 dark:shadow-none disabled:opacity-50 whitespace-nowrap"
                  >
                    {submittingUtr ? 'Submitting...' : 'Submit UTR'}
                  </button>
                </div>
                <p className="text-xs text-gray-500">Provide the 12-digit transaction ID shown on the payment receipt.</p>
              </div>

              {payNotice && (
                <div className={`p-4 rounded-xl flex items-start gap-3 border text-sm font-medium ${
                  payNotice.type === 'success' ? 'bg-green-50 border-green-200 text-green-700 dark:bg-green-950/20 dark:border-green-800 dark:text-green-400' :
                  payNotice.type === 'error' ? 'bg-red-50 border-red-200 text-red-700 dark:bg-red-950/20 dark:border-red-800 dark:text-red-400' :
                  'bg-yellow-50 border-yellow-200 text-yellow-700 dark:bg-yellow-950/20 dark:border-yellow-800 dark:text-yellow-400'
                }`}>
                  {payNotice.type === 'success' ? <FiCheck className="w-5 h-5 shrink-0 mt-0.5" /> : <FiAlertCircle className="w-5 h-5 shrink-0 mt-0.5" />}
                  <span>{payNotice.text}</span>
                </div>
              )}

            </div>

            {/* Simulation Sidebar Column */}
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
                <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                  <FiSmartphone className="text-indigo-600 dark:text-indigo-400" />
                  <span>Simulate Webhook Notification</span>
                </h3>
                <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                  In a production environment, the bank notification app (like Tasker) automatically forwards GPay/PhonePe business notifications to your webhook URL, verifying the order instantly.
                </p>
                <div className="bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100/40 rounded-xl p-3.5 space-y-2 text-xs">
                  <p className="font-semibold text-indigo-950 dark:text-indigo-300">How to test simulation:</p>
                  <ol className="list-decimal pl-4 space-y-1 text-gray-600 dark:text-gray-400">
                    <li>Enter any dummy 12-digit number in the UTR input box (e.g., <code className="font-mono bg-white dark:bg-gray-800 px-1 border rounded">039518224994</code>).</li>
                    <li>Click the <strong>Simulate Webhook</strong> button.</li>
                    <li>The system will match the simulated payload against your order, verification succeeds, and syncs status automatically.</li>
                  </ol>
                </div>
                
                <button
                  onClick={handleSimulateWebhook}
                  disabled={simulating || utr.trim().length !== 12}
                  className="w-full py-3 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-semibold rounded-xl transition-all shadow-md flex items-center justify-center space-x-2 disabled:opacity-40"
                >
                  {simulating ? (
                    <>
                      <FiLoader className="animate-spin" />
                      <span>Processing webhook...</span>
                    </>
                  ) : (
                    <>
                      <FiSend className="w-4 h-4" />
                      <span>Simulate Webhook Event</span>
                    </>
                  )}
                </button>
              </div>

              {/* API Details Card */}
              <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-6 shadow-sm space-y-3">
                <h4 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Webhook Endpoint Link</h4>
                <div className="flex items-center gap-1">
                  <input 
                    readOnly 
                    value="https://ztake.in/api/webhooks/bank" 
                    className="bg-slate-50 dark:bg-slate-800 border text-xs font-mono p-2.5 rounded-lg w-full text-gray-700 dark:text-gray-300" 
                  />
                  <button 
                    onClick={() => copyToClipboard('https://ztake.in/api/webhooks/bank', 'Webhook URL copied!')}
                    className="p-2.5 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
                  >
                    <FiCopy className="text-gray-600" />
                  </button>
                </div>
              </div>
            </div>

          </div>
        )}

        {/* STEP 3: POLLING VERIFICATION STATE */}
        {step === 'polling' && (
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-md p-16 border border-gray-100 dark:border-gray-800 text-center space-y-6">
            <div className="mx-auto w-20 h-20 rounded-full bg-indigo-50 dark:bg-indigo-950/40 flex items-center justify-center">
              <FiLoader className="h-10 w-10 text-indigo-600 dark:text-indigo-400 animate-spin" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Verifying Transaction</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 max-w-md mx-auto">
                Waiting for the bank webhook to deliver payment confirmation matching your UTR. This page will update automatically.
              </p>
            </div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-100 dark:border-yellow-900/30 text-yellow-700 dark:text-yellow-400 text-xs font-semibold rounded-full">
              <FiClock className="animate-pulse" />
              <span>Checking status...</span>
            </div>
          </div>
        )}

        {/* STEP 4: SUCCESS VERIFIED STATE */}
        {step === 'succeeded' && order && (
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-md p-10 border border-gray-100 dark:border-gray-800 text-center space-y-8 max-w-2xl mx-auto">
            <div className="mx-auto w-24 h-24 rounded-full bg-green-50 dark:bg-green-950/30 flex items-center justify-center animate-bounce">
              <FiCheckCircle className="h-14 w-14 text-green-500" />
            </div>
            
            <div className="space-y-2">
              <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white">Payment Verified</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">The webhook matches and has successfully updated the dashboard stats.</p>
            </div>

            {/* Receipt Summary */}
            <div className="bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 rounded-2xl p-6 text-left space-y-4">
              <div className="flex justify-between border-b pb-3 dark:border-gray-700">
                <span className="text-gray-500 text-sm">ZTake Order ID</span>
                <span className="font-semibold text-gray-900 dark:text-white font-mono">{order.ztakeOrderId}</span>
              </div>
              <div className="flex justify-between border-b pb-3 dark:border-gray-700">
                <span className="text-gray-500 text-sm">Customer Name</span>
                <span className="font-semibold text-gray-900 dark:text-white">{order.customerName}</span>
              </div>
              <div className="flex justify-between border-b pb-3 dark:border-gray-700">
                <span className="text-gray-500 text-sm">UTR Number</span>
                <span className="font-semibold text-gray-900 dark:text-white font-mono">{utr || 'Matched via Webhook'}</span>
              </div>
              <div className="flex justify-between pt-1">
                <span className="text-gray-500 text-sm">Amount Paid</span>
                <span className="font-extrabold text-green-600 dark:text-green-400 text-lg">₹{order.amount.toFixed(2)}</span>
              </div>
            </div>

            <div className="flex gap-4">
              <button
                onClick={() => setStep('create')}
                className="w-full py-3 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-semibold rounded-xl transition-all"
              >
                Create Another Test
              </button>
              <button
                onClick={() => router.push('/dashboard')}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl transition-all"
              >
                Go to Dashboard
              </button>
            </div>
          </div>
        )}

      </div>
    </Layout>
  );
}
