'use client';

import * as React from 'react';
import { useState, useEffect } from 'react';

interface Stats {
  totalUsers: number;
  totalPayments: number;
  totalReceivedOrdersAmount?: number;
  paymentStatusBreakdown: Array<{
    payment_status: string;
    count: number;
    total_amount: number;
  }>;
  recentPayments: Array<{
    utr: string;
    amount: number;
    payment_status: string;
    created_at: string;
    business_name: string;
  }>;
  topVendors: Array<{
    business_name: string;
    contact_name: string;
    email: string;
    payment_count: number;
    total_amount: number;
  }>;
  dailyTrends: Array<{
    date: string;
    payment_count: number;
    total_amount: number;
  }>;
}

interface User {
  id: number;
  email: string;
  business_name: string;
  contact_name: string;
  phone: string;
  upi_id: string;
  payout_balance?: number;
  payout_recharge_bank_name?: string | null;
  payout_recharge_account_number?: string | null;
  payout_recharge_account_holder?: string | null;
  payout_recharge_ifsc?: string | null;
  created_at: string;
  updated_at: string;
}

interface Payment {
  id: number;
  utr: string;
  amount: number;
  payment_status: string;
  checked_status: boolean;
  checked_at: string | null;
  created_at: string;
  updated_at: string;
  business_name: string;
  contact_name: string;
  email: string;
  upi_id: string;
}

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState<Stats | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [payouts, setPayouts] = useState<Array<{
    id: number;
    vendor_id: number;
    business_name?: string;
    amount: number;
    currency: string;
    beneficiary_name?: string | null;
    beneficiary_account?: string | null;
    beneficiary_ifsc?: string | null;
    beneficiary_upi?: string | null;
    reference_id?: string | null;
    remarks?: string | null;
    status: string;
    cashfree_payout_id?: string | null;
    created_at: string;
  }>>([]);
  const [settlements, setSettlements] = useState<Array<{
    id: number;
    vendor_id: number;
    business_name?: string;
    amount: number;
    status: string;
    admin_notes?: string | null;
    created_at: string;
  }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  // UTR approvals
  const [pendingVendorId, setPendingVendorId] = useState<string>('1');
  const [payoutStatusFilter, setPayoutStatusFilter] = useState<string>('created');
  const [updatingPayoutId, setUpdatingPayoutId] = useState<number | null>(null);
  // Edit recharge details
  const [editUserId, setEditUserId] = useState<number | null>(null);
  const [editBankName, setEditBankName] = useState('');
  const [editAccountHolder, setEditAccountHolder] = useState('');
  const [editAccountNumber, setEditAccountNumber] = useState('');
  const [editIfsc, setEditIfsc] = useState('');
  const [savingUser, setSavingUser] = useState(false);

  function PendingUtrList({ vendorFilter, onApprove }: { vendorFilter?: string; onApprove: (p: { id?: number; utr: string; amount: number; vendor_id: number }) => Promise<void> }) {
    const [rows, setRows] = useState<Array<{ id?: number; utr: string; amount: number; vendor_id: number; business_name?: string; created_at: string }>>([]);
    const [loading, setLoading] = useState(false);
    const [err, setErr] = useState<string | null>(null);

    const load = async () => {
      setLoading(true);
      setErr(null);
      try {
        const query = new URLSearchParams({ status: 'Pending', limit: '50', with_utr: '1' });
        if (vendorFilter && vendorFilter.trim()) query.set('vendor_id', vendorFilter.trim());
        const res = await fetch(`/api/admin/orders?${query.toString()}`);
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error || 'Failed');
        const mapped = ((json.data && json.data.orders) || []).map((o: any) => ({
          utr: o.utr,
          amount: Number(o.amount),
          vendor_id: Number(o.vendor_id || vendorFilter || 0),
          business_name: o.customer_name,
          created_at: o.created_at
        })).filter((r: any) => r.utr);
        setRows(mapped);
      } catch (e: any) {
        setErr(e.message || 'Failed to load');
      } finally {
        setLoading(false);
      }
    };

    useEffect(() => { load(); }, [vendorFilter]);

    return (
      <div className="border rounded-md">
        <div className="flex items-center justify-between px-3 py-2 border-b">
          <div className="font-medium">Pending ({rows.length})</div>
          <button onClick={load} className="text-sm text-indigo-600 hover:underline">Refresh</button>
        </div>
        {loading ? (
          <div className="p-4 text-sm text-gray-500">Loading...</div>
        ) : err ? (
          <div className="p-4 text-sm text-red-600">{err}</div>
        ) : rows.length === 0 ? (
          <div className="p-4 text-sm text-gray-500">No pending UTRs</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">UTR</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Business</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Vendor</th>
                  <th className="px-4 py-2"></th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td className="px-4 py-2 text-sm font-mono">{r.utr}</td>
                    <td className="px-4 py-2 text-sm">{r.business_name}</td>
                    <td className="px-4 py-2 text-sm">
                      <div className="flex items-center gap-2">
                        <span className="text-gray-500">₹</span>
                        <input
                          value={String(r.amount)}
                          onChange={(e) => {
                            const val = e.target.value;
                            setRows((prev) => prev.map((row) => row.utr === r.utr ? { ...row, amount: Number(val) || 0 } : row));
                          }}
                          className="w-28 border rounded-md px-2 py-1"
                        />
                      </div>
                    </td>
                    <td className="px-4 py-2 text-sm">{r.vendor_id}</td>
                    <td className="px-4 py-2 text-right">
                      <button
                        onClick={async () => {
                          try {
                            await onApprove(r);
                            await load();
                            alert('Approved and resubmitted');
                          } catch (e: any) {
                            alert(e.message || 'Approve failed');
                          }
                        }}
                        className="text-sm bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-md"
                      >
                        Approve
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  }

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [statsRes, usersRes, paymentsRes] = await Promise.all([
        fetch('/api/admin/stats'),
        fetch('/api/admin/users'),
        fetch('/api/admin/payments')
      ]);

      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
      }

      if (usersRes.ok) {
        const usersData = await usersRes.json();
        setUsers(usersData.users);
      }

      if (paymentsRes.ok) {
        const paymentsData = await paymentsRes.json();
        setPayments(paymentsData.payments);
      }
      // Also load payouts with default filter
      await loadPayouts(payoutStatusFilter);
      // Load settlements
      await loadSettlements();
    } catch (error) {
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const loadPayouts = async (status?: string) => {
    try {
      const query = new URLSearchParams();
      if (status && status.trim()) query.set('status', status.trim());
      const res = await fetch(`/api/admin/payouts?${query.toString()}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Failed to fetch payouts');
      setPayouts((json.data && json.data.payouts) || []);
    } catch (e) {
      // best-effort error surface via alert in UI controls
    }
  };

  const loadSettlements = async () => {
    try {
      const res = await fetch('/api/admin/settlements');
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Failed to fetch settlements');
      setSettlements(json.settlements || []);
    } catch (e) {
      // best-effort error surface via alert in UI controls
    }
  };

  const updatePayoutStatus = async (id: number, status: string) => {
    setUpdatingPayoutId(id);
    try {
      const res = await fetch('/api/admin/payouts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Update failed');
      await loadPayouts(payoutStatusFilter);
    } catch (e: any) {
      alert(e.message || 'Failed to update payout');
    } finally {
      setUpdatingPayoutId(null);
    }
  };

  const updateSettlementStatus = async (id: number, status: string, adminNotes?: string) => {
    try {
      const res = await fetch('/api/admin/settlements', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status, admin_notes: adminNotes })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Update failed');
      await loadSettlements();
      alert(`Settlement ${status} successfully`);
    } catch (e: any) {
      alert(e.message || 'Failed to update settlement');
    }
  };

  const deleteUser = async (userId: number) => {
    if (!confirm('Are you sure you want to delete this user? This will also delete all their payments.')) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/users?id=${userId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        setUsers(users.filter(user => user.id !== userId));
        setPayments(payments.filter(payment => payment.id !== userId));
      } else {
        const errorData = await response.json();
        alert(errorData.error || 'Failed to delete user');
      }
    } catch (error) {
      alert('Failed to delete user');
    }
  };

  const openEditRecharge = (u: User) => {
    setEditUserId(u.id);
    setEditBankName(u.payout_recharge_bank_name || '');
    setEditAccountHolder(u.payout_recharge_account_holder || '');
    setEditAccountNumber(u.payout_recharge_account_number || '');
    setEditIfsc(u.payout_recharge_ifsc || '');
  };

  const saveRechargeDetails = async () => {
    if (!editUserId) return;
    setSavingUser(true);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editUserId,
          payout_recharge_bank_name: editBankName || null,
          payout_recharge_account_number: editAccountNumber || null,
          payout_recharge_account_holder: editAccountHolder || null,
          payout_recharge_ifsc: editIfsc || null,
        })
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j?.error || 'Failed to save');
      // reload users
      const usersRes = await fetch('/api/admin/users');
      if (usersRes.ok) {
        const usersData = await usersRes.json();
        setUsers(usersData.users);
      }
      setEditUserId(null);
    } catch (e: any) {
      alert(e.message || 'Save failed');
    } finally {
      setSavingUser(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center text-red-600">
        <p>{error}</p>
        <button
          onClick={loadData}
          className="mt-4 bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'overview', name: 'Overview' },
            { id: 'users', name: 'Users' },
            { id: 'payments', name: 'Payments' },
            { id: 'utrSubmit', name: 'UTR Submit' },
            { id: 'payouts', name: 'Payouts' },
            { id: 'settlements', name: 'Settlements' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.name}
            </button>
          ))}
        </nav>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && stats && (
        <div className="space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-indigo-500 rounded-md flex items-center justify-center">
                      <span className="text-white text-sm font-medium">U</span>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Total Users</dt>
                      <dd className="text-lg font-medium text-gray-900">{stats.totalUsers}</dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-green-500 rounded-md flex items-center justify-center">
                      <span className="text-white text-sm font-medium">P</span>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Total Payments</dt>
                      <dd className="text-lg font-medium text-gray-900">{stats.totalPayments}</dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-emerald-500 rounded-md flex items-center justify-center">
                      <span className="text-white text-sm font-medium">₹</span>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Total Received (Orders)</dt>
                      <dd className="text-lg font-medium text-gray-900">₹{Number(stats.totalReceivedOrdersAmount || 0).toFixed(2)}</dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-yellow-500 rounded-md flex items-center justify-center">
                      <span className="text-white text-sm font-medium">S</span>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Succeeded</dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {stats.paymentStatusBreakdown.find(p => p.payment_status === 'Succeeded')?.count || 0}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-red-500 rounded-md flex items-center justify-center">
                      <span className="text-white text-sm font-medium">F</span>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Failed</dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {stats.paymentStatusBreakdown.find(p => p.payment_status === 'Failed')?.count || 0}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Payments */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Recent Payments</h3>
              <div className="overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">UTR</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Business</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {stats.recentPayments.map((payment) => (
                      <tr key={payment.utr}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {payment.utr}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {payment.business_name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          ₹{payment.amount}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            payment.payment_status === 'Succeeded' ? 'bg-green-100 text-green-800' :
                            payment.payment_status === 'Failed' ? 'bg-red-100 text-red-800' :
                            'bg-yellow-100 text-yellow-800'
                          }`}>
                            {payment.payment_status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(payment.created_at).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Users Tab */}
      {activeTab === 'users' && (
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">All Users</h3>
            <div className="overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Business Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">UPI ID</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Payout Balance</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {users.map((user) => (
                    <tr key={user.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {user.business_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {user.contact_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {user.email}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {user.upi_id}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        ₹{Number(user.payout_balance || 0).toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(user.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="inline-flex gap-3">
                          <button
                            onClick={() => openEditRecharge(user)}
                            className="text-indigo-600 hover:text-indigo-900"
                          >
                            Edit Recharge Details
                          </button>
                          <button
                            onClick={() => deleteUser(user.id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Payments Tab */}
      {activeTab === 'payments' && (
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">All Payments</h3>
            <div className="overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">UTR</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Business</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Checked</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {payments.map((payment) => (
                    <tr key={payment.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {payment.utr}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {payment.business_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        ₹{payment.amount}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          payment.payment_status === 'Succeeded' ? 'bg-green-100 text-green-800' :
                          payment.payment_status === 'Failed' ? 'bg-red-100 text-red-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {payment.payment_status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {payment.checked_status ? 'Yes' : 'No'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(payment.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* UTR Submit Tab */}
      {activeTab === 'utrSubmit' && (
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6 space-y-4">
            <h3 className="text-lg leading-6 font-medium text-gray-900">Pending UTR Approvals</h3>

            {/* Pending UTR list */}
            <div className="mt-8">
              {/* <h4 className="text-md font-semibold text-gray-900 mb-3">Pending UTR Submissions</h4> */}
              <div className="mb-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Vendor ID (filter)</label>
                  <input
                    value={pendingVendorId}
                    onChange={(e) => setPendingVendorId(e.target.value)}
                    className="w-full border rounded-md px-3 py-2"
                    placeholder="e.g. 1"
                  />
                  <p className="text-xs text-gray-500 mt-1">Defaults to 1. Change to view another vendor's pending UTRs.</p>
                </div>
              </div>
              <PendingUtrList
                vendorFilter={pendingVendorId}
                onApprove={async (p) => {
                  const res = await fetch(`/api/admin/submit-utr`, {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ utr: p.utr, amount: p.amount, vendor_id: p.vendor_id })
                  });
                  if (!res.ok) {
                    const j = await res.json().catch(() => ({}));
                    throw new Error(j?.error || 'Approve failed');
                  }
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Payouts Tab */}
      {activeTab === 'payouts' && (
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
              <div>
                <h3 className="text-lg leading-6 font-medium text-gray-900">Payout Requests</h3>
                <p className="text-sm text-gray-500">Review beneficiary bank/UPI details, manually pay, then approve or reject.</p>
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={payoutStatusFilter}
                  onChange={async (e) => { setPayoutStatusFilter(e.target.value); await loadPayouts(e.target.value); }}
                  className="border rounded-md px-2 py-1 text-sm"
                >
                  <option value="">All</option>
                  <option value="created">Created</option>
                  <option value="approved">Approved</option>
                  <option value="paid">Paid</option>
                  <option value="failed">Failed</option>
                  <option value="rejected">Rejected</option>
                </select>
                <button onClick={() => loadPayouts(payoutStatusFilter)} className="px-3 py-1.5 text-sm bg-gray-100 rounded-md">Refresh</button>
              </div>
            </div>

            {/* Recharge Requests */}
            <div className="border rounded-md">
              <div className="flex items-center justify-between px-3 py-2 border-b">
                <div className="font-medium">Recharge Requests</div>
                <button onClick={() => loadPayouts(payoutStatusFilter)} className="text-sm text-indigo-600 hover:underline">Refresh</button>
              </div>
              <AdminRechargeRequests />
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Vendor</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Beneficiary</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Bank / UPI</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Ref</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-4 py-2"></th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {payouts.map((p) => (
                    <tr key={p.id}>
                      <td className="px-4 py-2 text-sm font-mono">{p.id}</td>
                      <td className="px-4 py-2 text-sm">{p.business_name || `Vendor #${p.vendor_id}`}</td>
                      <td className="px-4 py-2 text-sm">{p.currency} {Number(p.amount).toFixed(2)}</td>
                      <td className="px-4 py-2 text-sm">
                        <div className="space-y-0.5">
                          <div className="font-medium">{p.beneficiary_name || '-'}</div>
                        </div>
                      </td>
                      <td className="px-4 py-2 text-sm">
                        {p.beneficiary_account && p.beneficiary_ifsc ? (
                          <div className="space-y-0.5">
                            <div className="font-mono">A/C: {p.beneficiary_account}</div>
                            <div className="font-mono">IFSC: {p.beneficiary_ifsc}</div>
                          </div>
                        ) : p.beneficiary_upi ? (
                          <div className="font-mono">UPI: {p.beneficiary_upi}</div>
                        ) : (
                          <span className="text-gray-500">-</span>
                        )}
                      </td>
                      <td className="px-4 py-2 text-sm">{p.reference_id || '-'}</td>
                      <td className="px-4 py-2 text-sm">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          p.status === 'paid' || p.status === 'approved' ? 'bg-green-100 text-green-800' :
                          p.status === 'rejected' || p.status === 'failed' ? 'bg-red-100 text-red-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {p.status}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-right">
                        <div className="inline-flex gap-2">
                          <button
                            onClick={() => updatePayoutStatus(p.id, 'approved')}
                            disabled={updatingPayoutId === p.id}
                            className="px-3 py-1 bg-indigo-600 text-white rounded disabled:opacity-50"
                          >Approve</button>
                          <button
                            onClick={() => updatePayoutStatus(p.id, 'paid')}
                            disabled={updatingPayoutId === p.id}
                            className="px-3 py-1 bg-emerald-600 text-white rounded disabled:opacity-50"
                          >Mark Paid</button>
                          <button
                            onClick={() => updatePayoutStatus(p.id, 'rejected')}
                            disabled={updatingPayoutId === p.id}
                            className="px-3 py-1 bg-red-600 text-white rounded disabled:opacity-50"
                          >Reject</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {payouts.length === 0 && (
                <div className="p-6 text-center text-sm text-gray-500">No payouts found.</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Settlements Tab */}
      {activeTab === 'settlements' && (
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
              <div>
                <h3 className="text-lg leading-6 font-medium text-gray-900">Settlement Requests</h3>
                <p className="text-sm text-gray-500">Review and approve vendor settlement requests.</p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => loadSettlements()} className="px-3 py-1.5 text-sm bg-gray-100 rounded-md">Refresh</button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Vendor</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Admin Notes</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {settlements.map((s) => (
                    <tr key={s.id}>
                      <td className="px-4 py-2 text-sm font-mono">{s.id}</td>
                      <td className="px-4 py-2 text-sm">
                        <div>
                          <div className="font-medium">{s.business_name}</div>
                          <div className="text-gray-500">ID: {s.vendor_id}</div>
                        </div>
                      </td>
                      <td className="px-4 py-2 text-sm font-medium">₹{Number(s.amount).toFixed(2)}</td>
                      <td className="px-4 py-2 text-sm">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          s.status === 'approved' ? 'bg-green-100 text-green-800' :
                          s.status === 'rejected' ? 'bg-red-100 text-red-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {s.status}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-sm">{new Date(s.created_at).toLocaleString()}</td>
                      <td className="px-4 py-2 text-sm">
                        <input
                          type="text"
                          placeholder="Add notes..."
                          className="w-full border rounded px-2 py-1 text-xs"
                          defaultValue={s.admin_notes || ''}
                          onChange={(e) => {
                            // Update local state for admin notes
                            setSettlements(prev => prev.map(settlement => 
                              settlement.id === s.id ? { ...settlement, admin_notes: e.target.value } : settlement
                            ));
                          }}
                        />
                      </td>
                      <td className="px-4 py-2 text-right">
                        <div className="inline-flex gap-2">
                          {s.status === 'pending' && (
                            <>
                              <button
                                onClick={() => {
                                  const notes = settlements.find(settlement => settlement.id === s.id)?.admin_notes || '';
                                  updateSettlementStatus(s.id, 'approved', notes);
                                }}
                                className="px-3 py-1 bg-green-600 text-white rounded text-xs"
                              >Approve</button>
                              <button
                                onClick={() => {
                                  const notes = settlements.find(settlement => settlement.id === s.id)?.admin_notes || '';
                                  updateSettlementStatus(s.id, 'rejected', notes);
                                }}
                                className="px-3 py-1 bg-red-600 text-white rounded text-xs"
                              >Reject</button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {settlements.length === 0 && (
                <div className="p-6 text-center text-sm text-gray-500">No settlement requests found.</div>
              )}
            </div>
          </div>
        </div>
      )}

      {editUserId !== null && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-full max-w-lg p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-gray-900">Edit Recharge Bank Details</h3>
              <button onClick={() => setEditUserId(null)} className="text-gray-500">✕</button>
            </div>
            <div className="grid grid-cols-1 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Bank Name</label>
                <input value={editBankName} onChange={(e) => setEditBankName(e.target.value)} className="w-full border rounded-md px-3 py-2" placeholder="e.g. HDFC Bank" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Account Holder</label>
                <input value={editAccountHolder} onChange={(e) => setEditAccountHolder(e.target.value)} className="w-full border rounded-md px-3 py-2" placeholder="e.g. Jane Doe" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Account Number</label>
                <input value={editAccountNumber} onChange={(e) => setEditAccountNumber(e.target.value)} className="w-full border rounded-md px-3 py-2" placeholder="e.g. 1234567890" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">IFSC</label>
                <input value={editIfsc} onChange={(e) => setEditIfsc(e.target.value)} className="w-full border rounded-md px-3 py-2" placeholder="e.g. HDFC0001234" />
              </div>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => setEditUserId(null)} className="px-3 py-1.5 text-sm border rounded">Cancel</button>
              <button onClick={saveRechargeDetails} disabled={savingUser} className="px-3 py-1.5 text-sm bg-indigo-600 text-white rounded disabled:opacity-50">Save</button>
            </div>
            <p className="text-xs text-gray-500 mt-3">These details are shown to the vendor in the Recharge popup.</p>
          </div>
        </div>
      )}
    </div>
  );
}

function AdminRechargeRequests() {
  const [rows, setRows] = React.useState<Array<{ id:number; vendor_id:number; business_name:string; amount:number; utr?: string | null; status:string; created_at:string }>>([])
  const [loading, setLoading] = React.useState(false)
  const [err, setErr] = React.useState<string | null>(null)
  const [updatingId, setUpdatingId] = React.useState<number | null>(null)
  const [edits, setEdits] = React.useState<Record<number, { amount: string; utr: string }>>({})

  const load = async () => {
    setLoading(true)
    setErr(null)
    try {
      const res = await fetch('/api/admin/recharges')
      const j = await res.json()
      if (!res.ok) throw new Error(j?.error || 'Failed')
      setRows((j.data && j.data.recharges) || [])
    } catch (e:any) {
      setErr(e.message || 'Failed to load')
    } finally {
      setLoading(false)
    }
  }

  React.useEffect(() => { load() }, [])

  const update = async (id:number, status:string) => {
    setUpdatingId(id)
    try {
      const payload:any = { id, status }
      if (edits[id]?.amount) payload.amount = Number(edits[id].amount)
      if (edits[id]?.utr) payload.utr = edits[id].utr
      const res = await fetch('/api/admin/recharges', { method:'PATCH', headers:{ 'Content-Type':'application/json' }, body: JSON.stringify(payload) })
      let j:any = null; try { j = await res.json() } catch {}
      if (!res.ok) throw new Error((j && j.error) || 'Update failed')
      await load()
    } catch (e:any) {
      alert(e.message || 'Failed')
    } finally {
      setUpdatingId(null)
    }
  }

  if (loading) return <div className="p-4 text-sm text-gray-500">Loading...</div>
  if (err) return <div className="p-4 text-sm text-red-600">{err}</div>
  if (rows.length === 0) return <div className="p-4 text-sm text-gray-500">No recharge requests</div>

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Vendor</th>
            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">UTR</th>
            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
            <th className="px-4 py-2"></th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {rows.map((r) => (
            <tr key={r.id}>
              <td className="px-4 py-2 text-sm font-mono">{r.id}</td>
              <td className="px-4 py-2 text-sm">{r.business_name || `Vendor #${r.vendor_id}`}</td>
              <td className="px-4 py-2 text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-gray-500">₹</span>
                  <input
                    value={edits[r.id]?.amount ?? String(r.amount)}
                    onChange={(e) => setEdits((prev) => ({ ...prev, [r.id]: { ...(prev[r.id]||{ utr: r.utr || '' }), amount: e.target.value } }))}
                    className="w-28 border rounded-md px-2 py-1"
                  />
                </div>
              </td>
              <td className="px-4 py-2 text-sm">
                <input
                  value={edits[r.id]?.utr ?? (r.utr || '')}
                  onChange={(e) => setEdits((prev) => ({ ...prev, [r.id]: { ...(prev[r.id]||{ amount: String(r.amount) }), utr: e.target.value } }))}
                  className="w-40 border rounded-md px-2 py-1 font-mono"
                  placeholder="UTR"
                />
              </td>
              <td className="px-4 py-2 text-sm">
                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                  r.status === 'paid' || r.status === 'approved' ? 'bg-green-100 text-green-800' :
                  r.status === 'rejected' ? 'bg-red-100 text-red-800' :
                  'bg-yellow-100 text-yellow-800'
                }`}>
                  {r.status}
                </span>
              </td>
              <td className="px-4 py-2 text-right">
                <div className="inline-flex gap-2">
                  <button onClick={() => update(r.id, 'approved')} disabled={updatingId===r.id} className="px-3 py-1 bg-indigo-600 text-white rounded disabled:opacity-50">Approve</button>
                  <button onClick={() => update(r.id, 'paid')} disabled={updatingId===r.id} className="px-3 py-1 bg-emerald-600 text-white rounded disabled:opacity-50">Mark Paid</button>
                  <button onClick={() => update(r.id, 'rejected')} disabled={updatingId===r.id} className="px-3 py-1 bg-red-600 text-white rounded disabled:opacity-50">Reject</button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
