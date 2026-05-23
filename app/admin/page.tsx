'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import Image from 'next/image';
import { useTheme } from 'next-themes';
import { FiSun, FiMoon } from 'react-icons/fi';

// Dynamic import — AdminDashboard is 150KB, loads as a separate chunk
const AdminDashboard = dynamic(() => import('@/components/AdminDashboard'), {
  ssr: false,
  loading: () => (
    <div className="space-y-6 animate-pulse">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-28 rounded-xl" style={{ background: 'rgba(255,255,255,0.06)' }} />
        ))}
      </div>
      <div className="h-96 rounded-xl" style={{ background: 'rgba(255,255,255,0.06)' }} />
    </div>
  ),
});

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const { theme, setTheme } = useTheme();
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const response = await fetch('/api/admin/stats');
      if (response.ok) {
        setIsAuthenticated(true);
      } else {
        router.push('/admin/login');
      }
    } catch (error) {
      router.push('/admin/login');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/admin/logout', { method: 'POST' });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      router.push('/admin/login');
    }
  };

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-glass-page">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 mx-auto" style={{ borderBottom: '2px solid var(--brand-primary)' }}></div>
          <p className="mt-4 text-zinc-500 dark:text-zinc-400">Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-glass-page text-zinc-900 dark:text-zinc-50">
      <nav
        className="fixed top-0 left-0 right-0 z-50"
        style={{
          height: '60px',
          background: 'var(--layout-header-bg)',
          backdropFilter: 'blur(24px) saturate(180%)',
          WebkitBackdropFilter: 'blur(24px) saturate(180%)',
          borderBottom: '1px solid var(--layout-sidebar-border)',
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-[60px]">
            <div className="flex items-center space-x-6">
              <Link href="/admin" className="flex items-center gap-2.5">
                <Image src="/ztake-icon.png" alt="Ztake" width={28} height={28} className="rounded" />
                <h1 className="ztake-wordmark" style={{ fontSize: '18px', color: 'var(--layout-text-primary)' }}>
                  ztake<span style={{ opacity: 0.5, fontWeight: 400, fontSize: '13px', marginLeft: '6px' }}>admin</span>
                </h1>
              </Link>
              <Link
                href="/admin/orders"
                className="text-sm font-medium transition-colors"
                style={{ color: 'var(--layout-text-secondary)' }}
                onMouseEnter={e => e.currentTarget.style.color = 'var(--layout-text-primary)'}
                onMouseLeave={e => e.currentTarget.style.color = 'var(--layout-text-secondary)'}
              >
                Orders
              </Link>
              <Link
                href="/admin/webhooks"
                className="text-sm font-medium transition-colors"
                style={{ color: 'var(--layout-text-secondary)' }}
                onMouseEnter={e => e.currentTarget.style.color = 'var(--layout-text-primary)'}
                onMouseLeave={e => e.currentTarget.style.color = 'var(--layout-text-secondary)'}
              >
                Webhook Events
              </Link>
            </div>
            <div className="flex items-center space-x-4">
              {/* Theme Toggle */}
              {mounted && (
                <button
                  onClick={toggleTheme}
                  className="glass-button-secondary flex items-center justify-center"
                  style={{ width: '36px', height: '36px', padding: 0, borderRadius: 'var(--radius-md)', animation: 'none' }}
                  title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
                >
                  {theme === 'dark' ? (
                    <FiSun className="w-4 h-4" style={{ color: 'var(--layout-text-secondary)' }} />
                  ) : (
                    <FiMoon className="w-4 h-4" style={{ color: 'var(--layout-text-secondary)' }} />
                  )}
                </button>
              )}
              <button
                onClick={handleLogout}
                className="glass-button-destructive px-4 py-2 text-sm font-medium"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>
      
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8 pt-[84px]">
        <AdminDashboard />
      </main>
    </div>
  );
}

