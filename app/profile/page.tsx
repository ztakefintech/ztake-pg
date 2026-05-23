'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/context';
import Layout from '@/components/Layout';
import dynamic from 'next/dynamic';

// Dynamic import — ProfileForm is 42KB, loads as a separate chunk
const ProfileForm = dynamic(() => import('@/components/ProfileForm'), {
  ssr: false,
  loading: () => (
    <div className="max-w-5xl mx-auto space-y-6 animate-pulse">
      <div className="h-8 w-48 rounded" style={{ background: 'rgba(255,255,255,0.06)' }} />
      <div className="h-32 rounded-xl" style={{ background: 'rgba(255,255,255,0.06)' }} />
      <div className="h-64 rounded-xl" style={{ background: 'rgba(255,255,255,0.06)' }} />
    </div>
  ),
});
export default function ProfilePage() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <Layout>
      <ProfileForm />
    </Layout>
  );
}
