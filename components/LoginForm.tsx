'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/context';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  Loader2, 
  ShieldCheck, 
  ArrowRight,
  HelpCircle,
} from 'lucide-react';

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
        if (data.message && data.message.includes('Password set successfully')) {
          setError(''); // Clear any previous errors
        }
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
      if (!window.google) {
        await loadGoogleScript();
      }

      const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
      if (!clientId) {
        throw new Error('Google Client ID not configured. Please add NEXT_PUBLIC_GOOGLE_CLIENT_ID to your environment variables.');
      }

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

    if (name === 'email') {
      debouncedCheckEmail(value);
    }
  };

  return (
    <div className="min-h-screen w-full bg-zinc-50 dark:bg-black text-zinc-900 dark:text-zinc-50 flex items-center justify-center px-4 py-16 relative overflow-hidden transition-colors duration-300">
      
      {/* Background Decorative Mesh / Blobs */}
      <div className="absolute inset-0 pointer-events-none z-0">
        <div className="absolute top-[20%] left-[20%] w-[350px] h-[350px] rounded-full bg-blue-500/10 dark:bg-blue-600/10 blur-[100px]" />
        <div className="absolute bottom-[20%] right-[20%] w-[450px] h-[450px] rounded-full bg-violet-500/10 dark:bg-violet-600/10 blur-[120px]" />
      </div>

      <div className="w-full max-w-[420px] relative z-10">
        
        {/* Apple-style Frosted Glass Card */}
        <div className="relative rounded-[32px] border border-black/[0.05] dark:border-white/[0.08] bg-white/70 dark:bg-zinc-950/70 backdrop-blur-2xl px-8 py-10 shadow-[0_20px_50px_rgba(0,0,0,0.05)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.3)]">
          
          {/* Card Header (Emblem & Title) */}
          <div className="flex flex-col items-center mb-8">
            <div className="mb-4 relative group">
              {/* Sleek App Icon Container */}
              <div className="w-16 h-16 rounded-2xl bg-zinc-900 dark:bg-white flex items-center justify-center shadow-lg transition-transform duration-300 group-hover:scale-105">
                <Image 
                  src="/ztake-icon.png"
                  alt="Ztake"
                  width={40}
                  height={40}
                  className="rounded-lg"
                />
              </div>
            </div>
            <h1 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-white flex items-center gap-1.5 justify-center">
              <span>Sign In to</span>
              <span className="ztake-wordmark" style={{ fontSize: '20px' }}>ztake</span>
            </h1>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1.5">Enter your credentials to access your gateway dashboard</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* Input Fields Container */}
            <div className="space-y-3">
              
              {/* Email Input */}
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-400">
                  <Mail className="h-4 w-4" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  className="w-full rounded-xl pl-10 pr-10 py-3 text-sm bg-zinc-100/60 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:focus:ring-white transition-all placeholder:text-zinc-400 dark:placeholder:text-zinc-600"
                  placeholder="Email address"
                  value={formData.email}
                  onChange={handleChange}
                />
                
                {/* Checking Loader */}
                {emailStatus.checking && (
                  <div className="absolute inset-y-0 right-3 flex items-center">
                    <Loader2 className="animate-spin h-4 w-4 text-blue-500" />
                  </div>
                )}
              </div>

              {/* Password Input */}
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-400">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  className="w-full rounded-xl pl-10 pr-10 py-3 text-sm bg-zinc-100/60 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:focus:ring-white transition-all placeholder:text-zinc-400 dark:placeholder:text-zinc-600"
                  placeholder="Password"
                  value={formData.password}
                  onChange={handleChange}
                />
                
                {/* Toggle Eye Button */}
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>

              {/* Email Status Message */}
              {emailStatus.message && (
                <div className="text-[11px] font-medium leading-normal text-zinc-500 dark:text-zinc-400 bg-zinc-100/50 dark:bg-zinc-900/50 border border-zinc-200/50 dark:border-zinc-800/60 rounded-xl px-4 py-2.5">
                  {emailStatus.message}
                </div>
              )}
            </div>

            {/* Error Message */}
            {error && (
              <div className="text-red-600 dark:text-red-400 text-xs text-center bg-red-500/5 dark:bg-red-500/10 border border-red-500/20 dark:border-red-500/30 rounded-xl py-3 px-4">
                {error}
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full rounded-xl py-3 text-sm font-semibold text-white dark:text-black bg-zinc-900 hover:bg-zinc-800 dark:bg-white dark:hover:bg-zinc-100 transition-all shadow-md flex items-center justify-center gap-1.5 disabled:opacity-50 hover:scale-[1.01]"
            >
              {isLoading ? (
                <>
                  <Loader2 className="animate-spin h-4 w-4" />
                  Signing In...
                </>
              ) : (
                'Sign In'
              )}
            </button>

            {/* Divider */}
            <div className="flex items-center gap-3 py-1">
              <div className="h-px flex-1 bg-zinc-200 dark:bg-zinc-800/80" />
              <span className="text-[10px] text-zinc-400 dark:text-zinc-500 uppercase tracking-widest font-bold">or</span>
              <div className="h-px flex-1 bg-zinc-200 dark:bg-zinc-800/80" />
            </div>

            {/* Google OAuth Login Button */}
            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={isGoogleLoading}
              className="w-full rounded-xl py-3 bg-zinc-100/80 hover:bg-zinc-200/80 dark:bg-zinc-900/40 dark:hover:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800/80 text-sm font-semibold text-zinc-700 dark:text-zinc-300 flex items-center justify-center gap-2.5 transition-all disabled:opacity-50 hover:scale-[1.01]"
            >
              {isGoogleLoading ? (
                <Loader2 className="animate-spin h-4 w-4" />
              ) : (
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
              )}
              {isGoogleLoading ? 'Connecting...' : 'Continue with Google'}
            </button>

            {/* Forgot Password Link */}
            <div className="text-center pt-2">
              <a href="#" className="text-xs font-semibold text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300 transition-colors">
                Forgot Password?
              </a>
            </div>

          </form>
        </div>

        {/* Security Footer Details */}
        <div className="mt-8 text-center space-y-4">
          <div className="flex items-center justify-center gap-1.5 text-[10px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
            <ShieldCheck className="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-500" />
            <span>Secured with End-to-End Encryption</span>
          </div>

          {/* Payment Methods Badges */}
          <div className="flex justify-center gap-2">
            <div className="px-2.5 py-1 text-[9px] font-bold text-zinc-500 bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800/80 rounded-md">
              UPI
            </div>
            <div className="px-2.5 py-1 text-[9px] font-bold text-zinc-500 bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800/80 rounded-md">
              VISA
            </div>
            <div className="px-2.5 py-1 text-[9px] font-bold text-zinc-500 bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800/80 rounded-md">
              MC
            </div>
            <div className="px-2.5 py-1 text-[9px] font-bold text-zinc-500 bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800/80 rounded-md">
              RUPAY
            </div>
            <div className="px-2.5 py-1 text-[9px] font-bold text-zinc-500 bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800/80 rounded-md">
              NETBANKING
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
