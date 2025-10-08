'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/context';
import { FiDollarSign, FiCreditCard, FiClock, FiCheckCircle, FiRefreshCw, FiArrowUpRight, FiArrowDownLeft } from 'react-icons/fi';

interface SettlementRecord {
  id: number;
  type: 'recharge' | 'payout' | 'order_credit' | 'settlement';
  amount: number;
  status: string;
  description: string;
  created_at: string;
  utr?: string;
  beneficiary_name?: string;
  reference_id?: string;
}

export default function SettlementPage() {
  const { vendor, token } = useAuth();
  const [records, setRecords] = useState<SettlementRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (vendor && token) {
      loadSettlementHistory();
    }
  }, [vendor, token]);

  const loadSettlementHistory = async () => {
    try {
      setLoading(true);
      setError('');
      
      // Fetch recharge history
      const rechargeRes = await fetch('/api/vendor/payouts/recharges', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      // Fetch payout history
      const payoutRes = await fetch('/api/vendor/payouts', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      // Fetch order credits (succeeded orders)
      const ordersRes = await fetch('/api/vendor/orders', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      // Fetch settlement history
      const settlementRes = await fetch('/api/vendor/settlements', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const allRecords: SettlementRecord[] = [];

      if (rechargeRes.ok) {
        const rechargeData = await rechargeRes.json();
        const rechargeRecords = (rechargeData.data?.recharges || []).map((r: any) => ({
          id: r.id,
          type: 'recharge' as const,
          amount: Number(r.amount),
          status: r.status,
          description: `Recharge request`,
          created_at: r.created_at,
          utr: r.utr
        }));
        allRecords.push(...rechargeRecords);
      }

      if (payoutRes.ok) {
        const payoutData = await payoutRes.json();
        const payoutRecords = (payoutData.payouts || []).map((p: any) => ({
          id: p.id,
          type: 'payout' as const,
          amount: -Number(p.amount), // Negative for outflows
          status: p.status,
          description: `Payout to ${p.beneficiary_name || 'beneficiary'}`,
          created_at: p.created_at,
          beneficiary_name: p.beneficiary_name,
          reference_id: p.reference_id
        }));
        allRecords.push(...payoutRecords);
      }

      if (ordersRes.ok) {
        const ordersData = await ordersRes.json();
        const orderRecords = (ordersData.data?.orders || [])
          .filter((o: any) => o.status === 'Succeeded')
          .map((o: any) => ({
            id: o.id,
            type: 'order_credit' as const,
            amount: Number(o.amount),
            status: 'completed',
            description: `Order payment received`,
            created_at: o.created_at,
            reference_id: o.merchant_order_id
          }));
        allRecords.push(...orderRecords);
      }

      if (settlementRes.ok) {
        const settlementData = await settlementRes.json();
        const settlementRecords = (settlementData.settlements || []).map((s: any) => ({
          id: s.id,
          type: 'settlement' as const,
          amount: -Number(s.amount), // Negative for outflows
          status: s.status,
          description: `Settlement request`,
          created_at: s.created_at
        }));
        allRecords.push(...settlementRecords);
      }

      // Sort by date (newest first)
      allRecords.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setRecords(allRecords);

    } catch (err) {
      setError('Failed to load settlement history');
    } finally {
      setLoading(false);
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

  const getStatusIcon = (type: string, status: string) => {
    if (type === 'recharge' || type === 'payout' || type === 'settlement') {
      switch (status) {
        case 'approved':
        case 'paid':
          return <FiCheckCircle className="text-green-500" />;
        case 'rejected':
          return <FiClock className="text-red-500" />;
        case 'pending':
          return <FiClock className="text-yellow-500" />;
        default:
          return <FiClock className="text-yellow-500" />;
      }
    }
    
    return <FiCheckCircle className="text-green-500" />;
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'recharge':
        return <FiArrowDownLeft className="text-blue-500" />;
      case 'payout':
        return <FiArrowUpRight className="text-orange-500" />;
      case 'settlement':
        return <FiDollarSign className="text-purple-500" />;
      case 'order_credit':
        return <FiDollarSign className="text-green-500" />;
      default:
        return <FiCreditCard className="text-gray-500" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Settlement History</h1>
          <p className="text-gray-600">Track all your balance movements and transactions</p>
        </div>
        <button
          onClick={loadSettlementHistory}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
        >
          <FiRefreshCw className="h-4 w-4" />
          Refresh
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-600">{error}</p>
        </div>
      )}

      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Transaction History</h3>
          
          {records.length === 0 ? (
            <div className="text-center py-8">
              <FiCreditCard className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No transactions yet</h3>
              <p className="mt-1 text-sm text-gray-500">Your settlement history will appear here.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reference</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {records.map((record) => (
                    <tr key={`${record.type}-${record.id}`}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          {getTypeIcon(record.type)}
                          <span className="ml-2 text-sm font-medium text-gray-900 capitalize">
                            {record.type.replace('_', ' ')}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {record.description}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <span className={record.amount >= 0 ? 'text-green-600' : 'text-red-600'}>
                          {record.amount >= 0 ? '+' : ''}{formatCurrency(record.amount)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          {getStatusIcon(record.type, record.status)}
                          <span className="ml-2 text-sm text-gray-900 capitalize">{record.status}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {record.utr && (
                          <div className="font-mono">{record.utr}</div>
                        )}
                        {record.reference_id && (
                          <div className="text-xs">{record.reference_id}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(record.created_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
