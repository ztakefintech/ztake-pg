'use client';

import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import { useAuth } from '@/lib/context';

interface PayoutRow {
  id: number;
  amount: number;
  currency: string;
  beneficiary_name?: string | null;
  beneficiary_account?: string | null;
  beneficiary_ifsc?: string | null;
  beneficiary_upi?: string | null;
  reference_id?: string | null;
  remarks?: string | null;
  status: string;
  created_at: string;
}

export default function PayoutsPage() {
  const { isAuthenticated, isLoading, token } = useAuth();
  const [payouts, setPayouts] = useState<PayoutRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!isAuthenticated || !token) return;
      setLoading(true);
      try {
        const res = await fetch('/api/vendor/payouts', {
          headers: { Authorization: `Bearer ${token}` }
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error || 'Failed to fetch');
        setPayouts(json.payouts || []);
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
          <h1 className="text-2xl font-bold">Payouts</h1>
          <p className="text-gray-600">View your payout requests and their status</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border">
          <div className="px-6 py-4 border-b">
            <div className="flex items-center justify-between">
              <span className="text-lg font-semibold">Your Payouts</span>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-48">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            </div>
          ) : error ? (
            <div className="p-6 text-red-600">{error}</div>
          ) : payouts.length === 0 ? (
            <div className="p-6 text-gray-500">No payout requests found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Beneficiary</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Bank/UPI Details</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reference</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {payouts.map((p) => (
                    <tr key={p.id}>
                      <td className="px-6 py-4 font-mono text-sm">{p.id}</td>
                      <td className="px-6 py-4 text-sm font-medium">{p.currency} {Number(p.amount).toFixed(2)}</td>
                      <td className="px-6 py-4 text-sm">{p.beneficiary_name || '-'}</td>
                      <td className="px-6 py-4 text-sm">
                        {p.beneficiary_account && p.beneficiary_ifsc ? (
                          <div className="space-y-1">
                            <div className="font-mono text-xs">A/C: {p.beneficiary_account}</div>
                            <div className="font-mono text-xs">IFSC: {p.beneficiary_ifsc}</div>
                          </div>
                        ) : p.beneficiary_upi ? (
                          <div className="font-mono text-xs">UPI: {p.beneficiary_upi}</div>
                        ) : (
                          <span className="text-gray-500">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm">{p.reference_id || '-'}</td>
                      <td className="px-6 py-4 text-sm">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          p.status === 'paid' || p.status === 'approved' ? 'bg-green-100 text-green-800' :
                          p.status === 'rejected' || p.status === 'failed' ? 'bg-red-100 text-red-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {p.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm">{new Date(p.created_at).toLocaleString()}</td>
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


