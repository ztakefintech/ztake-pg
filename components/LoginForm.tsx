'use client';

import React, { useState } from 'react';
import { useAuth } from '@/lib/context';
import { useRouter } from 'next/navigation';
import { FiEye, FiEyeOff, FiMail, FiLock, FiShield, FiCreditCard, FiDollarSign, FiCheckCircle, FiX } from 'react-icons/fi';

// Google OAuth types
interface GoogleUserInfo {
  id: string;
  email: string;
  name: string;
  picture?: string;
  verified_email: boolean;
}

// Extend Window interface for Google OAuth
declare global {
  interface Window {
    google: {
      accounts: {
        oauth2: {
          initTokenClient: (config: {
            client_id: string;
            scope: string;
            callback: (response: { access_token: string }) => void;
          }) => {
            requestAccessToken: () => void;
          };
        };
      };
    };
  }
}

export default function LoginForm() {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [error, setError] = useState('');
  const [showAlert, setShowAlert] = useState(true);
  const [emailStatus, setEmailStatus] = useState<{
    exists: boolean;
    approved: boolean;
    hasGoogleId: boolean;
    checking: boolean;
    message: string;
  }>({
    exists: false,
    approved: false,
    hasGoogleId: false,
    checking: false,
    message: ''
  });
  
  const { login } = useAuth();
  const router = useRouter();

  // Email validation with debouncing
  const checkEmailStatus = async (email: string) => {
    if (!email || !email.includes('@')) {
      setEmailStatus({
        exists: false,
        approved: false,
        hasGoogleId: false,
        checking: false,
        message: ''
      });
      return;
    }

    setEmailStatus(prev => ({ ...prev, checking: true }));

    try {
      const response = await fetch('/api/auth/check-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.ok) {
        setEmailStatus({
          exists: data.exists,
          approved: data.approved,
          hasGoogleId: data.hasGoogleId,
          checking: false,
          message: data.message
        });
      } else {
        setEmailStatus({
          exists: false,
          approved: false,
          hasGoogleId: false,
          checking: false,
          message: data.error || 'Failed to check email'
        });
      }
    } catch (err) {
      setEmailStatus({
        exists: false,
        approved: false,
        hasGoogleId: false,
        checking: false,
        message: 'Network error'
      });
    }
  };

  // Debounced email check
  const debouncedCheckEmail = React.useMemo(
    () => {
      let timeoutId: NodeJS.Timeout;
      return (email: string) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => checkEmailStatus(email), 500);
      };
    },
    []
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        login(data.vendor, data.token);
        router.push('/dashboard');
      } else {
        setError(data.error || 'Login failed');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsGoogleLoading(true);
    setError('');

    try {
      // Load Google OAuth script if not already loaded
      if (!window.google) {
        await loadGoogleScript();
      }

      // Check if Google Client ID is configured
      const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
      if (!clientId) {
        throw new Error('Google Client ID not configured. Please add NEXT_PUBLIC_GOOGLE_CLIENT_ID to your environment variables.');
      }

      // Initialize Google OAuth
      window.google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: 'email profile',
        callback: handleGoogleCallback,
      }).requestAccessToken();
    } catch (err) {
      console.error('Google OAuth error:', err);
      setError('Google login failed. Please try again.');
      setIsGoogleLoading(false);
    }
  };

  const handleGoogleCallback = async (response: any) => {
    try {
      console.log('Google OAuth: Callback received, processing...');
      
      if (!response || !response.access_token) {
        throw new Error('No access token received from Google');
      }

      const res = await fetch('/api/auth/google', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ accessToken: response.access_token }),
      });

      const data = await res.json();
      console.log('Google OAuth: API response:', { status: res.status, success: res.ok });

      if (res.ok) {
        login(data.vendor, data.token);
        router.push('/dashboard');
      } else if (data.requiresApproval) {
        // Redirect to access denied page with user info
        const params = new URLSearchParams({
          email: data.email,
          name: data.name,
          message: data.message
        });
        
        if (data.userId) {
          params.set('userId', data.userId);
        }
        
        router.push(`/access-denied?${params.toString()}`);
      } else {
        console.error('Google OAuth: API error:', data);
        setError(data.error || 'Google login failed');
      }
    } catch (err) {
      console.error('Google callback error:', err);
      setError(`Google login failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const loadGoogleScript = (): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (window.google) {
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Failed to load Google script'));
      document.head.appendChild(script);
    });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });

    // Check email status when email changes
    if (name === 'email') {
      debouncedCheckEmail(value);
    }
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-slate-100 to-slate-200 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="relative rounded-[28px] border border-white/50 bg-white/60 backdrop-blur-xl px-6 sm:px-8 py-8 sm:py-10 shadow-[inset_8px_8px_24px_rgba(255,255,255,0.6),inset_-8px_-8px_24px_rgba(0,0,0,0.03),0_20px_60px_rgba(0,0,0,0.08)]">
          <div className="flex flex-col items-center">
            <div className="mb-6">
              <div className="w-20 h-20 rounded-3xl bg-white shadow-[8px_8px_24px_rgba(0,0,0,0.06),-8px_-8px_24px_rgba(255,255,255,0.9)] flex items-center justify-center">
                <img src="/logo.png" alt="ZTAKE" className="w-12 h-12 object-contain" />
              </div>
            </div>
            <h1 className="text-xl font-semibold tracking-wide text-slate-800 mb-6">ZTAKE</h1>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-3">
              <div className="relative">
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  className={`w-full rounded-2xl px-5 py-3.5 bg-white/70 border border-white/60 shadow-[inset_4px_4px_12px_rgba(0,0,0,0.06),inset_-4px_-4px_12px_rgba(255,255,255,0.9)] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-400/60 ${
                    emailStatus.checking
                      ? 'ring-2 ring-amber-300/60'
                      : ''
                  }`}
                  placeholder="Email"
                  value={formData.email}
                  onChange={handleChange}
                />
                {emailStatus.checking && (
                  <div className="absolute inset-y-0 right-3 flex items-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-sky-500"></div>
                  </div>
                )}
              </div>

              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  className="w-full rounded-2xl px-5 py-3.5 pr-12 bg-white/70 border border-white/60 shadow-[inset_4px_4px_12px_rgba(0,0,0,0.06),inset_-4px_-4px_12px_rgba(255,255,255,0.9)] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-400/60"
                  placeholder="Password"
                  value={formData.password}
                  onChange={handleChange}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-4 flex items-center"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <FiEyeOff className="h-5 w-5 text-slate-400" />
                  ) : (
                    <FiEye className="h-5 w-5 text-slate-400" />
                  )}
                </button>
              </div>

              {emailStatus.message && (
                <div className="text-xs text-slate-600 bg-white/60 border border-white/70 rounded-xl px-4 py-2 shadow-[inset_2px_2px_8px_rgba(0,0,0,0.04),inset_-2px_-2px_8px_rgba(255,255,255,0.9)]">
                  {emailStatus.message}
                </div>
              )}
            </div>

            {error && (
              <div className="text-red-600 text-sm text-center bg-red-50/70 border border-red-200/60 rounded-xl p-3">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full rounded-2xl py-3.5 text-slate-800 bg-white shadow-[8px_8px_24px_rgba(0,0,0,0.06),-8px_-8px_24px_rgba(255,255,255,0.9)] hover:shadow-[10px_10px_28px_rgba(0,0,0,0.08),-10px_-10px_28px_rgba(255,255,255,1)] transition-shadow disabled:opacity-50"
            >
              {isLoading ? 'Signing in…' : 'Sign In'}
            </button>

            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-slate-300/60" />
              <span className="px-3 py-1 text-slate-500 text-xs rounded-full bg-white/80 shadow-[inset_4px_4px_12px_rgba(0,0,0,0.04),inset_-4px_-4px_12px_rgba(255,255,255,0.9)]">or</span>
              <div className="h-px flex-1 bg-slate-300/60" />
            </div>

            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={isGoogleLoading}
              className="w-full rounded-2xl py-3.5 bg-white/80 border border-white/60 text-slate-700 flex items-center justify-center gap-2 shadow-[8px_8px_24px_rgba(0,0,0,0.06),-8px_-8px_24px_rgba(255,255,255,0.9)] hover:shadow-[10px_10px_28px_rgba(0,0,0,0.08),-10px_-10px_28px_rgba(255,255,255,1)] transition-shadow disabled:opacity-50"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              {isGoogleLoading ? 'Signing in…' : 'Continue with Google'}
            </button>

            <div className="text-center">
              <a href="#" className="text-sm text-slate-600 hover:text-slate-700">Forgot Password?</a>
            </div>
          </form>
        </div>

        <div className="mt-8 text-center">
          <p className="text-xs text-slate-500">Secured with end-to-end encryption</p>
        </div>

        <div className="mt-4 flex justify-center gap-3">
          <div className="w-10 h-7 rounded-xl bg-white/70 border border-white/60 shadow-[4px_4px_12px_rgba(0,0,0,0.06),-4px_-4px_12px_rgba(255,255,255,0.9)] flex items-center justify-center">
            <span className="text-[10px] font-semibold text-indigo-600">UPI</span>
          </div>
          <div className="w-10 h-7 rounded-xl bg-white/70 border border-white/60 shadow-[4px_4px_12px_rgba(0,0,0,0.06),-4px_-4px_12px_rgba(255,255,255,0.9)] flex items-center justify-center">
            <span className="text-[10px] font-semibold text-blue-600">VISA</span>
          </div>
          <div className="w-10 h-7 rounded-xl bg-white/70 border border-white/60 shadow-[4px_4px_12px_rgba(0,0,0,0.06),-4px_-4px_12px_rgba(255,255,255,0.9)] flex items-center justify-center">
            <span className="text-[10px] font-semibold text-red-500">MC</span>
          </div>
          <div className="w-10 h-7 rounded-xl bg-white/70 border border-white/60 shadow-[4px_4px_12px_rgba(0,0,0,0.06),-4px_-4px_12px_rgba(255,255,255,0.9)] flex items-center justify-center">
            <span className="text-[12px] font-semibold text-emerald-600">₹</span>
          </div>
          <div className="w-10 h-7 rounded-xl bg-white/70 border border-white/60 shadow-[4px_4px_12px_rgba(0,0,0,0.06),-4px_-4px_12px_rgba(255,255,255,0.9)] flex items-center justify-center">
            <span className="text-[10px] font-semibold text-sky-600">NB</span>
          </div>
        </div>
      </div>
    </div>
  );
}
