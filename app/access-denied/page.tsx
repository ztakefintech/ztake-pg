'use client';

import React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { FiMail, FiPhone, FiClock, FiShield, FiArrowLeft } from 'react-icons/fi';

function AccessDeniedContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const email = searchParams.get('email') || '';
  const name = searchParams.get('name') || '';
  const message = searchParams.get('message') || 'Your account is pending approval. Please contact support for access.';
  const userId = searchParams.get('userId') || '';
  
  const isNewUser = message.includes('account has been created');

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Left Section - Branding */}
      <div className="lg:w-1/2 bg-gradient-to-br from-red-50 to-orange-100 relative overflow-hidden">
        <div className="flex flex-col justify-center px-8 lg:px-12 py-8 lg:py-16 w-full min-h-[50vh] lg:min-h-screen">
          {/* Logo */}
          <div className="mb-6 lg:mb-8 text-center lg:text-left">
            <h1 className="text-2xl lg:text-3xl font-bold text-gray-800">ZTake</h1>
            <p className="text-sm text-gray-600 mt-1">Payment Solutions</p>
          </div>

          {/* Illustration */}
          <div className="hidden lg:flex flex-1 items-center justify-center mb-8">
            <div className="relative w-80 h-80">
              {/* Shield with clock */}
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-red-200 rounded-full flex items-center justify-center shadow-lg">
                <FiShield className="w-16 h-16 text-red-600" />
              </div>
              
              {/* Clock overlay */}
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-md">
                <FiClock className="w-10 h-10 text-orange-600" />
              </div>
              
              {/* Background shapes */}
              <div className="absolute top-8 left-4 w-12 h-12 bg-red-200 rounded-full opacity-50 animate-pulse"></div>
              <div className="absolute bottom-20 right-4 w-8 h-8 bg-orange-200 rounded-full opacity-50 animate-pulse"></div>
            </div>
          </div>

          {/* Marketing Text */}
          <div className="text-center lg:text-left">
            <h2 className="text-xl lg:text-2xl font-bold text-gray-800 mb-4">Access Pending Approval</h2>
            <p className="text-gray-600 text-base lg:text-lg leading-relaxed">
              We're reviewing your account to ensure secure access to our payment platform
            </p>
          </div>
        </div>
      </div>

      {/* Right Section - Access Denied Message */}
      <div className="w-full lg:w-1/2 bg-white flex flex-col justify-center px-6 lg:px-8 py-8 lg:py-16">
        <div className="max-w-md mx-auto w-full">
          {/* Status Icon */}
          <div className="text-center mb-8">
            <div className={`w-20 h-20 ${isNewUser ? 'bg-green-100' : 'bg-orange-100'} rounded-full flex items-center justify-center mx-auto mb-4`}>
              {isNewUser ? (
                <FiShield className="w-10 h-10 text-green-600" />
              ) : (
                <FiClock className="w-10 h-10 text-orange-600" />
              )}
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              {isNewUser ? 'Account Created!' : 'Access Pending'}
            </h2>
            <p className="text-gray-600">
              {isNewUser ? 'Your account has been created and is under review' : 'Your account is under review'}
            </p>
          </div>

          {/* User Info */}
          {email && (
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <div className="flex items-center space-x-3">
                <FiMail className="w-5 h-5 text-gray-500" />
                <div>
                  <p className="text-sm text-gray-500">Account Email</p>
                  <p className="font-medium text-gray-900">{email}</p>
                </div>
              </div>
              {name && (
                <div className="flex items-center space-x-3 mt-3">
                  <FiShield className="w-5 h-5 text-gray-500" />
                  <div>
                    <p className="text-sm text-gray-500">Account Name</p>
                    <p className="font-medium text-gray-900">{name}</p>
                  </div>
                </div>
              )}
              {userId && (
                <div className="flex items-center space-x-3 mt-3">
                  <FiShield className="w-5 h-5 text-gray-500" />
                  <div>
                    <p className="text-sm text-gray-500">Account ID</p>
                    <p className="font-medium text-gray-900 font-mono">{userId}</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Message */}
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-6">
            <p className="text-orange-800 text-sm leading-relaxed">
              {message}
            </p>
          </div>

          {/* Contact Information */}
          <div className="space-y-4 mb-8">
            <h3 className="text-lg font-semibold text-gray-900">Contact Support</h3>
            
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <FiMail className="w-5 h-5 text-blue-600" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Email Support</p>
                  <a href="mailto:support@ztake.in" className="text-sm text-blue-600 hover:text-blue-500">
                    support@ztake.in
                  </a>
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                <FiPhone className="w-5 h-5 text-blue-600" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Phone Support</p>
                  <a href="tel:+91-9220592512" className="text-sm text-blue-600 hover:text-blue-500">
                    +91-9220592512
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            <button
              onClick={() => router.push('/login')}
              className="w-full flex justify-center items-center py-3 px-4 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
            >
              <FiArrowLeft className="w-4 h-4 mr-2" />
              Back to Login
            </button>
            
            <button
              onClick={() => window.open('mailto:support@ztake.in?subject=Account Approval Request', '_blank')}
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
            >
              Request Approval
            </button>
          </div>

          {/* Additional Info */}
          <div className="mt-8 text-center">
            <p className="text-xs text-gray-500">
              Approval typically takes 1-2 business days. You'll receive an email notification once approved.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AccessDeniedPage() {
  return (
    <React.Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-black text-zinc-500">
        Loading...
      </div>
    }>
      <AccessDeniedContent />
    </React.Suspense>
  );
}
