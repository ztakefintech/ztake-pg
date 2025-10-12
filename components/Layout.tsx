'use client';

import React, { ReactNode } from 'react';
import { useAuth } from '@/lib/context';
import { FiLogOut, FiUser, FiCreditCard, FiSettings, FiMonitor, FiList, FiPackage, FiDollarSign, FiTrendingUp } from 'react-icons/fi';
import Link from 'next/link';
import Image from 'next/image';

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const { vendor, logout, isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center gap-1">
              <div>
                <Image src={'/logo.png'} alt="logo" width={45} height={45} />
              </div>
              <Link href="/dashboard" className="text-2xl font-bold text-gray-700">
                ZTAKE
              </Link>
            </div>
            
            <div className="flex items-center space-x-4">
              <Link
                href="/profile"
                className="flex items-center space-x-2 text-gray-700 hover:text-gray-900 transition-colors"
                title="Profile Settings"
              >
                <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                  <FiUser className="w-4 h-4 text-gray-600" />
                </div>
                <span className="text-sm font-medium">{vendor?.business_name}</span>
              </Link>
              
              <button
                onClick={logout}
                className="flex items-center space-x-1 text-gray-500 hover:text-gray-700"
              >
                <FiLogOut />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Sidebar */}
      <div className="flex">
        <aside className="w-64 bg-white shadow-sm min-h-screen">
          <nav className="mt-8">
            <div className="px-4 space-y-2">
              <Link
                href="/dashboard"
                className="flex items-center space-x-3 px-3 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
              >
                <FiCreditCard />
                <span>Dashboard</span>
              </Link>
              
              <Link
                href="/settings"
                className="flex items-center space-x-3 px-3 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
              >
                <FiSettings />
                <span>Settings</span>
              </Link>
              
              <Link
                href="/transactions"
                className="flex items-center space-x-3 px-3 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
              >
                <FiList />
                <span>Payin Transactions</span>
              </Link>

              
                <Link
                  href="/orders"
                  className="flex items-center space-x-3 px-3 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
                >
                  <FiPackage />
                  <span>Orders</span>
                </Link>
                <Link
                  href="/payouts"
                  className="flex items-center space-x-3 px-3 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
                >
                  <FiDollarSign />
                  <span>Payouts</span>
                </Link>
                <Link
                  href="/settlement"
                  className="flex items-center space-x-3 px-3 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
                >
                  <FiTrendingUp />
                  <span>Settlement</span>
                </Link>
               
              
              <Link
                href="/instant-payout"
                className="flex items-center space-x-3 px-3 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
              >
                <FiMonitor />
                <span>Instant Payout</span>
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
