'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/context';
import Layout from '@/components/Layout';
import CashfreeV2PayoutForm from '@/components/CashfreeV2PayoutForm';

export default function CashfreeV2PayoutPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [authLoading, isAuthenticated, router]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <Layout>
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Cashfree V2 Complete Payout</h1>
            <p className="mt-2 text-gray-600">
              Create payouts with automatic beneficiary creation and transfer initiation using Cashfree V2 APIs.
            </p>
          </div>

          <CashfreeV2PayoutForm />
        </div>
      </div>
    </Layout>
  );
}
