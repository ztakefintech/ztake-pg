'use client';

import React, { ReactNode, useState } from 'react';
import { useAuth } from '@/lib/context';
import { FiLogOut, FiUser, FiCreditCard, FiSettings, FiMonitor, FiList, FiPackage, FiDollarSign, FiTrendingUp, FiHome, FiZap } from 'react-icons/fi';
import { FiMoon, FiSun } from 'react-icons/fi';
import Link from 'next/link';
import Image from 'next/image';
import { useTheme } from 'next-themes';

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const { vendor, logout, isAuthenticated } = useAuth();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!isAuthenticated) {
    return <>{children}</>;
  }

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 transition-colors">
      {/* Header */}
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <FiZap className="w-6 h-6 text-blue-600 dark:text-blue-500" />
                <Link href="/dashboard" className="text-xl font-bold text-gray-900 dark:text-white">
                  ZTAKE
                </Link>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              {mounted && (
                <button
                  onClick={toggleTheme}
                  className="flex items-center justify-center w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                  title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
                >
                  {theme === 'dark' ? (
                    <FiSun className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                  ) : (
                    <FiMoon className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                  )}
                </button>
              )}
              
              <Link
                href="/profile"
                className="flex items-center space-x-2 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
                title="Profile Settings"
              >
                <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center">
                  <FiUser className="w-4 h-4 text-gray-600 dark:text-gray-300" />
                </div>
                <span className="text-sm font-medium">{vendor?.business_name}</span>
              </Link>
              
              <button
                onClick={() => logout()}
                className="flex items-center space-x-1 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
              >
                <FiLogOut />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside className="w-64 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 min-h-screen">
          <nav className="mt-8">
            <div className="px-4 space-y-1">
              <Link
                href="/dashboard"
                className="flex items-center space-x-3 px-3 py-2.5 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors group"
              >
                <FiHome className="w-5 h-5 group-hover:text-blue-600 dark:group-hover:text-blue-400" />
                <span className="font-medium">Dashboard</span>
              </Link>
              
              <Link
                href="/settings"
                className="flex items-center space-x-3 px-3 py-2.5 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors group"
              >
                <FiSettings className="w-5 h-5 group-hover:text-blue-600 dark:group-hover:text-blue-400" />
                <span className="font-medium">Settings</span>
              </Link>
              
              <Link
                href="/transactions"
                className="flex items-center space-x-3 px-3 py-2.5 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors group"
              >
                <FiDollarSign className="w-5 h-5 group-hover:text-blue-600 dark:group-hover:text-blue-400" />
                <span className="font-medium">Payin</span>
              </Link>

              <Link
                href="/orders"
                className="flex items-center space-x-3 px-3 py-2.5 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors group"
              >
                <FiPackage className="w-5 h-5 group-hover:text-blue-600 dark:group-hover:text-blue-400" />
                <span className="font-medium">Orders</span>
              </Link>

              <Link
                href="/payouts"
                className="flex items-center space-x-3 px-3 py-2.5 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors group"
              >
                <FiCreditCard className="w-5 h-5 group-hover:text-blue-600 dark:group-hover:text-blue-400" />
                <span className="font-medium">Payouts</span>
              </Link>

              <Link
                href="/settlement"
                className="flex items-center space-x-3 px-3 py-2.5 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors group"
              >
                <FiTrendingUp className="w-5 h-5 group-hover:text-blue-600 dark:group-hover:text-blue-400" />
                <span className="font-medium">Settlement</span>
              </Link>
               
              <Link
                href="/instant-payout"
                className="flex items-center space-x-3 px-3 py-2.5 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors group"
              >
                <FiMonitor className="w-5 h-5 group-hover:text-blue-600 dark:group-hover:text-blue-400" />
                <span className="font-medium">Instant Payout</span>
              </Link>
            </div>
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
