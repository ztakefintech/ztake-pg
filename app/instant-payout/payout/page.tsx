'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/context';
import { useRouter } from 'next/navigation';

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

      setSuccessMessage(data?.data?.message || data?.message || 'Payout created');
      setCreatedPayout(data?.data?.payout || data?.payout || null);
    } catch (err: any) {
      setError('Network error while creating payout');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-sm border p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Payout Demo</h1>
          <p className="text-gray-600">Create a test payout via the Payouts API</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Amount</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="100.00"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Currency</label>
              <input
                type="text"
                value={currency}
                onChange={(e) => setCurrency(e.target.value.toUpperCase())}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="INR"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Beneficiary Name</label>
            <input
              type="text"
              value={beneficiaryName}
              onChange={(e) => setBeneficiaryName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="John Doe"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">UPI ID (optional)</label>
              <input
                type="text"
                value={beneficiaryUpi}
                onChange={(e) => setBeneficiaryUpi(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="user@upi"
              />
            </div>
            <div></div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Bank Account (optional)</label>
              <input
                type="text"
                value={beneficiaryAccount}
                onChange={(e) => setBeneficiaryAccount(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Account Number"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">IFSC (optional)</label>
              <input
                type="text"
                value={beneficiaryIfsc}
                onChange={(e) => setBeneficiaryIfsc(e.target.value.toUpperCase())}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="HDFC0001234"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Reference ID (optional)</label>
              <input
                type="text"
                value={referenceId}
                onChange={(e) => setReferenceId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Your internal reference"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Remarks (optional)</label>
              <input
                type="text"
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Purpose or note"
              />
            </div>
          </div>

          {error && (
            <div className="p-3 rounded-md bg-red-100 text-red-800 border border-red-200">
              <p className="font-medium">{error}</p>
            </div>
          )}

          {successMessage && (
            <div className="p-3 rounded-md bg-green-100 text-green-800 border border-green-200">
              <p className="font-medium">{successMessage}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-60"
          >
            {submitting ? 'Submitting...' : 'Create Payout'}
          </button>
        </form>

        {createdPayout && (
          <div className="mt-6 border rounded-md p-4 bg-gray-50">
            <h2 className="text-lg font-semibold mb-2">Created Payout</h2>
            <pre className="text-xs overflow-auto">
{JSON.stringify(createdPayout, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}


