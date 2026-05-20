'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface WebhookEvent {
  id: number;
  received_at: string;
  source: string;
  utr: string | null;
  google_txn_id: string | null;
  amount: number | null;
  paid_at: string | null;
  signature_valid: boolean;
  matched_txn_id: string | null;
  processed: boolean;
  note: string | null;
  raw_payload: any;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export default function AdminWebhooksPage() {
  const [events, setEvents] = useState<WebhookEvent[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedEvent, setSelectedEvent] = useState<WebhookEvent | null>(null);

  const loadEvents = async (page = 1, status = statusFilter) => {
    setLoading(true);
    setError(null);
    try {
      const query = new URLSearchParams({
        page: String(page),
        limit: '20',
        status,
      });
      const res = await fetch(`/api/admin/webhook-events?${query.toString()}`);
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          window.location.href = '/admin/login';
          return;
        }
        const json = await res.json().catch(() => ({}));
        throw new Error(json?.error || 'Failed to fetch webhook events');
      }
      const json = await res.json();
      setEvents(json.events || []);
      setPagination(json.pagination || null);
      setCurrentPage(page);
    } catch (e: any) {
      setError(e.message || 'Failed to load');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEvents(1, statusFilter);
  }, [statusFilter]);

  const loadDetail = async (id: number) => {
    try {
      const res = await fetch(`/api/admin/webhook-events/${id}`);
      if (!res.ok) throw new Error('Failed to load detail');
      const json = await res.json();
      setSelectedEvent(json.event);
    } catch {
      // Fallback to the row data already loaded
      const fallback = events.find((e) => e.id === id);
      if (fallback) setSelectedEvent(fallback);
    }
  };

  const statusFilters = [
    { key: 'all', label: 'All' },
    { key: 'matched', label: 'Matched' },
    { key: 'unmatched', label: 'Unmatched' },
    { key: 'invalid', label: 'Invalid' },
  ];

  const getStatusBadge = (e: WebhookEvent) => {
    if (e.processed && e.matched_txn_id) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
          ✅ Auto-verified
        </span>
      );
    }
    if (!e.signature_valid) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
          ❌ Invalid Signature
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
        ⚠️ Unmatched
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center space-x-6">
              <Link href="/admin" className="text-xl font-semibold text-gray-900 hover:text-indigo-600">
                ← Admin Dashboard
              </Link>
              <span className="text-gray-300">|</span>
              <h1 className="text-lg font-medium text-gray-700">Webhook Events</h1>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6">
          <h2 className="text-2xl font-semibold text-gray-900">Webhook Events Log</h2>
          <p className="mt-1 text-sm text-gray-500">
            All bank webhook notifications received at <code className="bg-gray-100 px-1 py-0.5 rounded text-xs">/api/webhooks/bank</code>
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-3">
          <div className="flex space-x-2">
            {statusFilters.map((f) => (
              <button
                key={f.key}
                onClick={() => setStatusFilter(f.key)}
                className={`px-4 py-2 text-sm font-medium rounded-lg border transition-colors ${
                  statusFilter === f.key
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                    : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
          <button
            onClick={() => loadEvents(currentPage, statusFilter)}
            className="px-4 py-2 text-sm font-medium bg-white text-indigo-600 border border-indigo-200 rounded-lg hover:bg-indigo-50 transition-colors"
          >
            ↻ Refresh
          </button>
        </div>

        {/* Stats bar */}
        {pagination && (
          <div className="mb-4 text-sm text-gray-500">
            Showing {events.length} of {pagination.total} events · Page {pagination.page} of {pagination.totalPages}
          </div>
        )}

        {/* Content */}
        {loading ? (
          <div className="bg-white shadow rounded-lg p-12 text-center">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600 mx-auto"></div>
            <p className="mt-3 text-gray-500">Loading webhook events...</p>
          </div>
        ) : error ? (
          <div className="bg-white shadow rounded-lg p-8">
            <div className="text-red-600 text-center">
              <p className="text-lg font-medium">Error</p>
              <p className="mt-1 text-sm">{error}</p>
              <button
                onClick={() => loadEvents(1)}
                className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm"
              >
                Retry
              </button>
            </div>
          </div>
        ) : events.length === 0 ? (
          <div className="bg-white shadow rounded-lg p-12 text-center">
            <p className="text-gray-500 text-lg">No webhook events found</p>
            <p className="text-gray-400 text-sm mt-1">Events will appear here once the bank starts sending webhooks.</p>
          </div>
        ) : (
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Received At</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Source</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">UTR</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Matched Order</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Note</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {events.map((e) => (
                    <tr key={e.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 text-sm text-gray-500 font-mono">#{e.id}</td>
                      <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">
                        {new Date(e.received_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">{e.source || '—'}</td>
                      <td className="px-4 py-3 text-sm font-mono text-gray-900">{e.utr || '—'}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {e.amount != null ? `₹${Number(e.amount).toFixed(2)}` : '—'}
                      </td>
                      <td className="px-4 py-3 text-sm">{getStatusBadge(e)}</td>
                      <td className="px-4 py-3 text-sm font-mono text-indigo-600">
                        {e.matched_txn_id || '—'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500 max-w-xs truncate" title={e.note || ''}>
                        {e.note || '—'}
                      </td>
                      <td className="px-4 py-3 text-right text-sm">
                        <button
                          onClick={() => loadDetail(e.id)}
                          className="text-indigo-600 hover:text-indigo-900 font-medium"
                        >
                          View JSON
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {pagination && pagination.totalPages > 1 && (
              <div className="px-4 py-3 border-t bg-gray-50 flex items-center justify-between">
                <button
                  onClick={() => loadEvents(currentPage - 1)}
                  disabled={!pagination.hasPrev}
                  className="px-3 py-1.5 text-sm font-medium bg-white border border-gray-300 rounded-md disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
                >
                  ← Previous
                </button>
                <span className="text-sm text-gray-600">
                  Page {pagination.page} of {pagination.totalPages}
                </span>
                <button
                  onClick={() => loadEvents(currentPage + 1)}
                  disabled={!pagination.hasNext}
                  className="px-3 py-1.5 text-sm font-medium bg-white border border-gray-300 rounded-md disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
                >
                  Next →
                </button>
              </div>
            )}
          </div>
        )}
      </main>

      {/* JSON Detail Modal */}
      {selectedEvent && (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-60 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b flex justify-between items-center bg-gray-50">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Webhook Event #{selectedEvent.id}</h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Received: {new Date(selectedEvent.received_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
                  {selectedEvent.utr && <> · UTR: <span className="font-mono">{selectedEvent.utr}</span></>}
                </p>
              </div>
              <button
                onClick={() => setSelectedEvent(null)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Summary row */}
            <div className="px-6 py-3 border-b grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
              <div>
                <span className="text-gray-500 block text-xs">Source</span>
                <span className="font-medium">{selectedEvent.source || '—'}</span>
              </div>
              <div>
                <span className="text-gray-500 block text-xs">Amount</span>
                <span className="font-medium">{selectedEvent.amount != null ? `₹${Number(selectedEvent.amount).toFixed(2)}` : '—'}</span>
              </div>
              <div>
                <span className="text-gray-500 block text-xs">Status</span>
                {getStatusBadge(selectedEvent)}
              </div>
              <div>
                <span className="text-gray-500 block text-xs">Matched Order</span>
                <span className="font-mono text-sm">{selectedEvent.matched_txn_id || '—'}</span>
              </div>
            </div>

            {/* Raw JSON */}
            <div className="px-6 py-4 overflow-y-auto flex-1">
              <p className="text-xs text-gray-500 mb-2 font-medium uppercase tracking-wider">Raw Payload</p>
              <pre className="text-xs text-gray-800 whitespace-pre-wrap break-all bg-gray-100 p-4 rounded-lg border font-mono leading-relaxed">
                {typeof selectedEvent.raw_payload === 'string'
                  ? (() => { try { return JSON.stringify(JSON.parse(selectedEvent.raw_payload), null, 2); } catch { return selectedEvent.raw_payload; } })()
                  : JSON.stringify(selectedEvent.raw_payload, null, 2)}
              </pre>
            </div>

            <div className="px-6 py-3 border-t bg-gray-50 flex justify-end">
              <button
                onClick={() => setSelectedEvent(null)}
                className="bg-white border border-gray-300 rounded-lg shadow-sm px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
