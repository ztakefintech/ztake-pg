'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useAuth } from '@/lib/context';
import { useRouter } from 'next/navigation';
import Layout from '@/components/Layout';
import { FiRefreshCw, FiChevronLeft, FiChevronRight, FiDollarSign, FiClock, FiCheckCircle, FiXCircle, FiAlertCircle } from 'react-icons/fi';

interface Transaction {
  id: number;
  ztake_order_id?: string | null;
  merchant_order_id?: string | null;
  utr?: string | null;
  amount: number;
  currency?: string;
  customer_name?: string;
  status: string;
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
  Success: number;
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
  const [statusCounts, setStatusCounts] = useState<StatusCounts>({ Success: 0, Pending: 0, Failed: 0 });
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
  const fetchTransactions = async (page = 1, signal?: AbortSignal) => {
    if (!isAuthenticated || !token) return;

    setIsLoading(true);
    setError('');

    try {
      const response = await fetch(`/api/vendor/payments?page=${page}&limit=${pagination.limit}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        },
        signal,
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
            Success: data.statusCounts.Success || 0,
            Pending: data.statusCounts.Pending || 0,
            Failed: data.statusCounts.Failed || 0
          });
        } else {
          setStatusCounts({ Success: 0, Pending: 0, Failed: 0 });
        }
        setCheckedCount(typeof data?.checkedCount === 'number' ? data.checkedCount : 0);
        
        console.log('API Response:', {
          paymentsCount: data?.payments?.length || 0,
          statusCounts: data?.statusCounts,
          pagination: data?.pagination,
          payments: data?.payments?.map((p: Transaction) => ({
            id: p.id,
            ztake_order_id: p.ztake_order_id,
            utr: p.utr,
            status: p.status,
            amount: p.amount,
            currency: p.currency
          }))
        });
      } else {
        const message = data?.error || rawText || 'Failed to fetch transactions';
        setError(`${message} (HTTP ${response.status})`);
      }
    } catch (err: any) {
      if (err?.name !== 'AbortError') {
        setError(`Network error. Please try again. ${err?.message ? `(${err.message})` : ''}`.trim());
        console.error('Error fetching transactions:', err);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Load transactions on component mount and when page changes
  useEffect(() => {
    if (isAuthenticated && token) {
      const controller = new AbortController();
      fetchTransactions(pagination.page, controller.signal);
      return () => controller.abort();
    }
  }, [isAuthenticated, token, pagination.page]);

  const handlePageChange = useCallback((newPage: number) => {
    setPagination(prev => {
      if (newPage >= 1 && newPage <= prev.totalPages) {
        return { ...prev, page: newPage };
      }
      return prev;
    });
  }, []);

  const handleRefresh = useCallback(() => {
    fetchTransactions(pagination.page);
  }, [pagination.page]);

  // Debounced search — delays filtering by 300ms to reduce re-renders
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSearchChange = useCallback((value: string) => {
    setSearchTerm(value);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      setDebouncedSearch(value);
    }, 300);
  }, []);

  // Clean up debounce timer on unmount
  useEffect(() => {
    return () => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    };
  }, []);

  // Filter transactions based on search term and status — memoized
  const filteredTransactions = useMemo(() => {
    return transactions.filter(transaction => {
      const matchesSearch = debouncedSearch === '' || 
        (transaction.utr && transaction.utr.toLowerCase().includes(debouncedSearch.toLowerCase())) ||
        transaction.amount.toString().includes(debouncedSearch) ||
        (transaction.ztake_order_id && transaction.ztake_order_id.toLowerCase().includes(debouncedSearch.toLowerCase()));
      
      const matchesStatus = statusFilter === 'all' || 
        (statusFilter === 'Success' && (transaction.status === 'Succeeded' || transaction.status === 'SUCCEEDED' || transaction.status === 'completed')) ||
        (statusFilter === 'Pending' && (transaction.status === 'Pending' || transaction.status === 'PENDING' || transaction.status === 'created')) ||
        (statusFilter === 'Failed' && (transaction.status === 'Failed' || transaction.status === 'FAILED' || transaction.status === 'rejected'));
      
      return matchesSearch && matchesStatus;
    });
  }, [transactions, debouncedSearch, statusFilter]);

  const getStatusIcon = (status: string) => {
    if (status === 'Succeeded' || status === 'SUCCEEDED' || status === 'completed') {
      return <FiCheckCircle className="text-green-500" />;
    } else if (status === 'Failed' || status === 'FAILED' || status === 'rejected') {
      return <FiXCircle className="text-red-500" />;
    } else {
      return <FiClock className="text-yellow-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    if (status === 'Succeeded' || status === 'SUCCEEDED' || status === 'completed') {
      return 'bg-green-100 text-green-800';
    } else if (status === 'Failed' || status === 'FAILED' || status === 'rejected') {
      return 'bg-red-100 text-red-800';
    } else {
      return 'bg-yellow-100 text-yellow-800';
    }
  };

  const getStatusText = (status: string) => {
    if (status === 'Succeeded' || status === 'SUCCEEDED' || status === 'completed') {
      return 'Success';
    } else if (status === 'Failed' || status === 'FAILED' || status === 'rejected') {
      return 'Failed';
    } else {
      return 'Pending';
    }
  };

  const formatDate = useCallback((dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }, []);

  const formatAmount = useCallback((amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount);
  }, []);

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
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Transaction History</h1>
              <p className="text-gray-600 dark:text-gray-400">View all your payment transactions</p>
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
        <div className="bg-white dark:bg-gray-900 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-2">
                Search Transactions
              </label>
              <input
                type="text"
                id="search"
                value={searchTerm}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder="Search by UTR or amount..."
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
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
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

          <div className="bg-white dark:bg-gray-900 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <FiCheckCircle className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Checked</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {checkedCount}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Transactions Table */}
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">All Transactions</h2>
          </div>

          {isLoading ? (
            <div className="space-y-2 animate-pulse p-6">
              {/* Table header skeleton */}
              <div className="h-10 rounded-lg" style={{ background: 'rgba(255,255,255,0.04)' }} />
              {/* Table row skeletons */}
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-14 rounded-lg" style={{ background: 'rgba(255,255,255,0.03)' }} />
              ))}
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
                  <thead className="bg-gray-50 dark:bg-gray-800">
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
                  <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                    {filteredTransactions.map((transaction) => (
                      <tr key={transaction.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900 dark:text-white">
                            {transaction.ztake_order_id || '-'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {transaction.utr || '-'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-semibold text-gray-900 dark:text-white">
                            {transaction.currency || '₹'} {formatAmount(transaction.amount)}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center space-x-2">
                            {getStatusIcon(transaction.status)}
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(transaction.status)}`}>
                              {getStatusText(transaction.status)}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDate(transaction.created_at)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {transaction.status === 'Succeeded' || transaction.status === 'SUCCEEDED' || transaction.status === 'completed' ? (
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
                <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-800">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-700">
                      Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} results
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handlePageChange(pagination.page - 1)}
                        disabled={pagination.page === 1 || isLoading}
                        className="flex items-center px-3 py-2 text-sm font-medium text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
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
                                  : 'text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 hover:bg-gray-50'
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
                                      : 'text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 hover:bg-gray-50'
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
                                    : 'text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 hover:bg-gray-50'
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
                        className="flex items-center px-3 py-2 text-sm font-medium text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
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
