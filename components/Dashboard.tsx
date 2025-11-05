'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/context';
import { FiCreditCard, FiDollarSign, FiClock, FiCheckCircle, FiShield, FiInfo, FiCpu, FiAlertTriangle, FiArchive } from 'react-icons/fi';
import { useVendorWebSocket } from '@/hooks/use-websocket';
import MaskedText from '@/components/ui/masked-text';
import { toast } from '@/hooks/use-toast';

interface Payment {
  id: number;
  utr: string;
  amount: number;
  status: string;
  created_at: string;
}

interface RechargeRequest {
  id: number;
  amount: number;
  utr: string;
  status: string;
  admin_notes?: string | null;
  created_at: string;
}

export default function Dashboard() {
  const { vendor, token } = useAuth();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [totalReceived, setTotalReceived] = useState<number>(0);
  const [payoutBalance, setPayoutBalance] = useState<number>(0);
  const [heldAmount, setHeldAmount] = useState<number>(0);
  const [rechargeAccount, setRechargeAccount] = useState<{ bank_name?: string | null; account_number?: string | null; account_holder?: string | null; ifsc?: string | null } | null>(null);
  const [rechargeRequests, setRechargeRequests] = useState<RechargeRequest[]>([]);
  const [showRecharge, setShowRecharge] = useState(false);
  const [rechargeAmount, setRechargeAmount] = useState('');
  const [rechargeUtr, setRechargeUtr] = useState('');
  const [submittingRecharge, setSubmittingRecharge] = useState(false);
  const [submittingSettlement, setSubmittingSettlement] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // WebSocket connection for real-time updates
  const ws = useVendorWebSocket({
    onEvent: (event) => {
      console.log('Vendor received WebSocket event:', event);
      
      // Handle recharge status changes
      if (event.type === 'recharge_status_changed' && event.payload.vendorId === vendor?.id) {
        const message = getRechargeEventMessage(event);
        const variant = getRechargeEventVariant(event.payload.status);
        
        toast({
          title: "Recharge Update",
          description: message,
          variant: variant,
          duration: 5000,
        });
        
        // Refresh recharge requests
        fetchRechargeRequests();
      }
      
      // Handle payment status changes
      if (event.type === 'payment_status_changed' && event.payload.vendorId === vendor?.id) {
        const message = getPaymentEventMessage(event);
        const variant = getPaymentEventVariant(event.payload.payment_status);
        
        toast({
          title: "Payment Update",
          description: message,
          variant: variant,
          duration: 5000,
        });
        
        // Refresh dashboard data
        fetchDashboardData();
      }
      
      // Handle settlement status changes
      if (event.type === 'settlement_status_changed' && event.payload.vendorId === vendor?.id) {
        const message = getSettlementEventMessage(event);
        const variant = getSettlementEventVariant(event.payload.status);
        
        toast({
          title: "Settlement Update",
          description: message,
          variant: variant,
          duration: 5000,
        });
        
        // Refresh dashboard data
        fetchDashboardData();
      }
    },
    onConnect: () => {
      console.log('Vendor WebSocket connected');
    },
    onDisconnect: () => {
      console.log('Vendor WebSocket disconnected');
    },
    onError: (error) => {
      console.error('Vendor WebSocket error:', error);
    }
  });

  // Helper functions for recharge events
  const getRechargeEventMessage = (event: any) => {
    const { amount, status, adminNotes } = event.payload;
    switch (status) {
      case 'success':
        return `Your recharge request of ₹${amount} was successful!`;
      case 'paid':
        return `Your recharge request of ₹${amount} has been processed successfully!`;
      case 'failed':
        return `Your recharge request of ₹${amount} failed. ${adminNotes ? `Reason: ${adminNotes}` : ''}`;
      default:
        return `Your recharge request status updated to ${getStatusText(status)}`;
    }
  };

  const getRechargeEventVariant = (status: string): 'default' | 'destructive' => {
    if (status === 'failed') {
      return 'destructive';
    }
    return 'default';
  };

  // Helper functions for payment events
  const getPaymentEventMessage = (event: any) => {
    const { amount, payment_status, utr } = event.payload;
    switch (payment_status) {
      case 'Succeeded':
        return `Payment of ₹${amount} (UTR: ${utr}) was successful!`;
      case 'Failed':
        return `Payment of ₹${amount} (UTR: ${utr}) failed.`;
      case 'Pending':
        return `Payment of ₹${amount} (UTR: ${utr}) is pending.`;
      default:
        return `Payment status updated to ${getStatusText(payment_status)}`;
    }
  };

  const getPaymentEventVariant = (status: string): 'default' | 'destructive' => {
    if (status === 'Failed') {
      return 'destructive';
    }
    return 'default';
  };

  // Helper functions for settlement events
  const getSettlementEventMessage = (event: any) => {
    const { amount, status, adminNotes } = event.payload;
    switch (status) {
      case 'success':
        return `Your settlement request of ₹${amount} was successful!`;
      case 'paid':
        return `Your settlement request of ₹${amount} has been processed successfully!`;
      case 'failed':
        return `Your settlement request of ₹${amount} failed. ${adminNotes ? `Reason: ${adminNotes}` : ''}`;
      default:
        return `Settlement request status updated to ${getStatusText(status)}`;
    }
  };

  const getSettlementEventVariant = (status: string): 'default' | 'destructive' => {
    if (status === 'failed') {
      return 'destructive';
    }
    return 'default';
  };

  useEffect(() => {
    if (vendor && token) {
      fetchDashboardData();
    }
  }, [vendor, token]);

  const fetchDashboardData = async () => {
    try {
      setIsLoading(true);
      setError('');
      
      // Fetch recent payments and stats in parallel
      const [paymentsRes, statsRes, balanceRes, settlementsRes] = await Promise.all([
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
      
      if (paymentsRes.ok) {
        const paymentsData = await paymentsRes.json();
        setPayments(paymentsData.payments);
      } else {
        setError('Failed to load recent payments');
      }

      if (statsRes.ok) {
        const statsData = await statsRes.json();
        let totalReceivedAmount = Number(statsData?.data?.totalReceivedOrdersAmount || 0);
        
        // Subtract settlements that are already requested or completed (pending/success/paid)
        if (settlementsRes.ok) {
          const settlementsData = await settlementsRes.json();
          // Deduct amounts that are already requested or approved/processed
          // This prevents double counting between payin and payout balances
          const deductedStatuses = new Set(['pending', 'approved', 'success', 'paid']);
          const deductedSettlements = (settlementsData.settlements || []).filter((s: any) => deductedStatuses.has(String(s.status)));
          const deductedAmount = deductedSettlements.reduce((sum: number, s: any) => sum + Number(s.amount), 0);
          totalReceivedAmount -= deductedAmount;
        }
        
        // Ensure total never goes negative
        setTotalReceived(Math.max(0, totalReceivedAmount));
      }

      if (balanceRes.ok) {
        const balJson = await balanceRes.json();
        setPayoutBalance(Number(balJson?.data?.balance || 0));
        setHeldAmount(Number(balJson?.data?.held_amount || 0));
        setRechargeAccount(balJson?.data?.recharge_account || null);
      }

      // Fetch recharge requests
      await fetchRechargeRequests();
    } catch (err) {
      setError('Failed to load dashboard data');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchRechargeRequests = async () => {
    try {
      const res = await fetch('/api/vendor/payouts/recharges', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (res.ok) {
        const json = await res.json();
        setRechargeRequests(json?.data?.recharges || []);
      }
    } catch (err) {
      console.error('Failed to fetch recharge requests:', err);
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
      // Payment statuses
      case 'completed':
        return <FiCheckCircle className="text-green-500" />;
      case 'Succeeded':
        return <FiCheckCircle className="text-green-500" />;
      case 'Failed':
        return <FiAlertTriangle className="text-red-500" />;
      case 'Pending':
        return <FiClock className="text-yellow-500" />;
      
      // Recharge statuses
      case 'paid':
        return <FiCheckCircle className="text-green-500" />;
      case 'success':
        return <FiCheckCircle className="text-green-500" />;
      case 'failed':
        return <FiAlertTriangle className="text-red-500" />;
      case 'pending':
        return <FiClock className="text-yellow-500" />;
      
      // Settlement statuses
      case 'pending':
        return <FiClock className="text-yellow-500" />;
      
      default:
        return <FiClock className="text-gray-500" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      // Recharge statuses
      case 'paid':
        return 'Success';
      case 'success':
        return 'Success';
      case 'failed':
        return 'Failed';
      case 'pending':
        return 'Pending';
      
      // Payment statuses
      case 'completed':
        return 'Success';
      case 'Succeeded':
        return 'Success';
      case 'Failed':
        return 'Failed';
      case 'Pending':
        return 'Pending';
      
      // Settlement statuses
      case 'pending':
        return 'Pending';
      
      default:
        return 'Pending';
    }
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
      // Refresh recharge requests to show the new one
      await fetchRechargeRequests();
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
    
    // Calculate fee for settlement (3.53%)
    const feePercent = 3.53;
    const feeAmount = Number((totalReceived * feePercent / 100).toFixed(2));
    const netAmount = Number((totalReceived - feeAmount).toFixed(2));
    
    if (!confirm(`Are you sure you want to process settlement for ₹${totalReceived.toFixed(2)}?\n\nFee: 2% + GST (₹${feeAmount})\nNet amount: ₹${netAmount}\n\nThis will send the request to admin for approval.`)) {
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
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-400"></div>
      </div>
    );
  }
  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm p-6 border border-gray-200 dark:border-gray-800">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Welcome Back, {vendor?.business_name || 'User'}</h1>
        {vendor?.vendor_code && (
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Vendor ID: <MaskedText value={vendor.vendor_code} className="align-middle" />
          </p>
        )}
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}


      {/* Balance Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Payin Balance</h2>
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
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Payout Balance</h2>
            <FiDollarSign className="text-primary-600" />
          </div>
          <div className="text-2xl font-bold">{formatCurrency(payoutBalance)}</div>
          {/* {heldAmount > 0 && ( */}
            <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              <span className="font-medium">Funds on Hold:</span> {formatCurrency(heldAmount) || 0}
            </div>
          {/* )} */}
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
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Bot Status</h2>
            <FiShield className="text-primary-600" />
          </div>
          {vendor?.bot_token && vendor?.chat_id ? (
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
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">API Status</h2>
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
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Important</h2>
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
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Recent Payments</h2>
          <FiDollarSign className="text-blue-600 dark:text-blue-400" size={20} />
        </div>
        
        {payments.length === 0 ? (
          <div className="text-center py-8">
            <FiCreditCard className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" />
            <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No payments yet</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Payments will appear here once they are processed.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    UTR
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    AMOUNT
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    STATUS
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    DATE
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                {payments.map((payment) => (
                  <tr key={payment.id} className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900 dark:text-white">
                      {payment.utr}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                      {formatCurrency(payment.amount)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        {getStatusIcon(payment.status)}
                        <span className="text-sm font-medium text-gray-900 dark:text-white">{getStatusText(payment.status)}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
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
          <div className="bg-white dark:bg-gray-900 rounded-lg w-full max-w-md p-5 border border-gray-200 dark:border-gray-800">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Recharge Payout Balance</h3>
              <button onClick={() => setShowRecharge(false)} className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200">✕</button>
            </div>
            {rechargeAccount ? (
              <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded p-4 space-y-1 mb-4">
                <div className="text-sm text-gray-600 dark:text-gray-400">Transfer to:</div>
                {rechargeAccount.bank_name && <div className="text-sm"><span className="text-gray-600 dark:text-gray-400">Bank:</span> <span className="font-medium text-gray-900 dark:text-white">{rechargeAccount.bank_name}</span></div>}
                {rechargeAccount.account_holder && <div className="text-sm"><span className="text-gray-600 dark:text-gray-400">Account Holder:</span> <span className="font-medium text-gray-900 dark:text-white">{rechargeAccount.account_holder}</span></div>}
                {rechargeAccount.account_number && <div className="text-sm font-mono"><span className="text-gray-600 dark:text-gray-400 not-italic font-sans">Account Number:</span> <span className="text-gray-900 dark:text-white">{rechargeAccount.account_number}</span></div>}
                {rechargeAccount.ifsc && <div className="text-sm"><span className="text-gray-600 dark:text-gray-400">IFSC:</span> <span className="font-medium text-gray-900 dark:text-white">{rechargeAccount.ifsc}</span></div>}
              </div>
            ) : (
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded p-4 text-sm text-yellow-800 dark:text-yellow-200 mb-4">Recharge account details not configured. Please contact support.</div>
            )}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Amount</label>
              <input value={rechargeAmount} onChange={(e) => setRechargeAmount(e.target.value)} className="w-full border border-gray-300 dark:border-gray-700 rounded px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500" placeholder="e.g. 5000" />
              {rechargeAmount && !isNaN(Number(rechargeAmount)) && Number(rechargeAmount) > 0 && (
                <div className="text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 p-2 rounded">
                  <div>Fee: 1% + GST (₹{Number((Number(rechargeAmount) * 0.0118).toFixed(2))})</div>
                  <div>Net amount: ₹{Number((Number(rechargeAmount) - Number(rechargeAmount) * 0.0118).toFixed(2))}</div>
                </div>
              )}
            </div>
            <div className="space-y-2 mt-3">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">UTR</label>
              <input value={rechargeUtr} onChange={(e) => setRechargeUtr(e.target.value)} className="w-full border border-gray-300 dark:border-gray-700 rounded px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500" placeholder="e.g. 214587963214" />
              {/* <p className="text-xs text-gray-500">Provide UTR after transferring to help admin validate quickly.</p> */}
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => setShowRecharge(false)} className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-700 rounded bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">Cancel</button>
              <button onClick={submitRecharge} disabled={submittingRecharge} className="px-3 py-1.5 text-sm bg-indigo-600 dark:bg-indigo-500 text-white rounded hover:bg-indigo-700 dark:hover:bg-indigo-600 disabled:opacity-50">Submit</button>
            </div>
            {/* <p className="text-xs text-gray-500 mt-3">Your request will appear in admin dashboard. Admin will manually credit and approve; balance updates after approval.</p> */}
          </div>
        </div>
      )}
    </div>
  );
}
