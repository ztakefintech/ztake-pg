'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function OrderPaymentPage({ params }: { params: { qpayOrderId: string } }) {
  const router = useRouter();

  useEffect(() => {
    router.replace(`/pay/${params.qpayOrderId}`);
  }, [params.qpayOrderId, router]);

  return (
    <div className="min-h-screen bg-glass-page flex flex-col justify-center items-center p-6">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-zinc-900 dark:border-white"></div>
      <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-4 font-medium">Redirecting to secure checkout...</p>
    </div>
  );
}
