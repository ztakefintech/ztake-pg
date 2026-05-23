'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/context';
import Layout from '@/components/Layout';
import { FiKey, FiCopy, FiCheck, FiEye, FiEyeOff, FiBook, FiCpu, FiChevronRight } from 'react-icons/fi';

export default function DashboardApiDocs() {
  const { isAuthenticated, isLoading, token, vendor } = useAuth();
  const router = useRouter();

  const [secretKey, setSecretKey] = useState('');
  const [loadingKey, setLoadingKey] = useState(true);
  const [showKey, setShowKey] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);
  const [activeTab, setActiveTab] = useState<'js' | 'python' | 'curl'>('js');
  const [copiedCode, setCopiedCode] = useState(false);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, isLoading, router]);

  useEffect(() => {
    if (isAuthenticated && token) {
      fetchSecretKey();
    }
  }, [isAuthenticated, token]);

  const fetchSecretKey = async () => {
    try {
      setLoadingKey(true);
      const res = await fetch('/api/vendor/secret-key', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (data.success && data.data?.secret_key) {
        setSecretKey(data.data.secret_key);
      }
    } catch (err) {
      console.error('Error fetching secret key:', err);
    } finally {
      setLoadingKey(false);
    }
  };

  const handleCopyKey = () => {
    navigator.clipboard.writeText(secretKey || 'YOUR_SECRET_KEY');
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  const vendorCode = vendor?.vendor_code || 'YOUR_VENDOR_CODE';
  const displayedKey = secretKey || 'pk_live_your_secret_key_goes_here';

  const snippets = {
    js: `const response = await fetch('https://ztake.in/api/payments/update', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ${displayedKey}',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    utr: '652603702065',
    amount: 500,
    vendor_code: '${vendorCode}'
  })
});
const data = await response.json();`,

    python: `import requests

response = requests.post(
    'https://ztake.in/api/payments/update',
    headers={
        'Authorization': 'Bearer ${displayedKey}',
        'Content-Type': 'application/json'
    },
    json={
        'utr': '652603702065',
        'amount': 500,
        'vendor_code': '${vendorCode}'
    }
)
data = response.json()`,

    curl: `curl -X POST https://ztake.in/api/payments/update \\
  -H "Authorization: Bearer ${displayedKey}" \\
  -H "Content-Type: application/json" \\
  -d '{"utr":"652603702065","amount":500,"vendor_code":"${vendorCode}"}'`
  };

  const handleCopyCode = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <Layout>
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Page title and top info */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-200 dark:border-gray-800 pb-6">
          <div>
            <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white">API Credentials</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Configure server integrations and authenticate REST calls securely.
            </p>
          </div>
          <a
            href="/docs"
            target="_blank"
            className="flex items-center space-x-2 bg-primary-600 hover:bg-primary-700 text-white font-semibold py-2 px-4 rounded-xl transition duration-150 shadow-sm w-fit"
          >
            <FiBook />
            <span>Open Public Docs</span>
          </a>
        </div>

        {/* API Credentials Box */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 md:p-8 shadow-sm">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <FiKey className="text-primary-500" /> Secret Key Authentication
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
            Use your permanent secret key (`pk_`) for secure backend operations. Keep this key safe and never disclose it in client-side scripts.
          </p>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="relative flex-1 bg-gray-50 dark:bg-gray-800/80 rounded-xl border border-gray-250 dark:border-gray-700 font-mono text-sm px-4 py-3 flex items-center min-w-0">
              {loadingKey ? (
                <span className="text-gray-400 italic">Fetching credentials...</span>
              ) : showKey ? (
                <span className="text-gray-900 dark:text-white select-all break-all pr-12">{displayedKey}</span>
              ) : (
                <span className="text-gray-400 font-sans tracking-widest select-none">••••••••••••••••••••••••••••••••••••••••••••••••</span>
              )}
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setShowKey(!showKey)}
                disabled={loadingKey || !secretKey}
                className="flex items-center justify-center border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-xl p-3 text-gray-600 dark:text-gray-300 transition duration-150"
                title={showKey ? 'Hide Secret Key' : 'Reveal Secret Key'}
              >
                {showKey ? <FiEyeOff className="w-5 h-5" /> : <FiEye className="w-5 h-5" />}
              </button>
              
              <button
                onClick={handleCopyKey}
                disabled={loadingKey || !secretKey}
                className="flex-1 sm:flex-initial flex items-center justify-center bg-gray-900 hover:bg-gray-850 dark:bg-white dark:hover:bg-gray-100 text-white dark:text-gray-900 font-semibold px-4 py-3 rounded-xl transition duration-150 space-x-2"
              >
                {copiedKey ? <FiCheck className="text-emerald-500" /> : <FiCopy />}
                <span>{copiedKey ? 'Copied' : 'Copy Key'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Quickstart Tab Panel */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden shadow-sm">
          <div className="p-6 border-b border-gray-200 dark:border-gray-850 flex flex-wrap gap-4 items-center justify-between">
            <div>
              <h3 className="font-bold text-gray-900 dark:text-white text-lg">Quick Start Example</h3>
              <p className="text-xs text-gray-500 mt-0.5">Submit payment updates via our POST transaction endpoint</p>
            </div>
            
            {/* Tabs */}
            <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-xl">
              {(['js', 'python', 'curl'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-1.5 rounded-lg text-xs font-semibold uppercase transition-all ${
                    activeTab === tab
                      ? 'bg-white dark:bg-gray-900 text-primary-600 dark:text-primary-400 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {tab === 'js' ? 'JavaScript' : tab === 'python' ? 'Python' : 'cURL'}
                </button>
              ))}
            </div>
          </div>

          <div className="p-6 bg-gray-950">
            <div className="flex items-center justify-between text-xs font-semibold text-gray-400 uppercase mb-3">
              <span>Code Snippet ({activeTab})</span>
              <button
                onClick={() => handleCopyCode(snippets[activeTab])}
                className="flex items-center space-x-1 hover:text-white transition"
              >
                {copiedCode ? <FiCheck className="text-emerald-500" /> : <FiCopy />}
                <span>{copiedCode ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
            <pre className="font-mono text-xs overflow-x-auto text-gray-300 leading-relaxed max-h-96">
              {snippets[activeTab]}
            </pre>
          </div>
        </div>

        {/* ZiBot AI Integration Section */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 md:p-8 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-indigo-50 dark:bg-indigo-950 text-indigo-650 dark:text-indigo-400 rounded-2xl">
              <FiCpu className="w-6 h-6" />
            </div>
            <div className="space-y-2">
              <h3 className="font-bold text-gray-900 dark:text-white text-lg">ZiBot Support Chatbot API</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                Connect your site pages directly to ZiBot using your Secret API key. You can prompt users for order details, query payment transaction results, verify UTR states, and fetch historical support session records.
              </p>
              <div className="pt-2 flex items-center space-x-4">
                <a
                  href="/dashboard/chatbot"
                  className="text-sm font-semibold text-primary-600 dark:text-primary-400 hover:underline flex items-center space-x-1"
                >
                  <span>Configure ZiBot</span>
                  <FiChevronRight />
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
