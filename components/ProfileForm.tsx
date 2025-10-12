'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/context';
import { FiUser, FiPhone, FiCreditCard, FiSave, FiMessageCircle, FiCopy, FiRefreshCw } from 'react-icons/fi';

interface PaymentInfo {
  qr_code_url: string;
  upi_id: string;
  upi_url: string;
  vendor_id: number;
  bank_name?: string | null;
  bank_account_holder?: string | null;
  bank_account_number?: string | null;
  bank_ifsc?: string | null;
  bot_token_present?: boolean;
  chat_id_present?: boolean;
  is_bot_live?: boolean;
}

export default function ProfileForm() {
  const { vendor, token, updateVendor } = useAuth();
  const [formData, setFormData] = useState({
    business_name: '',
    contact_name: '',
    phone: '',
    upi_id: '',
    bank_name: '',
    bank_account_number: '',
    bank_account_holder: '',
    bank_ifsc: '',
    bot_token: '',
    chat_id: '',
    cashfree_app_id: '',
    cashfree_secret_key: '',
    cashfree_payout_client_id: '',
    cashfree_payout_client_secret: '',
    cashfree_env: 'sandbox'
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [paymentInfo, setPaymentInfo] = useState<PaymentInfo | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [qrError, setQrError] = useState('');

  useEffect(() => {
    if (token) {
      fetchProfile();
      fetchPaymentInfo();
    }
  }, [token]);

  // Refresh payment info when UPI ID changes
  useEffect(() => {
    if (formData.upi_id && paymentInfo) {
      if (formData.upi_id !== paymentInfo.upi_id) {
        fetchPaymentInfo(true);
      }
    }
  }, [formData.upi_id]);

  const fetchProfile = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/vendor/profile', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setFormData({
          business_name: data.vendor.business_name || '',
          contact_name: data.vendor.contact_name || '',
          phone: data.vendor.phone || '',
          upi_id: data.vendor.upi_id || '',
          bank_name: data.vendor.bank_name || '',
          bank_account_number: data.vendor.bank_account_number || '',
          bank_account_holder: data.vendor.bank_account_holder || '',
          bank_ifsc: data.vendor.bank_ifsc || '',
          bot_token: data.vendor.bot_token || '',
          chat_id: data.vendor.chat_id || '',
          cashfree_app_id: data.vendor.cashfree_app_id || '',
          cashfree_secret_key: data.vendor.cashfree_secret_key || '',
          cashfree_payout_client_id: data.vendor.cashfree_payout_client_id || '',
          cashfree_payout_client_secret: data.vendor.cashfree_payout_client_secret || '',
          cashfree_env: data.vendor.cashfree_env || 'sandbox'
        });
      } else {
        setError('Failed to load profile');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchPaymentInfo = async (isRefresh = false) => {
    if (!token) {
      return;
    }
    
    try {
      if (isRefresh) {
        setIsRefreshing(true);
      }
      setQrError('');
      
      const response = await fetch('/api/vendor/payment-info', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setPaymentInfo(data);
      } else {
        setQrError('Failed to load payment information');
      }
    } catch (err) {
      setQrError('Network error. Please try again.');
    } finally {
      if (isRefresh) {
        setIsRefreshing(false);
      }
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setSuccess('Copied to clipboard!');
      setTimeout(() => setSuccess(''), 2000);
    } catch (err) {
      setError('Failed to copy to clipboard');
    }
  };

  const handleRefresh = () => {
    fetchPaymentInfo(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/vendor/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess('Profile updated successfully');
        // Update the vendor data in auth context
        updateVendor({
          id: vendor?.id || 0,
          email: vendor?.email || '',
          business_name: formData.business_name,
          contact_name: formData.contact_name,
          phone: formData.phone,
          upi_id: formData.upi_id
        });
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(data.error || 'Failed to update profile');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Profile Settings</h1>
        <p className="text-gray-600">Manage your account information and payment details</p>
      </div>

      <div className="card">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="form-group">
              <label htmlFor="business_name" className="form-label">
                Business Name
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FiUser className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="business_name"
                  name="business_name"
                  type="text"
                  required
                  className="input-field pl-10"
                  placeholder="Enter your business name"
                  value={formData.business_name}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="contact_name" className="form-label">
                Contact Name
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FiUser className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="contact_name"
                  name="contact_name"
                  type="text"
                  required
                  className="input-field pl-10"
                  placeholder="Enter your contact name"
                  value={formData.contact_name}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="phone" className="form-label">
                Phone Number
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FiPhone className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  className="input-field pl-10"
                  placeholder="Enter your phone number"
                  value={formData.phone}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="upi_id" className="form-label">
                UPI ID
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FiCreditCard className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="upi_id"
                  name="upi_id"
                  type="text"
                  required
                  className="input-field pl-10"
                  placeholder="yourname@paytm"
                  value={formData.upi_id}
                  onChange={handleChange}
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Enter your UPI ID (e.g., yourname@paytm, yourname@phonepe)
              </p>
            </div>
            
            <div className="form-group">
              <label htmlFor="bank_name" className="form-label">
                Bank Name
              </label>
              <input
                id="bank_name"
                name="bank_name"
                type="text"
                className="input-field"
                placeholder="e.g., HDFC Bank"
                value={formData.bank_name}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label htmlFor="bank_account_holder" className="form-label">
                Account Holder Name
              </label>
              <input
                id="bank_account_holder"
                name="bank_account_holder"
                type="text"
                className="input-field"
                placeholder="e.g., Rahul Sharma"
                value={formData.bank_account_holder}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label htmlFor="bank_account_number" className="form-label">
                Account Number
              </label>
              <input
                id="bank_account_number"
                name="bank_account_number"
                type="text"
                className="input-field"
                placeholder="e.g., 123456789012"
                value={formData.bank_account_number}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label htmlFor="bank_ifsc" className="form-label">
                IFSC Code
              </label>
              <input
                id="bank_ifsc"
                name="bank_ifsc"
                type="text"
                className="input-field uppercase"
                placeholder="e.g., HDFC0001234"
                value={formData.bank_ifsc}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="bot_token" className="form-label">
              Telegram Bot Token
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FiMessageCircle className="h-5 w-5 text-gray-400" />
              </div>
              <input
                id="bot_token"
                name="bot_token"
                type="password"
                className="input-field pl-10"
                placeholder="123456789:ABCdefGHIjklMNOpqrsTUVwxyz"
                value={formData.bot_token}
                onChange={handleChange}
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Enter your Telegram Bot Token to enable bot notifications for this vendor. 
              Get your token from @BotFather on Telegram.
            </p>
          </div>

          <div className="form-group">
            <label htmlFor="chat_id" className="form-label">
              Telegram Chat ID
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FiMessageCircle className="h-5 w-5 text-gray-400" />
              </div>
              <input
                id="chat_id"
                name="chat_id"
                type="text"
                className="input-field pl-10"
                placeholder="e.g., 123456789 or -1001234567890"
                value={formData.chat_id}
                onChange={handleChange}
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Enter the Telegram chat ID where notifications should be sent. Use @userinfobot or your bot updates to find it.
            </p>
          </div>

          {error && (
            <div className="error-message text-center">
              {error}
            </div>
          )}

          {success && (
            <div className="success-message text-center">
              {success}
            </div>
          )}

          <div className="pt-2">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Payment Information</h2>
            <p className="text-gray-600 mb-4">Your UPI payment details and QR code for receiving payments.</p>
            
            {qrError ? (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                <p className="text-red-600">{qrError}</p>
                <button
                  onClick={handleRefresh}
                  className="mt-2 text-sm text-red-600 hover:text-red-800 underline"
                >
                  Try again
                </button>
              </div>
            ) : paymentInfo ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-2">UPI ID</h3>
                  <div className="flex items-center space-x-2">
                    <p className="text-lg font-mono bg-gray-100 p-3 rounded flex-1">{paymentInfo.upi_id}</p>
                    <button
                      onClick={() => copyToClipboard(paymentInfo.upi_id || '')}
                      className="p-2 text-gray-500 hover:text-gray-700"
                      title="Copy UPI ID"
                    >
                      <FiCopy className="h-4 w-4" />
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Click the copy icon to copy UPI ID</p>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-2">QR Code</h3>
                  <div className="flex justify-center">
                    <div className="relative">
                      <img 
                        src={paymentInfo.qr_code_url} 
                        alt="Payment QR Code" 
                        className="w-40 h-40 border-2 border-gray-200 rounded-lg shadow-sm"
                        onError={() => setQrError('Failed to load QR code image')}
                      />
                      {isRefreshing && (
                        <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center rounded-lg">
                          <FiRefreshCw className="h-6 w-6 animate-spin text-primary-600" />
                        </div>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-2 text-center">Scan with any UPI app to pay</p>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 mb-6">
                <FiRefreshCw className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">Loading payment info...</h3>
                <p className="mt-1 text-sm text-gray-500">Please wait while we fetch your UPI details.</p>
              </div>
            )}
          </div>

          <div className="pt-2">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Ztake Settings</h2>
            <p className="text-gray-600 mb-4">Configure your payout settings in the backend or via support.</p>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isSaving}
              className="btn-primary flex items-center space-x-2"
            >
              <FiSave />
              <span>{isSaving ? 'Saving...' : 'Save Changes'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
