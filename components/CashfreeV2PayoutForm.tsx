'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/context';
import { toast } from '@/hooks/use-toast';

interface PayoutFormData {
  amount: string;
  currency: string;
  remarks: string;
  reference_id: string;
  beneficiary_name: string;
  beneficiary_id: string;
  email: string;
  phone: string;
  bank_account_number: string;
  bank_ifsc: string;
  callback_url: string;
}

interface PayoutResponse {
  success: boolean;
  message: string;
  payout: {
    id: number;
    reference_id: string;
    amount: number;
    currency: string;
    status: string;
    beneficiary_name: string;
    beneficiary_account?: string;
    cashfree_transfer_id?: string;
    created_at: string;
  };
  beneficiary: {
    id: string;
    name: string;
    account?: string;
  };
  provider: {
    beneficiary: any;
    transfer: any;
  };
}

export default function CashfreeV2PayoutForm() {
  const { vendor, token } = useAuth();
  const [loading, setLoading] = useState(false);
  const [payoutResponse, setPayoutResponse] = useState<PayoutResponse | null>(null);
  const [formData, setFormData] = useState<PayoutFormData>({
    amount: '',
    currency: 'INR',
    remarks: '',
    reference_id: '',
    beneficiary_name: '',
    beneficiary_id: '',
    email: '',
    phone: '',
    bank_account_number: '',
    bank_ifsc: '',
    callback_url: ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.amount || parseFloat(formData.amount) < 1) {
      newErrors.amount = 'Amount must be at least ₹1';
    }
    if (parseFloat(formData.amount) > 100000) {
      newErrors.amount = 'Amount cannot exceed ₹1,00,000';
    }

    if (!formData.beneficiary_name.trim()) {
      newErrors.beneficiary_name = 'Beneficiary name is required';
    }

    if (!formData.bank_account_number.trim()) {
      newErrors.bank_account_number = 'Bank account number is required';
    }
    if (!formData.bank_ifsc.trim()) {
      newErrors.bank_ifsc = 'IFSC code is required';
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }

    if (formData.phone && !/^[6-9]\d{9}$/.test(formData.phone)) {
      newErrors.phone = 'Invalid phone number format';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast({
        title: "Validation Error",
        description: "Please fix the errors in the form",
        variant: "destructive",
      });
      return;
    }

    if (!token) {
      toast({
        title: "Authentication Error",
        description: "Please log in to create payouts",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    setPayoutResponse(null);

    try {
      const response = await fetch('/api/vendor/cashfree/v2/complete-payout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          ...formData,
          amount: parseFloat(formData.amount),
          // Generate beneficiary ID if not provided
          beneficiary_id: formData.beneficiary_id || undefined
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setPayoutResponse(data);
        toast({
          title: "Success",
          description: "Payout initiated successfully!",
        });
      } else {
        throw new Error(data.error || data.message || 'Failed to create payout');
      }
    } catch (error: any) {
      console.error('Payout creation error:', error);
      toast({
        title: "Error",
        description: error.message || 'Failed to create payout',
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof PayoutFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const generateReferenceId = () => {
    const refId = `PAYOUT_${Date.now()}_${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
    handleInputChange('reference_id', refId);
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Cashfree V2 Complete Payout</h2>
        <p className="text-gray-600">
          Create a payout with automatic beneficiary creation and transfer initiation using Cashfree V2 APIs.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Payout Details */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Payout Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Amount (₹) *
              </label>
              <input
                type="number"
                step="0.01"
                min="1"
                max="100000"
                value={formData.amount}
                onChange={(e) => handleInputChange('amount', e.target.value)}
                className={`w-full border rounded-md px-3 py-2 ${
                  errors.amount ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Enter amount"
                required
              />
              {errors.amount && <p className="text-red-500 text-xs mt-1">{errors.amount}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Currency
              </label>
              <select
                value={formData.currency}
                onChange={(e) => handleInputChange('currency', e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
              >
                <option value="INR">INR</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Reference ID
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={formData.reference_id}
                  onChange={(e) => handleInputChange('reference_id', e.target.value)}
                  className="flex-1 border border-gray-300 rounded-md px-3 py-2"
                  placeholder="Auto-generated if empty"
                />
                <button
                  type="button"
                  onClick={generateReferenceId}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Generate
                </button>
              </div>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Remarks
              </label>
              <textarea
                value={formData.remarks}
                onChange={(e) => handleInputChange('remarks', e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
                rows={3}
                placeholder="Optional remarks for the payout"
              />
            </div>
          </div>
        </div>

        {/* Beneficiary Details */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Beneficiary Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Beneficiary Name *
              </label>
              <input
                type="text"
                value={formData.beneficiary_name}
                onChange={(e) => handleInputChange('beneficiary_name', e.target.value)}
                className={`w-full border rounded-md px-3 py-2 ${
                  errors.beneficiary_name ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Enter beneficiary name"
                required
              />
              {errors.beneficiary_name && <p className="text-red-500 text-xs mt-1">{errors.beneficiary_name}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Beneficiary ID
              </label>
              <input
                type="text"
                value={formData.beneficiary_id}
                onChange={(e) => handleInputChange('beneficiary_id', e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
                placeholder="Auto-generated if empty"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                className={`w-full border rounded-md px-3 py-2 ${
                  errors.email ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="beneficiary@example.com"
              />
              {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Phone
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                className={`w-full border rounded-md px-3 py-2 ${
                  errors.phone ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="9876543210"
              />
              {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone}</p>}
            </div>
          </div>
        </div>

        {/* Bank Account Details */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Bank Account Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Bank Account Number *
              </label>
              <input
                type="text"
                value={formData.bank_account_number}
                onChange={(e) => handleInputChange('bank_account_number', e.target.value)}
                className={`w-full border rounded-md px-3 py-2 ${
                  errors.bank_account_number ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Enter account number"
                required
              />
              {errors.bank_account_number && <p className="text-red-500 text-xs mt-1">{errors.bank_account_number}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                IFSC Code *
              </label>
              <input
                type="text"
                value={formData.bank_ifsc}
                onChange={(e) => handleInputChange('bank_ifsc', e.target.value.toUpperCase())}
                className={`w-full border rounded-md px-3 py-2 ${
                  errors.bank_ifsc ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="ABCD0123456"
                required
              />
              {errors.bank_ifsc && <p className="text-red-500 text-xs mt-1">{errors.bank_ifsc}</p>}
            </div>
          </div>
        </div>

        {/* Callback URL */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Callback Configuration</h3>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Callback URL
            </label>
            <input
              type="url"
              value={formData.callback_url}
              onChange={(e) => handleInputChange('callback_url', e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
              placeholder="https://your-domain.com/webhook"
            />
            <p className="text-xs text-gray-500 mt-1">
              Optional: URL to receive payout status updates
            </p>
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-3 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Processing...' : 'Create Payout'}
          </button>
        </div>
      </form>

      {/* Response Display */}
      {payoutResponse && (
        <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
          <h3 className="text-lg font-semibold text-green-800 mb-3">Payout Created Successfully!</h3>
          <div className="space-y-2 text-sm">
            <div><strong>Payout ID:</strong> {payoutResponse.payout.id}</div>
            <div><strong>Reference ID:</strong> {payoutResponse.payout.reference_id}</div>
            <div><strong>Amount:</strong> ₹{payoutResponse.payout.amount}</div>
            <div><strong>Status:</strong> {payoutResponse.payout.status}</div>
            <div><strong>Beneficiary:</strong> {payoutResponse.beneficiary.name}</div>
            {payoutResponse.payout.beneficiary_account && (
              <div><strong>Account:</strong> {payoutResponse.payout.beneficiary_account}</div>
            )}
            {payoutResponse.payout.cashfree_transfer_id && (
              <div><strong>Cashfree Transfer ID:</strong> {payoutResponse.payout.cashfree_transfer_id}</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
