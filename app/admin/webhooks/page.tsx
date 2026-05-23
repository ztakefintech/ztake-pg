'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { parseBankWebhookPayload } from '@/lib/webhooks/parse-bank-payload';
import { io, Socket } from 'socket.io-client';
import { useTheme } from 'next-themes';
import { FiSun, FiMoon } from 'react-icons/fi';

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
  request_ip?: string | null;
  user_agent?: string | null;
  content_type?: string | null;
  request_headers?: any;
  request_method?: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

function enhanceEventWithParsedData(e: WebhookEvent): WebhookEvent {
  if (!e) return e;
  
  let payloadObj = e.raw_payload;
  if (typeof payloadObj === 'string') {
    try {
      payloadObj = JSON.parse(payloadObj);
    } catch {
      payloadObj = {};
    }
  }

  const parsed = parseBankWebhookPayload(payloadObj || {});

  const safeParseNum = (val: any): number | null => {
    if (val == null) return null;
    if (typeof val === 'number') return isNaN(val) ? null : val;
    const clean = String(val).replace(/[+\-\s₹,]/g, '').trim();
    const parsedVal = parseFloat(clean);
    return isNaN(parsedVal) ? null : parsedVal;
  };

  const finalAmount = safeParseNum(e.amount) ?? safeParseNum(parsed.amount);
  const finalCustomerPaid = safeParseNum(e.customer_paid) ?? safeParseNum(parsed.customer_paid);
  const finalMdrGst = safeParseNum(e.mdr_gst) ?? safeParseNum(parsed.mdr_gst);
  const finalAmountReceived = safeParseNum(e.amount_received) ?? safeParseNum(parsed.amount_received);

  return {
    ...e,
    utr: e.utr || parsed.utr,
    google_txn_id: e.google_txn_id || parsed.google_txn_id,
    amount: finalAmount,
    payment_type: e.payment_type && e.payment_type !== 'unknown' ? e.payment_type : parsed.payment_type,
    sender_name: e.sender_name || parsed.sender_name,
    payment_method: e.payment_method || parsed.payment_method,
    payment_app: e.payment_app || parsed.payment_app,
    customer_paid: finalCustomerPaid,
    mdr_gst: finalMdrGst,
    amount_received: finalAmountReceived,
  };
}

