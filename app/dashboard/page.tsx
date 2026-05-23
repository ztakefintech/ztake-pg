'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/context';
import Layout from '@/components/Layout';
import dynamic from 'next/dynamic';

// Dynamic import — Dashboard loads as a separate chunk
const Dashboard = dynamic(() => import('@/components/Dashboard'), {
  ssr: false,
  loading: () => (
    <div className="space-y-6 animate-pulse">
      <div className="h-24 rounded-xl" style={{ background: 'rgba(255,255,255,0.06)' }} />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {[...Array(2)].map((_, i) => (
          <div key={i} className="h-40 rounded-xl" style={{ background: 'rgba(255,255,255,0.06)' }} />
        ))}
      </div>
      <div className="h-64 rounded-xl" style={{ background: 'rgba(255,255,255,0.06)' }} />
    </div>
  ),
});
export default function DashboardPage() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-glass-page">
        <div className="animate-spin rounded-full h-12 w-12" style={{ borderBottom: '2px solid var(--brand-primary)' }}></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <Layout>
      <Dashboard />
    </Layout>
  );
}
