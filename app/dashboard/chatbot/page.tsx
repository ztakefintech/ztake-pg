'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/context';
import Layout from '@/components/Layout';
import { FiCpu, FiMessageSquare, FiSave, FiCheck, FiSend, FiCode, FiCopy } from 'react-icons/fi';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export default function ChatbotDashboard() {
  const { isAuthenticated, isLoading, token } = useAuth();
  const router = useRouter();

  // Vendor credentials and configuration
  const [secretKey, setSecretKey] = useState('');
  const [botName, setBotName] = useState('ZiBot');
  const [systemPrompt, setSystemPrompt] = useState('You are a helpful payment support assistant.');
  const [isActive, setIsActive] = useState(true);
  
  // Status states
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [savingConfig, setSavingConfig] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [copiedEmbed, setCopiedEmbed] = useState(false);

  // Preview chatbot widget states
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [sessionId, setSessionId] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, isLoading, router]);

  // Phase 1: Retrieve vendor secret key, then fetch chatbot config using it
  useEffect(() => {
    if (isAuthenticated && token) {
      const initDashboard = async () => {
        try {
          // Fetch secret key
          const keyRes = await fetch('/api/vendor/secret-key', {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          const keyData = await keyRes.json();
          if (keyData.success && keyData.data?.secret_key) {
            const sk = keyData.data.secret_key;
            setSecretKey(sk);
            
            // Now fetch configuration using the secret key
            const configRes = await fetch('/api/v2/chat/config', {
              headers: { 'Authorization': `Bearer ${sk}` }
            });
            const configData = await configRes.json();
            if (configData.success && configData.config) {
              setBotName(configData.config.bot_name || 'ZiBot');
              setSystemPrompt(configData.config.system_prompt || '');
              setIsActive(configData.config.is_active !== undefined ? configData.config.is_active : true);
            }
          }
        } catch (err) {
          console.error('Error loading chatbot dashboard details:', err);
        } finally {
          setLoadingConfig(false);
        }
      };
      initDashboard();
    }
  }, [isAuthenticated, token]);

  // Scroll to bottom of chat on new messages
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!secretKey) return;
    
    setSavingConfig(true);
    setSaveStatus('idle');
    try {
      const res = await fetch('/api/v2/chat/config', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${secretKey}`
        },
        body: JSON.stringify({
          bot_name: botName,
          system_prompt: systemPrompt,
          is_active: isActive
        })
      });
      const data = await res.json();
      if (data.success) {
        setSaveStatus('success');
        setTimeout(() => setSaveStatus('idle'), 3000);
      } else {
        setSaveStatus('error');
      }
    } catch (err) {
      setSaveStatus('error');
    } finally {
      setSavingConfig(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || chatLoading || !secretKey) return;

    const userText = inputMessage.trim();
    setInputMessage('');
    
    // Add user message to UI
    const updatedMessages: ChatMessage[] = [...messages, { role: 'user', content: userText }];
    setMessages(updatedMessages);
    setChatLoading(true);

    try {
      const res = await fetch('/api/v2/chat/message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${secretKey}`
        },
        body: JSON.stringify({
          message: userText,
          session_id: sessionId
        })
      });
      
      const data = await res.json();
      if (data.success) {
        if (data.session_id) {
          setSessionId(data.session_id);
        }
        setMessages([...updatedMessages, { role: 'assistant', content: data.reply }]);
      } else {
        setMessages([...updatedMessages, { role: 'assistant', content: `Error: ${data.error || 'Failed to reply'}` }]);
      }
    } catch (err: any) {
      setMessages([...updatedMessages, { role: 'assistant', content: `Error: ${err.message || 'Network error'}` }]);
    } finally {
      setChatLoading(false);
    }
  };

  const embedCode = `<script>
  window.ZiBotConfig = { apiKey: '${secretKey || 'YOUR_SECRET_KEY'}', botName: '${botName}' };
</script>
<script src="https://ztake.in/zibot-widget.js" async></script>`;

  const copyEmbedSnippet = () => {
    navigator.clipboard.writeText(embedCode);
    setCopiedEmbed(true);
    setTimeout(() => setCopiedEmbed(false), 2000);
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
        {/* Header */}
        <div className="border-b border-gray-200 dark:border-gray-800 pb-6">
          <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white flex items-center gap-2">
            <FiCpu className="text-primary-500" /> ZiBot Assistant Configuration
          </h1>
          <p className="text-gray-650 dark:text-gray-400 mt-1">
            Customize system behavior directives, test the AI chatbot response styles, and fetch embedding tags for external integrations.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left Column: Form & Embedding code snippet */}
          <div className="lg:col-span-7 space-y-8">
            {loadingConfig ? (
              <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-8 flex items-center justify-center h-80">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-650"></div>
              </div>
            ) : (
              <form onSubmit={handleSaveConfig} className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 md:p-8 shadow-sm space-y-6">
                <h3 className="font-bold text-gray-900 dark:text-white text-lg border-b border-gray-100 dark:border-gray-800 pb-3">
                  Configuration Settings
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Bot Display Name</label>
                    <input
                      type="text"
                      required
                      value={botName}
                      onChange={(e) => setBotName(e.target.value)}
                      placeholder="ZiBot"
                      className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-750 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Bot Status</label>
                    <div className="flex items-center h-11">
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isActive}
                          onChange={(e) => setIsActive(e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 dark:bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:width-5 after:transition-all peer-checked:bg-primary-600"></div>
                        <span className="ml-3 text-sm font-semibold text-gray-800 dark:text-gray-300">
                          {isActive ? 'Active / Enabled' : 'Inactive / Disabled'}
                        </span>
                      </label>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">System Instructions Prompt</label>
                  <textarea
                    rows={4}
                    required
                    value={systemPrompt}
                    onChange={(e) => setSystemPrompt(e.target.value)}
                    placeholder="You are a payment support bot..."
                    className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-750 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 font-mono text-sm leading-relaxed"
                  />
                  <p className="text-xs text-gray-450 mt-1.5 leading-normal">
                    This prompt directs Claude's personality and goals. Use this space to specify guidelines for UTR verification, refund queries, or general business terms.
                  </p>
                </div>

                <div className="flex items-center gap-4 border-t border-gray-100 dark:border-gray-800 pt-4">
                  <button
                    type="submit"
                    disabled={savingConfig}
                    className="bg-primary-650 hover:bg-primary-700 disabled:bg-gray-400 text-white font-semibold py-2.5 px-6 rounded-xl transition duration-150 flex items-center space-x-2 shadow-sm"
                  >
                    {savingConfig ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <>
                        <FiSave />
                        <span>Save Configuration</span>
                      </>
                    )}
                  </button>

                  {saveStatus === 'success' && (
                    <span className="text-sm text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                      <FiCheck /> Config saved successfully!
                    </span>
                  )}
                  {saveStatus === 'error' && (
                    <span className="text-sm text-red-600 dark:text-red-400 font-semibold">
                      Failed to save configuration. Try again.
                    </span>
                  )}
                </div>
              </form>
            )}

            {/* Embedding Integration snippet */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 md:p-8 shadow-sm space-y-4">
              <h3 className="font-bold text-gray-900 dark:text-white text-lg flex items-center gap-2">
                <FiCode className="text-primary-500" /> Web Widget Embed Code
              </h3>
              <p className="text-sm text-gray-650 dark:text-gray-400">
                To embed this support bot on your site or checkout portal, paste this script block inside the &lt;body&gt; of your HTML templates:
              </p>

              <div className="relative bg-gray-950 p-4 rounded-xl border border-gray-900">
                <button
                  onClick={copyEmbedSnippet}
                  disabled={loadingConfig || !secretKey}
                  className="absolute right-3 top-3 text-gray-400 hover:text-white transition p-1"
                  title="Copy Embed Code"
                >
                  {copiedEmbed ? <FiCheck className="text-emerald-500" /> : <FiCopy className="w-4 h-4" />}
                </button>
                <pre className="font-mono text-xs overflow-x-auto text-gray-300 pr-8 leading-relaxed">
                  {embedCode}
                </pre>
              </div>
            </div>
          </div>

          {/* Right Column: Live chat widget preview */}
          <div className="lg:col-span-5">
            <div className="bg-white dark:bg-gray-900 border border-gray-250 dark:border-gray-800 rounded-2xl shadow-lg overflow-hidden flex flex-col h-[580px]">
              
              {/* Chat Widget Header */}
              <div className="p-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-full bg-primary-600 flex items-center justify-center font-bold text-white shadow-sm">
                    {botName.charAt(0)}
                  </div>
                  <div>
                    <h4 className="font-bold text-white text-sm leading-tight">{botName}</h4>
                    <span className="text-xs text-emerald-400 flex items-center gap-1 font-medium">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span> Support Online
                    </span>
                  </div>
                </div>
                <div className="bg-slate-800 text-[10px] px-2 py-0.5 rounded text-slate-400 font-mono">
                  PREVIEW
                </div>
              </div>

              {/* Chat Message List */}
              <div className="flex-1 p-4 overflow-y-auto bg-slate-50 dark:bg-slate-950 space-y-4">
                <div className="flex gap-2.5">
                  <div className="w-7 h-7 rounded-full bg-primary-650 flex items-center justify-center font-bold text-white text-xs flex-shrink-0">
                    {botName.charAt(0)}
                  </div>
                  <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800/80 rounded-2xl rounded-tl-none p-3 shadow-xs max-w-[80%]">
                    <p className="text-xs text-gray-800 dark:text-gray-300 leading-normal">
                      Hello! I am your {botName} chatbot support agent. Ask me details regarding transaction statuses, refunds, or payment proofs.
                    </p>
                  </div>
                </div>

                {messages.map((msg, index) => (
                  <div
                    key={index}
                    className={`flex gap-2.5 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    {msg.role === 'assistant' && (
                      <div className="w-7 h-7 rounded-full bg-primary-650 flex items-center justify-center font-bold text-white text-xs flex-shrink-0">
                        {botName.charAt(0)}
                      </div>
                    )}
                    <div
                      className={`p-3 rounded-2xl max-w-[80%] text-xs leading-normal shadow-xs ${
                        msg.role === 'user'
                          ? 'bg-primary-600 text-white rounded-tr-none'
                          : 'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-850 rounded-tl-none text-gray-800 dark:text-gray-300'
                      }`}
                    >
                      <p>{msg.content}</p>
                    </div>
                  </div>
                ))}
                
                {chatLoading && (
                  <div className="flex gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-primary-650 flex items-center justify-center font-bold text-white text-xs flex-shrink-0 animate-pulse">
                      {botName.charAt(0)}
                    </div>
                    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-850 rounded-2xl rounded-tl-none p-3 shadow-xs flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-gray-400 dark:bg-gray-650 animate-bounce"></span>
                      <span className="w-1.5 h-1.5 rounded-full bg-gray-400 dark:bg-gray-650 animate-bounce [animation-delay:0.2s]"></span>
                      <span className="w-1.5 h-1.5 rounded-full bg-gray-400 dark:bg-gray-650 animate-bounce [animation-delay:0.4s]"></span>
                    </div>
                  </div>
                )}
                
                <div ref={chatBottomRef} />
              </div>

              {/* Chat Input form */}
              <form onSubmit={handleSendMessage} className="p-3 border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 flex gap-2">
                <input
                  type="text"
                  disabled={chatLoading || !secretKey || !isActive}
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  placeholder={isActive ? "Type support question..." : "Bot is currently disabled"}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-750 rounded-xl bg-white dark:bg-gray-800 text-xs text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-primary-500"
                />
                <button
                  type="submit"
                  disabled={chatLoading || !inputMessage.trim() || !secretKey || !isActive}
                  className="bg-primary-600 hover:bg-primary-700 disabled:bg-gray-300 text-white p-2.5 rounded-xl transition duration-150"
                >
                  <FiSend className="w-4 h-4" />
                </button>
              </form>

            </div>
          </div>

        </div>
      </div>
    </Layout>
  );
}