export default function AdminWebhooksPage() {
  const [events, setEvents] = useState<WebhookEvent[]>([]);
  const [mounted, setMounted] = useState(false);
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    setMounted(true);
  }, []);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedEvent, setSelectedEvent] = useState<WebhookEvent | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());
  const [copySuccess, setCopySuccess] = useState(false);
  const [taskerWebhookKey, setTaskerWebhookKey] = useState('5ac5024706c3e5c81d6fc5437452469f897177637c35aa129ee3ead3f1bd9fa8');
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Terminal Logs State
  const [logs, setLogs] = useState<{timestamp: string, message: string, type: string}[]>([]);
  const [socketConnected, setSocketConnected] = useState(false);
  const logEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    // Connect to Webhook Express Server
    const webhookUrl = process.env.NEXT_PUBLIC_WEBHOOK_URL || 'http://localhost:3001';
    const socket: Socket = io(webhookUrl);
    
    socket.on('connect', () => {
      setSocketConnected(true);
      setLogs(prev => [...prev, { timestamp: new Date().toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' }), message: 'Connected to Webhook Ingestion Server Terminal.', type: 'success' }]);
    });

    socket.on('disconnect', () => {
      setSocketConnected(false);
      setLogs(prev => [...prev, { timestamp: new Date().toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' }), message: 'Disconnected from server.', type: 'error' }]);
    });

    socket.on('system_log', (logObj) => {
      setLogs(prev => [...prev, logObj].slice(-100)); // Keep last 100 logs
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  useEffect(() => {
    if (logEndRef.current) {
      logEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  // Simulation State
  const [showTestModal, setShowTestModal] = useState(false);
  const [testAmount, setTestAmount] = useState('10.00');
  const [testUtr, setTestUtr] = useState('');
  const [testSender, setTestSender] = useState('TEST USER');
  const [sendingTest, setSendingTest] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const loadEvents = useCallback(async (page = 1, status = statusFilter, silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      const query = new URLSearchParams({
        page: String(page),
        limit: '10', // Optimized from 20 to 10 items per page
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
      const enhancedEvents = (json.events || []).map(enhanceEventWithParsedData);
      setEvents(enhancedEvents);
      if (json.taskerWebhookKey) {
        setTaskerWebhookKey(json.taskerWebhookKey);
      }
      setPagination(json.pagination || null);
      setCurrentPage(page);
      setLastRefreshed(new Date());
    } catch (e: any) {
      if (!silent) setError(e.message || 'Failed to load');
    } finally {
      if (!silent) setLoading(false);
    }
  }, [statusFilter]);

  // Initial load
  useEffect(() => {
    loadEvents(1, statusFilter);
  }, [statusFilter]);

  // Auto-refresh polling — optimized from 5000ms to 10000ms (reduced API calls by 50%)
  useEffect(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (autoRefresh) {
      intervalRef.current = setInterval(() => {
        loadEvents(currentPage, statusFilter, true);
      }, 2000); // Polling every 2s for live updates
    }
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [autoRefresh, currentPage, statusFilter, loadEvents]);

  const loadDetail = async (id: number) => {
    try {
      const res = await fetch(`/api/admin/webhook-events/${id}`);
      if (!res.ok) throw new Error('Failed to load detail');
      const json = await res.json();
      setSelectedEvent(enhanceEventWithParsedData(json.event));
    } catch {
      const fallback = events.find((e) => e.id === id);
      if (fallback) setSelectedEvent(enhanceEventWithParsedData(fallback));
    }
  };

  const handleCopyPayload = async (payload: any) => {
    try {
      const text = typeof payload === 'string'
        ? (() => { try { return JSON.stringify(JSON.parse(payload), null, 2); } catch { return payload; } })()
        : JSON.stringify(payload, null, 2);
      await navigator.clipboard.writeText(text);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch {
      // Fallback
    }
  };

  const handleSendTestWebhook = async () => {
    setSendingTest(true);
    setTestResult(null);
    try {
      const finalUtr = testUtr.trim() || Math.floor(100000000000 + Math.random() * 900000000000).toString();
      
      const payload = {
        amount: `+ ₹${testAmount}`,
        time: new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
        raw_screen: `Google Pay Business|Received from ${testSender}|₹${testAmount}|UTR: ${finalUtr}`,
        source: 'gpay_business',
        timestamp: Math.floor(Date.now() / 1000).toString()
      };

      const res = await fetch('/api/webhooks/bank', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-webhook-signature': 'debug-test'
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${await res.text()}`);
      }

      const data = await res.json();
      setTestResult({
        success: true,
        message: `Simulated webhook event dispatched successfully! Status: ${data.status || 'logged'}. Generated UTR: ${finalUtr}`
      });
      
      // Refresh list to show new event immediately
      setTimeout(() => loadEvents(1), 500);
    } catch (e: any) {
      setTestResult({
        success: false,
        message: `Failed to dispatch simulation: ${e.message}`
      });
    } finally {
      setSendingTest(false);
    }
  };

  const statusFilters = [
    { key: 'all', label: 'All Events', icon: '📋' },
    { key: 'matched', label: 'Matched', icon: '✓' },
    { key: 'unmatched', label: 'Unmatched', icon: '⚠' },
    { key: 'invalid', label: 'Invalid', icon: '✕' },
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

  const formatTimestamp = (ts: string) => {
    try {
      return new Date(ts).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'medium', timeZone: 'Asia/Kolkata' });
    } catch {
      return ts;
    }
  };

  return (
    <div className="min-h-screen bg-glass-page text-zinc-900 dark:text-zinc-50">
      {/* Navigation */}
      <nav className="bg-white/80 dark:bg-black/80 backdrop-blur-md sticky top-0 z-30 shadow-sm border-b border-zinc-200 dark:border-zinc-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center space-x-6">
              <Link href="/admin" className="text-sm font-semibold text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white transition-colors flex items-center gap-1">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Dashboard
              </Link>
              <span className="text-zinc-200 dark:text-zinc-800">|</span>
              <h1 className="text-base font-bold text-zinc-800 dark:text-zinc-200">Webhook Events</h1>
            </div>
            {/* Live Indicator */}
            <div className="flex items-center gap-3">
              {/* Theme Toggle */}
              {mounted && (
                <button
                  onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                  className="glass-button-secondary flex items-center justify-center"
                  style={{ width: '36px', height: '36px', padding: 0, borderRadius: 'var(--radius-md)', animation: 'none' }}
                  title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
                >
                  {theme === 'dark' ? (
                    <FiSun className="w-4 h-4" style={{ color: 'var(--layout-text-secondary)' }} />
                  ) : (
                    <FiMoon className="w-4 h-4" style={{ color: 'var(--layout-text-secondary)' }} />
                  )}
                </button>
              )}
              <button
                onClick={() => setAutoRefresh(!autoRefresh)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                  autoRefresh
                    ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 border border-emerald-200/50 dark:border-emerald-800/30'
                    : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700'
                }`}
              >
                {autoRefresh && (
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                )}
                {autoRefresh ? 'LIVE' : 'PAUSED'}
              </button>
              <span className="text-[10px] text-zinc-400 dark:text-zinc-500 hidden sm:inline">
                {lastRefreshed.toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' })}
              </span>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h2 className="text-2xl font-extrabold text-zinc-900 dark:text-white tracking-tight">Webhook Events</h2>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              Live stream of incoming GPay Business / Tasker / external webhook notifications
            </p>
          </div>
          <button
            onClick={() => loadEvents(currentPage, statusFilter)}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-xl shadow-md hover:bg-zinc-800 dark:hover:bg-zinc-200 active:scale-95 transition-all cursor-pointer"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 8H17" />
            </svg>
            Refresh Logs
          </button>
        </div>

        {/* Diagnostic Panel */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800/60 p-6 mb-6 shadow-sm rounded-2xl">
          <div className="flex flex-col gap-5">
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">Webhook Endpoints — Accepts ALL Formats</h3>
              
              {/* Primary Endpoint */}
              <div className="flex flex-wrap items-center gap-3">
                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 border border-emerald-100/50 dark:border-emerald-800/30">PRIMARY</span>
                <code className="bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 font-mono text-xs px-2.5 py-1 rounded-lg border border-zinc-200 dark:border-zinc-800 select-all">
                  {typeof window !== 'undefined' ? `${window.location.origin}/api/webhooks/bank` : '/api/webhooks/bank'}
                </code>
              </div>
              
              {/* Fallback Endpoint */}
              <div className="flex flex-wrap items-center gap-3">
                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 border border-amber-100/50 dark:border-amber-800/30">FALLBACK</span>
                <code className="bg-zinc-50 dark:bg-zinc-950 text-amber-600 dark:text-amber-400 font-mono text-xs px-2.5 py-1 rounded-lg border border-zinc-200 dark:border-zinc-800 select-all">
                  /api/webhooks/payment
                </code>
                <span className="text-[10px] text-zinc-400 dark:text-zinc-500">(Express server — auto-forwards to primary)</span>
              </div>

              {/* Capabilities */}
              <div className="flex flex-wrap gap-2 mt-2">
                <span className="inline-flex items-center px-2 py-1 rounded-lg text-[10px] font-bold bg-sky-50 dark:bg-sky-950/30 text-sky-700 dark:text-sky-300 border border-sky-100/50 dark:border-sky-800/30">✓ GET</span>
                <span className="inline-flex items-center px-2 py-1 rounded-lg text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-300 border border-indigo-100/50 dark:border-indigo-800/30">✓ POST</span>
                <span className="inline-flex items-center px-2 py-1 rounded-lg text-[10px] font-bold bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 border border-amber-100/50 dark:border-amber-800/30">✓ PUT</span>
                <span className="inline-flex items-center px-2 py-1 rounded-lg text-[10px] font-bold bg-purple-50 dark:bg-purple-950/30 text-purple-700 dark:text-purple-300 border border-purple-100/50 dark:border-purple-800/30">✓ PATCH</span>
                <span className="inline-flex items-center px-2 py-1 rounded-lg text-[10px] font-bold bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300 border border-rose-100/50 dark:border-rose-800/30">✓ DELETE</span>
                <span className="inline-flex items-center px-2 py-1 rounded-lg text-[10px] font-bold bg-zinc-50 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700">✓ JSON</span>
                <span className="inline-flex items-center px-2 py-1 rounded-lg text-[10px] font-bold bg-zinc-50 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700">✓ Form Data</span>
                <span className="inline-flex items-center px-2 py-1 rounded-lg text-[10px] font-bold bg-zinc-50 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700">✓ URL-Encoded</span>
                <span className="inline-flex items-center px-2 py-1 rounded-lg text-[10px] font-bold bg-zinc-50 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700">✓ Raw Text</span>
                <span className="inline-flex items-center px-2 py-1 rounded-lg text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 border border-emerald-100/50 dark:border-emerald-800/30">✓ No Auth Required</span>
              </div>

              <p className="text-xs text-zinc-400 dark:text-zinc-500">
                Send data via any HTTP method, any content type, with or without headers/authorization. All requests are logged.
              </p>
            </div>

            {/* Tasker API Key */}
            <div className="bg-zinc-50 dark:bg-zinc-950 rounded-xl border border-zinc-200/50 dark:border-zinc-800/50 p-4 space-y-2">
              <h4 className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">Tasker API Key (Optional — for verified requests)</h4>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-zinc-500 dark:text-zinc-400">Header:</span>
                <code className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 font-mono text-xs px-2 py-1 rounded border border-zinc-200 dark:border-zinc-800 select-all">x-api-key</code>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-zinc-500 dark:text-zinc-400">Value:</span>
                <code className="bg-white dark:bg-zinc-900 text-emerald-700 dark:text-emerald-400 font-mono text-xs px-2 py-1 rounded border border-zinc-200 dark:border-zinc-800 select-all break-all">
                  {taskerWebhookKey}
                </code>
              </div>
              <p className="text-[10px] text-zinc-400 dark:text-zinc-500">
                Add this header in your Tasker HTTP Request to tag webhooks as verified. Without it, webhooks are still accepted but marked as unverified.
              </p>
            </div>
            
            <div className="flex justify-end">
              <button
                onClick={() => {
                  setTestUtr('');
                  setTestAmount('10.00');
                  setTestSender('TEST USER');
                  setTestResult(null);
                  setShowTestModal(true);
                }}
                className="flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white text-white rounded-xl shadow-sm transition-all cursor-pointer"
              >
                🧪 Simulate Webhook Payload
              </button>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800/60 p-4 mb-6 shadow-sm rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex flex-wrap gap-2">
            {statusFilters.map((f) => (
              <button
                key={f.key}
                onClick={() => setStatusFilter(f.key)}
                className={`px-4 py-2 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                  statusFilter === f.key
                    ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 border-zinc-900 dark:border-zinc-100 shadow-sm shadow-zinc-200 dark:shadow-none'
                    : 'bg-white dark:bg-zinc-950 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900'
                }`}
              >
                {f.icon} {f.label}
              </button>
            ))}
          </div>
          {pagination && (
            <div className="text-xs font-semibold text-zinc-400 dark:text-zinc-500">
              Showing {events.length} of {pagination.total} events
            </div>
          )}
        </div>

        {/* Content */}
        {loading ? (
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800/60 shadow-sm rounded-2xl p-16 text-center">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-zinc-900 dark:border-zinc-100 mx-auto"></div>
            <p className="mt-4 text-zinc-500 dark:text-zinc-400 font-semibold text-sm">Fetching webhook streams...</p>
          </div>
        ) : error ? (
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800/60 shadow-sm rounded-2xl p-12 text-center">
            <div className="text-rose-500 dark:text-rose-400">
              <p className="text-lg font-bold">Failed to load</p>
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{error}</p>
              <button
                onClick={() => loadEvents(1)}
                className="mt-6 px-5 py-2 glass-button-primary text-sm font-semibold rounded-xl shadow transition-colors"
              >
                Retry Request
              </button>
            </div>
          </div>
        ) : events.length === 0 ? (
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800/60 shadow-sm rounded-2xl p-16 text-center">
            <div className="w-16 h-16 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200/50 dark:border-zinc-800/50 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="h-8 w-8 text-zinc-400 dark:text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V7a2 2 0 012-2h6a2 2 0 012 2v2M7 20h10a2 2 0 002-2v-6a2 2 0 00-2-2H7a2 2 0 00-2 2v6a2 2 0 002 2z" />
              </svg>
            </div>
            <p className="text-zinc-800 dark:text-zinc-200 font-bold text-lg">No Webhook Events Found</p>
            <p className="text-zinc-400 dark:text-zinc-500 text-sm mt-1 max-w-sm mx-auto">Events will appear live once GPay Business starts posting notifications to your endpoint.</p>
            {autoRefresh && (
              <p className="text-emerald-600 dark:text-emerald-450 text-xs mt-4 font-semibold flex items-center justify-center gap-1.5">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                Listening for incoming webhooks...
              </p>
            )}
          </div>
        ) : (
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800/60 shadow-sm rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-zinc-100 dark:divide-zinc-800">
                <thead className="bg-zinc-50/50 dark:bg-zinc-950/40 border-b border-zinc-200 dark:border-zinc-800">
                  <tr>
                    <th className="px-4 py-3.5 text-left text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">ID</th>
                    <th className="px-4 py-3.5 text-left text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">Received At</th>
                    <th className="px-4 py-3.5 text-left text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">Type</th>
                    <th className="px-4 py-3.5 text-left text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">Sender & UTR</th>
                    <th className="px-4 py-3.5 text-left text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">Amount Details</th>
                    <th className="px-4 py-3.5 text-left text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">App / Method</th>
                    <th className="px-4 py-3.5 text-left text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">Status</th>
                    <th className="px-4 py-3.5 text-left text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">IP / Agent</th>
                    <th className="px-4 py-3.5"></th>
                  </tr>
                </thead>
                <tbody className="bg-transparent divide-y divide-zinc-100 dark:divide-zinc-800">
                  {events.map((e) => (
                    <tr key={e.id} className="hover:bg-zinc-50/30 dark:hover:bg-zinc-800/10 transition-colors">
                      <td className="px-4 py-4 text-xs font-semibold text-zinc-400 dark:text-zinc-500 font-mono">#{e.id}</td>
                      <td className="px-4 py-4 text-xs text-zinc-800 dark:text-zinc-300 whitespace-nowrap">
                        <div className="font-semibold">{formatTimestamp(e.received_at)}</div>
                        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                          <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-mono">{e.source || 'GPay'}</span>
                          {e.request_method && (
                            <span className={`inline-flex items-center px-1.5 py-0.2 rounded text-[8px] font-bold ${
                              e.request_method === 'GET' ? 'bg-sky-50 dark:bg-sky-950/30 text-sky-700 dark:text-sky-300 border border-sky-100/50 dark:border-sky-800/30' :
                              e.request_method === 'POST' ? 'bg-indigo-50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-300 border border-indigo-100/50 dark:border-indigo-800/30' :
                              e.request_method === 'PUT' ? 'bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 border border-amber-100/50 dark:border-amber-800/30' :
                              e.request_method === 'PATCH' ? 'bg-purple-50 dark:bg-purple-950/30 text-purple-700 dark:text-purple-300 border border-purple-100/50 dark:border-purple-800/30' :
                              e.request_method === 'DELETE' ? 'bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300 border border-rose-100/50 dark:border-rose-800/30' :
                              'bg-zinc-50 dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-800'
                            }`}>
                              {e.request_method}
                            </span>
                          )}
                          {(e as any).table_source === 'payment_webhooks' && (
                            <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[8px] font-bold bg-orange-50 dark:bg-orange-950/30 text-orange-650 dark:text-orange-350 border border-orange-100/50 dark:border-orange-800/30">
                              TASKER
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4 text-xs whitespace-nowrap">
                        {getPaymentTypeBadge(e.payment_type)}
                      </td>
                      <td className="px-4 py-4 text-xs">
                        {e.utr || e.sender_name ? (
                          <>
                            <div className="font-bold text-zinc-900 dark:text-zinc-100 truncate max-w-[150px]" title={e.sender_name || 'Sender'}>
                              {e.sender_name || 'Anonymous'}
                            </div>
                            <div className="text-[10px] font-mono text-zinc-400 dark:text-zinc-500 mt-0.5 font-medium select-all" title="UTR ID">
                              {e.utr || '—'}
                            </div>
                          </>
                        ) : (
                          <div className="text-zinc-400 dark:text-zinc-500 italic max-w-[180px] truncate" title={e.note || 'No parsed data'}>
                            {e.note || 'No metadata parsed'}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-4 text-xs whitespace-nowrap">
                        <div className="font-extrabold text-zinc-900 dark:text-zinc-100">
                          {e.amount != null && !isNaN(Number(e.amount)) ? `₹${Number(e.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : (e.amount != null ? `₹${e.amount}` : '—')}
                        </div>
                        {e.mdr_gst != null && !isNaN(Number(e.mdr_gst)) && Number(e.mdr_gst) > 0 && (
                          <div className="text-[10px] text-rose-500 dark:text-rose-455 font-bold mt-0.5">
                            Fee: -₹{Number(e.mdr_gst).toFixed(2)}
                          </div>
                        )}
                        {e.amount_received != null && !isNaN(Number(e.amount_received)) && Number(e.amount_received) !== Number(e.amount) && (
                          <div className="text-[9px] text-zinc-400 dark:text-zinc-500 font-semibold mt-0.5">
                            Net: ₹{Number(e.amount_received).toFixed(2)}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-4 text-xs whitespace-nowrap">
                        <div className="flex flex-col items-start gap-1">
                          {getPaymentAppBadge(e.payment_app) || <span className="text-zinc-400 dark:text-zinc-650">—</span>}
                          {e.payment_method && (
                            <span className="text-[9px] font-bold text-zinc-400 dark:text-zinc-500 flex items-center gap-0.5">
                              💳 {e.payment_method.toUpperCase()}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4 text-xs whitespace-nowrap">{getStatusBadge(e)}</td>
                      <td className="px-4 py-4 text-xs whitespace-nowrap">
                        <div className="font-mono text-[10px] text-zinc-400 dark:text-zinc-500 truncate max-w-[100px]" title={e.request_ip || ''}>
                          {e.request_ip || '—'}
                        </div>
                        <div className="text-[9px] text-zinc-300 dark:text-zinc-600 truncate max-w-[100px] mt-0.5" title={e.user_agent || ''}>
                          {e.user_agent ? e.user_agent.split(' ')[0] : '—'}
                        </div>
                      </td>
                      <td className="px-4 py-4 text-right whitespace-nowrap text-xs">
                        <button
                          onClick={() => loadDetail(e.id)}
                          className="glass-button-secondary font-bold px-3 py-1.5 rounded-lg text-xs active:scale-95 transition-all cursor-pointer"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {pagination && pagination.totalPages > 1 && (
              <div className="px-6 py-4 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/40 flex items-center justify-between">
                <button
                  onClick={() => loadEvents(currentPage - 1)}
                  disabled={!pagination.hasPrev}
                  className="px-4 py-2 text-xs font-bold text-zinc-600 dark:text-zinc-400 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl disabled:opacity-40 disabled:cursor-not-allowed hover:bg-zinc-50 dark:hover:bg-zinc-950 transition-colors"
                >
                  ← Prev Page
                </button>
                <span className="text-xs font-bold text-zinc-500 dark:text-zinc-400">
                  Page {pagination.page} of {pagination.totalPages}
                </span>
                <button
                  onClick={() => loadEvents(currentPage + 1)}
                  disabled={!pagination.hasNext}
                  className="px-4 py-2 text-xs font-bold text-zinc-600 dark:text-zinc-400 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl disabled:opacity-40 disabled:cursor-not-allowed hover:bg-zinc-50 dark:hover:bg-zinc-950 transition-colors"
                >
                  Next Page →
                </button>
              </div>
            )}
          </div>
        )}

        {/* Realtime Terminal Log Component */}
        <div className="bg-zinc-955 rounded-2xl border border-zinc-800 shadow-xl overflow-hidden mt-8">
          <div className="px-6 py-4 border-b border-white/10 flex justify-between items-center bg-black/40">
            <div className="flex items-center space-x-3">
              <span className={`h-2.5 w-2.5 rounded-full ${socketConnected ? 'bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]' : 'bg-rose-500'}`}></span>
              <h3 className="text-sm font-bold text-white font-mono tracking-wider">LIVE SYSTEM LOGS TERMINAL</h3>
            </div>
            <button
              onClick={() => setLogs([])}
              className="text-xs font-mono text-zinc-400 hover:text-white transition-colors cursor-pointer"
            >
              Clear Console
            </button>
          </div>
          <div className="p-6 h-[300px] overflow-y-auto font-mono text-xs leading-relaxed scrollbar-thin scrollbar-thumb-zinc-800 bg-black/60">
            {logs.length === 0 ? (
              <div className="text-zinc-600 dark:text-zinc-500 flex items-center justify-center h-full">Awaiting incoming connection logs...</div>
            ) : (
              logs.map((log, i) => (
                <div key={i} className="mb-2 hover:bg-white/5 px-2 py-1 rounded transition-colors flex gap-3">
                  <span className="text-zinc-500 shrink-0">[{log.timestamp}]</span>
                  <span className={`${
                    log.type === 'error' ? 'text-rose-400' :
                    log.type === 'success' ? 'text-emerald-400' :
                    log.type === 'warning' ? 'text-amber-400' : 'text-zinc-300'
                  } break-all`}>
                    {log.message}
                  </span>
                </div>
              ))
            )}
            <div ref={logEndRef} />
          </div>
        </div>
      </main>

      {/* Detail Modal */}
      {selectedEvent && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 transition-opacity">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl max-w-3xl w-full max-h-[92vh] overflow-hidden flex flex-col border border-zinc-200 dark:border-zinc-800">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 flex justify-between items-center bg-zinc-50 dark:bg-zinc-950">
              <div>
                <h3 className="text-lg font-bold text-zinc-900 dark:text-white">Webhook Event Details</h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-450 mt-0.5">
                  ID: <span className="font-mono font-semibold">#{selectedEvent.id}</span> · Received: {formatTimestamp(selectedEvent.received_at)}
                </p>
              </div>
              <button
                onClick={() => setSelectedEvent(null)}
                className="text-zinc-400 hover:text-zinc-500 p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Body */}
            <div className="overflow-y-auto flex-1 p-6 space-y-6">
              {/* Status Banner */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Status:</span>
                  {getStatusBadge(selectedEvent)}
                </div>
                {selectedEvent.matched_txn_id && (
                  <div className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                    Matched Order: <span className="font-mono text-zinc-900 dark:text-zinc-100 font-semibold bg-zinc-150 dark:bg-zinc-800 px-2 py-1 rounded border border-zinc-250 dark:border-zinc-700 select-all">{selectedEvent.matched_txn_id}</span>
                  </div>
                )}
              </div>

              {/* Request Details (like webhook.site) */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">Request Details</h4>
                <div className="bg-white dark:bg-zinc-950 rounded-xl border border-zinc-200/60 dark:border-zinc-800/60 p-4 space-y-2 shadow-sm">
                  <div className="flex justify-between items-center py-1 border-b border-zinc-50 dark:border-zinc-900">
                    <span className="text-xs text-zinc-500 dark:text-zinc-400">IP Address</span>
                    <span className="text-xs font-mono font-bold text-zinc-900 dark:text-zinc-100 select-all">{selectedEvent.request_ip || '—'}</span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-zinc-50 dark:border-zinc-900">
                    <span className="text-xs text-zinc-500 dark:text-zinc-400">User-Agent</span>
                    <span className="text-xs font-mono text-zinc-700 dark:text-zinc-300 truncate max-w-[300px]" title={selectedEvent.user_agent || ''}>{selectedEvent.user_agent || '—'}</span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-zinc-50 dark:border-zinc-900">
                    <span className="text-xs text-zinc-500 dark:text-zinc-400">Content-Type</span>
                    <span className="text-xs font-mono text-zinc-700 dark:text-zinc-300">{selectedEvent.content_type || '—'}</span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-zinc-50 dark:border-zinc-900">
                    <span className="text-xs text-zinc-500 dark:text-zinc-400">HTTP Method</span>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                      selectedEvent.request_method === 'GET' ? 'bg-sky-50 dark:bg-sky-950/30 text-sky-700 dark:text-sky-300 border border-sky-100/50 dark:border-sky-800/30' :
                      selectedEvent.request_method === 'POST' ? 'bg-indigo-50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-300 border border-indigo-100/50 dark:border-indigo-800/30' :
                      selectedEvent.request_method === 'PUT' ? 'bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 border border-amber-100/50 dark:border-amber-800/30' :
                      selectedEvent.request_method === 'PATCH' ? 'bg-purple-50 dark:bg-purple-950/30 text-purple-700 dark:text-purple-300 border border-purple-100/50 dark:border-purple-800/30' :
                      selectedEvent.request_method === 'DELETE' ? 'bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300 border border-rose-100/50 dark:border-rose-800/30' :
                      'bg-zinc-50 dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-800'
                    }`}>
                      {selectedEvent.request_method || 'POST'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-1">
                    <span className="text-xs text-zinc-500 dark:text-zinc-400">Source</span>
                    <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200">{selectedEvent.source || '—'}</span>
                  </div>
                </div>
              </div>

              {/* Grid: Extracted Metadata & Financials */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Left: Metadata */}
                <div className="space-y-4">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">Payment Metadata</h4>
                  
                  <div className="bg-white dark:bg-zinc-950 rounded-xl border border-zinc-200/60 dark:border-zinc-800/60 p-4 space-y-3 shadow-sm">
                    <div className="flex justify-between items-center py-1.5 border-b border-zinc-50 dark:border-zinc-900">
                      <span className="text-xs text-zinc-500 dark:text-zinc-400">Sender Name</span>
                      <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">{selectedEvent.sender_name || '—'}</span>
                    </div>
                    <div className="flex justify-between items-center py-1.5 border-b border-zinc-50 dark:border-zinc-900">
                      <span className="text-xs text-zinc-500 dark:text-zinc-400">UPI Transaction ID (UTR)</span>
                      <span className="text-xs font-mono font-bold text-zinc-900 dark:text-zinc-100 select-all">{selectedEvent.utr || '—'}</span>
                    </div>
                    <div className="flex justify-between items-center py-1.5 border-b border-zinc-50 dark:border-zinc-900">
                      <span className="text-xs text-zinc-500 dark:text-zinc-400">Google Transaction ID</span>
                      <span className="text-xs font-mono font-bold text-zinc-900 dark:text-zinc-100 select-all">{selectedEvent.google_txn_id || '—'}</span>
                    </div>
                    <div className="flex justify-between items-center py-1.5 border-b border-zinc-50 dark:border-zinc-900">
                      <span className="text-xs text-zinc-500 dark:text-zinc-400">Payment App</span>
                      <span>{getPaymentAppBadge(selectedEvent.payment_app) || '—'}</span>
                    </div>
                    <div className="flex justify-between items-center py-1.5">
                      <span className="text-xs text-zinc-500 dark:text-zinc-400">Payment Method</span>
                      <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200">{selectedEvent.payment_method || '—'}</span>
                    </div>
                  </div>
                </div>

                {/* Right: Financial Details */}
                <div className="space-y-4">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">Financial Ledger</h4>

                  <div className="bg-white dark:bg-zinc-950 rounded-xl border border-zinc-200/60 dark:border-zinc-800/60 p-4 space-y-3 shadow-sm">
                    <div className="flex justify-between items-center py-1.5 border-b border-zinc-50 dark:border-zinc-900">
                      <span className="text-xs text-zinc-500 dark:text-zinc-400">Transaction Type</span>
                      <span>{getPaymentTypeBadge(selectedEvent.payment_type)}</span>
                    </div>
                    <div className="flex justify-between items-center py-1.5 border-b border-zinc-50 dark:border-zinc-900">
                      <span className="text-xs text-zinc-500 dark:text-zinc-400">Customer Paid</span>
                      <span className="text-xs font-extrabold text-zinc-900 dark:text-zinc-100">
                        {selectedEvent.customer_paid != null && !isNaN(Number(selectedEvent.customer_paid)) ? `₹${Number(selectedEvent.customer_paid).toFixed(2)}` : (selectedEvent.amount != null && !isNaN(Number(selectedEvent.amount)) ? `₹${Number(selectedEvent.amount).toFixed(2)}` : '—')}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-1.5 border-b border-zinc-50 dark:border-zinc-900">
                      <span className="text-xs text-zinc-500 dark:text-zinc-400">MDR + GST Fees</span>
                      <span className="text-xs font-bold text-rose-500 dark:text-rose-455">
                        {selectedEvent.mdr_gst != null && !isNaN(Number(selectedEvent.mdr_gst)) ? `-₹${Number(selectedEvent.mdr_gst).toFixed(2)}` : '₹0.00'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-1.5 bg-emerald-50/50 dark:bg-emerald-950/20 p-2 rounded-lg border border-emerald-100/50 dark:border-emerald-800/30">
                      <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300">Amount Received</span>
                      <span className="text-sm font-extrabold text-emerald-650 dark:text-emerald-350">
                        {selectedEvent.amount_received != null && !isNaN(Number(selectedEvent.amount_received)) ? `₹${Number(selectedEvent.amount_received).toFixed(2)}` : (selectedEvent.amount != null && !isNaN(Number(selectedEvent.amount)) ? `₹${Number(selectedEvent.amount).toFixed(2)}` : '—')}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Notes Section if exists */}
              {selectedEvent.note && (
                <div className="p-3 bg-amber-50/50 dark:bg-amber-950/20 border border-amber-100/50 dark:border-amber-900/30 rounded-xl">
                  <span className="text-[10px] font-bold text-amber-800 dark:text-amber-400 uppercase block mb-0.5">Note Log</span>
                  <p className="text-xs text-amber-700 dark:text-amber-300 font-semibold">{selectedEvent.note}</p>
                </div>
              )}

              {/* Raw JSON Payload */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">Raw Webhook JSON Payload</h4>
                  <button
                    onClick={() => handleCopyPayload(selectedEvent.raw_payload)}
                    className={`text-xs font-bold px-3 py-1 rounded-lg border transition-all cursor-pointer ${
                      copySuccess
                        ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 border-emerald-250 dark:border-emerald-800'
                        : 'glass-button-secondary text-zinc-650 dark:text-zinc-350 border-zinc-200 dark:border-zinc-700'
                    }`}
                  >
                    {copySuccess ? '✓ Copied!' : 'Copy'}
                  </button>
                </div>
                <div className="relative">
                  <pre className="text-xs text-zinc-800 dark:text-zinc-200 whitespace-pre-wrap break-all bg-zinc-50 dark:bg-zinc-955 p-4 rounded-xl border border-zinc-200/80 dark:border-zinc-800 font-mono leading-relaxed max-h-[250px] overflow-y-auto">
                    {typeof selectedEvent.raw_payload === 'string'
                      ? (() => { try { return JSON.stringify(JSON.parse(selectedEvent.raw_payload), null, 2); } catch { return selectedEvent.raw_payload; } })()
                      : JSON.stringify(selectedEvent.raw_payload, null, 2)}
                  </pre>
                </div>
              </div>

              {/* Request Headers (expandable) */}
              {selectedEvent.request_headers && Object.keys(selectedEvent.request_headers).length > 0 && (
                <details className="group">
                  <summary className="text-xs font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 cursor-pointer hover:text-zinc-600 dark:hover:text-zinc-350 transition-colors list-none flex items-center gap-1">
                    <svg className="h-3 w-3 transition-transform group-open:rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                    </svg>
                    Request Headers
                  </summary>
                  <pre className="mt-2 text-xs text-zinc-600 dark:text-zinc-400 whitespace-pre-wrap break-all bg-zinc-50 dark:bg-zinc-955 p-4 rounded-xl border border-zinc-200/80 dark:border-zinc-800 font-mono leading-relaxed max-h-[200px] overflow-y-auto">
                    {typeof selectedEvent.request_headers === 'string'
                      ? (() => { try { return JSON.stringify(JSON.parse(selectedEvent.request_headers), null, 2); } catch { return selectedEvent.request_headers; } })()
                      : JSON.stringify(selectedEvent.request_headers, null, 2)}
                  </pre>
                </details>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 flex justify-end">
              <button
                onClick={() => setSelectedEvent(null)}
                className="bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-xl shadow-sm px-5 py-2 text-sm font-bold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-950 transition-colors cursor-pointer"
              >
                Close details
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Simulator Modal */}
      {showTestModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 transition-opacity">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden flex flex-col border border-zinc-200 dark:border-zinc-800">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 flex justify-between items-center bg-zinc-50 dark:bg-zinc-950">
              <div>
                <h3 className="text-base font-bold text-zinc-900 dark:text-white">Simulate Bank Webhook</h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-450 mt-0.5">Test end-to-end webhook receipt & UTR verification</p>
              </div>
              <button
                onClick={() => setShowTestModal(false)}
                className="text-zinc-400 hover:text-zinc-500 p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4">
              {testResult && (
                <div className={`p-4 rounded-xl border text-xs font-semibold ${
                  testResult.success 
                    ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200/50 dark:border-emerald-800/30 text-emerald-800 dark:text-emerald-300' 
                    : 'bg-rose-50 dark:bg-rose-950/30 border-rose-200/50 dark:border-rose-800/30 text-rose-800 dark:text-rose-300'
                }`}>
                  {testResult.message}
                </div>
              )}

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Amount (INR)</label>
                <input
                  type="number"
                  step="0.01"
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white/50 dark:bg-black/50 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-950 dark:focus:ring-zinc-50 font-sans"
                  value={testAmount}
                  onChange={(e) => setTestAmount(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Sender Name</label>
                <input
                  type="text"
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white/50 dark:bg-black/50 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-950 dark:focus:ring-zinc-50 font-sans"
                  value={testSender}
                  onChange={(e) => setTestSender(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">UTR / Transaction ID (Optional)</label>
                <input
                  type="text"
                  placeholder="Generates random UTR if empty"
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white/50 dark:bg-black/50 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-950 dark:focus:ring-zinc-50 font-mono"
                  value={testUtr}
                  onChange={(e) => setTestUtr(e.target.value)}
                />
                <span className="text-[10px] text-zinc-400 dark:text-zinc-500 block mt-0.5">
                  To test order verification, enter the UTR submitted on a pending checkout order.
                </span>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 flex justify-end gap-3">
              <button
                onClick={() => setShowTestModal(false)}
                className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2 text-xs font-bold text-zinc-700 dark:text-zinc-350 hover:bg-zinc-50 dark:hover:bg-zinc-950 cursor-pointer"
              >
                Close
              </button>
              <button
                onClick={handleSendTestWebhook}
                disabled={sendingTest}
                className="bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white text-white rounded-xl px-5 py-2 text-xs font-bold disabled:opacity-50 cursor-pointer transition-colors"
              >
                {sendingTest ? 'Sending...' : 'Dispatch Webhook'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
