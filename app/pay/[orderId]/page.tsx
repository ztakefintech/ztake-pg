'use client';

import { useEffect, useState, useRef } from 'react';
import Image from 'next/image';
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
  original_amount?: number | null;
  currency: string;
  customer_name: string;
  status: string;
  vendor_id: number;
  utr?: string | null;
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
  const [step, setStep] = useState<'pay' | 'polling' | 'succeeded' | 'failed' | 'expired'>('pay');
  const [utr, setUtr] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState<{ text: string; type: 'success' | 'warning' | 'error' } | null>(null);
  
  // UI toggles
  const [showQr, setShowQr] = useState(false);
  const [showBank, setShowBank] = useState(false);
  const [copiedUpi, setCopiedUpi] = useState(false);

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

        // If order already succeeded, show success
        if (currentOrder.status === 'Succeeded' || currentOrder.status === 'SUCCEEDED' || currentOrder.status === 'completed') {
          setStep('succeeded');
          setLoading(false);
          return;
        }

        // If UTR already submitted (status is Pending or order has a UTR), block the page
        if (currentOrder.utr || currentOrder.status === 'Pending' || currentOrder.status === 'PENDING') {
          setStep('expired');
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
      setCopiedUpi(true);
      setTimeout(() => setCopiedUpi(false), 2000);
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
      <div className="min-h-screen bg-glass-page flex flex-col justify-center items-center p-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-zinc-900 dark:border-zinc-100"></div>
        <p className="text-xs text-zinc-500 dark:text-zinc-450 mt-3 font-semibold">Loading secure checkout...</p>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-glass-page flex flex-col justify-center items-center p-4 text-center animate-fade-in">
        <div className="w-12 h-12 bg-red-50 dark:bg-red-950/10 rounded-full flex items-center justify-center text-red-500 mb-3 border border-red-500/20">
          <FiAlertCircle className="w-6 h-6" />
        </div>
        <h1 className="text-base font-bold text-zinc-900 dark:text-white">Payment Link Error</h1>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 max-w-xs">{error || 'This payment link is invalid or has expired.'}</p>
      </div>
    );
  }

  const upiId = paymentDetails?.upi_id || '';
  const upiUrl = upiId ? `upi://pay?pa=${encodeURIComponent(upiId)}` : '';

  return (
    <div className="min-h-screen bg-glass-page text-zinc-900 dark:text-zinc-50 flex items-center justify-center p-2 sm:p-4 overflow-hidden">
      {/* Floating Apple-Style Glass Prism Card */}
      <div className="w-full max-w-[370px] glass-prism-border flex flex-col overflow-hidden shadow-2xl animate-scale-up">
        
        {/* Main compact content */}
        <div className="flex-1 p-4 space-y-3">
          
          {/* Header */}
          <div className="flex items-center justify-between border-b pb-2 dark:border-gray-800">
            <div>
              <span className="text-[8px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">Secure Checkout</span>
              <h2 className="text-xs font-extrabold text-gray-800 dark:text-white">Ztake Payments</h2>
            </div>
            <div className="text-right">
              <span className="text-[8px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">Order ID</span>
              <p className="text-[9px] font-mono text-gray-500 dark:text-gray-400 truncate max-w-[100px]">{order.ztake_order_id}</p>
            </div>
          </div>

          {/* === STEP: PAY === */}
          {step === 'pay' && (
            <>
              {/* Sleek Row for Amount and Customer */}
              <div className="flex items-center justify-between p-3 bg-zinc-50/50 dark:bg-zinc-900/40 rounded-xl border border-zinc-200/50 dark:border-zinc-800/40">
                <div>
                  <p className="text-[8px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">Amount to Pay</p>
                  <h1 className="text-xl font-black text-zinc-900 dark:text-white leading-tight mt-0.5">
                    ₹{Number(order.amount).toFixed(2)}
                  </h1>
                </div>
                {order.customer_name && (
                  <div className="text-right">
                    <p className="text-[8px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">Customer</p>
                    <p className="text-xs font-bold text-zinc-800 dark:text-zinc-200 mt-0.5 truncate max-w-[140px]">
                      {order.customer_name}
                    </p>
                  </div>
                )}
              </div>

              {/* UPI ID Copy Field (ALWAYS VISIBLE & COPYABLE) */}
              {upiId && (
                <div className="flex items-center justify-between p-2.5 rounded-xl border border-zinc-250/50 dark:border-zinc-800/40 bg-zinc-50/30 dark:bg-zinc-900/20">
                  <div className="flex flex-col min-w-0">
                    <span className="text-[8px] uppercase text-zinc-400 dark:text-zinc-500 tracking-wider font-bold">UPI ID (Copy & Pay)</span>
                    <code className="text-xs font-mono font-bold text-zinc-850 dark:text-zinc-200 truncate mt-0.5 select-all">
                      {upiId}
                    </code>
                  </div>
                  <button 
                    onClick={() => copyToClipboard(upiId, 'UPI ID copied!')}
                    className="p-1.5 glass-button-secondary rounded-lg flex items-center justify-center shadow-sm shrink-0 ml-2 hover:scale-[1.03] transition-transform"
                    title="Copy UPI ID"
                  >
                    {copiedUpi ? (
                      <FiCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    ) : (
                      <FiCopy className="w-3.5 h-3.5 text-zinc-600 dark:text-zinc-300" />
                    )}
                  </button>
                </div>
              )}

              {/* UPI Pay Button and Quick Links */}
              {upiUrl && (
                <div className="space-y-2">
                  <a 
                    href={upiUrl}
                    className="w-full py-2 glass-button-primary rounded-xl flex items-center justify-center space-x-1.5 text-xs font-bold shadow-sm hover:scale-[1.01] transition-transform"
                  >
                    <FiSmartphone className="w-3.5 h-3.5" />
                    <span>Pay with Default App</span>
                  </a>

                  {/* Quick app links */}
                  <div className="grid grid-cols-3 gap-1.5 text-[9px] font-bold">
                    <a 
                      href={`phonepe://pay?pa=${encodeURIComponent(upiId)}`}
                      className="flex items-center justify-center gap-1 py-1.5 border border-purple-500/20 text-purple-600 dark:text-purple-400 bg-purple-500/5 hover:bg-purple-500/10 transition-all rounded-lg"
                    >
                      <span className="w-1 h-1 rounded-full bg-purple-600 dark:bg-purple-400 shrink-0" />
                      <span>PhonePe</span>
                    </a>
                    <a 
                      href={`gpay://upi/pay?pa=${encodeURIComponent(upiId)}`}
                      className="flex items-center justify-center gap-1 py-1.5 border border-blue-500/20 text-blue-600 dark:text-blue-400 bg-blue-500/5 hover:bg-blue-500/10 transition-all rounded-lg"
                    >
                      <span className="w-1 h-1 rounded-full bg-blue-600 dark:bg-blue-400 shrink-0" />
                      <span>GPay</span>
                    </a>
                    <a 
                      href={`paytmmp://pay?pa=${encodeURIComponent(upiId)}`}
                      className="flex items-center justify-center gap-1 py-1.5 border border-sky-500/20 text-sky-600 dark:text-sky-400 bg-sky-500/5 hover:bg-sky-500/10 transition-all rounded-lg"
                    >
                      <span className="w-1 h-1 rounded-full bg-sky-600 dark:bg-sky-400 shrink-0" />
                      <span>Paytm</span>
                    </a>
                  </div>
                </div>
              )}

              {/* QR Code Section */}
              {paymentDetails && (
                <div className="glass-card rounded-xl overflow-hidden">
                  <button 
                    onClick={() => setShowQr(!showQr)}
                    className="w-full px-3 py-2 bg-transparent flex items-center justify-between text-xs font-bold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100/50 dark:hover:bg-zinc-800/30 transition-colors"
                  >
                    <span className="flex items-center gap-1.5">
                      <FiSmartphone className="text-zinc-400 dark:text-zinc-500 w-3.5 h-3.5" />
                      <span>Scan QR Code to Pay</span>
                    </span>
                    {showQr ? <FiChevronUp className="w-3.5 h-3.5" /> : <FiChevronDown className="w-3.5 h-3.5" />}
                  </button>

                  {showQr && (
                    <div className="p-3.5 flex flex-col items-center bg-transparent border-t border-zinc-200/10 dark:border-zinc-800/10">
                      {paymentDetails.qr_code ? (
                        <div className="bg-white p-2 rounded-lg border border-zinc-200 shadow-sm">
                          <Image src={paymentDetails.qr_code} alt="UPI QR Code" width={144} height={144} unoptimized />
                        </div>
                      ) : (
                        <div className="w-36 h-36 bg-zinc-100/50 dark:bg-zinc-950/50 rounded-lg flex items-center justify-center text-[10px] text-zinc-400 border border-zinc-200/40 dark:border-zinc-800/40">
                          QR Code unavailable
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Bank Transfer Details */}
              {paymentDetails && (paymentDetails.bank_account_holder || paymentDetails.bank_account_number) && (
                <div className="glass-card rounded-xl overflow-hidden">
                  <button 
                    onClick={() => setShowBank(!showBank)}
                    className="w-full px-3 py-2 bg-transparent flex items-center justify-between text-xs font-bold text-zinc-700 dark:text-zinc-305 hover:bg-zinc-100/50 dark:hover:bg-zinc-800/30 transition-colors"
                  >
                    <span>Bank Transfer Details</span>
                    {showBank ? <FiChevronUp className="w-3.5 h-3.5" /> : <FiChevronDown className="w-3.5 h-3.5" />}
                  </button>

                  {showBank && (
                    <div className="p-3 bg-transparent border-t border-zinc-200/10 dark:border-zinc-800/10 space-y-2 text-xs">
                      {paymentDetails.bank_account_holder && (
                        <div className="flex justify-between items-center">
                          <span className="text-zinc-450 text-[10px]">Account Holder</span>
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-zinc-800 dark:text-white text-[10px]">{paymentDetails.bank_account_holder}</span>
                            <button onClick={() => copyToClipboard(paymentDetails.bank_account_holder!, 'Copied!')} className="p-1 glass-button-secondary rounded">
                              <FiCopy className="w-3 h-3 text-zinc-550 dark:text-zinc-400" />
                            </button>
                          </div>
                        </div>
                      )}
                      {paymentDetails.bank_name && (
                        <div className="flex justify-between items-center">
                          <span className="text-zinc-450 text-[10px]">Bank</span>
                          <span className="font-semibold text-zinc-850 dark:text-white text-[10px]">{paymentDetails.bank_name}</span>
                        </div>
                      )}
                      {paymentDetails.bank_account_number && (
                        <div className="flex justify-between items-center">
                          <span className="text-zinc-450 text-[10px]">Account No.</span>
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono font-semibold text-zinc-850 dark:text-white text-[10px]">{paymentDetails.bank_account_number}</span>
                            <button onClick={() => copyToClipboard(paymentDetails.bank_account_number!, 'Copied!')} className="p-1 glass-button-secondary rounded">
                              <FiCopy className="w-3 h-3 text-zinc-550 dark:text-zinc-400" />
                            </button>
                          </div>
                        </div>
                      )}
                      {paymentDetails.bank_ifsc && (
                        <div className="flex justify-between items-center">
                          <span className="text-zinc-450 text-[10px]">IFSC</span>
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono font-semibold text-zinc-850 dark:text-white text-[10px]">{paymentDetails.bank_ifsc}</span>
                            <button onClick={() => copyToClipboard(paymentDetails.bank_ifsc!, 'Copied!')} className="p-1 glass-button-secondary rounded">
                              <FiCopy className="w-3 h-3 text-zinc-550 dark:text-zinc-400" />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Divider */}
              <div className="flex items-center gap-2 py-0.5">
                <div className="flex-1 h-px bg-gray-200 dark:bg-gray-800"></div>
                <span className="text-[8px] font-bold text-gray-400 uppercase tracking-widest">Verify Payment</span>
                <div className="flex-1 h-px bg-gray-200 dark:bg-gray-800"></div>
              </div>

              {/* UTR Input */}
              <div className="space-y-2 glass-card rounded-xl p-3">
                <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300">
                  Enter 12-digit UPI UTR
                </label>
                <p className="text-[9px] text-zinc-400 leading-tight -mt-1">
                  Open UPI app → View History → copy 12-digit UTR/Ref No.
                </p>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={12}
                  className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-white font-mono text-sm tracking-wider focus:ring-1 focus:ring-zinc-950 dark:focus:ring-zinc-100 outline-none placeholder:text-zinc-450 placeholder:text-[11px] placeholder:tracking-normal text-center"
                  placeholder="e.g. 039518224994"
                  value={utr}
                  onChange={(e) => setUtr(e.target.value.replace(/[^0-9]/g, ''))}
                />
                <button
                  onClick={handleSubmitUtr}
                  disabled={submitting || utr.trim().length < 6}
                  className="w-full py-2 glass-button-primary rounded-lg disabled:opacity-50 text-xs flex items-center justify-center space-x-1.5 font-bold hover:scale-[1.01] transition-transform"
                >
                  {submitting ? (
                    <>
                      <FiLoader className="animate-spin w-3.5 h-3.5" />
                      <span>Verifying...</span>
                    </>
                  ) : (
                    <>
                      <FiSend className="w-3.5 h-3.5" />
                      <span>Verify & Complete</span>
                    </>
                  )}
                </button>
              </div>

              {/* Notice */}
              {notice && (
                <div className={`p-2.5 rounded-lg flex items-start gap-2 border text-[11px] font-semibold transition-all ${
                  notice.type === 'success' ? 'bg-green-50 border-green-200 text-green-700 dark:bg-green-950/20 dark:border-green-800 dark:text-green-400' :
                  notice.type === 'error' ? 'bg-red-50 border-red-200 text-red-700 dark:bg-red-950/20 dark:border-red-800 dark:text-red-400' :
                  'bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-950/20 dark:border-amber-800 dark:text-amber-400'
                }`}>
                  {notice.type === 'success' ? <FiCheck className="w-3.5 h-3.5 shrink-0 mt-0.5" /> : <FiAlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />}
                  <span>{notice.text}</span>
                </div>
              )}
            </>
          )}

          {/* === STEP: POLLING / VERIFYING === */}
          {step === 'polling' && (
            <div className="text-center py-10 space-y-4">
              <div className="mx-auto w-16 h-16 rounded-full bg-zinc-100/50 dark:bg-zinc-900/30 border border-zinc-200/50 dark:border-zinc-800/40 flex items-center justify-center">
                <FiLoader className="h-8 w-8 text-zinc-900 dark:text-white animate-spin" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-zinc-900 dark:text-white">Verifying Payment</h3>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 max-w-[240px] mx-auto leading-relaxed">
                  We've received your UTR. Waiting for bank confirmation. This page will update automatically.
                </p>
              </div>
              <div className="flex justify-center gap-1">
                <div className="w-1.5 h-1.5 rounded-full bg-zinc-800 dark:bg-zinc-200 animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-1.5 h-1.5 rounded-full bg-zinc-800 dark:bg-zinc-200 animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-1.5 h-1.5 rounded-full bg-zinc-800 dark:bg-zinc-200 animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
            </div>
          )}

          {/* === STEP: EXPIRED / ALREADY USED === */}
          {step === 'expired' && (
            <div className="text-center py-8 space-y-4">
              <div className="mx-auto w-16 h-16 rounded-full bg-amber-50 dark:bg-amber-950/20 flex items-center justify-center">
                <FiAlertCircle className="h-8 w-8 text-amber-500" />
              </div>
              <div className="space-y-1">
                <h2 className="text-base font-bold text-zinc-900 dark:text-white">Payment Link Expired</h2>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 max-w-[240px] mx-auto leading-relaxed">
                  A UTR has already been submitted for this order. This payment link is no longer active.
                </p>
              </div>
              <div className="bg-zinc-50/50 dark:bg-zinc-900/40 border border-zinc-200/50 dark:border-zinc-800/40 rounded-xl p-3 text-[11px] space-y-1.5 mx-auto max-w-[260px] text-left">
                <div className="flex justify-between">
                  <span className="text-zinc-400">Order ID</span>
                  <span className="font-mono font-semibold text-zinc-700 dark:text-zinc-300 text-[10px]">{order.ztake_order_id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">Status</span>
                  <span className="font-semibold text-amber-600 dark:text-amber-400 uppercase text-[9px] tracking-wider">{order.status}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">Amount</span>
                  <span className="font-bold text-zinc-800 dark:text-white">
                    {order.original_amount && Number(order.original_amount) !== Number(order.amount) ? (
                      <>
                        <span className="line-through text-zinc-400 dark:text-zinc-550 mr-1.5 font-normal">
                          ₹{Number(order.original_amount).toFixed(2)}
                        </span>
                        ₹{Number(order.amount).toFixed(2)}
                      </>
                    ) : (
                      `₹${Number(order.amount).toFixed(2)}`
                    )}
                  </span>
                </div>
              </div>
              <p className="text-[10px] text-zinc-400 font-medium max-w-[240px] mx-auto">
                If you believe this is an error, please contact the merchant.
              </p>
            </div>
          )}

          {/* === STEP: SUCCESS === */}
          {step === 'succeeded' && (
            <div className="text-center py-6 space-y-4">
              <div className="mx-auto w-16 h-16 rounded-full bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-500/20 flex items-center justify-center animate-scale-up">
                <FiCheckCircle className="h-10 w-10 text-emerald-500" />
              </div>
              
              <div className="space-y-1">
                <h2 className="text-xl font-black text-emerald-600 dark:text-emerald-400">Payment Verified!</h2>
                <p className="text-[11px] text-zinc-405">Your payment has been successfully confirmed.</p>
              </div>

              {/* Receipt */}
              <div className="bg-zinc-50/50 dark:bg-zinc-900/40 border border-zinc-200/50 dark:border-zinc-800/40 rounded-xl p-4 text-left text-[11px] space-y-2.5 mx-auto max-w-[260px]">
                <div className="flex justify-between border-b pb-2 border-zinc-200/10 dark:border-zinc-800/20">
                  <span className="text-zinc-450">Order ID</span>
                  <span className="font-semibold text-zinc-850 dark:text-white font-mono text-[10px]">{order.ztake_order_id}</span>
                </div>
                <div className="flex justify-between border-b pb-2 border-zinc-200/10 dark:border-zinc-800/20">
                  <span className="text-zinc-450">Customer</span>
                  <span className="font-semibold text-zinc-850 dark:text-white">{order.customer_name}</span>
                </div>
                {utr && (
                  <div className="flex justify-between border-b pb-2 border-zinc-200/10 dark:border-zinc-800/20">
                    <span className="text-zinc-450">UTR / Ref No.</span>
                    <span className="font-semibold text-zinc-850 dark:text-white font-mono">{utr}</span>
                  </div>
                )}
                <div className="flex justify-between pt-0.5">
                  <span className="text-zinc-450">Amount Paid</span>
                  <span className="font-extrabold text-emerald-600 dark:text-emerald-400 text-xs">
                    {order.original_amount && Number(order.original_amount) !== Number(order.amount) ? (
                      <>
                        <span className="line-through text-zinc-400 dark:text-zinc-550 mr-1.5 font-normal">
                          ₹{Number(order.original_amount).toFixed(2)}
                        </span>
                        ₹{Number(order.amount).toFixed(2)}
                      </>
                    ) : (
                      `₹${Number(order.amount).toFixed(2)}`
                    )}
                  </span>
                </div>
              </div>

              <p className="text-[10px] text-zinc-400 font-medium max-w-[240px] mx-auto">
                You can safely close this page. The merchant has been notified.
              </p>
            </div>
          )}

        </div>

        {/* Fixed Footer */}
        <div className="py-2.5 text-center border-t border-zinc-200/10 dark:border-zinc-800/10 bg-transparent text-[8px] text-zinc-400 tracking-wider uppercase font-semibold shrink-0">
          Powered by Ztake Payments · Secure UPI Checkout
        </div>
      </div>
    </div>
  );
}
