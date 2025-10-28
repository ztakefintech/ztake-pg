'use client';

import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import { useAuth } from '@/lib/context';
import { useRouter } from 'next/navigation';
import { FiRefreshCw, FiChevronLeft, FiChevronRight, FiDollarSign, FiClock, FiCheckCircle, FiXCircle, FiAlertCircle } from 'react-icons/fi';

interface PayoutRow {
  id: number;
  amount: number;
  currency: string;
  beneficiary_name?: string | null;
  beneficiary_account?: string | null;
  beneficiary_ifsc?: string | null;
  beneficiary_upi?: string | null;
  reference_id?: string | null;
  remarks?: string | null;
  status: string;
  created_at: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface StatusCounts {
  Success: number;
  Pending: number;
  Failed: number;
}

export default function PayoutsPage() {
  const { vendor, token, isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [payouts, setPayouts] = useState<PayoutRow[]>([]);
  const [statusCounts, setStatusCounts] = useState<StatusCounts>({ Success: 0, Pending: 0, Failed: 0 });
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0
  });
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchPayouts(1);
    }
  }, [isAuthenticated]);

  const fetchPayouts = async (page: number) => {
    if (!token) return;
    
    setIsLoading(true);
    setError('');
    
    try {
      const response = await fetch(`/api/vendor/payouts/jwt?page=${page}&limit=${pagination.limit}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      let data: any = null;
      const rawText = await response.text();
      try {
        data = rawText ? JSON.parse(rawText) : null;
      } catch {
        data = null;
      }

      if (response.ok) {
        setPayouts(data?.payouts || []);
        setPagination(data?.pagination || { page, limit: pagination.limit, total: 0, totalPages: 0 });
        if (data?.statusCounts) {
          setStatusCounts({
            Success: data.statusCounts.Success || 0,
            Pending: data.statusCounts.Pending || 0,
            Failed: data.statusCounts.Failed || 0
          });
        } else {
          setStatusCounts({ Success: 0, Pending: 0, Failed: 0 });
        }
      } else {
        const message = data?.error || rawText || 'Failed to fetch payouts';
        setError(`${message} (HTTP ${response.status})`);
      }
    } catch (err: any) {
      setError(`Network error. Please try again. ${err?.message ? `(${err.message})` : ''}`.trim());
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = () => {
    fetchPayouts(pagination.page);
  };

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      fetchPayouts(newPage);
    }
  };

  // Filter payouts based on search term and status
  const filteredPayouts = payouts.filter(payout => {
    const matchesSearch = searchTerm === '' || 
      payout.amount.toString().includes(searchTerm) ||
      (payout.beneficiary_name && payout.beneficiary_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (payout.beneficiary_account && payout.beneficiary_account.includes(searchTerm)) ||
      (payout.beneficiary_upi && payout.beneficiary_upi.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (payout.reference_id && payout.reference_id.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesStatus = statusFilter === 'all' || 
      (statusFilter === 'Success' && (payout.status === 'paid' || payout.status === 'approved' || payout.status === 'success')) ||
      (statusFilter === 'Pending' && (payout.status === 'created' || payout.status === 'pending')) ||
      (statusFilter === 'Failed' && (payout.status === 'rejected' || payout.status === 'failed'));
    
    return matchesSearch && matchesStatus;
  });

  const getStatusIcon = (status: string) => {
    if (status === 'paid' || status === 'approved' || status === 'success') {
      return <FiCheckCircle className="text-green-500" />;
    } else if (status === 'rejected' || status === 'failed') {
      return <FiXCircle className="text-red-500" />;
    } else {
      return <FiClock className="text-yellow-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
      case 'approved':
      case 'success':
        return 'bg-green-100 text-green-800';
      case 'rejected':
      case 'failed':
        return 'bg-red-100 text-red-800';
      case 'created':
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'approved':
        return 'Success';
      case 'rejected':
        return 'Failed';
      case 'created':
        return 'Pending';
      case 'success':
        return 'Success';
      case 'failed':
        return 'Failed';
      case 'pending':
        return 'Pending';
      case 'paid':
        return 'Success';
      default:
        return status;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount);
  };

  // Show loading spinner while checking authentication
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Don't render if not authenticated (will redirect)
  if (!isAuthenticated) {
    return null;
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Payout History</h1>
              <p className="text-gray-600 dark:text-gray-400">View all your payout transactions</p>
            </div>
            <button
              onClick={handleRefresh}
              disabled={isLoading}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
            >
              <FiRefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* Search and Filter Controls */}
        <div className="bg-white p-6 rounded-lg shadow-sm border mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-2">
                Search Payouts
              </label>
              <input
                type="text"
                id="search"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by beneficiary name, account, UPI ID, or amount..."
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="md:w-48">
              <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-2">
                Filter by Status
              </label>
              <select
                id="status"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Status</option>
                <option value="Success">Success</option>
                <option value="Pending">Pending</option>
                <option value="Failed">Failed</option>
              </select>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white dark:bg-gray-900 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <FiCheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Successful</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {statusCounts.Success}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-900 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <FiClock className="h-6 w-6 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Pending</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {statusCounts.Pending}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-900 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800">
            <div className="flex items-center">
              <div className="p-2 bg-red-100 rounded-lg">
                <FiXCircle className="h-6 w-6 text-red-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Failed</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {statusCounts.Failed}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Payouts Table */}
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">All Payouts</h2>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : error ? (
            <div className="p-6 text-center">
              <FiAlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <p className="text-red-600">{error}</p>
              <button
                onClick={handleRefresh}
                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Try Again
              </button>
            </div>
          ) : filteredPayouts.length === 0 ? (
            <div className="p-6 text-center">
              <FiDollarSign className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">
                {payouts.length === 0 ? 'No payouts found' : 'No payouts match your filters'}
              </p>
              <p className="text-sm text-gray-400">
                {payouts.length === 0 
                  ? 'Your payout transactions will appear here' 
                  : 'Try adjusting your search or filter criteria'
                }
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50 dark:bg-gray-800">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Beneficiary
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Account/UPI
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Amount
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Reference ID
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                    {filteredPayouts.map((payout) => (
                      <tr key={payout.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900 dark:text-white">{payout.beneficiary_name || '-'}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900 dark:text-white">
                            {payout.beneficiary_upi || payout.beneficiary_account || '-'}
                          </div>
                          {payout.beneficiary_ifsc && (
                            <div className="text-xs text-gray-500">{payout.beneficiary_ifsc}</div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-semibold text-gray-900 dark:text-white">
                            {formatAmount(payout.amount)}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center space-x-2">
                            {getStatusIcon(payout.status)}
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(payout.status)}`}>
                              {getStatusText(payout.status)}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900 dark:text-white">{payout.reference_id || '-'}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDate(payout.created_at)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {pagination.totalPages > 1 && (
                <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-800">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-700">
                      Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} payouts
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handlePageChange(pagination.page - 1)}
                        disabled={pagination.page <= 1}
                        className="flex items-center px-3 py-2 text-sm font-medium text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <FiChevronLeft className="h-4 w-4 mr-1" />
                        Previous
                      </button>
                      <span className="px-3 py-2 text-sm text-gray-700">
                        Page {pagination.page} of {pagination.totalPages}
                      </span>
                      <button
                        onClick={() => handlePageChange(pagination.page + 1)}
                        disabled={pagination.page >= pagination.totalPages}
                        className="flex items-center px-3 py-2 text-sm font-medium text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Next
                        <FiChevronRight className="h-4 w-4 ml-1" />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </Layout>
  );
}