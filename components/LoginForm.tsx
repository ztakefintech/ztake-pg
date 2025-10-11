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
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Left Section - Branding & Marketing */}
      <div className="lg:w-1/2 bg-gradient-to-br from-blue-50 to-indigo-100 relative overflow-hidden">
        <div className="flex flex-col justify-center px-8 lg:px-12 py-8 lg:py-16 w-full min-h-[50vh] lg:min-h-screen">
          {/* Logo */}
          <div className="mb-6 lg:mb-8 text-center lg:text-left">
            <h1 className="text-2xl lg:text-3xl font-bold text-gray-800">ZTake</h1>
            <p className="text-sm text-gray-600 mt-1">Payment Solutions</p>
          </div>

          {/* Illustration - Hidden on mobile, shown on desktop */}
          <div className="hidden lg:flex flex-1 items-center justify-center mb-8">
            <div className="relative w-80 h-80 login-illustration">
              {/* Person with card */}
              <div className="absolute bottom-8 left-8 w-16 h-20 bg-gray-200 rounded-lg flex items-center justify-center shadow-lg">
                <FiCreditCard className="w-8 h-8 text-blue-600" />
              </div>
              
              {/* POS Terminal */}
              <div className="absolute bottom-4 right-12 w-20 h-16 bg-gray-300 rounded-lg flex items-center justify-center shadow-lg">
                <div className="w-12 h-8 bg-gray-400 rounded flex items-center justify-center">
                  <FiCheckCircle className="w-4 h-4 text-green-600" />
                </div>
              </div>
              
              {/* Coins */}
              <div className="absolute top-16 right-8 flex flex-col space-y-2">
                <div className="w-8 h-8 bg-yellow-400 rounded-full flex items-center justify-center shadow-md">
                  <FiDollarSign className="w-4 h-4 text-yellow-800" />
                </div>
                <div className="w-6 h-6 bg-yellow-400 rounded-full shadow-md"></div>
                <div className="w-4 h-4 bg-yellow-400 rounded-full shadow-md"></div>
              </div>
              
              {/* Floating coin */}
              <div className="absolute top-24 left-16 w-6 h-6 bg-yellow-400 rounded-full login-coin shadow-md">
                <div className="absolute -right-2 top-1/2 transform -translate-y-1/2 w-8 h-0.5 bg-gray-400 border-dashed border-t border-gray-400"></div>
              </div>
              
              {/* Background shapes */}
              <div className="absolute top-8 left-4 w-12 h-12 bg-blue-200 rounded-full login-shape"></div>
              <div className="absolute bottom-20 right-4 w-8 h-8 bg-indigo-200 rounded-full login-shape"></div>
            </div>
          </div>

          {/* Marketing Text */}
          <div className="text-center lg:text-left">
            <h2 className="text-xl lg:text-2xl font-bold text-gray-800 mb-4">Transforming Digital Payments</h2>
            <p className="text-gray-600 text-base lg:text-lg leading-relaxed">
              Enjoy smooth financial services that make payments, banking, and managing expenses effortless
            </p>
          </div>
        </div>
      </div>

      {/* Right Section - Login Form */}
      <div className="w-full lg:w-1/2 bg-white flex flex-col justify-center px-6 lg:px-8 py-8 lg:py-16">
        <div className="max-w-md mx-auto w-full">
          {/* Alert Banner */}
          {showAlert && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-8 relative">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <FiShield className="h-5 w-5 text-yellow-600" />
                </div>
                <div className="ml-3 flex-1">
                  <p className="text-sm text-yellow-800">
                    Payment system updated. Please ensure your integrations are current.
                  </p>
                  <a href="/docs" className="text-sm text-yellow-600 hover:text-yellow-500 underline">
                    Visit documentation for details.
                  </a>
                </div>
                <button
                  onClick={() => setShowAlert(false)}
                  className="ml-3 flex-shrink-0"
                >
                  <FiX className="h-4 w-4 text-yellow-600" />
                </button>
              </div>
            </div>
          )}

          {/* Welcome Message */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Welcome to ZTake Payment
              <span className="ml-2">👋</span>
            </h2>
            <p className="text-gray-600">Sign in to your account to continue</p>
          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <div className="relative">
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                    emailStatus.checking 
                      ? 'border-yellow-300 bg-yellow-50' 
                      : emailStatus.exists && emailStatus.approved && !emailStatus.hasGoogleId
                        ? 'border-green-300 bg-green-50' 
                        : emailStatus.exists && emailStatus.hasGoogleId
                          ? 'border-blue-300 bg-blue-50'
                          : emailStatus.exists && !emailStatus.approved 
                            ? 'border-orange-300 bg-orange-50'
                            : 'border-gray-300'
                  }`}
                  placeholder="Enter your email or number"
                  value={formData.email}
                  onChange={handleChange}
                />
                {emailStatus.checking && (
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                  </div>
                )}
                {!emailStatus.checking && emailStatus.exists && emailStatus.approved && !emailStatus.hasGoogleId && (
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                    <FiCheckCircle className="h-5 w-5 text-green-600" />
                  </div>
                )}
                {!emailStatus.checking && emailStatus.exists && emailStatus.hasGoogleId && (
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                    <svg className="h-5 w-5 text-blue-600" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                  </div>
                )}
                {!emailStatus.checking && emailStatus.exists && !emailStatus.approved && !emailStatus.hasGoogleId && (
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                    <FiX className="h-5 w-5 text-orange-600" />
                  </div>
                )}
              </div>
              {emailStatus.message && (
                <div className={`mt-2 p-3 rounded-lg border ${
                  emailStatus.exists && emailStatus.approved && !emailStatus.hasGoogleId
                    ? 'text-green-600 bg-green-50 border-green-200' 
                    : emailStatus.exists && emailStatus.hasGoogleId
                      ? 'text-blue-600 bg-blue-50 border-blue-200'
                      : emailStatus.exists && !emailStatus.approved 
                        ? 'text-orange-600 bg-orange-50 border-orange-200'
                        : 'text-red-600 bg-red-50 border-red-200'
                }`}>
                  <div className="flex items-start">
                    <div className="flex-shrink-0">
                      {emailStatus.exists && emailStatus.hasGoogleId ? (
                        <svg className="h-5 w-5" viewBox="0 0 24 24">
                          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                        </svg>
                      ) : emailStatus.exists && emailStatus.approved && !emailStatus.hasGoogleId ? (
                        <FiCheckCircle className="h-5 w-5" />
                      ) : emailStatus.exists && !emailStatus.approved ? (
                        <FiX className="h-5 w-5" />
                      ) : (
                        <FiX className="h-5 w-5" />
                      )}
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-medium">{emailStatus.message}</p>
                      {emailStatus.exists && emailStatus.hasGoogleId && (
                        <p className="text-xs mt-1 opacity-75">
                          This account is linked to Google. Please use the "Continue with Google" button below.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {emailStatus.exists && emailStatus.approved && !emailStatus.hasGoogleId && (
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                  placeholder="Enter your password"
                  value={formData.password}
                  onChange={handleChange}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <FiEyeOff className="h-5 w-5 text-gray-400" />
                  ) : (
                    <FiEye className="h-5 w-5 text-gray-400" />
                  )}
                </button>
              </div>
            )}

            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-700">
                  Remember me
                </label>
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={isLoading || !emailStatus.exists || !emailStatus.approved || emailStatus.hasGoogleId}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isLoading ? 'Signing in...' : 'Sign In'}
              </button>
            </div>

            {error && (
              <div className="text-red-600 text-sm text-center bg-red-50 border border-red-200 rounded-lg p-3">
                {error}
              </div>
            )}

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">or</span>
              </div>
            </div>

            <div>
              <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={isGoogleLoading}
                className="w-full flex justify-center items-center py-3 px-4 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                {isGoogleLoading ? 'Signing in...' : 'Continue with Google'}
              </button>
            </div>
          </form>

          {/* Terms */}
          <div className="mt-8 text-center">
            <p className="text-sm text-gray-600">
              By signing up, you agree to our{' '}
              <a href="/terms" className="text-blue-600 hover:text-blue-500 underline">
                Terms and Conditions
              </a>{' '}
              &{' '}
              <a href="/privacy" className="text-blue-600 hover:text-blue-500 underline">
                Privacy Policy
              </a>
            </p>
          </div>

          {/* Security Badges */}
          <div className="mt-8 lg:mt-12 space-y-4 lg:space-y-6">
            {/* Security Certifications */}
            <div className="text-center">
              <p className="text-xs text-gray-500 mb-3">SECURITY CERTIFICATIONS</p>
              <div className="flex flex-wrap justify-center items-center gap-3 lg:gap-6">
                <div className="flex items-center space-x-1">
                  <FiShield className="w-4 h-4 text-gray-600" />
                  <span className="text-xs text-gray-600">VAPT CERTIFIED</span>
                </div>
                <div className="flex items-center space-x-1">
                  <FiShield className="w-4 h-4 text-gray-600" />
                  <span className="text-xs text-gray-600">PCI DSS</span>
                </div>
                <div className="flex items-center space-x-1">
                  <FiShield className="w-4 h-4 text-gray-600" />
                  <span className="text-xs text-gray-600">ISO 27001</span>
                </div>
              </div>
            </div>

            {/* Payment Methods */}
            <div className="text-center">
              <p className="text-xs text-gray-500 mb-3">ACCEPTED PAYMENT METHODS</p>
              <div className="flex flex-wrap justify-center items-center gap-2 lg:gap-4">
                <div className="w-8 h-5 bg-red-600 rounded text-white text-xs flex items-center justify-center font-bold">V</div>
                <div className="w-8 h-5 bg-blue-600 rounded text-white text-xs flex items-center justify-center font-bold">M</div>
                <div className="w-8 h-5 bg-green-600 rounded text-white text-xs flex items-center justify-center font-bold">₹</div>
                <div className="w-8 h-5 bg-orange-600 rounded text-white text-xs flex items-center justify-center font-bold">UPI</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
