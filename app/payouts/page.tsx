'use client';

import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import { useAuth } from '@/lib/context';

export default function PayoutsPage() {
  const { isAuthenticated, isLoading: authLoading, token } = useAuth();
  const [payouts, setPayouts] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchPayouts = async (p: number) => {
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/vendor/payouts?page=${p}&limit=10`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Failed to fetch payouts');
      setPayouts(data.payouts || []);
      setTotalPages(data.pagination?.totalPages || 0);
    } catch (e: any) {
      setError(e?.message || 'Failed to fetch payouts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated && token) {
      fetchPayouts(page);
    }
  }, [isAuthenticated, token, page]);

  return (
    <Layout>
      <div className="max-w-5xl mx-auto py-6">
        <h1 className="text-2xl font-bold mb-4">Payout Requests</h1>
        {error && <div className="error-message mb-4">{error}</div>}
        <div className="overflow-x-auto bg-white shadow rounded">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left">ID</th>
                <th className="px-4 py-2 text-left">Amount</th>
                <th className="px-4 py-2 text-left">Beneficiary</th>
                <th className="px-4 py-2 text-left">Reference</th>
                <th className="px-4 py-2 text-left">Status</th>
                <th className="px-4 py-2 text-left">Created</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td className="px-4 py-6" colSpan={6}>Loading...</td></tr>
              ) : payouts.length === 0 ? (
                <tr><td className="px-4 py-6" colSpan={6}>No payout requests yet.</td></tr>
              ) : payouts.map((p) => (
                <tr key={p.id} className="border-t">
                  <td className="px-4 py-2">{p.id}</td>
                  <td className="px-4 py-2">{p.currency} {Number(p.amount).toFixed(2)}</td>
                  <td className="px-4 py-2">{p.beneficiary_name || p.beneficiary_upi || p.beneficiary_account || '-'}</td>
                  <td className="px-4 py-2">{p.reference_id || '-'}</td>
                  <td className="px-4 py-2">{p.status}</td>
                  <td className="px-4 py-2">{new Date(p.created_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between mt-4">
          <button className="btn-secondary" disabled={page <= 1} onClick={() => setPage(page - 1)}>Prev</button>
          <span>Page {page} of {totalPages}</span>
          <button className="btn-secondary" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>Next</button>
        </div>
      </div>
    </Layout>
  );
}


