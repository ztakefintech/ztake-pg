'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/context';
import { useRouter } from 'next/navigation';
import Layout from '@/components/Layout';

export default function PayoutDemoPage() {
  const { isAuthenticated, isLoading: authLoading, token } = useAuth();
  const router = useRouter();

  const [amount, setAmount] = useState<string>('');
  const [currency, setCurrency] = useState<string>('INR');
  const [beneficiaryName, setBeneficiaryName] = useState<string>('');
  const [beneficiaryAccount, setBeneficiaryAccount] = useState<string>('');
  const [beneficiaryIfsc, setBeneficiaryIfsc] = useState<string>('');
  const [beneficiaryUpi, setBeneficiaryUpi] = useState<string>('');
  const [referenceId, setReferenceId] = useState<string>('');
  const [remarks, setRemarks] = useState<string>('');

  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string>('');
  const [createdPayout, setCreatedPayout] = useState<any>(null);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [authLoading, isAuthenticated, router]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');
    setCreatedPayout(null);

    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt <= 0) {
      setError('Enter a valid amount');
      return;
    }

    if (!beneficiaryUpi && !(beneficiaryAccount && beneficiaryIfsc)) {
      setError('Provide either UPI ID or Bank Account + IFSC');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/vendor/payouts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          amount: amt,
          currency,
          beneficiary_name: beneficiaryName || null,
          beneficiary_account: beneficiaryAccount || null,
          beneficiary_ifsc: beneficiaryIfsc || null,
          beneficiary_upi: beneficiaryUpi || null,
          reference_id: referenceId || null,
          remarks: remarks || null
        })
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data?.error || 'Failed to create payout');
        return;
      }

      setSuccessMessage(data?.data?.message || data?.message || 'Payout pending');
      setCreatedPayout(data?.data?.payout || data?.payout || null);
    } catch (err: any) {
      setError('Network error while creating payout');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Instant Payout</h1>
          <p className="text-gray-600">Create a test payout via the Payouts API</p>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h2 className="text-xl font-semibold mb-4">Payout</h2>
          <p className="text-gray-600 mb-4">Create a payout to bank account or UPI ID.</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input
                type="number"
                step="0.01"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="border rounded px-3 py-2"
                placeholder="Amount"
                required
              />
              <input
                type="text"
                value={currency}
                onChange={(e) => setCurrency(e.target.value.toUpperCase())}
                className="border rounded px-3 py-2"
                placeholder="Currency (INR)"
              />
            </div>

            <input
              type="text"
              value={beneficiaryName}
              onChange={(e) => setBeneficiaryName(e.target.value)}
              className="border rounded px-3 py-2 w-full"
              placeholder="Beneficiary Name"
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input
                type="text"
                value={beneficiaryUpi}
                onChange={(e) => setBeneficiaryUpi(e.target.value)}
                className="border rounded px-3 py-2"
                placeholder="UPI ID (optional)"
              />
              <div></div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <input
                type="text"
                value={beneficiaryAccount}
                onChange={(e) => setBeneficiaryAccount(e.target.value)}
                className="border rounded px-3 py-2 md:col-span-2"
                placeholder="Bank Account Number (optional)"
              />
              <input
                type="text"
                value={beneficiaryIfsc}
                onChange={(e) => setBeneficiaryIfsc(e.target.value.toUpperCase())}
                className="border rounded px-3 py-2"
                placeholder="IFSC (optional)"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input
                type="text"
                value={referenceId}
                onChange={(e) => setReferenceId(e.target.value)}
                className="border rounded px-3 py-2"
                placeholder="Reference ID (optional)"
              />
              <input
                type="text"
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                className="border rounded px-3 py-2"
                placeholder="Remarks (optional)"
              />
            </div>

            <div className="flex gap-2 mt-4">
              <button
                type="submit"
                disabled={submitting}
                className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 disabled:opacity-60"
              >
                {submitting ? 'Creating...' : 'Create Payout'}
              </button>
              <a className="px-4 py-2 rounded border hover:bg-gray-50" href="/payouts">
                View Payouts
              </a>
            </div>

            {(error || successMessage) && (
              <div className={`mt-3 p-2 rounded ${error ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
                {error || successMessage}
              </div>
            )}

            {createdPayout && (
              <div className="mt-4">
                <h3 className="font-semibold mb-2">Created Payout</h3>
                <div className="border rounded p-2 bg-gray-50 text-xs">
                  <pre className="overflow-auto">{JSON.stringify(createdPayout, null, 2)}</pre>
                </div>
              </div>
            )}
          </form>
        </div>
      </div>
    </Layout>
  );
}


