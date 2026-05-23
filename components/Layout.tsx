'use client';

import React, { ReactNode, useState, useMemo, useCallback } from 'react';
import { useAuth } from '@/lib/context';
import { FiLogOut, FiUser, FiCreditCard, FiSettings, FiMonitor, FiList, FiPackage, FiDollarSign, FiTrendingUp, FiHome, FiZap, FiPlayCircle, FiFileText, FiMessageSquare } from 'react-icons/fi';
import { FiMoon, FiSun } from 'react-icons/fi';
import Link from 'next/link';
import Image from 'next/image';
import { useTheme } from 'next-themes';
import { usePathname } from 'next/navigation';

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const { vendor, logout, isAuthenticated } = useAuth();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!isAuthenticated) {
    return <>{children}</>;
  }

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  const navItems = useMemo(() => [
    { href: '/dashboard', label: 'Dashboard', icon: FiHome, section: 'main' },
    { href: '/settings', label: 'Settings', icon: FiSettings, section: 'main' },
    { href: '/dashboard/api-docs', label: 'API Docs', icon: FiFileText, section: 'main' },
    { href: '/dashboard/chatbot', label: 'ZiBot', icon: FiMessageSquare, section: 'main' },
    { href: '/transactions', label: 'Payin', icon: FiDollarSign, section: 'payments' },
    { href: '/orders', label: 'Orders', icon: FiPackage, section: 'payments' },
    { href: '/payouts', label: 'Payouts', icon: FiCreditCard, section: 'payments' },
    { href: '/settlement', label: 'Settlement', icon: FiTrendingUp, section: 'payments' },
    { href: '/instant-payout', label: 'Instant Payout', icon: FiMonitor, section: 'payments' },
    { href: '/demo', label: 'Demo Payin', icon: FiPlayCircle, section: 'tools' },
  ], []);

  const isActive = useCallback((href: string) => pathname === href, [pathname]);

	return (
		<div className="h-screen overflow-hidden bg-glass-page transition-colors">
      {/* Header / Topbar */}
			<header
        className="fixed top-0 left-0 right-0 z-50"
        style={{
          height: '60px',
          background: 'var(--layout-header-bg)',
          backdropFilter: 'blur(24px) saturate(180%)',
          WebkitBackdropFilter: 'blur(24px) saturate(180%)',
          borderBottom: '1px solid var(--layout-sidebar-border)',
        }}
      >
        <div className="h-full max-w-full px-6 flex items-center justify-between">
          {/* Logo / Brand */}
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="flex items-center gap-2.5 group">
              <Image 
                src="/ztake-icon.png" 
                alt="Ztake" 
                width={28} 
                height={28} 
                className="transition-transform duration-300 group-hover:scale-105 rounded" 
              />
              <span className="ztake-wordmark group-hover:opacity-80 transition-opacity">
                ztake
              </span>
            </Link>
          </div>
          
          {/* Right Actions */}
          <div className="flex items-center gap-3">
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
            
            {/* Profile */}
            <Link
              href="/profile"
              className="flex items-center gap-2.5 transition-colors"
              style={{ color: 'var(--layout-text-secondary)' }}
              onMouseEnter={e => e.currentTarget.style.color = 'var(--layout-text-primary)'}
              onMouseLeave={e => e.currentTarget.style.color = 'var(--layout-text-secondary)'}
              title="Profile Settings"
            >
              <div
                className="flex items-center justify-center"
                style={{
                  width: '34px',
                  height: '34px',
                  borderRadius: '50%',
                  border: '1.5px solid var(--glass-border-strong)',
                  background: 'var(--glass-bg)',
                }}
              >
                <FiUser className="w-4 h-4" />
              </div>
              <span className="text-sm font-medium hidden sm:inline">{vendor?.business_name}</span>
            </Link>
            
            {/* Logout */}
            <button
              onClick={() => logout()}
              className="glass-button-secondary flex items-center gap-1.5 px-3 py-1.5 text-sm"
              style={{ borderRadius: 'var(--radius-md)', animation: 'none' }}
            >
              <FiLogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </header>

			<div>
        {/* Sidebar */}
				<aside
          className="fixed top-[60px] left-0 h-[calc(100vh-60px)] overflow-y-auto"
          style={{
            width: '240px',
            background: 'var(--layout-sidebar-bg)',
            backdropFilter: 'blur(40px) saturate(200%)',
            WebkitBackdropFilter: 'blur(40px) saturate(200%)',
            borderRight: '1px solid var(--layout-sidebar-border)',
            padding: '20px 12px',
          }}
        >


          <nav>
            {/* Main Section */}
            <div
              style={{
                fontSize: '10px',
                fontWeight: 700,
                letterSpacing: '0.1em',
                color: 'var(--layout-text-secondary)',
                opacity: 0.6,
                textTransform: 'uppercase' as const,
                padding: '16px 14px 6px',
              }}
            >
              Navigation
            </div>

            <div className="space-y-0.5">
              {navItems.filter(item => item.section === 'main').map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="flex items-center gap-3 transition-all duration-200"
                    style={{
                      borderRadius: 'var(--radius-md)',
                      padding: '10px 14px',
                      fontSize: '14px',
                      fontWeight: 500,
                      color: active ? 'var(--layout-text-active)' : 'var(--layout-text-secondary)',
                      background: active ? 'var(--layout-nav-active-bg)' : 'transparent',
                      boxShadow: active ? '0 2px 8px rgba(0,0,0,0.08)' : 'none',
                      marginBottom: '2px',
                    }}
                    onMouseEnter={(e) => {
                      if (!active) {
                        e.currentTarget.style.background = 'var(--layout-nav-hover-bg)';
                        e.currentTarget.style.color = 'var(--layout-text-primary)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!active) {
                        e.currentTarget.style.background = 'transparent';
                        e.currentTarget.style.color = 'var(--layout-text-secondary)';
                      }
                    }}
                  >
                    <Icon className="w-[18px] h-[18px]" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>

            {/* Payments Section */}
            <div
              style={{
                fontSize: '10px',
                fontWeight: 700,
                letterSpacing: '0.1em',
                color: 'var(--layout-text-secondary)',
                opacity: 0.6,
                textTransform: 'uppercase' as const,
                padding: '16px 14px 6px',
              }}
            >
              Payments
            </div>

            <div className="space-y-0.5">
              {navItems.filter(item => item.section === 'payments').map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="flex items-center gap-3 transition-all duration-200"
                    style={{
                      borderRadius: 'var(--radius-md)',
                      padding: '10px 14px',
                      fontSize: '14px',
                      fontWeight: 500,
                      color: active ? 'var(--layout-text-active)' : 'var(--layout-text-secondary)',
                      background: active ? 'var(--layout-nav-active-bg)' : 'transparent',
                      boxShadow: active ? '0 2px 8px rgba(0,0,0,0.08)' : 'none',
                      marginBottom: '2px',
                    }}
                    onMouseEnter={(e) => {
                      if (!active) {
                        e.currentTarget.style.background = 'var(--layout-nav-hover-bg)';
                        e.currentTarget.style.color = 'var(--layout-text-primary)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!active) {
                        e.currentTarget.style.background = 'transparent';
                        e.currentTarget.style.color = 'var(--layout-text-secondary)';
                      }
                    }}
                  >
                    <Icon className="w-[18px] h-[18px]" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>

            {/* Tools Section */}
            <div
              style={{
                fontSize: '10px',
                fontWeight: 700,
                letterSpacing: '0.1em',
                color: 'var(--layout-text-secondary)',
                opacity: 0.6,
                textTransform: 'uppercase' as const,
                padding: '16px 14px 6px',
              }}
            >
              Tools
            </div>

            <div className="space-y-0.5">
              {navItems.filter(item => item.section === 'tools').map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="flex items-center gap-3 transition-all duration-200"
                    style={{
                      borderRadius: 'var(--radius-md)',
                      padding: '10px 14px',
                      fontSize: '14px',
                      fontWeight: 500,
                      color: active ? 'var(--layout-text-active)' : 'var(--layout-text-secondary)',
                      background: active ? 'var(--layout-nav-active-bg)' : 'transparent',
                      boxShadow: active ? '0 2px 8px rgba(0,0,0,0.08)' : 'none',
                      marginBottom: '2px',
                    }}
                    onMouseEnter={(e) => {
                      if (!active) {
                        e.currentTarget.style.background = 'var(--layout-nav-hover-bg)';
                        e.currentTarget.style.color = 'var(--layout-text-primary)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!active) {
                        e.currentTarget.style.background = 'transparent';
                        e.currentTarget.style.color = 'var(--layout-text-secondary)';
                      }
                    }}
                  >
                    <Icon className="w-[18px] h-[18px]" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </nav>
        </aside>

				{/* Main Content */}
				<main className="pt-[60px] h-[calc(100vh-60px)] overflow-y-auto p-8" style={{ marginLeft: '240px', width: 'calc(100vw - 240px)' }}>
				  <div className="max-w-7xl mx-auto">
				    <div className="glass-content rounded-2xl p-6 md:p-8 page-content">
				      {children}
				    </div>
				  </div>
				</main>
      </div>
    </div>
  );
}
