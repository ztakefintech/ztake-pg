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
  qr_code: string | null;
  upi_id: string;
  bank_name?: string;
  bank_account_holder?: string;
  bank_account_number?: string;
  bank_ifsc?: string;
}

export default function PublicPaymentPage({ params }: { params: { orderId: string } }) {
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
  const [showBank, setShowBank] = useState(false);

  // Polling refs
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const pollingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Load Order and Payment Details
  useEffect(() => {
    const fetchOrderData = async () => {
      try {
        setLoading(true);
        // 1. Fetch Order Details (Public API)
        const orderRes = await fetch(`/api/v1/orders/${params.orderId}`);
        if (!orderRes.ok) {
          throw new Error('Order not found or this payment link is invalid.');
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

        // 2. Fetch Merchant Payment Details (Public API - QR, UPI, Bank)
        if (currentOrder.vendor_id) {
          const detailsRes = await fetch(
            `/api/public/payment-details?vendor_id=${currentOrder.vendor_id}&amount=${currentOrder.amount}`
          );
          if (detailsRes.ok) {
            const detailsData = await detailsRes.json();
            if (detailsData.success) {
              setPaymentDetails(detailsData.data);
            }
          }
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load payment details.');
      } finally {
        setLoading(false);
      }
    };

    fetchOrderData();
  }, [params.orderId]);

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

  const showNotice = (text: string, type: 'success' | 'warning' | 'error' = 'warning') => {
    setNotice({ text, type });
    setTimeout(() => setNotice(null), 4000);
  };

  const copyToClipboard = async (value: string, message: string) => {
    try {
      await navigator.clipboard.writeText(value);
      showNotice(message, 'success');
    } catch {
      showNotice('Failed to copy', 'error');
    }
  };

  // Submit UTR
  const handleSubmitUtr = async () => {
    if (!order) return;
    const trimmedUtr = utr.trim();
    if (!trimmedUtr || trimmedUtr.length < 6) {
      showNotice('Please enter a valid UPI Transaction ID / UTR number.', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/v1/orders/${order.ztake_order_id}/submit-utr`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ utr: trimmedUtr })
      });
      
      const data = await res.json();

      if (!res.ok) {
        if (data?.code === 'UTR_ALREADY_USED') {
          showNotice('This UTR has already been used for another transaction.', 'error');
        } else {
          showNotice(data?.message || 'Failed to submit UTR. Please try again.', 'error');
          // Even on error, start polling in case webhook arrives later
          startStatusPolling();
        }
        return;
      }

      if (data?.verified) {
        setStep('succeeded');
      } else {
        showNotice('UTR submitted! Waiting for bank verification...', 'warning');
        startStatusPolling();
      }
    } catch (err: any) {
      showNotice(err.message || 'Network error submitting UTR.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Start polling order status
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

    // Timeout after 2 minutes
    pollingTimeoutRef.current = setTimeout(() => {
      stopPolling();
      setStep('pay');
      showNotice('Verification is taking longer than expected. You can re-submit the UTR or contact the merchant.', 'warning');
    }, 120000);
  };

  // --- RENDER ---

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 flex flex-col justify-center items-center p-6">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-4 font-medium">Loading secure checkout...</p>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 flex flex-col justify-center items-center p-6 text-center">
        <div className="w-16 h-16 bg-red-50 dark:bg-red-950/20 rounded-full flex items-center justify-center text-red-500 mb-4">
          <FiAlertCircle className="w-8 h-8" />
        </div>
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">Payment Link Error</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 max-w-xs">{error || 'This payment link is invalid or has expired.'}</p>
      </div>
    );
  }

  const upiId = paymentDetails?.upi_id || '';
  const upiUrl = upiId ? `upi://pay?pa=${encodeURIComponent(upiId)}&pn=Merchant&am=${order.amount}&cu=INR` : '';

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 text-gray-900 dark:text-white flex flex-col items-center">
      {/* Mobile-first centered wrapper */}
      <div className="w-full max-w-[480px] bg-white dark:bg-gray-900 min-h-screen shadow-xl flex flex-col border-x border-gray-100 dark:border-gray-800/40">
        
        {/* Main scrollable content */}
        <div className="flex-1 p-5 space-y-5 overflow-y-auto">
          
          {/* Header */}
          <div className="flex items-center justify-between border-b pb-4 dark:border-gray-800">
            <div>
              <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">Secure Checkout</span>
              <h2 className="text-base font-extrabold text-gray-800 dark:text-white">Ztake Payments</h2>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">Order ID</span>
              <p className="text-[11px] font-mono text-gray-500 dark:text-gray-400 truncate max-w-[130px]">{order.ztake_order_id}</p>
            </div>
          </div>

          {/* === STEP: PAY === */}
          {step === 'pay' && (
            <>
              {/* Amount Card */}
              <div className="text-center py-7 bg-gradient-to-br from-indigo-50 to-violet-50 dark:from-indigo-950/30 dark:to-violet-950/20 rounded-2xl border border-indigo-100/50 dark:border-indigo-900/30">
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400">Total Amount</p>
                <h1 className="text-[42px] font-black text-indigo-600 dark:text-indigo-400 leading-tight mt-0.5">
                  ₹{Number(order.amount).toFixed(2)}
                </h1>
                {order.customer_name && (
                  <p className="text-[11px] text-gray-400 mt-1.5 font-medium">
                    Customer: {order.customer_name}
                  </p>
                )}
              </div>

              {/* UPI Pay Button */}
              {upiUrl && (
                <div className="space-y-3">
                  <a 
                    href={upiUrl}
                    className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white font-bold rounded-xl transition-all shadow-lg flex items-center justify-center space-x-2.5 text-base"
                  >
                    <FiSmartphone className="w-5 h-5" />
                    <span>Pay with UPI App</span>
                  </a>

                  {/* Quick app links */}
                  <div className="grid grid-cols-3 gap-2 text-xs font-bold">
                    <a 
                      href={`phonepe://pay?pa=${encodeURIComponent(upiId)}&pn=Merchant&am=${order.amount}&cu=INR`}
                      className="flex items-center justify-center py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-750 transition-colors"
                    >
                      <span className="text-purple-600 dark:text-purple-400">PhonePe</span>
                    </a>
                    <a 
                      href={`gpay://upi/pay?pa=${encodeURIComponent(upiId)}&pn=Merchant&am=${order.amount}&cu=INR`}
                      className="flex items-center justify-center py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-750 transition-colors"
                    >
                      <span className="text-blue-500 dark:text-blue-400">Google Pay</span>
                    </a>
                    <a 
                      href={`paytmmp://pay?pa=${encodeURIComponent(upiId)}&pn=Merchant&am=${order.amount}&cu=INR`}
                      className="flex items-center justify-center py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-750 transition-colors"
                    >
                      <span className="text-sky-500 dark:text-sky-400">Paytm</span>
                    </a>
                  </div>
                </div>
              )}

              {/* QR Code Section */}
              {paymentDetails && (
                <div className="border border-slate-200 dark:border-gray-800 rounded-2xl overflow-hidden">
                  <button 
                    onClick={() => setShowQr(!showQr)}
                    className="w-full px-4 py-3.5 bg-slate-50 dark:bg-slate-800 flex items-center justify-between text-sm font-semibold text-gray-700 dark:text-gray-300"
                  >
                    <span className="flex items-center gap-2">
                      <FiSmartphone className="text-indigo-500" />
                      <span>Scan QR Code to Pay</span>
                    </span>
                    {showQr ? <FiChevronUp /> : <FiChevronDown />}
                  </button>

                  {showQr && (
                    <div className="p-5 flex flex-col items-center bg-white dark:bg-gray-900 border-t dark:border-gray-800">
                      {paymentDetails.qr_code ? (
                        <div className="bg-white p-3 rounded-xl border shadow-sm">
                          <img src={paymentDetails.qr_code} alt="UPI QR Code" className="w-44 h-44" />
                        </div>
                      ) : (
                        <div className="w-44 h-44 bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center justify-center text-xs text-gray-400">
                          QR Code unavailable
                        </div>
                      )}
                      
                      {upiId && (
                        <div className="w-full text-center mt-4">
                          <span className="text-[10px] uppercase text-gray-400 dark:text-gray-500 tracking-widest font-bold">UPI ID</span>
                          <div className="flex items-center justify-center gap-1.5 mt-1">
                            <code className="text-xs font-mono bg-slate-50 dark:bg-slate-800 px-2.5 py-1 rounded-lg border text-gray-700 dark:text-gray-300 truncate max-w-[220px]">{upiId}</code>
                            <button 
                              onClick={() => copyToClipboard(upiId, 'UPI ID copied!')}
                              className="p-1.5 bg-slate-50 dark:bg-slate-800 border rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"
                            >
                              <FiCopy className="w-3.5 h-3.5 text-gray-500" />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Bank Transfer Details */}
              {paymentDetails && (paymentDetails.bank_account_holder || paymentDetails.bank_account_number) && (
                <div className="border border-slate-200 dark:border-gray-800 rounded-2xl overflow-hidden">
                  <button 
                    onClick={() => setShowBank(!showBank)}
                    className="w-full px-4 py-3.5 bg-slate-50 dark:bg-slate-800 flex items-center justify-between text-sm font-semibold text-gray-700 dark:text-gray-300"
                  >
                    <span>Bank Transfer Details</span>
                    {showBank ? <FiChevronUp /> : <FiChevronDown />}
                  </button>

                  {showBank && (
                    <div className="p-4 bg-white dark:bg-gray-900 border-t dark:border-gray-800 space-y-3 text-sm">
                      {paymentDetails.bank_account_holder && (
                        <div className="flex justify-between items-center">
                          <span className="text-gray-500 text-xs">Account Holder</span>
                          <div className="flex items-center gap-1.5">
                            <span className="font-medium text-gray-900 dark:text-white text-xs">{paymentDetails.bank_account_holder}</span>
                            <button onClick={() => copyToClipboard(paymentDetails.bank_account_holder!, 'Copied!')} className="p-1 bg-slate-100 dark:bg-slate-800 rounded">
                              <FiCopy className="w-3 h-3 text-gray-400" />
                            </button>
                          </div>
                        </div>
                      )}
                      {paymentDetails.bank_name && (
                        <div className="flex justify-between items-center">
                          <span className="text-gray-500 text-xs">Bank</span>
                          <span className="font-medium text-gray-900 dark:text-white text-xs">{paymentDetails.bank_name}</span>
                        </div>
                      )}
                      {paymentDetails.bank_account_number && (
                        <div className="flex justify-between items-center">
                          <span className="text-gray-500 text-xs">Account No.</span>
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-gray-900 dark:text-white text-xs">{paymentDetails.bank_account_number}</span>
                            <button onClick={() => copyToClipboard(paymentDetails.bank_account_number!, 'Copied!')} className="p-1 bg-slate-100 dark:bg-slate-800 rounded">
                              <FiCopy className="w-3 h-3 text-gray-400" />
                            </button>
                          </div>
                        </div>
                      )}
                      {paymentDetails.bank_ifsc && (
                        <div className="flex justify-between items-center">
                          <span className="text-gray-500 text-xs">IFSC</span>
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-gray-900 dark:text-white text-xs">{paymentDetails.bank_ifsc}</span>
                            <button onClick={() => copyToClipboard(paymentDetails.bank_ifsc!, 'Copied!')} className="p-1 bg-slate-100 dark:bg-slate-800 rounded">
                              <FiCopy className="w-3 h-3 text-gray-400" />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Divider */}
              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-gray-200 dark:bg-gray-800"></div>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">After Payment</span>
                <div className="flex-1 h-px bg-gray-200 dark:bg-gray-800"></div>
              </div>

              {/* UTR Input */}
              <div className="space-y-3 bg-slate-50 dark:bg-slate-800/40 rounded-2xl p-4 border border-slate-200 dark:border-gray-800">
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300">
                  Enter UPI Transaction ID (UTR)
                </label>
                <p className="text-[11px] text-gray-400 leading-normal -mt-1">
                  Open your UPI app → go to transaction history → find the 12-digit Transaction/Ref number for this payment.
                </p>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={12}
                  className="w-full px-4 py-3.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-mono text-base tracking-wider focus:ring-2 focus:ring-indigo-500 outline-none placeholder:text-gray-400 placeholder:text-sm placeholder:tracking-normal"
                  placeholder="e.g. 039518224994"
                  value={utr}
                  onChange={(e) => setUtr(e.target.value.replace(/[^0-9]/g, ''))}
                />
                <button
                  onClick={handleSubmitUtr}
                  disabled={submitting || utr.trim().length < 6}
                  className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] text-white font-bold rounded-xl transition-all shadow-md disabled:opacity-50 text-sm flex items-center justify-center space-x-2"
                >
                  {submitting ? (
                    <>
                      <FiLoader className="animate-spin w-4 h-4" />
                      <span>Verifying...</span>
                    </>
                  ) : (
                    <>
                      <FiSend className="w-4 h-4" />
                      <span>Submit UTR & Verify</span>
                    </>
                  )}
                </button>
              </div>

              {/* Notice */}
              {notice && (
                <div className={`p-3.5 rounded-xl flex items-start gap-2.5 border text-xs font-semibold transition-all ${
                  notice.type === 'success' ? 'bg-green-50 border-green-200 text-green-700 dark:bg-green-950/20 dark:border-green-800 dark:text-green-400' :
                  notice.type === 'error' ? 'bg-red-50 border-red-200 text-red-700 dark:bg-red-950/20 dark:border-red-800 dark:text-red-400' :
                  'bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-950/20 dark:border-amber-800 dark:text-amber-400'
                }`}>
                  {notice.type === 'success' ? <FiCheck className="w-4 h-4 shrink-0 mt-0.5" /> : <FiAlertCircle className="w-4 h-4 shrink-0 mt-0.5" />}
                  <span>{notice.text}</span>
                </div>
              )}
            </>
          )}

          {/* === STEP: POLLING / VERIFYING === */}
          {step === 'polling' && (
            <div className="text-center py-16 space-y-6">
              <div className="mx-auto w-20 h-20 rounded-full bg-indigo-50 dark:bg-indigo-950/40 flex items-center justify-center">
                <FiLoader className="h-10 w-10 text-indigo-600 dark:text-indigo-400 animate-spin" />
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Verifying Payment</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 max-w-[280px] mx-auto leading-relaxed">
                  We've received your UTR. Waiting for bank confirmation. This page will update automatically when verified.
                </p>
              </div>
              <div className="flex justify-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
            </div>
          )}

          {/* === STEP: SUCCESS === */}
          {step === 'succeeded' && (
            <div className="text-center py-10 space-y-6">
              <div className="mx-auto w-20 h-20 rounded-full bg-emerald-50 dark:bg-emerald-950/30 flex items-center justify-center">
                <FiCheckCircle className="h-12 w-12 text-emerald-500" />
              </div>
              
              <div className="space-y-1.5">
                <h2 className="text-2xl font-black text-emerald-600 dark:text-emerald-400">Payment Verified!</h2>
                <p className="text-xs text-gray-400">Your payment has been successfully confirmed.</p>
              </div>

              {/* Receipt */}
              <div className="bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 text-left text-xs space-y-3.5 mx-auto max-w-xs">
                <div className="flex justify-between border-b pb-2.5 dark:border-gray-700">
                  <span className="text-gray-400">Order ID</span>
                  <span className="font-semibold text-gray-800 dark:text-white font-mono text-[11px]">{order.ztake_order_id}</span>
                </div>
                <div className="flex justify-between border-b pb-2.5 dark:border-gray-700">
                  <span className="text-gray-400">Customer</span>
                  <span className="font-semibold text-gray-800 dark:text-white">{order.customer_name}</span>
                </div>
                {utr && (
                  <div className="flex justify-between border-b pb-2.5 dark:border-gray-700">
                    <span className="text-gray-400">UTR / Ref No.</span>
                    <span className="font-semibold text-gray-800 dark:text-white font-mono">{utr}</span>
                  </div>
                )}
                <div className="flex justify-between pt-1">
                  <span className="text-gray-400">Amount Paid</span>
                  <span className="font-extrabold text-emerald-600 dark:text-emerald-400 text-sm">₹{Number(order.amount).toFixed(2)}</span>
                </div>
              </div>

              <p className="text-[11px] text-gray-400 font-medium max-w-xs mx-auto">
                You can safely close this page. The merchant has been notified.
              </p>
            </div>
          )}

        </div>

        {/* Fixed Footer */}
        <div className="py-3.5 text-center border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 text-[10px] text-gray-400 tracking-wider uppercase font-semibold shrink-0">
          Powered by Ztake Payments · Secure UPI Checkout
        </div>
      </div>
    </div>
  );
}
