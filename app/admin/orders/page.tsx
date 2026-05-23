'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useTheme } from 'next-themes';
import { FiSun, FiMoon } from 'react-icons/fi';
import { useRouter } from 'next/navigation';

interface OrderRow {
  ztake_order_id: string;
  merchant_order_id: string;
  amount: number;
  original_amount?: number | null;
  currency: string;
  customer_name: string;
  status: string;
  utr?: string | null;
  created_at: string;
  verification_source?: string | null;
}

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const { theme, setTheme } = useTheme();
  const router = useRouter();

  const loadOrders = async () => {
    try {
      const res = await fetch('/api/admin/orders');
      if (!res.ok) throw new Error('Failed to fetch orders');
      const json = await res.json();
      setOrders(json.data.orders);
    } catch (e: any) {
      setError(e.message || 'Error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setMounted(true);
    loadOrders();
  }, []);

  const handleLogout = async () => {
    try {
      await fetch('/api/admin/logout', { method: 'POST' });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      router.push('/admin/login');
    }
  };

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  const updateStatus = async (ztakeOrderId: string, status: string) => {
    setUpdatingId(ztakeOrderId);
    try {
      const res = await fetch(`/api/v1/orders/${ztakeOrderId}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      if (!res.ok) throw new Error('Failed to update');
      await loadOrders();
    } catch (e: any) {
      alert(e.message || 'Failed');
    } finally {
      setUpdatingId(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-glass-page">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 mx-auto" style={{ borderBottom: '2px solid var(--brand-primary)' }}></div>
          <p className="mt-4 text-zinc-500 dark:text-zinc-400">Loading orders data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-glass-page text-red-600 dark:text-red-400 p-8 font-semibold">
        Error loading orders: {error}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-glass-page text-zinc-900 dark:text-zinc-50">
      <nav
        className="fixed top-0 left-0 right-0 z-50"
        style={{
          height: '60px',
          background: 'var(--layout-header-bg)',
          backdropFilter: 'blur(24px) saturate(180%)',
          WebkitBackdropFilter: 'blur(24px) saturate(180%)',
          borderBottom: '1px solid var(--layout-sidebar-border)',
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-[60px]">
            <div className="flex items-center space-x-6">
              <Link href="/admin" className="flex items-center gap-2.5">
                <Image src="/ztake-icon.png" alt="Ztake" width={28} height={28} className="rounded" />
                <h1 className="ztake-wordmark" style={{ fontSize: '18px', color: 'var(--layout-text-primary)' }}>
                  ztake<span style={{ opacity: 0.5, fontWeight: 400, fontSize: '13px', marginLeft: '6px' }}>admin</span>
                </h1>
              </Link>
              <Link
                href="/admin/orders"
                className="text-sm font-semibold transition-colors"
                style={{ color: 'var(--layout-text-primary)' }}
              >
                Orders
              </Link>
              <Link
                href="/admin/webhooks"
                className="text-sm font-medium transition-colors"
                style={{ color: 'var(--layout-text-secondary)' }}
                onMouseEnter={e => e.currentTarget.style.color = 'var(--layout-text-primary)'}
                onMouseLeave={e => e.currentTarget.style.color = 'var(--layout-text-secondary)'}
              >
                Webhook Events
              </Link>
            </div>
            <div className="flex items-center space-x-4">
              {/* Theme Toggle */}
              {mounted && (
                <button
                  onClick={toggleTheme}
                  className="glass-button-secondary flex items-center justify-center"
                  style={{ width: '36px', height: '36px', padding: 0, borderRadius: 'var(--radius-md)', animation: 'none' }}
                  title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
                >
                  {theme === 'dark' ? (
                    <FiSun className="w-4 h-4" style={{ color: 'var(--layout-text-secondary)' }} />
                  ) : (
                    <FiMoon className="w-4 h-4" style={{ color: 'var(--layout-text-secondary)' }} />
                  )}
                </button>
              )}
              <button
                onClick={handleLogout}
                className="glass-button-destructive px-4 py-2 text-sm font-medium"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 pt-[84px]">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">Orders</h1>
          <div className="text-sm text-zinc-500 dark:text-zinc-400 font-medium">
            Total: {orders.length} order(s)
          </div>
        </div>

        <div className="overflow-x-auto bg-white dark:bg-zinc-900/50 border border-zinc-200/50 dark:border-zinc-800/50 rounded-2xl shadow-xl backdrop-blur-md">
          <table className="min-w-full divide-y divide-zinc-200 dark:divide-zinc-800/80">
            <thead className="bg-zinc-50 dark:bg-zinc-950/40 border-b border-zinc-200 dark:border-zinc-800">
              <tr>
                <th className="px-5 py-4 text-left text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">ztake Order</th>
                <th className="px-5 py-4 text-left text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Merchant Order</th>
                <th className="px-5 py-4 text-left text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Customer</th>
                <th className="px-5 py-4 text-left text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Amount</th>
                <th className="px-5 py-4 text-left text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Status</th>
                <th className="px-5 py-4 text-right"></th>
              </tr>
            </thead>
            <tbody className="bg-transparent divide-y divide-zinc-200 dark:divide-zinc-800">
              {orders.map((o) => (
                <tr key={o.ztake_order_id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/20 transition-colors">
                  <td className="px-5 py-4 font-mono text-sm font-semibold text-zinc-900 dark:text-zinc-100">{o.ztake_order_id}</td>
                  <td className="px-5 py-4 text-sm text-zinc-500 dark:text-zinc-400">{o.merchant_order_id}</td>
                  <td className="px-5 py-4 text-sm font-medium text-zinc-900 dark:text-zinc-100">{o.customer_name}</td>
                  <td className="px-5 py-4 text-sm font-bold text-zinc-900 dark:text-zinc-100 whitespace-nowrap">
                    {o.original_amount && Number(o.original_amount) !== Number(o.amount) ? (
                      <span className="flex items-center gap-1.5 flex-wrap">
                        <span className="line-through text-zinc-400 dark:text-zinc-550 font-normal">
                          {o.currency} {Number(o.original_amount).toFixed(2)}
                        </span>
                        <span className="text-emerald-600 dark:text-emerald-400">
                          {o.currency} {Number(o.amount).toFixed(2)}
                        </span>
                      </span>
                    ) : (
                      `${o.currency} ${Number(o.amount).toFixed(2)}`
                    )}
                  </td>
                  <td className="px-5 py-4 text-sm whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                      o.status === 'SUCCESS' ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 border-emerald-200/50 dark:border-emerald-800/30' :
                      o.status === 'FAILED' ? 'bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300 border-rose-200/50 dark:border-rose-800/30' :
                      'bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 border-amber-200/50 dark:border-amber-800/30'
                    }`}>
                      {o.status}
                    </span>
                    {o.verification_source === 'webhook' && (
                      <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border border-emerald-200/50 dark:border-emerald-800/30">
                        Webhook ✓
                      </span>
                    )}
                    {o.verification_source === 'manual' && (
                      <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-zinc-100 dark:bg-zinc-800/50 text-zinc-800 dark:text-zinc-300 border border-zinc-200/50 dark:border-zinc-700/30">
                        Manual
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-4 text-right text-sm whitespace-nowrap">
                    <div className="inline-flex gap-2">
                      <button
                        onClick={() => updateStatus(o.ztake_order_id, 'SUCCESS')}
                        disabled={updatingId === o.ztake_order_id}
                        className="px-3 py-1.5 text-xs font-semibold bg-emerald-600 dark:bg-emerald-700 hover:bg-emerald-700 dark:hover:bg-emerald-600 text-white rounded-lg transition-colors disabled:opacity-50"
                      >Success</button>
                      <button
                        onClick={() => updateStatus(o.ztake_order_id, 'FAILED')}
                        disabled={updatingId === o.ztake_order_id}
                        className="px-3 py-1.5 text-xs font-semibold bg-rose-600 dark:bg-rose-700 hover:bg-rose-700 dark:hover:bg-rose-600 text-white rounded-lg transition-colors disabled:opacity-50"
                      >Fail</button>
                      <button
                        onClick={() => updateStatus(o.ztake_order_id, 'PENDING')}
                        disabled={updatingId === o.ztake_order_id}
                        className="px-3 py-1.5 text-xs font-semibold bg-zinc-600 dark:bg-zinc-700 hover:bg-zinc-700 dark:hover:bg-zinc-600 text-white rounded-lg transition-colors disabled:opacity-50"
                      >Pending</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}


