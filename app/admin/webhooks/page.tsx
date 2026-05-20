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
  payment_type?: string;
  sender_name?: string | null;
  payment_method?: string | null;
  payment_app?: string | null;
  customer_paid?: number | null;
  mdr_gst?: number | null;
  amount_received?: number | null;
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
    { key: 'all', label: 'All Events' },
    { key: 'matched', label: 'Matched' },
    { key: 'unmatched', label: 'Unmatched' },
    { key: 'invalid', label: 'Invalid' },
  ];

  const getStatusBadge = (e: WebhookEvent) => {
    if (e.processed && e.matched_txn_id) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
          ✓ Verified
        </span>
      );
    }
    if (!e.signature_valid) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 border border-rose-200">
          ✕ Bad Signature
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
        ⚠ Unmatched
      </span>
    );
  };

  const getPaymentTypeBadge = (type?: string) => {
    if (type === 'credit') {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-100">
          + CREDIT
        </span>
      );
    }
    if (type === 'debit') {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-rose-50 text-rose-700 border border-rose-100">
          - DEBIT
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-gray-50 text-gray-500 border border-gray-100">
        UNKNOWN
      </span>
    );
  };

  const getPaymentAppBadge = (app?: string | null) => {
    if (!app) return null;
    const lowerApp = app.toLowerCase();
    
    let styleClasses = "bg-slate-50 text-slate-600 border-slate-200";
    if (lowerApp.includes('phonepe')) {
      styleClasses = "bg-purple-50 text-purple-700 border-purple-100";
    } else if (lowerApp.includes('gpay') || lowerApp.includes('google')) {
      styleClasses = "bg-sky-50 text-sky-700 border-sky-100";
    } else if (lowerApp.includes('paytm')) {
      styleClasses = "bg-blue-50 text-blue-700 border-blue-100";
    } else if (lowerApp.includes('phone')) {
      styleClasses = "bg-purple-50 text-purple-700 border-purple-100";
    }
    
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border ${styleClasses}`}>
        {app.toUpperCase()}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50/50">
      {/* Navigation */}
      <nav className="bg-white/80 backdrop-blur-md sticky top-0 z-30 shadow-sm border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center space-x-6">
              <Link href="/admin" className="text-sm font-semibold text-slate-500 hover:text-indigo-600 transition-colors flex items-center gap-1">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Dashboard
              </Link>
              <span className="text-slate-200">|</span>
              <h1 className="text-base font-bold text-slate-800">Webhook Logs</h1>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">Bank Webhook Events</h2>
            <p className="mt-1 text-sm text-slate-500">
              Live updates of incoming GPay Business notifications received at <code className="bg-slate-100 px-1.5 py-0.5 rounded text-indigo-600 font-mono text-xs">/api/webhooks/bank</code>
            </p>
          </div>
          <button
            onClick={() => loadEvents(currentPage, statusFilter)}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold bg-indigo-600 text-white rounded-xl shadow-sm shadow-indigo-100 hover:bg-indigo-700 hover:shadow-indigo-200 active:scale-95 transition-all cursor-pointer"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 8H17" />
            </svg>
            Refresh Logs
          </button>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl border border-slate-100 p-4 mb-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex flex-wrap gap-2">
            {statusFilters.map((f) => (
              <button
                key={f.key}
                onClick={() => setStatusFilter(f.key)}
                className={`px-4 py-2 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                  statusFilter === f.key
                    ? 'bg-slate-900 text-white border-slate-900 shadow-sm shadow-slate-200'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
          {pagination && (
            <div className="text-xs font-semibold text-slate-400">
              Showing {events.length} of {pagination.total} events
            </div>
          )}
        </div>

        {/* Content */}
        {loading ? (
          <div className="bg-white border border-slate-100 shadow-sm rounded-2xl p-16 text-center">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600 mx-auto"></div>
            <p className="mt-4 text-slate-500 font-semibold text-sm">Fetching webhook streams...</p>
          </div>
        ) : error ? (
          <div className="bg-white border border-slate-150 shadow-sm rounded-2xl p-12 text-center">
            <div className="text-rose-600">
              <p className="text-lg font-bold">Failed to load</p>
              <p className="mt-1 text-sm text-slate-500">{error}</p>
              <button
                onClick={() => loadEvents(1)}
                className="mt-6 px-5 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-xl shadow hover:bg-indigo-700 transition-colors"
              >
                Retry Request
              </button>
            </div>
          </div>
        ) : events.length === 0 ? (
          <div className="bg-white border border-slate-100 shadow-sm rounded-2xl p-16 text-center">
            <div className="w-16 h-16 bg-slate-50 border border-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="h-8 w-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <p className="text-slate-800 font-bold text-lg">No Webhook Events Found</p>
            <p className="text-slate-400 text-sm mt-1 max-w-sm mx-auto">Events will appear live once GPay Business starts posting notifications to your endpoint.</p>
          </div>
        ) : (
          <div className="bg-white border border-slate-100 shadow-sm rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-100">
                <thead className="bg-slate-50/50">
                  <tr>
                    <th className="px-4 py-3.5 text-left text-[10px] font-bold text-slate-400 uppercase tracking-wider">ID</th>
                    <th className="px-4 py-3.5 text-left text-[10px] font-bold text-slate-400 uppercase tracking-wider">Received At</th>
                    <th className="px-4 py-3.5 text-left text-[10px] font-bold text-slate-400 uppercase tracking-wider">Type</th>
                    <th className="px-4 py-3.5 text-left text-[10px] font-bold text-slate-400 uppercase tracking-wider">Sender & UTR</th>
                    <th className="px-4 py-3.5 text-left text-[10px] font-bold text-slate-400 uppercase tracking-wider">Amount Details</th>
                    <th className="px-4 py-3.5 text-left text-[10px] font-bold text-slate-400 uppercase tracking-wider">App / Method</th>
                    <th className="px-4 py-3.5 text-left text-[10px] font-bold text-slate-400 uppercase tracking-wider">Status</th>
                    <th className="px-4 py-3.5 text-left text-[10px] font-bold text-slate-400 uppercase tracking-wider">Matched Txn</th>
                    <th className="px-4 py-3.5"></th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-100">
                  {events.map((e) => (
                    <tr key={e.id} className="hover:bg-slate-50/30 transition-colors">
                      <td className="px-4 py-4 text-xs font-semibold text-slate-400 font-mono">#{e.id}</td>
                      <td className="px-4 py-4 text-xs text-slate-800 whitespace-nowrap">
                        <div className="font-semibold">{new Date(e.received_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Kolkata' })}</div>
                        <div className="text-[10px] text-slate-400 font-mono mt-0.5">{e.source || 'GPay'}</div>
                      </td>
                      <td className="px-4 py-4 text-xs whitespace-nowrap">
                        {getPaymentTypeBadge(e.payment_type)}
                      </td>
                      <td className="px-4 py-4 text-xs">
                        <div className="font-bold text-slate-900 truncate max-w-[150px]" title={e.sender_name || 'Sender'}>
                          {e.sender_name || 'Anonymous'}
                        </div>
                        <div className="text-[10px] font-mono text-slate-400 mt-0.5 font-medium select-all" title="UTR ID">
                          {e.utr || '—'}
                        </div>
                      </td>
                      <td className="px-4 py-4 text-xs whitespace-nowrap">
                        <div className="font-extrabold text-slate-900">
                          {e.amount != null ? `₹${Number(e.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—'}
                        </div>
                        {e.mdr_gst != null && e.mdr_gst > 0 && (
                          <div className="text-[10px] text-rose-500 font-bold mt-0.5">
                            Fee: -₹{Number(e.mdr_gst).toFixed(2)}
                          </div>
                        )}
                        {e.amount_received != null && e.amount_received !== e.amount && (
                          <div className="text-[9px] text-slate-400 font-semibold mt-0.5">
                            Net: ₹{Number(e.amount_received).toFixed(2)}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-4 text-xs whitespace-nowrap">
                        <div className="flex flex-col items-start gap-1">
                          {getPaymentAppBadge(e.payment_app) || <span className="text-slate-400">—</span>}
                          {e.payment_method && (
                            <span className="text-[9px] font-bold text-slate-400 flex items-center gap-0.5">
                              💳 {e.payment_method.toUpperCase()}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4 text-xs whitespace-nowrap">{getStatusBadge(e)}</td>
                      <td className="px-4 py-4 text-xs font-mono text-indigo-600 whitespace-nowrap font-bold">
                        {e.matched_txn_id ? (
                          <span className="bg-indigo-50/50 border border-indigo-100/50 px-2 py-0.5 rounded select-all hover:bg-indigo-100/50 transition-colors">
                            {e.matched_txn_id.substring(0, 10)}...
                          </span>
                        ) : (
                          <span className="text-slate-300 font-semibold">—</span>
                        )}
                      </td>
                      <td className="px-4 py-4 text-right whitespace-nowrap text-xs">
                        <button
                          onClick={() => loadDetail(e.id)}
                          className="bg-indigo-50 border border-indigo-100 hover:bg-indigo-100 hover:text-indigo-700 text-indigo-600 font-bold px-3 py-1.5 rounded-lg active:scale-95 transition-all cursor-pointer"
                        >
                          View Payload
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {pagination && pagination.totalPages > 1 && (
              <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
                <button
                  onClick={() => loadEvents(currentPage - 1)}
                  disabled={!pagination.hasPrev}
                  className="px-4 py-2 text-xs font-bold text-slate-600 bg-white border border-slate-200 rounded-xl disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  ← Prev Page
                </button>
                <span className="text-xs font-bold text-slate-500">
                  Page {pagination.page} of {pagination.totalPages}
                </span>
                <button
                  onClick={() => loadEvents(currentPage + 1)}
                  disabled={!pagination.hasNext}
                  className="px-4 py-2 text-xs font-bold text-slate-600 bg-white border border-slate-200 rounded-xl disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Next Page →
                </button>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Detail Modal */}
      {selectedEvent && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 transition-opacity">
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[92vh] overflow-hidden flex flex-col border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Webhook Event Details</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  ID: <span className="font-mono font-semibold">#{selectedEvent.id}</span> · Received: {new Date(selectedEvent.received_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
                </p>
              </div>
              <button
                onClick={() => setSelectedEvent(null)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Body */}
            <div className="overflow-y-auto flex-1 p-6 space-y-6">
              {/* Status Banner */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 rounded-xl bg-slate-50 border border-slate-100 gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-slate-500">Status:</span>
                  {getStatusBadge(selectedEvent)}
                </div>
                {selectedEvent.matched_txn_id && (
                  <div className="text-sm font-medium text-slate-500">
                    Matched Order: <span className="font-mono text-indigo-600 font-semibold bg-indigo-50 px-2 py-1 rounded border border-indigo-100 select-all">{selectedEvent.matched_txn_id}</span>
                  </div>
                )}
              </div>

              {/* Grid: Extracted Metadata & Financials */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Left: Metadata */}
                <div className="space-y-4">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Payment Metadata</h4>
                  
                  <div className="bg-white rounded-xl border border-slate-100 p-4 space-y-3 shadow-sm">
                    <div className="flex justify-between items-center py-1.5 border-b border-slate-50">
                      <span className="text-xs text-slate-500">Sender Name</span>
                      <span className="text-xs font-bold text-slate-900">{selectedEvent.sender_name || '—'}</span>
                    </div>
                    <div className="flex justify-between items-center py-1.5 border-b border-slate-50">
                      <span className="text-xs text-slate-500">UPI Transaction ID (UTR)</span>
                      <span className="text-xs font-mono font-bold text-slate-900 select-all">{selectedEvent.utr || '—'}</span>
                    </div>
                    <div className="flex justify-between items-center py-1.5 border-b border-slate-50">
                      <span className="text-xs text-slate-500">Google Transaction ID</span>
                      <span className="text-xs font-mono font-bold text-slate-900 select-all">{selectedEvent.google_txn_id || '—'}</span>
                    </div>
                    <div className="flex justify-between items-center py-1.5 border-b border-slate-50">
                      <span className="text-xs text-slate-500">Payment App</span>
                      <span>{getPaymentAppBadge(selectedEvent.payment_app) || '—'}</span>
                    </div>
                    <div className="flex justify-between items-center py-1.5">
                      <span className="text-xs text-slate-500">Payment Method</span>
                      <span className="text-xs font-bold text-slate-800">{selectedEvent.payment_method || '—'}</span>
                    </div>
                  </div>
                </div>

                {/* Right: Financial Details */}
                <div className="space-y-4">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Financial Ledger</h4>

                  <div className="bg-white rounded-xl border border-slate-100 p-4 space-y-3 shadow-sm">
                    <div className="flex justify-between items-center py-1.5 border-b border-slate-50">
                      <span className="text-xs text-slate-500">Transaction Type</span>
                      <span>{getPaymentTypeBadge(selectedEvent.payment_type)}</span>
                    </div>
                    <div className="flex justify-between items-center py-1.5 border-b border-slate-50">
                      <span className="text-xs text-slate-500">Customer Paid</span>
                      <span className="text-xs font-extrabold text-slate-900">
                        {selectedEvent.customer_paid != null ? `₹${Number(selectedEvent.customer_paid).toFixed(2)}` : (selectedEvent.amount != null ? `₹${Number(selectedEvent.amount).toFixed(2)}` : '—')}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-1.5 border-b border-slate-50">
                      <span className="text-xs text-slate-500">MDR + GST Fees</span>
                      <span className="text-xs font-bold text-rose-500">
                        {selectedEvent.mdr_gst != null ? `-₹${Number(selectedEvent.mdr_gst).toFixed(2)}` : '₹0.00'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-1.5 bg-emerald-50/50 p-2 rounded-lg border border-emerald-100/50">
                      <span className="text-xs font-bold text-emerald-800">Amount Received</span>
                      <span className="text-sm font-extrabold text-emerald-600">
                        {selectedEvent.amount_received != null ? `₹${Number(selectedEvent.amount_received).toFixed(2)}` : (selectedEvent.amount != null ? `₹${Number(selectedEvent.amount).toFixed(2)}` : '—')}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Notes Section if exists */}
              {selectedEvent.note && (
                <div className="p-3 bg-amber-50/50 border border-amber-100 rounded-xl">
                  <span className="text-[10px] font-bold text-amber-800 uppercase block mb-0.5">Note Log</span>
                  <p className="text-xs text-amber-700 font-semibold">{selectedEvent.note}</p>
                </div>
              )}

              {/* Raw JSON Payload */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Raw Webhook JSON Payload</h4>
                <div className="relative">
                  <pre className="text-xs text-slate-800 whitespace-pre-wrap break-all bg-slate-95 p-4 rounded-xl border border-slate-100 font-mono leading-relaxed max-h-[250px] overflow-y-auto">
                    {typeof selectedEvent.raw_payload === 'string'
                      ? (() => { try { return JSON.stringify(JSON.parse(selectedEvent.raw_payload), null, 2); } catch { return selectedEvent.raw_payload; } })()
                      : JSON.stringify(selectedEvent.raw_payload, null, 2)}
                  </pre>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end">
              <button
                onClick={() => setSelectedEvent(null)}
                className="bg-white border border-slate-300 rounded-xl shadow-sm px-5 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 hover:border-slate-400 transition-all cursor-pointer"
              >
                Close details
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
