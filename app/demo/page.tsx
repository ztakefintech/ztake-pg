'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/context';
import Layout from '@/components/Layout';
import { 
  FiPlayCircle, 
  FiCopy, 
  FiLoader, 
  FiExternalLink, 
  FiCheckCircle, 
  FiClock, 
  FiAlertCircle, 
  FiUser, 
  FiSmartphone, 
  FiInfo,
  FiList
} from 'react-icons/fi';

interface DemoOrder {
  ztakeOrderId: string;
  amount: number;
  customerName: string;
  payPageUrl: string;
  pageQrCodeUrl: string;
  status: string;
  createdAt: string;
}

export default function DemoPayinDashboard() {
  const { isAuthenticated, isLoading, token } = useAuth();
  const router = useRouter();

  // Create Form State
  const [amount, setAmount] = useState('5.00');
  const [customerName, setCustomerName] = useState('Demo Customer');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  // Active generated order
  const [activeOrder, setActiveOrder] = useState<DemoOrder | null>(null);
  
  // List of generated demo orders in this session
  const [sessionOrders, setSessionOrders] = useState<DemoOrder[]>([]);
  const [notice, setNotice] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Background polling for all pending session orders
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, isLoading, router]);

  // Handle active status polling of all pending orders
  useEffect(() => {
    if (sessionOrders.length === 0) return;

    const pollPendingOrders = async () => {
      const pendingIds = sessionOrders
        .filter(o => o.status === 'order_created' || o.status === 'Pending')
        .map(o => o.ztakeOrderId);

      if (pendingIds.length === 0) return;

      try {
        const updatedOrders = await Promise.all(
          sessionOrders.map(async (order) => {
            if (order.status !== 'order_created' && order.status !== 'Pending') {
              return order;
            }
            try {
              const res = await fetch(`/api/v1/orders/${order.ztakeOrderId}`);
              if (res.ok) {
                const body = await res.json();
                const latestStatus = body.data?.status;
                if (latestStatus && latestStatus !== order.status) {
                  return { ...order, status: latestStatus };
                }
              }
            } catch (e) {
              console.error('Failed to poll status for order:', order.ztakeOrderId, e);
            }
            return order;
          })
        );

        // Check if any order changed to Succeeded and show a nice toast
        updatedOrders.forEach((newOrder, index) => {
          const oldOrder = sessionOrders[index];
          if (newOrder.status !== oldOrder.status && (newOrder.status === 'Succeeded' || newOrder.status === 'SUCCEEDED' || newOrder.status === 'completed')) {
            showToast(`Transaction ${newOrder.ztakeOrderId} of ₹${newOrder.amount} succeeded!`, 'success');
            // If the active order is the one that succeeded, update it
            if (activeOrder && activeOrder.ztakeOrderId === newOrder.ztakeOrderId) {
              setActiveOrder(newOrder);
            }
          }
        });

        setSessionOrders(updatedOrders);
      } catch (err) {
        console.error('Session orders polling error:', err);
      }
    };

    pollingRef.current = setInterval(pollPendingOrders, 4000);

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    };
  }, [sessionOrders, activeOrder]);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setNotice({ text, type });
    setTimeout(() => setNotice(null), 4000);
  };

  const copyToClipboard = async (value: string, message: string) => {
    try {
      await navigator.clipboard.writeText(value);
      showToast(message, 'success');
    } catch {
      showToast('Failed to copy link', 'error');
    }
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

      const newOrder: DemoOrder = {
        ztakeOrderId: data.ztakeOrderId,
        amount: data.amount,
        customerName: data.customerName,
        payPageUrl: data.payPageUrl,
        pageQrCodeUrl: data.pageQrCodeUrl,
        status: data.status,
        createdAt: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      };

      setActiveOrder(newOrder);
      setSessionOrders(prev => [newOrder, ...prev]);
      showToast('Public Payment link generated successfully!', 'success');
    } catch (err: any) {
      setCreateError(err.message || 'Error occurred. Make sure your UPI ID is set in Profile settings.');
    } finally {
      setCreating(false);
    }
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
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Header section */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm p-6 border border-gray-150 dark:border-gray-800">
          <div className="flex items-center space-x-3.5">
            <div className="p-3 bg-indigo-50 dark:bg-indigo-950/40 rounded-xl">
              <FiPlayCircle className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-gray-900 dark:text-white">Demo Payin Dashboard</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">Generate public checkout links, scan them on mobile, pay/verify, and view live status updates.</p>
            </div>
          </div>
        </div>

        {/* Global Success / Alert banner */}
        {notice && (
          <div className={`p-4 rounded-xl flex items-center gap-3 border text-sm font-semibold animate-fade-in ${
            notice.type === 'success' ? 'bg-green-50 border-green-200 text-green-700 dark:bg-green-950/20 dark:border-green-800 dark:text-green-400' :
            'bg-red-50 border-red-200 text-red-700 dark:bg-red-950/20 dark:border-red-800 dark:text-red-400'
          }`}>
            <FiCheckCircle className="w-5 h-5 shrink-0" />
            <span>{notice.text}</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          
          {/* LEFT: Configure form */}
          <div className="lg:col-span-2 bg-white dark:bg-gray-900 rounded-2xl shadow-sm p-6 border border-gray-150 dark:border-gray-800 space-y-5">
            <h2 className="text-lg font-bold text-gray-950 dark:text-white">Configure Demo Payin</h2>
            
            <form onSubmit={handleCreateOrder} className="space-y-4">
              <div className="form-group space-y-1.5">
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Amount (Min ₹5)
                </label>
                <div className="relative rounded-xl shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <span className="text-gray-400 font-medium text-sm">₹</span>
                  </div>
                  <input
                    type="number"
                    step="0.01"
                    min="5"
                    max="100000"
                    required
                    className="w-full pl-8 pr-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                    placeholder="5.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-group space-y-1.5">
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Customer Name
                </label>
                <div className="relative rounded-xl shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <FiUser className="text-gray-400 text-sm" />
                  </div>
                  <input
                    type="text"
                    required
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                    placeholder="Customer Name"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                  />
                </div>
              </div>

              {createError && (
                <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-xl p-4 flex items-start gap-2.5">
                  <FiAlertCircle className="text-red-500 w-5 h-5 shrink-0 mt-0.5" />
                  <p className="text-xs text-red-600 dark:text-red-400 font-semibold">{createError}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={creating}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-all shadow-md flex items-center justify-center space-x-2 disabled:opacity-50 text-sm"
              >
                {creating ? (
                  <>
                    <FiLoader className="animate-spin" />
                    <span>Generating Public Link...</span>
                  </>
                ) : (
                  <>
                    <FiPlayCircle className="w-5 h-5" />
                    <span>Generate Public Payment QR</span>
                  </>
                )}
              </button>
            </form>
          </div>

          {/* RIGHT: Generated QR and link card */}
          <div className="lg:col-span-3 bg-white dark:bg-gray-900 rounded-2xl shadow-sm p-6 border border-gray-150 dark:border-gray-800 flex flex-col justify-between min-h-[300px]">
            {activeOrder ? (
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-bold text-gray-950 dark:text-white">Public Payment Link Generated</h2>
                  <p className="text-xs text-gray-500 font-mono mt-0.5">Order ID: {activeOrder.ztakeOrderId}</p>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-6 bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl border">
                  
                  {activeOrder.pageQrCodeUrl ? (
                    <div className="bg-white p-2 rounded-xl border shadow-sm shrink-0">
                      <img src={activeOrder.pageQrCodeUrl} alt="Public Webpage QR" className="w-32 h-32" />
                    </div>
                  ) : (
                    <div className="w-32 h-32 bg-gray-100 rounded-xl flex items-center justify-center text-xs text-gray-400">QR Code Failed</div>
                  )}

                  <div className="space-y-3.5 w-full">
                    <p className="text-xs text-gray-600 dark:text-gray-400 leading-normal">
                      Scan this QR code with a smartphone to open the payment page directly on mobile, or send the checkout link below to customers.
                    </p>
                    
                    <div className="space-y-2">
                      <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">Public Checkout Link</span>
                      <div className="flex items-center gap-2">
                        <input
                          readOnly
                          className="bg-white dark:bg-gray-850 border p-2.5 rounded-lg text-xs font-mono text-gray-800 dark:text-gray-200 flex-1 truncate select-all"
                          value={activeOrder.payPageUrl}
                        />
                        <button
                          onClick={() => copyToClipboard(activeOrder.payPageUrl, 'Checkout link copied!')}
                          className="p-3 bg-white dark:bg-gray-850 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
                          title="Copy Link"
                        >
                          <FiCopy className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                        </button>
                        <a
                          href={activeOrder.payPageUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="p-3 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/60"
                          title="Open Checkout"
                        >
                          <FiExternalLink className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                        </a>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-between items-center bg-indigo-50/50 dark:bg-indigo-950/20 p-3 rounded-lg border border-indigo-100/30 text-xs">
                  <span className="flex items-center gap-1.5 text-indigo-950 dark:text-indigo-300 font-semibold">
                    <FiClock className="animate-spin text-indigo-600" />
                    <span>Live Tracking order status:</span>
                  </span>
                  <span className={`px-2 py-0.5 rounded font-bold uppercase tracking-wider text-[10px] ${
                    activeOrder.status === 'Succeeded' || activeOrder.status === 'completed' 
                      ? 'bg-green-100 text-green-800 dark:bg-green-950/40 dark:text-green-400' 
                      : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-950/40 dark:text-yellow-400'
                  }`}>
                    {activeOrder.status}
                  </span>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center text-center p-8 my-auto space-y-3">
                <FiSmartphone className="w-12 h-12 text-slate-300 dark:text-slate-700" />
                <h3 className="text-sm font-bold text-slate-400 dark:text-slate-500">No active link generated yet</h3>
                <p className="text-xs text-slate-400 dark:text-slate-500 max-w-xs">Fill the details on the left and click Generate to create a public mobile payment QR.</p>
              </div>
            )}
          </div>

        </div>

        {/* BOTTOM: Recent session payments table */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm p-6 border border-gray-150 dark:border-gray-800 space-y-4">
          <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <FiList className="text-indigo-600" />
            <span>Recent Session Demo Transactions</span>
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left border-collapse">
              <thead>
                <tr className="border-b dark:border-gray-800 text-gray-400 dark:text-gray-500 text-xs uppercase tracking-wider font-bold">
                  <th className="pb-3 font-semibold">Order ID</th>
                  <th className="pb-3 font-semibold">Customer</th>
                  <th className="pb-3 font-semibold text-right">Amount</th>
                  <th className="pb-3 font-semibold text-center">Status</th>
                  <th className="pb-3 font-semibold text-right">Link</th>
                </tr>
              </thead>
              <tbody className="divide-y dark:divide-gray-800">
                {sessionOrders.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-xs text-gray-400">
                      No demo transactions created in this session yet.
                    </td>
                  </tr>
                ) : (
                  sessionOrders.map((o) => (
                    <tr key={o.ztakeOrderId} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/10">
                      <td className="py-3.5 font-mono text-xs font-bold text-gray-700 dark:text-gray-300">
                        {o.ztakeOrderId}
                      </td>
                      <td className="py-3.5 text-gray-900 dark:text-white font-medium">
                        {o.customerName}
                      </td>
                      <td className="py-3.5 text-right font-extrabold text-gray-900 dark:text-white">
                        ₹{o.amount.toFixed(2)}
                      </td>
                      <td className="py-3.5 text-center">
                        <span className={`inline-block px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                          o.status === 'Succeeded' || o.status === 'completed'
                            ? 'bg-green-50 text-green-700 border border-green-200 dark:bg-green-950/20 dark:border-green-900 dark:text-green-400'
                            : 'bg-yellow-50 text-yellow-700 border border-yellow-200 dark:bg-yellow-950/20 dark:border-yellow-900 dark:text-yellow-400'
                        }`}>
                          {o.status}
                        </span>
                      </td>
                      <td className="py-3.5 text-right">
                        <a
                          href={o.payPageUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center text-xs text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 font-semibold gap-1"
                        >
                          <span>Checkout</span>
                          <FiExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </Layout>
  );
}
