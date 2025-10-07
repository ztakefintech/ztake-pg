'use client';

import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import { useAuth } from '@/lib/context';

interface OrderRow {
  ztake_order_id: string;
  merchant_order_id: string;
  amount: number;
  currency: string;
  customer_name: string;
  status: string;
  utr?: string | null;
  created_at: string;
}

export default function OrdersPage() {
  const { isAuthenticated, isLoading, token, vendor } = useAuth();
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!isAuthenticated || !token) return;
      setLoading(true);
      try {
        const res = await fetch('/api/vendor/orders', {
          headers: { Authorization: `Bearer ${token}` }
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error || 'Failed to fetch');
        setOrders(json.data?.orders || json.orders || []);
      } catch (e: any) {
        setError(e.message || 'Error');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [isAuthenticated, token]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return (
    <Layout>
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Orders</h1>
          <p className="text-gray-600">View orders created via the Order API</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border">
          <div className="px-6 py-4 border-b">
            <div className="flex items-center justify-between">
              <span className="text-lg font-semibold">Your Orders</span>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-48">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            </div>
          ) : error ? (
            <div className="p-6 text-red-600">{error}</div>
          ) : orders.length === 0 ? (
            <div className="p-6 text-gray-500">No orders found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ztake Order</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Merchant Order</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                    <th className="px-6 py-3"></th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {orders.map((o) => (
                    <tr key={o.ztake_order_id}>
                      <td className="px-6 py-4 font-mono text-sm">{o.ztake_order_id}</td>
                      <td className="px-6 py-4 text-sm">{o.merchant_order_id}</td>
                      <td className="px-6 py-4 text-sm">{o.customer_name}</td>
                      <td className="px-6 py-4 text-sm">{o.currency} {Number(o.amount).toFixed(2)}</td>
                      <td className="px-6 py-4 text-sm">{o.status}</td>
                      <td className="px-6 py-4 text-sm">{new Date(o.created_at).toLocaleString()}</td>
                      <td className="px-6 py-4 text-right text-sm">
                        {o.ztake_order_id?.startsWith('PAYOUT-') ? null : (
                          <a className="text-indigo-600 hover:underline" href={`/orders/${o.ztake_order_id}`} target="_blank" rel="noreferrer">
                            Open Payment Page
                          </a>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}


