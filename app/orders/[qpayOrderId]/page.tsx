'use client';

import { useEffect, useState } from 'react';
import { FiCopy } from 'react-icons/fi';

interface Order {
  ztake_order_id: string;
  merchant_order_id: string;
  amount: number;
  currency: string;
  customer_name: string;
  return_url: string;
  callback_url: string;
  status: string;
  utr?: string | null;
  vendor_id?: number | null;
}

export default function OrderPaymentPage({ params }: { params: { qpayOrderId: string } }) {
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [utr, setUtr] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [successAmount, setSuccessAmount] = useState<number | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`/api/v1/orders/${params.qpayOrderId}`);
        if (!res.ok) throw new Error('Order not found');
        const json = await res.json();
        setOrder(json.data);
        // Fetch QR + UPI if vendor is known (public endpoint)
        if (json.data?.vendor_id) {
          const pd = await fetch(`/api/public/payment-details?vendor_id=${json.data.vendor_id}`);
          const pdJson = await pd.json();
          if (pd.ok && pdJson?.success) {
            setQr(pdJson.data?.qr_code || null);
            setUpi(pdJson.data?.upi_id || null);
            setBank({
              holder: pdJson.data?.bank_account_holder || null,
              name: pdJson.data?.bank_name || null,
              number: pdJson.data?.bank_account_number || null,
              ifsc: pdJson.data?.bank_ifsc || null,
            });
          }
        }
      } catch (e: any) {
        setError(e.message || 'Failed to load order');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [params.qpayOrderId]);

  const [qr, setQr] = useState<string | null>(null);
  const [upi, setUpi] = useState<string | null>(null);
  const [bank, setBank] = useState<{
    holder: string | null;
    name: string | null;
    number: string | null;
    ifsc: string | null;
  } | null>(null);
  const [showBank, setShowBank] = useState(false);

  const copyToClipboard = async (value?: string | null) => {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(String(value));
      setNotice('Copied to clipboard');
      setTimeout(() => setNotice(null), 1200);
    } catch {}
  };

  const submitUtr = async () => {
    if (!utr) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/v1/orders/${params.qpayOrderId}/submit-utr`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ utr })
      });
      const data = await res.json();
      if (!res.ok) {
        // Show user-friendly messages
        if (data?.code === 'UTR_ALREADY_USED') setNotice('This UTR has already been used.');
        else if (data?.code === 'UTR_NOT_FOUND') setNotice('UTR not found for this vendor.');
        else setNotice(data?.message || 'Failed to submit UTR');
        // Redirect after short delay
        if (order?.return_url) {
          setTimeout(() => { window.location.href = order.return_url!; }, 2000);
        }
        return;
      }

      if (data?.verified) {
        // Success animation then redirect
        if (typeof data.amount === 'number') setSuccessAmount(data.amount);
        setShowSuccess(true);
        setTimeout(() => {
          if (order?.return_url) window.location.href = order.return_url;
        }, 1500);
      } else {
        setNotice('Payment is pending verification.');
        if (order?.return_url) {
          setTimeout(() => { window.location.href = order.return_url!; }, 2000);
        }
      }
    } catch (e: any) {
      alert(e.message || 'Submission failed');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen flex items-center justify-center text-red-600">{error || 'Order not found'}</div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-xl mx-auto bg-white shadow rounded-lg p-6">
        {showSuccess && (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-8 shadow-lg text-center">
              <div className="mx-auto mb-4 w-20 h-20 rounded-full bg-green-100 flex items-center justify-center">
                <svg className="h-12 w-12 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2l4 -4" /></svg>
              </div>
              <div className="text-xl font-semibold text-gray-900">Payment Successful</div>
              {successAmount != null && (
                <div className="mt-1 text-gray-700">Amount: {order.currency} {Number(successAmount).toFixed(2)}</div>
              )}
            </div>
          </div>
        )}
        <h1 className="text-2xl font-semibold mb-2">Pay Order</h1>
        <p className="text-sm text-gray-500 mb-6">Order ID: {order.ztake_order_id}</p>

        <div className="space-y-3 mb-6">
          <div className="flex justify-between">
            <span className="text-gray-600">Customer</span>
            <span className="font-medium">{order.customer_name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Amount</span>
            <span className="font-medium">{order.currency} {Number(order.amount).toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Status</span>
            <span className="font-medium">{order.status}</span>
          </div>
        </div>

        <div className="p-4 bg-indigo-50 rounded-md mb-2">
          <h2 className="font-medium mb-2">Pay via UPI</h2>
          {qr ? (
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <img src={qr} alt="UPI QR" className="w-40 h-40 rounded-md border self-start" />
              <div className="flex-1">
                <div className="text-sm text-gray-700">UPI ID</div>
                <div className="flex items-center gap-2">
                  <div className="font-mono text-gray-900 break-all">{upi || 'N/A'}</div>
                  {upi && (
                    <button
                      onClick={() => copyToClipboard(upi)}
                      aria-label="Copy UPI ID"
                      title="Copy UPI ID"
                      className="p-1.5 bg-gray-200 hover:bg-gray-300 rounded"
                    >
                     <FiCopy size={16} /> 
                    </button>
                  )}
                </div>
                <p className="text-sm text-gray-600 mt-3">Scan the QR in your UPI app and complete the payment, then enter your UTR below.</p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-600">Scan the UPI QR on your app and complete the payment. Then enter the UTR to submit.</p>
          )}
        </div>

        {bank && (bank.holder || bank.name || bank.number || bank.ifsc) && (
          <div className="mb-6">
            <button
              onClick={() => setShowBank(!showBank)}
              className="w-full flex items-center justify-between px-4 py-3 bg-gray-100 rounded-md hover:bg-gray-200"
            >
              <span className="font-medium text-gray-800">Bank Transfer Details</span>
              <svg className={`h-5 w-5 text-gray-600 transform transition-transform ${showBank ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.127l3.71-3.896a.75.75 0 111.08 1.04l-4.24 4.46a.75.75 0 01-1.08 0L5.21 8.27a.75.75 0 01.02-1.06z" clipRule="evenodd"/></svg>
            </button>
            {showBank && (
              <div className="px-4 py-3 border rounded-b-md border-t-0">
                <div className="grid grid-cols-1 gap-3 text-sm">
                  {bank.holder && (
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-gray-600">Account Holder</span>
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-medium text-gray-900 truncate max-w-[60vw] sm:max-w-xs">{bank.holder}</span>
                        <button onClick={() => copyToClipboard(bank.holder)} aria-label="Copy Account Holder" title="Copy Account Holder" className="p-1.5 bg-gray-200 hover:bg-gray-300 rounded">
<FiCopy size={16} />                        </button>
                      </div>
                    </div>
                  )}
                  {bank.name && (
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-gray-600">Bank</span>
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-medium text-gray-900 truncate max-w-[60vw] sm:max-w-xs">{bank.name}</span>
                        <button onClick={() => copyToClipboard(bank.name)} aria-label="Copy Bank" title="Copy Bank" className="p-1.5 bg-gray-200 hover:bg-gray-300 rounded">
                         <FiCopy size={16} /> 
                        </button>
                      </div>
                    </div>
                  )}
                  {bank.number && (
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-gray-600">Account Number</span>
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-mono text-gray-900 truncate max-w-[60vw] sm:max-w-xs">{bank.number}</span>
                        <button onClick={() => copyToClipboard(bank.number)} aria-label="Copy Account Number" title="Copy Account Number" className="p-1.5 bg-gray-200 hover:bg-gray-300 rounded">
                         <FiCopy size={16} /> 
                        </button>
                      </div>
                    </div>
                  )}
                  {bank.ifsc && (
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-gray-600">IFSC</span>
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-mono text-gray-900 truncate max-w-[60vw] sm:max-w-xs">{bank.ifsc}</span>
                        <button onClick={() => copyToClipboard(bank.ifsc)} aria-label="Copy IFSC" title="Copy IFSC" className="p-1.5 bg-gray-200 hover:bg-gray-300 rounded">
                         <FiCopy size={16} /> 
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="space-y-2">
          {notice && (
            <div className="p-3 bg-yellow-50 text-yellow-800 rounded-md text-sm">{notice}</div>
          )}
          <label className="block text-sm font-medium text-gray-700">Enter UTR</label>
          <input
            value={utr}
            onChange={(e) => setUtr(e.target.value)}
            placeholder="Enter UTR"
            className="w-full border rounded-md px-3 py-2"
          />
          <button
            onClick={submitUtr}
            disabled={submitting || !utr}
            className="w-full bg-indigo-600 text-white rounded-md py-2 mt-2 disabled:opacity-50"
          >
            {submitting ? 'Submitting...' : 'Submit UTR'}
          </button>
        </div>
      </div>
    </div>
  );
}


