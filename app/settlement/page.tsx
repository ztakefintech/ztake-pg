'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/context';
import Layout from '@/components/Layout';
import { FiDollarSign, FiClock, FiCheckCircle, FiRefreshCw, FiXCircle } from 'react-icons/fi';

interface SettlementRecord {
  id: number;
  amount: number;
  status: string;
  admin_notes?: string;
  created_at: string;
  fee_percent?: number;
  fee_amount?: number;
  net_amount?: number;
  fee_note?: string;
}

interface RechargeRecord {
  id: number;
  amount: number;
  utr?: string | null;
  status: string;
  created_at: string;
  fee_percent?: number;
  fee_amount?: number;
  net_amount?: number;
  fee_note?: string;
}

export default function SettlementPage() {
  const { vendor, token } = useAuth();
  const [records, setRecords] = useState<SettlementRecord[]>([]);
  const [recharges, setRecharges] = useState<RechargeRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'settlements' | 'recharges'>('settlements');

  useEffect(() => {
    if (vendor && token) {
      loadSettlementHistory();
    }
  }, [vendor, token]);

  const loadSettlementHistory = async () => {
    try {
      setLoading(true);
      setError('');
      
      // Fetch settlement history and recharge history in parallel
      const [settlementRes, rechargeRes] = await Promise.all([
        fetch('/api/vendor/settlements', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('/api/vendor/payouts/recharges', { headers: { 'Authorization': `Bearer ${token}` } })
      ]);

      if (settlementRes.ok) {
        const settlementData = await settlementRes.json();
        const settlementRecords = (settlementData.settlements || []).map((s: any) => ({
          id: s.id,
          amount: Number(s.amount),
          status: s.status,
          admin_notes: s.admin_notes,
          created_at: s.created_at,
          fee_percent: s.fee_percent != null ? Number(s.fee_percent) : undefined,
          fee_amount: s.fee_amount != null ? Number(s.fee_amount) : undefined,
          net_amount: s.net_amount != null ? Number(s.net_amount) : undefined,
          fee_note: s.fee_note || undefined
        }));
        
        // Sort by date (newest first)
        settlementRecords.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        setRecords(settlementRecords);
      } else {
        setError('Failed to load settlement history');
      }

      if (rechargeRes.ok) {
        const rechargeData = await rechargeRes.json();
        const rechargeRecords = (rechargeData?.data?.recharges || []).map((r: any) => ({
          id: r.id,
          amount: Number(r.amount),
          utr: r.utr,
          status: r.status,
          created_at: r.created_at,
          fee_percent: r.fee_percent != null ? Number(r.fee_percent) : undefined,
          fee_amount: r.fee_amount != null ? Number(r.fee_amount) : undefined,
          net_amount: r.net_amount != null ? Number(r.net_amount) : undefined,
          fee_note: r.fee_note || undefined
        }));
        rechargeRecords.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        setRecharges(rechargeRecords);
      }

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

  const getStatusText = (status: string) => {
    switch (status) {
      case 'approved':
        return 'Success';
      case 'rejected':
        return 'Failed';
      case 'created':
        return 'Pending';
      case 'success':
        return 'Success';
      case 'failed':
        return 'Failed';
      case 'pending':
        return 'Pending';
      default:
        return status;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <FiCheckCircle className="text-green-500" />;
      case 'failed':
        return <FiXCircle className="text-red-500" />;
      case 'pending':
        return <FiClock className="text-yellow-500" />;
      default:
        return <FiClock className="text-yellow-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
      case 'success':
        return 'bg-green-100 text-green-800';
      case 'rejected':
      case 'failed':
        return 'bg-red-100 text-red-800';
      case 'created':
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Settlement History</h1>
            <p className="text-gray-600 dark:text-gray-400">Track settlements and payout recharges</p>
            <div className="mt-2 space-y-2">
              <div className="text-xs text-gray-700 bg-yellow-50 border border-yellow-200 rounded px-3 py-2 inline-block">
                <span className="font-semibold">2%+GST PAYIN SETTLE</span> — Effective fee shown as 3.53% deduction.
              </div>
              <div className="text-xs text-gray-700 bg-blue-50 border border-blue-200 rounded px-3 py-2 inline-block ml-2">
                <span className="font-semibold">1%+GST PAYOUT RECHARGE</span> — Effective fee shown as 1.18% deduction.
              </div>
            </div>
          </div>
          <button
            onClick={loadSettlementHistory}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
          >
            <FiRefreshCw className="h-4 w-4" />
            Refresh
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 dark:border-gray-800">
          <nav className="-mb-px flex space-x-8">
            {[
              { id: 'settlements', name: 'Settlement Requests' },
              { id: 'recharges', name: 'Recharge Requests' }
            ].map((tab:any) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.name}
              </button>
            ))}
          </nav>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-600">{error}</p>
          </div>
        )}

        {activeTab === 'settlements' && (
        <div className="bg-white dark:bg-gray-900 shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white mb-4">Settlement Requests</h3>
            
            {records.length === 0 ? (
              <div className="text-center py-8">
                <FiDollarSign className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No settlement requests yet</h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Your settlement history will appear here.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-800">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">ID</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Amount</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Fee</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Net</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Admin Notes</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Date</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                    {records.map((record) => (
                      <tr key={record.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                          #{record.id}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                          {formatCurrency(record.amount)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                          {record.fee_amount != null
                            ? (
                              <span title={record.fee_percent != null ? `${record.fee_percent}%${record.fee_note ? ` • ${record.fee_note}` : ''}` : (record.fee_note || '')}>
                                {formatCurrency(record.fee_amount)}
                              </span>
                            )
                            : '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                          {record.net_amount != null ? formatCurrency(record.net_amount) : (record.fee_amount != null ? formatCurrency(record.amount - (record.fee_amount || 0)) : '-')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            {getStatusIcon(record.status)}
                            <span className={`ml-2 inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(record.status)}`}>
                              {getStatusText(record.status)}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                          {record.admin_notes || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
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
        )}

        {/* Recharge History */}
        {activeTab === 'recharges' && (
        <div className="bg-white dark:bg-gray-900 shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white mb-4">Recharge Requests</h3>

            {recharges.length === 0 ? (
              <div className="text-center py-8">
                <FiDollarSign className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No recharge requests yet</h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Your recharge history will appear here.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-800">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">ID</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Amount</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Fee</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Net</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">UTR</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Date</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                    {recharges.map((r) => (
                      <tr key={r.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">#{r.id}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">{formatCurrency(r.amount)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                          {r.fee_amount != null
                            ? (
                              <span title={r.fee_percent != null ? `${r.fee_percent}%${r.fee_note ? ` • ${r.fee_note}` : ''}` : (r.fee_note || '')}>
                                {formatCurrency(r.fee_amount)}
                              </span>
                            )
                            : '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                          {r.net_amount != null ? formatCurrency(r.net_amount) : (r.fee_amount != null ? formatCurrency(r.amount - (r.fee_amount || 0)) : '-')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-700">{r.utr || '-'}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(r.status)}`}>
                            {getStatusText(r.status)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{formatDate(r.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
        )}
      </div>
    </Layout>
  );
}
