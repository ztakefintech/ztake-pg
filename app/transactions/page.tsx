'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/context';
import { useRouter } from 'next/navigation';
import Layout from '@/components/Layout';
import { FiRefreshCw, FiChevronLeft, FiChevronRight, FiDollarSign, FiClock, FiCheckCircle, FiXCircle, FiAlertCircle } from 'react-icons/fi';

interface Transaction {
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
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface StatusCounts {
  Succeeded: number;
  Pending: number;
  Failed: number;
}

interface CheckedSummary {
  checkedCount: number;
}

export default function TransactionsPage() {
  const { vendor, token, isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [statusCounts, setStatusCounts] = useState<StatusCounts>({ Succeeded: 0, Pending: 0, Failed: 0 });
  const [checkedCount, setCheckedCount] = useState<number>(0);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, authLoading, router]);

  // Fetch transactions
  const fetchTransactions = async (page = 1) => {
    if (!isAuthenticated || !token) return;

    setIsLoading(true);
    setError('');

    try {
      const response = await fetch(`/api/vendor/payments?page=${page}&limit=${pagination.limit}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const rawText = await response.text();
      let data: any = null;
      try {
        data = rawText ? JSON.parse(rawText) : null;
      } catch {
        data = null;
      }

      if (response.ok) {
        setTransactions(data?.payments || []);
        setPagination(data?.pagination || { page, limit: pagination.limit, total: 0, totalPages: 0 });
        if (data?.statusCounts) {
          setStatusCounts({
            Succeeded: data.statusCounts.Succeeded || 0,
            Pending: data.statusCounts.Pending || 0,
            Failed: data.statusCounts.Failed || 0
          });
        } else {
          setStatusCounts({ Succeeded: 0, Pending: 0, Failed: 0 });
        }
        setCheckedCount(typeof data?.checkedCount === 'number' ? data.checkedCount : 0);
      } else {
        const message = data?.error || rawText || 'Failed to fetch transactions';
        setError(`${message} (HTTP ${response.status})`);
      }
    } catch (err: any) {
      setError(`Network error. Please try again. ${err?.message ? `(${err.message})` : ''}`.trim());
      console.error('Error fetching transactions:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Load transactions on component mount and when page changes
  useEffect(() => {
    if (isAuthenticated && token) {
      fetchTransactions(pagination.page);
    }
  }, [isAuthenticated, token, pagination.page]);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      setPagination(prev => ({ ...prev, page: newPage }));
    }
  };

  const handleRefresh = () => {
    fetchTransactions(pagination.page);
  };

  // Filter transactions based on search term and status
  const filteredTransactions = transactions.filter(transaction => {
    const matchesSearch = searchTerm === '' || 
      transaction.utr.toLowerCase().includes(searchTerm.toLowerCase()) ||
      transaction.amount.toString().includes(searchTerm);
    
    const matchesStatus = statusFilter === 'all' || transaction.payment_status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const getStatusIcon = (status: string, paymentStatus: string) => {
    if (paymentStatus === 'Succeeded') {
      return <FiCheckCircle className="text-green-500" />;
    } else if (paymentStatus === 'Failed') {
      return <FiXCircle className="text-red-500" />;
    } else {
      return <FiClock className="text-yellow-500" />;
    }
  };

  const getStatusColor = (status: string, paymentStatus: string) => {
    if (paymentStatus === 'Succeeded') {
      return 'bg-green-100 text-green-800';
    } else if (paymentStatus === 'Failed') {
      return 'bg-red-100 text-red-800';
    } else {
      return 'bg-yellow-100 text-yellow-800';
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
              <h1 className="text-2xl font-bold text-gray-900">Transaction History</h1>
              <p className="text-gray-600">View all your payment transactions</p>
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
                Search Transactions
              </label>
              <input
                type="text"
                id="search"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by UTR or amount..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Status</option>
                <option value="Succeeded">Succeeded</option>
                <option value="Pending">Pending</option>
                <option value="Failed">Failed</option>
              </select>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <FiCheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Successful</p>
                <p className="text-2xl font-bold text-gray-900">
                  {statusCounts.Succeeded}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <FiClock className="h-6 w-6 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Pending</p>
                <p className="text-2xl font-bold text-gray-900">
                  {statusCounts.Pending}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center">
              <div className="p-2 bg-red-100 rounded-lg">
                <FiXCircle className="h-6 w-6 text-red-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Failed</p>
                <p className="text-2xl font-bold text-gray-900">
                  {statusCounts.Failed}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <FiCheckCircle className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Checked</p>
                <p className="text-2xl font-bold text-gray-900">
                  {checkedCount}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Transactions Table */}
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">All Transactions</h2>
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
          ) : filteredTransactions.length === 0 ? (
            <div className="p-6 text-center">
              <FiDollarSign className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">
                {transactions.length === 0 ? 'No transactions found' : 'No transactions match your filters'}
              </p>
              <p className="text-sm text-gray-400">
                {transactions.length === 0 
                  ? 'Your payment transactions will appear here' 
                  : 'Try adjusting your search or filter criteria'
                }
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Order ID
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        UTR
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Amount
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Checked
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredTransactions.map((transaction) => (
                      <tr key={transaction.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {transaction.order_id || '-'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {transaction.utr}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-semibold text-gray-900">
                            {formatAmount(transaction.amount)}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center space-x-2">
                            {getStatusIcon(transaction.status, transaction.payment_status)}
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(transaction.status, transaction.payment_status)}`}>
                              {transaction.payment_status}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDate(transaction.created_at)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {transaction.checked_status ? (
                            <span className="text-green-600">Yes</span>
                          ) : (
                            <span className="text-gray-400">No</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {pagination.totalPages > 1 && (
                <div className="px-6 py-4 border-t border-gray-200">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-700">
                      Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} results
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handlePageChange(pagination.page - 1)}
                        disabled={pagination.page === 1 || isLoading}
                        className="flex items-center px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <FiChevronLeft className="h-4 w-4" />
                        Previous
                      </button>
                      
                      <div className="flex items-center space-x-1">
                        {(() => {
                          const currentPage = pagination.page;
                          const totalPages = pagination.totalPages;
                          const pages = [];
                          
                          // Always show first page
                          pages.push(
                            <button
                              key={1}
                              onClick={() => handlePageChange(1)}
                              disabled={isLoading}
                              className={`px-3 py-2 text-sm font-medium rounded-lg ${
                                1 === currentPage
                                  ? 'bg-blue-600 text-white'
                                  : 'text-gray-500 bg-white border border-gray-300 hover:bg-gray-50'
                              } disabled:opacity-50 disabled:cursor-not-allowed`}
                            >
                              1
                            </button>
                          );
                          
                          // Add ellipsis if current page is far from start
                          if (currentPage > 4) {
                            pages.push(
                              <span key="ellipsis-start" className="px-2 text-gray-500">
                                ...
                              </span>
                            );
                          }
                          
                          // Show pages around current page
                          const startPage = Math.max(2, currentPage - 1);
                          const endPage = Math.min(totalPages - 1, currentPage + 1);
                          
                          for (let page = startPage; page <= endPage; page++) {
                            if (page !== 1 && page !== totalPages) {
                              pages.push(
                                <button
                                  key={page}
                                  onClick={() => handlePageChange(page)}
                                  disabled={isLoading}
                                  className={`px-3 py-2 text-sm font-medium rounded-lg ${
                                    page === currentPage
                                      ? 'bg-blue-600 text-white'
                                      : 'text-gray-500 bg-white border border-gray-300 hover:bg-gray-50'
                                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                                >
                                  {page}
                                </button>
                              );
                            }
                          }
                          
                          // Add ellipsis if current page is far from end
                          if (currentPage < totalPages - 3) {
                            pages.push(
                              <span key="ellipsis-end" className="px-2 text-gray-500">
                                ...
                              </span>
                            );
                          }
                          
                          // Always show last page (if more than 1 page)
                          if (totalPages > 1) {
                            pages.push(
                              <button
                                key={totalPages}
                                onClick={() => handlePageChange(totalPages)}
                                disabled={isLoading}
                                className={`px-3 py-2 text-sm font-medium rounded-lg ${
                                  totalPages === currentPage
                                    ? 'bg-blue-600 text-white'
                                    : 'text-gray-500 bg-white border border-gray-300 hover:bg-gray-50'
                                } disabled:opacity-50 disabled:cursor-not-allowed`}
                              >
                                {totalPages}
                              </button>
                            );
                          }
                          
                          return pages;
                        })()}
                      </div>

                      <button
                        onClick={() => handlePageChange(pagination.page + 1)}
                        disabled={pagination.page === pagination.totalPages || isLoading}
                        className="flex items-center px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Next
                        <FiChevronRight className="h-4 w-4" />
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
