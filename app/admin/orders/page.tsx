'use client';

import { useEffect, useState } from 'react';

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

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

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
    loadOrders();
  }, []);

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
      <div className="p-8">Loading...</div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-red-600">{error}</div>
    );
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-4">Orders</h1>
      <div className="overflow-x-auto bg-white shadow rounded-lg">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ztake Order</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Merchant Order</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {orders.map((o) => (
              <tr key={o.ztake_order_id}>
                <td className="px-4 py-3 font-mono text-sm">{o.ztake_order_id}</td>
                <td className="px-4 py-3 text-sm">{o.merchant_order_id}</td>
                <td className="px-4 py-3 text-sm">{o.customer_name}</td>
                <td className="px-4 py-3 text-sm">{o.currency} {Number(o.amount).toFixed(2)}</td>
                <td className="px-4 py-3 text-sm">{o.status}</td>
                <td className="px-4 py-3 text-right text-sm">
                  <div className="inline-flex gap-2">
                    <button
                      onClick={() => updateStatus(o.ztake_order_id, 'SUCCESS')}
                      disabled={updatingId === o.ztake_order_id}
                      className="px-3 py-1 bg-green-600 text-white rounded disabled:opacity-50"
                    >Success</button>
                    <button
                      onClick={() => updateStatus(o.ztake_order_id, 'FAILED')}
                      disabled={updatingId === o.ztake_order_id}
                      className="px-3 py-1 bg-red-600 text-white rounded disabled:opacity-50"
                    >Fail</button>
                    <button
                      onClick={() => updateStatus(o.ztake_order_id, 'PENDING')}
                      disabled={updatingId === o.ztake_order_id}
                      className="px-3 py-1 bg-gray-600 text-white rounded disabled:opacity-50"
                    >Pending</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}


