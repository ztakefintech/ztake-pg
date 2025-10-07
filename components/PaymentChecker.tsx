'use client';

import React, { useState } from 'react';
import { FiSearch, FiCheckCircle, FiClock, FiX } from 'react-icons/fi';

interface PaymentResult {
  id: number;
  order_id?: string | null;
  utr: string;
  amount: number;
  status: string;
  payment_status: string;
  checked_status: boolean;
  checked_at: string | null;
  created_at: string;
  updated_at: string;
  vendor: {
    id: number;
    business_name: string;
    contact_name: string;
    upi_id: string;
  };
}

export default function PaymentChecker() {
  const [utr, setUtr] = useState('');
  const [vendorId, setVendorId] = useState('');
  const [orderId, setOrderId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [payment, setPayment] = useState<PaymentResult | null>(null);
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!utr.trim() || !vendorId.trim() || !orderId.trim()) return;

    setIsLoading(true);
    setError('');
    setPayment(null);
    setMessage('');

    try {
      const response = await fetch('/api/payments/check', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          utr: utr.trim(),
          vendor_id: parseInt(vendorId.trim()),
          order_id: orderId.trim()
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setPayment(data.payment);
        setMessage(data.message || '');
      } else {
        setError(data.error || 'Payment not found');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusIcon = (paymentStatus: string) => {
    switch (paymentStatus) {
      case 'Succeeded':
        return <FiCheckCircle className="text-green-500" />;
      case 'Pending':
        return <FiClock className="text-yellow-500" />;
      case 'Failed':
        return <FiX className="text-red-500" />;
      default:
        return <FiX className="text-red-500" />;
    }
  };

  const getStatusColor = (paymentStatus: string) => {
    switch (paymentStatus) {
      case 'Succeeded':
        return 'bg-green-100 text-green-800';
      case 'Pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'Failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-red-100 text-red-800';
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Payment Status Checker</h1>
        <p className="text-gray-600">Enter UTR, Vendor ID, and Order ID to check payment status. Order ID is only added for successful payments.</p>
      </div>

      <div className="card">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="form-group">
              <label htmlFor="utr" className="form-label">
                UTR Number
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FiSearch className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="utr"
                  name="utr"
                  type="text"
                  required
                  className="input-field pl-10"
                  placeholder="e.g., 690518190930"
                  value={utr}
                  onChange={(e) => setUtr(e.target.value)}
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="vendorId" className="form-label">
                Vendor ID
              </label>
              <input
                id="vendorId"
                name="vendorId"
                type="number"
                required
                className="input-field"
                placeholder="e.g., 1"
                value={vendorId}
                onChange={(e) => setVendorId(e.target.value)}
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="orderId" className="form-label">
              Order ID
            </label>
            <input
              id="orderId"
              name="orderId"
              type="text"
              required
              className="input-field"
              placeholder="e.g., ord_12345"
              value={orderId}
              onChange={(e) => setOrderId(e.target.value)}
            />
          </div>

          <button
            type="submit"
            disabled={isLoading || !utr.trim() || !vendorId.trim() || !orderId.trim()}
            className="btn-primary w-full flex items-center justify-center space-x-2"
          >
            <FiSearch />
            <span>{isLoading ? 'Checking...' : 'Check Payment Status'}</span>
          </button>
        </form>

        {error && (
          <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-600">{error}</p>
          </div>
        )}

        {message && (
          <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-blue-600">{message}</p>
          </div>
        )}

        {payment && (
          <div className="mt-6 space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-green-800 mb-2">Payment Found</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-green-700">UTR</p>
                  <p className="font-mono text-green-900">{payment.utr}</p>
                </div>
                <div>
                  <p className="text-sm text-green-700">Order ID</p>
                  <p className="font-mono text-green-900">{payment.order_id || 'Not set'}</p>
                </div>
                <div>
                  <p className="text-sm text-green-700">Amount</p>
                  <p className="font-semibold text-green-900">{formatCurrency(payment.amount)}</p>
                </div>
                <div>
                  <p className="text-sm text-green-700">Payment Status</p>
                  <div className="flex items-center space-x-2">
                    {getStatusIcon(payment.payment_status)}
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(payment.payment_status)}`}>
                      {payment.payment_status}
                    </span>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-green-700">Checked Status</p>
                  <div className="flex items-center space-x-2">
                    {payment.checked_status ? (
                      <FiCheckCircle className="text-green-500" />
                    ) : (
                      <FiClock className="text-yellow-500" />
                    )}
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      payment.checked_status ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {payment.checked_status ? 'Checked' : 'Not Checked'}
                    </span>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-green-700">Date</p>
                  <p className="text-green-900">{formatDate(payment.created_at)}</p>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-semibold text-gray-900 mb-2">Vendor Information</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-600">Business Name</p>
                  <p className="font-medium text-gray-900">{payment.vendor.business_name}</p>
                </div>
                <div>
                  <p className="text-gray-600">Contact Name</p>
                  <p className="font-medium text-gray-900">{payment.vendor.contact_name}</p>
                </div>
                <div>
                  <p className="text-gray-600">UPI ID</p>
                  <p className="font-mono text-gray-900">{payment.vendor.upi_id}</p>
                </div>
                <div>
                  <p className="text-gray-600">Payment ID</p>
                  <p className="font-mono text-gray-900">#{payment.id}</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
