'use client';

import { useEffect, useState, useRef } from 'react';
import { 
  FiSmartphone, 
  FiCopy, 
  FiCheckCircle, 
  FiLoader, 
  FiAlertCircle, 
  FiCheck,
  FiChevronDown,
  FiChevronUp,
  FiSend
} from 'react-icons/fi';

interface Order {
  ztake_order_id: string;
  merchant_order_id: string;
  amount: number;
  currency: string;
  customer_name: string;
  status: string;
  vendor_id: number;
}

interface PaymentDetails {
  qr_code: string;
  upi_id: string;
  bank_name?: string;
  bank_account_holder?: string;
  bank_account_number?: string;
  bank_ifsc?: string;
}

export default function DemoPublicPaymentPage({ params }: { params: { orderId: string } }) {
  const [order, setOrder] = useState<Order | null>(null);
  const [paymentDetails, setPaymentDetails] = useState<PaymentDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Page state
  const [step, setStep] = useState<'pay' | 'polling' | 'succeeded' | 'failed'>('pay');
  const [utr, setUtr] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState<{ text: string; type: 'success' | 'warning' | 'error' } | null>(null);
  
  // UI toggles
  const [showQr, setShowQr] = useState(true);
  const [showSimulate, setShowSimulate] = useState(false);
  const [simulating, setSimulating] = useState(false);

  // Polling refs
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const pollingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Load Order and Payment Details
  useEffect(() => {
    const fetchOrderData = async () => {
      try {
        setLoading(true);
        // 1. Fetch Order Details (Public)
        const orderRes = await fetch(`/api/v1/orders/${params.orderId}`);
        if (!orderRes.ok) {
          throw new Error('Order not found or invalid link');
        }
        const orderData = await orderRes.json();
        const currentOrder = orderData.data;
        setOrder(currentOrder);

        // If order already succeeded, skip straight to success
        if (currentOrder.status === 'Succeeded' || currentOrder.status === 'SUCCEEDED' || currentOrder.status === 'completed') {
          setStep('succeeded');
          setLoading(false);
          return;
        }

        // 2. Fetch Merchant Details (Public - passing amount to generate dynamic QR)
        const detailsRes = await fetch(
          `/api/public/payment-details?vendor_id=${currentOrder.vendor_id}&amount=${currentOrder.amount}`
        );
        if (!detailsRes.ok) {
          throw new Error('Merchant payment configurations are invalid');
        }
        const detailsData = await detailsRes.json();
        setPaymentDetails(detailsData.data);

      } catch (err: any) {
        setError(err.message || 'Failed to load checkout details');
      } finally {
        setLoading(false);
      }
    };

    fetchOrderData();
  }, [params.orderId]);

  // Clean up polling
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

  const showNotice = (text: string, type: 'success' | 'warning' | 'error' = 'warning') => {
    setNotice({ text, type });
    setTimeout(() => setNotice(null), 3000);
  };

  const copyToClipboard = async (value: string, message: string) => {
    try {
      await navigator.clipboard.writeText(value);
      showNotice(message, 'success');
    } catch {
      showNotice('Failed to copy', 'error');
    }
  };

  // Submit UTR to verify
  const handleSubmitUtr = async () => {
    if (!order) return;
    if (!utr || utr.trim().length !== 12 || isNaN(Number(utr))) {
      showNotice('Please enter a valid 12-digit UPI UTR / Transaction ID', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/v1/orders/${order.ztake_order_id}/submit-utr`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ utr: utr.trim() })
      });
      
      const data = await res.json();

      if (!res.ok) {
        if (data?.code === 'UTR_ALREADY_USED') {
          showNotice('This UTR has already been used by another transaction.', 'error');
        } else if (data?.code === 'UTR_NOT_FOUND') {
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
      setSubmitting(false);
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
        raw_screen: `Back|Show menu|Received from ${order.customer_name}|${nowStr}|₹${order.amount} credited|See insights|Payment from PhonePe|Payment received from customer|Transaction details\nPayment method\nUPI\nUPI Transaction ID\n${utr.trim()}\nPaid via External app\nCustomer paid\n₹${order.amount}\nAmount you get\n₹${order.amount}`,
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
      startStatusPolling();
    } catch (err: any) {
      showNotice(err.message || 'Simulation failed', 'error');
    } finally {
      setSimulating(false);
    }
  };

  // Start polling checkout status
  const startStatusPolling = () => {
    if (!order) return;
    stopPolling();
    setStep('polling');

    pollingIntervalRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/v1/orders/${order.ztake_order_id}`);
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

    pollingTimeoutRef.current = setTimeout(() => {
      stopPolling();
      setStep('pay');
      showNotice('Verification timed out. You can re-submit the UTR or simulate again.', 'error');
    }, 60000);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col justify-center items-center p-6">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-4 font-medium">Opening secure checkout...</p>
      </div>
    );
  }

  if (error || !order || !paymentDetails) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col justify-center items-center p-6 text-center">
        <div className="w-16 h-16 bg-red-50 dark:bg-red-950/20 rounded-full flex items-center justify-center text-red-500 mb-4">
          <FiAlertCircle className="w-8 h-8" />
        </div>
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">Checkout Error</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 max-w-xs">{error || 'This checkout page is invalid or expired.'}</p>
      </div>
    );
  }

  const upiUrl = `upi://pay?pa=${paymentDetails.upi_id}&pn=ZtakeMerchant&am=${order.amount}&cu=INR`;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-gray-900 dark:text-white flex flex-col items-center">
      {/* Mobile-first wrapper */}
      <div className="w-full max-w-[480px] bg-white dark:bg-gray-900 min-h-screen shadow-lg flex flex-col justify-between border-x border-gray-100 dark:border-gray-800/40 relative">
        
        {/* Main Content */}
        <div className="flex-1 p-5 space-y-5 overflow-y-auto pb-10">
          
          {/* Header */}
          <div className="flex items-center justify-between border-b pb-4 dark:border-gray-800">
            <div>
              <span className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Merchant</span>
              <h2 className="text-base font-extrabold text-gray-800 dark:text-white truncate max-w-[200px]">Demo Merchant</h2>
            </div>
            <div className="text-right">
              <span className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Order Reference</span>
              <p className="text-xs font-mono text-gray-600 dark:text-gray-400 truncate max-w-[120px]">{order.ztake_order_id}</p>
            </div>
          </div>

          {/* STEP 1: PAYMENT WIDGET */}
          {step === 'pay' && (
            <>
              {/* Payment Amount Display */}
              <div className="text-center py-6 bg-indigo-50/50 dark:bg-indigo-950/20 rounded-2xl border border-indigo-100/30">
                <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">Total Amount to Pay</p>
                <h1 className="text-4xl font-black text-indigo-600 dark:text-indigo-400 mt-1">₹{order.amount.toFixed(2)}</h1>
                <p className="text-xs text-gray-400 mt-2 font-medium">Please pay the exact amount to verify automatically.</p>
              </div>

              {/* UPI Pay CTA Buttons */}
              <div className="space-y-3">
                <a 
                  href={upiUrl}
                  className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white font-bold rounded-xl transition-all shadow-md flex items-center justify-center space-x-2.5 text-base"
                >
                  <FiSmartphone className="w-5 h-5" />
                  <span>Pay with any UPI App</span>
                </a>

                {/* Sub-app Launch links */}
                <div className="grid grid-cols-3 gap-2 text-xs font-bold">
                  <a 
                    href={upiUrl.replace('upi://', 'phonepe://')}
                    className="flex flex-col items-center justify-center py-2.5 bg-slate-50 dark:bg-slate-800 border rounded-xl hover:bg-slate-100 transition-colors"
                  >
                    <span className="text-purple-600 mb-0.5">PhonePe</span>
                  </a>
                  <a 
                    href={upiUrl.replace('upi://', 'gpay://')}
                    className="flex flex-col items-center justify-center py-2.5 bg-slate-50 dark:bg-slate-800 border rounded-xl hover:bg-slate-100 transition-colors"
                  >
                    <span className="text-blue-500 mb-0.5">Google Pay</span>
                  </a>
                  <a 
                    href={upiUrl.replace('upi://', 'paytmmp://')}
                    className="flex flex-col items-center justify-center py-2.5 bg-slate-50 dark:bg-slate-800 border rounded-xl hover:bg-slate-100 transition-colors"
                  >
                    <span className="text-sky-500 mb-0.5">Paytm</span>
                  </a>
                </div>
              </div>

              {/* Show QR Code toggle */}
              <div className="border border-slate-100 dark:border-gray-800/80 rounded-2xl overflow-hidden shadow-sm">
                <button 
                  onClick={() => setShowQr(!showQr)}
                  className="w-full px-4 py-3.5 bg-slate-50 dark:bg-slate-800 flex items-center justify-between text-sm font-semibold text-gray-700 dark:text-gray-300"
                >
                  <span className="flex items-center gap-2">
                    <FiSmartphone className="text-indigo-500" />
                    <span>Show UPI QR Code</span>
                  </span>
                  {showQr ? <FiChevronUp /> : <FiChevronDown />}
                </button>

                {showQr && (
                  <div className="p-5 flex flex-col items-center bg-white dark:bg-gray-900 border-t dark:border-gray-850">
                    {paymentDetails.qr_code ? (
                      <div className="bg-white p-2.5 rounded-xl border shadow-sm">
                        <img src={paymentDetails.qr_code} alt="UPI QR" className="w-40 h-40" />
                      </div>
                    ) : (
                      <div className="w-40 h-40 bg-slate-100 rounded-xl flex items-center justify-center text-xs text-gray-400">QR Generation Failed</div>
                    )}
                    
                    <div className="w-full text-center mt-4">
                      <span className="text-[10px] uppercase text-gray-400 dark:text-gray-500 tracking-wider">Merchant VPA ID</span>
                      <div className="flex items-center justify-center gap-1.5 mt-0.5">
                        <code className="text-xs font-mono bg-slate-50 dark:bg-slate-800 px-2 py-1 rounded border truncate max-w-[200px]">{paymentDetails.upi_id}</code>
                        <button 
                          onClick={() => copyToClipboard(paymentDetails.upi_id, 'UPI ID copied!')}
                          className="p-1.5 bg-slate-50 dark:bg-slate-800 border rounded-lg hover:bg-slate-100"
                        >
                          <FiCopy className="w-3.5 h-3.5 text-gray-500" />
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* UTR Input Form */}
              <div className="space-y-3 bg-white dark:bg-gray-900 rounded-2xl p-1 border dark:border-gray-800">
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300">
                  Enter 12-Digit UPI Ref Number (UTR)
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={12}
                    className="w-full px-4 py-3.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-mono text-sm focus:ring-2 focus:ring-indigo-500 outline-none placeholder:text-gray-400"
                    placeholder="Enter UPI Ref No. (e.g. 039518224994)"
                    value={utr}
                    onChange={(e) => setUtr(e.target.value.replace(/[^0-9]/g, ''))}
                  />
                  <button
                    onClick={handleSubmitUtr}
                    disabled={submitting || utr.trim().length !== 12}
                    className="px-5 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-all shadow-md disabled:opacity-50 text-sm whitespace-nowrap"
                  >
                    {submitting ? 'Submitting...' : 'Submit UTR'}
                  </button>
                </div>
                <p className="text-[11px] text-gray-400 leading-normal">
                  Important: After making payment in your UPI App, find the 12-digit UTR/UPI Transaction ID in the transaction history and enter it above to verify.
                </p>
              </div>

              {notice && (
                <div className={`p-4 rounded-xl flex items-start gap-3 border text-xs font-semibold ${
                  notice.type === 'success' ? 'bg-green-50 border-green-200 text-green-700 dark:bg-green-950/20 dark:border-green-800 dark:text-green-400' :
                  notice.type === 'error' ? 'bg-red-50 border-red-200 text-red-700 dark:bg-red-950/20 dark:border-red-800 dark:text-red-400' :
                  'bg-yellow-50 border-yellow-200 text-yellow-700 dark:bg-yellow-950/20 dark:border-yellow-800 dark:text-yellow-400'
                }`}>
                  {notice.type === 'success' ? <FiCheck className="w-4 h-4 shrink-0" /> : <FiAlertCircle className="w-4 h-4 shrink-0" />}
                  <span>{notice.text}</span>
                </div>
              )}

              {/* Collapsible Webhook Simulator for Testing */}
              <div className="border border-slate-100 dark:border-gray-800 rounded-xl overflow-hidden">
                <button 
                  onClick={() => setShowSimulate(!showSimulate)}
                  className="w-full px-4 py-3.5 bg-slate-50 dark:bg-slate-800 flex items-center justify-between text-xs font-semibold text-gray-600 dark:text-gray-400"
                >
                  <span className="flex items-center gap-1.5">
                    <FiSmartphone />
                    <span>Demo Tools: Simulate Webhook</span>
                  </span>
                  {showSimulate ? <FiChevronUp /> : <FiChevronDown />}
                </button>

                {showSimulate && (
                  <div className="p-4 bg-slate-50/50 dark:bg-slate-900 border-t dark:border-gray-800 space-y-3">
                    <p className="text-xs text-gray-500 leading-normal">
                      Click below to simulate an incoming bank notification webhook matching the UTR you entered. This verifies the webhook matching flow.
                    </p>
                    <button
                      onClick={handleSimulateWebhook}
                      disabled={simulating || utr.trim().length !== 12}
                      className="w-full py-2.5 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:hover:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 text-xs font-bold rounded-lg transition-colors border border-indigo-100 dark:border-indigo-900/40 flex items-center justify-center space-x-1.5 disabled:opacity-40"
                    >
                      {simulating ? <FiLoader className="animate-spin" /> : <FiSend />}
                      <span>Simulate Bank Webhook</span>
                    </button>
                  </div>
                )}
              </div>
            </>
          )}

          {/* STEP 2: POLLING VERIFICATION */}
          {step === 'polling' && (
            <div className="text-center py-20 space-y-6">
              <div className="mx-auto w-16 h-16 rounded-full bg-indigo-50 dark:bg-indigo-950/40 flex items-center justify-center">
                <FiLoader className="h-8 w-8 text-indigo-600 dark:text-indigo-400 animate-spin" />
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Confirming Payment</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 max-w-[280px] mx-auto leading-relaxed">
                  Waiting for the bank to deliver webhook confirmation matching your UTR. This screen will update automatically.
                </p>
              </div>
            </div>
          )}

          {/* STEP 3: SUCCESS GREEN RECEIPT */}
          {step === 'succeeded' && (
            <div className="text-center py-12 space-y-6 animate-fade-in">
              <div className="mx-auto w-20 h-20 rounded-full bg-emerald-50 dark:bg-emerald-950/30 flex items-center justify-center animate-bounce">
                <FiCheckCircle className="h-12 w-12 text-emerald-500" />
              </div>
              
              <div className="space-y-1.5">
                <h2 className="text-2xl font-black text-emerald-600 dark:text-emerald-400">Payment Successful</h2>
                <p className="text-xs text-gray-400">Your transaction has been verified by the bank webhook.</p>
              </div>

              {/* Receipt card */}
              <div className="bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 rounded-2xl p-5 text-left text-xs space-y-3.5">
                <div className="flex justify-between border-b pb-2.5 dark:border-gray-700">
                  <span className="text-gray-400">Transaction ID</span>
                  <span className="font-semibold text-gray-800 dark:text-white font-mono">{params.orderId}</span>
                </div>
                <div className="flex justify-between border-b pb-2.5 dark:border-gray-700">
                  <span className="text-gray-400">Customer Name</span>
                  <span className="font-semibold text-gray-800 dark:text-white">{order.customer_name}</span>
                </div>
                <div className="flex justify-between border-b pb-2.5 dark:border-gray-700">
                  <span className="text-gray-400">UTR / Ref Number</span>
                  <span className="font-semibold text-gray-800 dark:text-white font-mono">{utr || 'Verified'}</span>
                </div>
                <div className="flex justify-between pt-1">
                  <span className="text-gray-400">Amount Paid</span>
                  <span className="font-extrabold text-emerald-600 dark:text-emerald-400 text-sm">₹{order.amount.toFixed(2)}</span>
                </div>
              </div>

              <div className="bg-slate-50 dark:bg-slate-800/20 p-4 rounded-xl text-xs text-gray-400 font-medium">
                You may now close this page or return to the merchant application.
              </div>
            </div>
          )}

        </div>

        {/* Footer Branding */}
        <div className="py-4 text-center border-t border-gray-150 dark:border-gray-800 bg-slate-50/50 dark:bg-slate-900 text-[10px] text-gray-400 tracking-wider uppercase font-semibold">
          Powered by Ztake Payments
        </div>
      </div>
    </div>
  );
}
