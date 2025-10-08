'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/context';
import { FiCreditCard, FiDollarSign, FiClock, FiCheckCircle, FiRefreshCw, FiCopy, FiMaximize2, FiShield, FiInfo, FiCpu, FiAlertTriangle, FiArchive } from 'react-icons/fi';

interface Payment {
  id: number;
  utr: string;
  amount: number;
  status: string;
  created_at: string;
}

interface PaymentInfo {
  qr_code_url: string;
  upi_id: string;
  upi_url: string;
  vendor_id: number;
  bank_name?: string | null;
  bank_account_holder?: string | null;
  bank_account_number?: string | null;
  bank_ifsc?: string | null;
  bot_token_present?: boolean;
  chat_id_present?: boolean;
  is_bot_live?: boolean;
}

export default function Dashboard() {
  const { vendor, token } = useAuth();
  const [paymentInfo, setPaymentInfo] = useState<PaymentInfo | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [totalReceived, setTotalReceived] = useState<number>(0);
  const [payoutBalance, setPayoutBalance] = useState<number>(0);
  const [rechargeAccount, setRechargeAccount] = useState<{ bank_name?: string | null; account_number?: string | null; account_holder?: string | null; ifsc?: string | null } | null>(null);
  const [showRecharge, setShowRecharge] = useState(false);
  const [rechargeAmount, setRechargeAmount] = useState('');
  const [rechargeUtr, setRechargeUtr] = useState('');
  const [submittingRecharge, setSubmittingRecharge] = useState(false);
  const [submittingSettlement, setSubmittingSettlement] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [qrError, setQrError] = useState('');

  useEffect(() => {
    if (vendor && token) {
      fetchDashboardData();
    }
  }, [vendor, token]);

  // Refresh data when vendor UPI ID changes
  useEffect(() => {
    if (vendor?.upi_id && paymentInfo) {
      // If the UPI ID in context is different from what we have in paymentInfo, refresh
      if (vendor.upi_id !== paymentInfo.upi_id) {
        fetchDashboardData(true);
      }
    }
  }, [vendor?.upi_id]);

  const fetchDashboardData = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      setError('');
      setQrError('');
      
      // Fetch payment info and recent payments in parallel
      const [paymentInfoRes, paymentsRes, statsRes, balanceRes, settlementsRes] = await Promise.all([
        fetch('/api/vendor/payment-info', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }),
        fetch('/api/vendor/payments?limit=5', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }),
        fetch('/api/vendor/stats', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }),
        fetch('/api/vendor/payouts/balance', {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch('/api/vendor/settlements', {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ]);

      if (paymentInfoRes.ok) {
        const paymentData = await paymentInfoRes.json();
        setPaymentInfo(paymentData);
        setQrError('');
      } else {
        const errorData = await paymentInfoRes.json();
        setQrError(errorData.error || 'Failed to load payment info');
      }
      
      if (paymentsRes.ok) {
        const paymentsData = await paymentsRes.json();
        setPayments(paymentsData.payments);
      } else {
        setError('Failed to load recent payments');
      }

      if (statsRes.ok) {
        const statsData = await statsRes.json();
        let totalReceivedAmount = Number(statsData?.data?.totalReceivedOrdersAmount || 0);
        
        // Subtract pending settlements from total received
        if (settlementsRes.ok) {
          const settlementsData = await settlementsRes.json();
          const pendingSettlements = settlementsData.settlements?.filter((s: any) => s.status === 'pending') || [];
          const pendingAmount = pendingSettlements.reduce((sum: number, s: any) => sum + Number(s.amount), 0);
          totalReceivedAmount -= pendingAmount;
        }
        
        // Ensure total never goes negative
        setTotalReceived(Math.max(0, totalReceivedAmount));
      }

      if (balanceRes.ok) {
        const balJson = await balanceRes.json();
        setPayoutBalance(Number(balJson?.data?.balance || 0));
        setRechargeAccount(balJson?.data?.recharge_account || null);
      }
    } catch (err) {
      setError('Failed to load dashboard data');
      setQrError('Network error occurred');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <FiCheckCircle className="text-green-500" />;
      case 'pending':
        return <FiClock className="text-yellow-500" />;
      default:
        return <FiClock className="text-gray-500" />;
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      // You could add a toast notification here
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  const handleRefresh = () => {
    fetchDashboardData(true);
  };

  const submitRecharge = async () => {
    const amt = Number(rechargeAmount);
    if (!Number.isFinite(amt) || amt <= 0) {
      alert('Enter a valid amount');
      return;
    }
    if (!rechargeUtr || rechargeUtr.trim().length < 6) {
      alert('Enter a valid UTR');
      return;
    }
    setSubmittingRecharge(true);
    try {
      const res = await fetch('/api/vendor/payouts/recharges', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ amount: amt, utr: rechargeUtr.trim() })
      });
      let j: any = null;
      try { j = await res.json(); } catch {}
      if (!res.ok) throw new Error((j && j.error) || 'Failed');
      setShowRecharge(false);
      setRechargeAmount('');
      setRechargeUtr('');
      alert('Recharge request submitted');
    } catch (e: any) {
      alert(e.message || 'Recharge failed');
    } finally {
      setSubmittingRecharge(false);
    }
  };

  const processSettlement = async () => {
    if (totalReceived <= 0) {
      alert('No amount available for settlement');
      return;
    }
    
    if (!confirm(`Are you sure you want to process settlement for ${formatCurrency(totalReceived)}? This will send the request to admin for approval.`)) {
      return;
    }

    setSubmittingSettlement(true);
    try {
      const res = await fetch('/api/vendor/settlements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ amount: totalReceived })
      });
      
      let j: any = null;
      try { j = await res.json(); } catch {}
      if (!res.ok) throw new Error((j && j.error) || 'Failed');
      
      alert('Settlement request submitted successfully! Admin will review and approve.');
      // Refresh dashboard data to update totals
      fetchDashboardData();
    } catch (e: any) {
      alert(e.message || 'Settlement request failed');
    } finally {
      setSubmittingSettlement(false);
    }
  };

  const maskAccountNumber = (acct?: string | null) => {
    if (!acct) return '';
    const trimmed = String(acct).replace(/\s+/g, '');
    if (trimmed.length <= 4) return trimmed;
    return `${'*'.repeat(Math.max(0, trimmed.length - 4))}${trimmed.slice(-4)}`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600">Welcome back, {vendor?.business_name}</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-600">{error}</p>
        </div>
      )}

      {/* Payment Info Card */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Payment Information</h2>
          <div className="flex items-center space-x-2">
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="p-2 text-gray-500 hover:text-gray-700 disabled:opacity-50"
              title="Refresh QR Code"
            >
              <FiRefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
            <FiMaximize2 className="text-primary-600" />
          </div>
        </div>
        
        {qrError ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-600">{qrError}</p>
            <button
              onClick={handleRefresh}
              className="mt-2 text-sm text-red-600 hover:text-red-800 underline"
            >
              Try again
            </button>
          </div>
        ) : paymentInfo ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">UPI ID</h3>
              <div className="flex items-center space-x-2">
                <p className="text-lg font-mono bg-gray-100 p-3 rounded flex-1">{paymentInfo.upi_id}</p>
                <button
                  onClick={() => copyToClipboard(paymentInfo.upi_id || '')}
                  className="p-2 text-gray-500 hover:text-gray-700"
                  title="Copy UPI ID"
                >
                  <FiCopy className="h-4 w-4" />
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">Click the copy icon to copy UPI ID</p>
            </div>
            
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">QR Code</h3>
              <div className="flex justify-center">
                <div className="relative">
                  <img 
                    src={paymentInfo.qr_code_url} 
                    alt="Payment QR Code" 
                    className="w-40 h-40 border-2 border-gray-200 rounded-lg shadow-sm"
                    onError={() => setQrError('Failed to load QR code image')}
                  />
                  {isRefreshing && (
                    <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center rounded-lg">
                      <FiRefreshCw className="h-6 w-6 animate-spin text-primary-600" />
                    </div>
                  )}
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-2 text-center">Scan with any UPI app to pay</p>
            </div>

            {/* Bank Details */}
        
          </div>
        ) : (
          <div className="text-center py-8">
            <FiMaximize2 className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">Loading payment info...</h3>
            <p className="mt-1 text-sm text-gray-500">Please wait while we fetch your UPI details.</p>
          </div>
        )}
      </div>

      {/* Totals */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Total Received (Orders)</h2>
            <FiDollarSign className="text-primary-600" />
          </div>
          <div className="text-2xl font-bold">{formatCurrency(totalReceived)}</div>
          <div className="mt-3 flex items-center justify-between">
            <span className="text-xs text-gray-500">Sum of succeeded orders</span>
            <div className="flex items-center gap-2">
              <a href="/settlement" className="p-2 bg-indigo-600 text-white rounded hover:bg-indigo-700" title="View History">
                <FiArchive className="h-4 w-4" />
              </a>
              {totalReceived > 0 && (
                <button 
                  onClick={processSettlement}
                  disabled={submittingSettlement}
                  className="px-3 py-1.5 text-sm bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
                >
                  {submittingSettlement ? 'Processing...' : 'Settle'}
                </button>
              )}
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Payout Balance</h2>
            <FiDollarSign className="text-primary-600" />
          </div>
          <div className="text-2xl font-bold">{formatCurrency(payoutBalance)}</div>
          <div className="mt-3 flex items-center justify-between">
            <span className="text-xs text-gray-500">Use for vendor payouts</span>
            <div className="flex items-center gap-2">
              {/* <a href="/settlement" className="p-2 bg-gray-600 text-white rounded hover:bg-gray-700" title="View History">
                <FiArchive className="h-4 w-4" />
              </a> */}
              <button onClick={() => setShowRecharge(true)} className="px-3 py-1.5 text-sm bg-indigo-600 text-white rounded">Recharge</button>
            </div>
          </div>
        </div>
      </div>

      {/* System Status Tiles */}
      <div className=" grid-cols-1 md:grid-cols-3 gap-6 hidden">
        {/* Bot Status */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Bot Status</h2>
            <FiShield className="text-primary-600" />
          </div>
          {paymentInfo && paymentInfo.is_bot_live ? (
            <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center space-x-3">
                <FiCheckCircle className="text-green-600" />
                <div>
                  <p className="text-sm font-medium text-green-800">Bot is Live</p>
                  <p className="text-xs text-green-700">We are monitoring your payments.</p>
                </div>
              </div>
              <span className="inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">Active</span>
            </div>
          ) : (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-yellow-800 text-sm">Bot is not configured. Provide Bot Token and Chat ID in settings.</p>
            </div>
          )}
        </div>

        {/* API Status */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">API Status</h2>
            <FiCpu className="text-primary-600" />
          </div>
          <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div>
              <p className="text-sm font-medium text-blue-800">Operational</p>
              <p className="text-xs text-blue-700">All systems are running normally.</p>
            </div>
            <span className="inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">200 OK</span>
          </div>
        </div>

        {/* Important Alerts */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Important</h2>
            <FiAlertTriangle className="text-primary-600" />
          </div>
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <p className="text-sm text-gray-700">No alerts.</p>
            <p className="text-xs text-gray-500">You are up to date.</p>
          </div>
        </div>
      </div>

      {/* Recent Payments */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Recent Payments</h2>
          <FiDollarSign className="text-primary-600" />
        </div>
        
        {payments.length === 0 ? (
          <div className="text-center py-8">
            <FiCreditCard className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No payments yet</h3>
            <p className="mt-1 text-sm text-gray-500">Payments will appear here once they are processed.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    UTR
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {payments.map((payment) => (
                  <tr key={payment.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">
                      {payment.utr}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatCurrency(payment.amount)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        {getStatusIcon(payment.status)}
                        <span className="text-sm text-gray-900 capitalize">{payment.status}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(payment.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showRecharge && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-full max-w-md p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-gray-900">Recharge Payout Balance</h3>
              <button onClick={() => setShowRecharge(false)} className="text-gray-500">✕</button>
            </div>
            {rechargeAccount ? (
              <div className="bg-gray-50 border border-gray-200 rounded p-4 space-y-1 mb-4">
                <div className="text-sm text-gray-600">Transfer to:</div>
                {rechargeAccount.bank_name && <div className="text-sm"><span className="text-gray-600">Bank:</span> <span className="font-medium">{rechargeAccount.bank_name}</span></div>}
                {rechargeAccount.account_holder && <div className="text-sm"><span className="text-gray-600">Account Holder:</span> <span className="font-medium">{rechargeAccount.account_holder}</span></div>}
                {rechargeAccount.account_number && <div className="text-sm font-mono"><span className="text-gray-600 not-italic font-sans">Account Number:</span> {rechargeAccount.account_number}</div>}
                {rechargeAccount.ifsc && <div className="text-sm"><span className="text-gray-600">IFSC:</span> <span className="font-medium">{rechargeAccount.ifsc}</span></div>}
              </div>
            ) : (
              <div className="bg-yellow-50 border border-yellow-200 rounded p-4 text-sm text-yellow-800 mb-4">Recharge account details not configured. Please contact support.</div>
            )}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Amount</label>
              <input value={rechargeAmount} onChange={(e) => setRechargeAmount(e.target.value)} className="w-full border rounded px-3 py-2" placeholder="e.g. 5000" />
            </div>
            <div className="space-y-2 mt-3">
              <label className="block text-sm font-medium text-gray-700">UTR</label>
              <input value={rechargeUtr} onChange={(e) => setRechargeUtr(e.target.value)} className="w-full border rounded px-3 py-2" placeholder="e.g. 214587963214" />
              {/* <p className="text-xs text-gray-500">Provide UTR after transferring to help admin validate quickly.</p> */}
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => setShowRecharge(false)} className="px-3 py-1.5 text-sm border rounded">Cancel</button>
              <button onClick={submitRecharge} disabled={submittingRecharge} className="px-3 py-1.5 text-sm bg-indigo-600 text-white rounded disabled:opacity-50">Submit</button>
            </div>
            {/* <p className="text-xs text-gray-500 mt-3">Your request will appear in admin dashboard. Admin will manually credit and approve; balance updates after approval.</p> */}
          </div>
        </div>
      )}
    </div>
  );
}
