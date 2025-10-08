'use client';

import React, { ReactNode } from 'react';
import { useAuth } from '@/lib/context';
import { FiLogOut, FiUser, FiCreditCard, FiSettings, FiMonitor, FiList, FiPackage } from 'react-icons/fi';
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
            <div className="flex items-center gap-4">
              <div>
                <Image src={'/logo.png'} alt="logo" width={40} height={40} />
              </div>
              <Link href="/dashboard" className="text-xl font-bold text-primary-600">
                Ztake
              </Link>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <FiUser className="text-gray-500" />
                <span className="text-sm text-gray-700">{vendor?.business_name}</span>
              </div>
              
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
                href="/profile"
                className="flex items-center space-x-3 px-3 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
              >
                <FiUser />
                <span>Profile</span>
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

              <div className="space-y-1">
                <Link
                  href="/orders"
                  className="flex items-center space-x-3 px-3 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
                >
                  <FiPackage />
                  <span>Orders</span>
                </Link>
                <Link
                  href="/payouts"
                  className="ml-10 block px-3 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  Payouts
                </Link>
              </div>
              
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
