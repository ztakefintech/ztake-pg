import { useState, useEffect } from "react";
import { PillButton } from "@/components/marketing/PillButton";
import { GlassCard } from "@/components/marketing/GlassCard";
import {
  CreditCard,
  Zap,
  Globe,
  Shield,
  Code,
  TrendingUp,
  Wallet,
  Users,
  CheckCircle,
  ArrowRight,
  Sparkles,
  Smartphone,
  Cpu,
  Lock,
  Terminal,
  Activity,
  Layers,
  ChevronRight,
  Copy,
  Check,
} from "lucide-react";

export default function Home() {
  // States for Interactive Playground
  const [payMethod, setPayMethod] = useState<"upi" | "card">("upi");
  const [payAmount, setPayAmount] = useState("1000");
  const [payStatus, setPayStatus] = useState<"idle" | "processing" | "success">("idle");
  const [payLatency, setPayLatency] = useState(15);
  const [copied, setCopied] = useState(false);
  const [codeLang, setCodeLang] = useState<"curl" | "node" | "python">("curl");

  // States for Tabbed Solutions
  const [solutionTab, setSolutionTab] = useState<"checkout" | "billing" | "banking">("checkout");

  // Trigger payment simulation
  const handlePayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (payStatus !== "idle") return;
    setPayStatus("processing");
    const startTime = performance.now();
    setTimeout(() => {
      const endTime = performance.now();
      setPayLatency(Math.round(endTime - startTime + 8)); // Simulate network latency + processing
      setPayStatus("success");
    }, 1800);
  };

  // Reset payment simulator
  const resetPayment = () => {
    setPayStatus("idle");
  };

  // Code snippets based on selected language
  const codeSnippets = {
    curl: `curl -X POST https://api.ztake.in/v1/payments \\
  -H "Authorization: Bearer sk_live_..." \\
  -H "Content-Type: application/json" \\
  -d '{
    "amount": ${payAmount ? parseFloat(payAmount) * 100 : 100000},
    "currency": "INR",
    "payment_method": "${payMethod}",
    "description": "Simulation checkout"
  }'`,
    node: `const ztake = require('ztake-node')('sk_live_...');

await ztake.payments.create({
  amount: ${payAmount ? parseFloat(payAmount) * 100 : 100000},
  currency: 'INR',
  payment_method: '${payMethod}',
  description: 'Simulation checkout'
});`,
    python: `import ztake

ztake.api_key = "sk_live_..."
payment = ztake.Payment.create(
    amount=${payAmount ? parseFloat(payAmount) * 100 : 100000},
    currency="INR",
    payment_method="${payMethod}",
    description="Simulation checkout"
)`,
  };

  // Copy code snippet helper
  const handleCopyCode = () => {
    navigator.clipboard.writeText(codeSnippets[codeLang]);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-950 dark:bg-black dark:text-zinc-50 overflow-hidden font-sans transition-colors duration-300">
      
      {/* Sleek radial glowing backgrounds */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-[1400px] h-[700px] pointer-events-none z-0 opacity-40 dark:opacity-60">
        <div className="absolute top-[-10%] left-[20%] w-[500px] h-[500px] rounded-full bg-blue-400/20 dark:bg-blue-600/10 blur-[120px]" />
        <div className="absolute top-[10%] right-[10%] w-[600px] h-[600px] rounded-full bg-violet-400/20 dark:bg-violet-600/10 blur-[130px]" />
        <div className="absolute top-[-5%] left-[45%] w-[400px] h-[400px] rounded-full bg-emerald-400/10 dark:bg-emerald-500/5 blur-[100px]" />
      </div>

      {/* Hero Section */}
      <section id="home" className="relative pt-32 md:pt-40 pb-20 px-4 sm:px-6 lg:px-8 z-10">
        <div className="max-w-7xl mx-auto text-center">
          
          {/* Tagline Badge */}
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-zinc-900/5 dark:bg-white/5 border border-zinc-950/10 dark:border-white/10 mb-8 animate-fade-in">
            <Sparkles className="w-3.5 h-3.5 text-blue-500 dark:text-blue-400" />
            <span className="text-xs font-medium tracking-wide text-zinc-600 dark:text-zinc-300 uppercase">
              Next-Gen Payments for scale
            </span>
          </div>

          {/* Main Title */}
          <h1 className="text-5xl sm:text-7xl lg:text-8xl font-bold tracking-tight leading-[1.05] mb-8 text-transparent bg-clip-text bg-gradient-to-b from-zinc-900 via-zinc-800 to-zinc-600 dark:from-white dark:via-zinc-200 dark:to-zinc-500">
            Empowering Modern <br className="hidden sm:inline" />
            Businesses to Get Paid.
          </h1>

          <p className="text-lg sm:text-xl md:text-2xl text-zinc-500 dark:text-zinc-400 max-w-3xl mx-auto mb-10 leading-relaxed font-normal">
            Accept 180+ payment methods globally. Built for developers with Apple-level simplicity, optimized for high success rates, and settled instantly.
          </p>

          {/* Hero CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-20">
            <PillButton 
              variant="default" 
              size="lg" 
              href="/login" 
              testId="hero-button-start"
              className="w-full sm:w-auto bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-white dark:hover:bg-zinc-100 dark:text-zinc-950 px-8 py-6 rounded-full font-medium transition-all shadow-md hover:scale-[1.02] flex items-center justify-center gap-2"
            >
              Get Started Now
              <ArrowRight className="w-4 h-4" />
            </PillButton>
            <PillButton 
              variant="outline" 
              size="lg" 
              href="/docs" 
              testId="hero-button-docs"
              className="w-full sm:w-auto border-zinc-300 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-900 text-zinc-800 dark:text-zinc-200 px-8 py-6 rounded-full font-medium transition-all"
            >
              View Documentation
            </PillButton>
          </div>

          {/* Stats Bar */}
          <div className="grid grid-cols-3 gap-4 md:gap-8 max-w-4xl mx-auto border-t border-zinc-200/50 dark:border-zinc-800/50 pt-10 pb-4">
            <div className="text-center">
              <div className="text-2xl sm:text-4xl font-semibold tracking-tight text-zinc-900 dark:text-white">10K+</div>
              <div className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-1 font-medium">Active Merchants</div>
            </div>
            <div className="text-center">
              <div className="text-2xl sm:text-4xl font-semibold tracking-tight text-zinc-900 dark:text-white">₹500Cr+</div>
              <div className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-1 font-medium">Processed</div>
            </div>
            <div className="text-center">
              <div className="text-2xl sm:text-4xl font-semibold tracking-tight text-zinc-900 dark:text-white">99.99%</div>
              <div className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-1 font-medium">API Uptime</div>
            </div>
          </div>

        </div>
      </section>

      {/* Interactive Payment Playground */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 relative z-10 border-t border-zinc-200/50 dark:border-zinc-800/50 bg-zinc-100/50 dark:bg-zinc-950/30">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <span className="text-xs font-semibold tracking-widest text-blue-500 dark:text-blue-400 uppercase">
              Developer Playground
            </span>
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-zinc-900 dark:text-white mt-3">
              Experience the Checkout in Real-Time
            </h2>
            <p className="text-zinc-500 dark:text-zinc-400 max-w-2xl mx-auto mt-4 text-base">
              Try out the payment simulator on the left. The mock checkout API on the right reflects your integration dynamically.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch max-w-5xl mx-auto">
            {/* Interactive Checkout Terminal */}
            <div className="lg:col-span-5 flex">
              <GlassCard className="w-full p-6 flex flex-col justify-between border-zinc-200/80 dark:border-zinc-800/80 shadow-2xl relative overflow-hidden" glow>
                
                {/* Visual Glass Accent */}
                <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/10 dark:bg-blue-600/10 rounded-full blur-2xl" />

                <div>
                  {/* Checkout Header */}
                  <div className="flex items-center justify-between pb-4 border-b border-zinc-200/60 dark:border-zinc-800/60 mb-6">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="text-xs font-semibold tracking-wider text-zinc-500 dark:text-zinc-400 uppercase">Secure Sandbox Checkout</span>
                    </div>
                    <span className="text-xs font-bold text-zinc-900 dark:text-white bg-zinc-200/60 dark:bg-zinc-800/60 px-2 py-0.5 rounded-md">TEST MODE</span>
                  </div>

                  {/* Payment Method Selector */}
                  <div className="flex bg-zinc-200/50 dark:bg-zinc-900/50 p-1 rounded-full mb-6">
                    <button
                      onClick={() => setPayMethod("upi")}
                      className={`flex-1 py-2 text-xs font-medium rounded-full transition-all duration-300 ${
                        payMethod === "upi"
                          ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm"
                          : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200"
                      }`}
                    >
                      UPI / GPay / PhonePe
                    </button>
                    <button
                      onClick={() => setPayMethod("card")}
                      className={`flex-1 py-2 text-xs font-medium rounded-full transition-all duration-300 ${
                        payMethod === "card"
                          ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm"
                          : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200"
                      }`}
                    >
                      Credit/Debit Card
                    </button>
                  </div>

                  {/* Input form */}
                  {payStatus === "idle" && (
                    <form onSubmit={handlePayment} className="space-y-4">
                      <div>
                        <label className="block text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5">
                          Amount (INR)
                        </label>
                        <input
                          type="number"
                          value={payAmount}
                          onChange={(e) => setPayAmount(e.target.value)}
                          className="w-full bg-zinc-100/50 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 text-zinc-900 dark:text-white font-medium"
                          placeholder="Amount in INR"
                          min="1"
                          required
                        />
                      </div>

                      {payMethod === "upi" ? (
                        <div>
                          <label className="block text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5">
                            UPI ID
                          </label>
                          <input
                            type="text"
                            defaultValue="karthik@okaxis"
                            className="w-full bg-zinc-100/50 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 text-zinc-900 dark:text-white"
                            placeholder="e.g. name@upi"
                            required
                          />
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <div>
                            <label className="block text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5">
                              Card Number
                            </label>
                            <input
                              type="text"
                              maxLength={19}
                              defaultValue="4111 2222 3333 4444"
                              className="w-full bg-zinc-100/50 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 text-zinc-900 dark:text-white font-mono"
                              placeholder="4111 2222 3333 4444"
                              required
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5">
                                Expiry
                              </label>
                              <input
                                type="text"
                                maxLength={5}
                                defaultValue="12/29"
                                className="w-full bg-zinc-100/50 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 text-zinc-900 dark:text-white"
                                placeholder="MM/YY"
                                required
                              />
                            </div>
                            <div>
                              <label className="block text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5">
                                CVV
                              </label>
                              <input
                                type="password"
                                maxLength={3}
                                defaultValue="123"
                                className="w-full bg-zinc-100/50 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 text-zinc-900 dark:text-white"
                                placeholder="•••"
                                required
                              />
                            </div>
                          </div>
                        </div>
                      )}

                      <button
                        type="submit"
                        className="w-full bg-blue-600 hover:bg-blue-500 text-white font-medium py-3 px-4 rounded-xl shadow-lg shadow-blue-500/25 transition-all duration-300 flex items-center justify-center gap-2 mt-4 hover:scale-[1.01]"
                      >
                        <Lock className="w-4 h-4" />
                        Pay ₹{parseFloat(payAmount || "0").toLocaleString("en-IN")}
                      </button>
                    </form>
                  )}

                  {/* Processing State */}
                  {payStatus === "processing" && (
                    <div className="py-12 flex flex-col items-center justify-center space-y-4">
                      <div className="relative">
                        {/* Apple-style circular spinner */}
                        <svg className="animate-spin w-12 h-12 text-blue-500" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                      </div>
                      <p className="text-sm font-medium text-zinc-600 dark:text-zinc-300">Authorizing payment with bank...</p>
                    </div>
                  )}

                  {/* Success State */}
                  {payStatus === "success" && (
                    <div className="py-8 flex flex-col items-center justify-center space-y-5 animate-scale-up">
                      <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950/50 border border-emerald-500/30 flex items-center justify-center">
                        <Check className="w-8 h-8 text-emerald-500 dark:text-emerald-400 stroke-[3]" />
                      </div>
                      
                      <div className="text-center">
                        <h4 className="text-lg font-bold text-zinc-900 dark:text-white">Payment Successful</h4>
                        <p className="text-xs text-zinc-500 mt-1">Order ID: ztk_order_{Math.random().toString(36).substring(7)}</p>
                      </div>

                      <div className="w-full bg-zinc-100 dark:bg-zinc-900/60 border border-zinc-200/50 dark:border-zinc-800/50 rounded-xl p-3 text-xs space-y-1.5 font-mono text-zinc-600 dark:text-zinc-300">
                        <div className="flex justify-between">
                          <span>API Status:</span>
                          <span className="text-emerald-500 font-semibold">200 OK</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Method:</span>
                          <span className="uppercase">{payMethod}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Amount:</span>
                          <span>INR {parseFloat(payAmount || "0").toLocaleString("en-IN")}</span>
                        </div>
                        <div className="flex justify-between border-t border-zinc-200 dark:border-zinc-800 pt-1.5 mt-1.5">
                          <span>Latency:</span>
                          <span className="text-blue-500 font-semibold">{payLatency}ms</span>
                        </div>
                      </div>

                      <button
                        onClick={resetPayment}
                        className="text-xs font-semibold text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 border border-zinc-300 dark:border-zinc-800 px-4 py-2 rounded-lg transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-900"
                      >
                        Make Another Payment
                      </button>
                    </div>
                  )}

                </div>

                <div className="text-center text-[10px] text-zinc-400 dark:text-zinc-500 mt-6 pt-3 border-t border-zinc-200/40 dark:border-zinc-800/40">
                  Secured with Bank-Grade AES-256 GCM Encryption.
                </div>
              </GlassCard>
            </div>

            {/* Code / Developer Side */}
            <div className="lg:col-span-7 flex">
              <GlassCard className="w-full bg-zinc-950 dark:bg-zinc-950 border-zinc-800/80 shadow-2xl p-6 flex flex-col justify-between" glow>
                <div>
                  {/* Language Tabs */}
                  <div className="flex items-center justify-between pb-3 border-b border-zinc-800/80 mb-4">
                    <div className="flex gap-1.5">
                      <button
                        onClick={() => setCodeLang("curl")}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                          codeLang === "curl"
                            ? "bg-zinc-800 text-white"
                            : "text-zinc-400 hover:text-white"
                        }`}
                      >
                        cURL
                      </button>
                      <button
                        onClick={() => setCodeLang("node")}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                          codeLang === "node"
                            ? "bg-zinc-800 text-white"
                            : "text-zinc-400 hover:text-white"
                        }`}
                      >
                        Node.js
                      </button>
                      <button
                        onClick={() => setCodeLang("python")}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                          codeLang === "python"
                            ? "bg-zinc-800 text-white"
                            : "text-zinc-400 hover:text-white"
                        }`}
                      >
                        Python
                      </button>
                    </div>

                    <button
                      onClick={handleCopyCode}
                      className="text-zinc-500 hover:text-zinc-300 p-1.5 hover:bg-zinc-900 rounded-md transition-colors"
                      title="Copy code"
                    >
                      {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>

                  {/* Code editor snippet window */}
                  <div className="relative font-mono text-[13px] leading-relaxed text-zinc-300 bg-zinc-900/30 rounded-xl p-4 overflow-x-auto min-h-[220px]">
                    <pre>
                      <code>
                        {codeLang === "curl" && (
                          <>
                            <span className="text-zinc-500">curl</span> <span className="text-blue-400">-X</span> POST https://api.ztake.in/v1/payments \<br />
                            &nbsp;&nbsp;<span className="text-blue-400">-H</span> <span className="text-amber-300">"Authorization: Bearer sk_live_..."</span> \<br />
                            &nbsp;&nbsp;<span className="text-blue-400">-H</span> <span className="text-amber-300">"Content-Type: application/json"</span> \<br />
                            &nbsp;&nbsp;<span className="text-blue-400">-d</span> <span className="text-zinc-200">'{'{'}</span><br />
                            &nbsp;&nbsp;&nbsp;&nbsp;<span className="text-teal-400">"amount"</span>: <span className="text-pink-400">{payAmount ? parseFloat(payAmount) * 100 : 100000}</span>,<br />
                            &nbsp;&nbsp;&nbsp;&nbsp;<span className="text-teal-400">"currency"</span>: <span className="text-amber-300">"INR"</span>,<br />
                            &nbsp;&nbsp;&nbsp;&nbsp;<span className="text-teal-400">"payment_method"</span>: <span className="text-amber-300">"{payMethod}"</span>,<br />
                            &nbsp;&nbsp;&nbsp;&nbsp;<span className="text-teal-400">"description"</span>: <span className="text-amber-300">"Simulation checkout"</span><br />
                            &nbsp;&nbsp;<span className="text-zinc-200">{'}'}'</span>
                          </>
                        )}
                        {codeLang === "node" && (
                          <>
                            <span className="text-pink-400">const</span> ztake = <span className="text-blue-400">require</span>(<span className="text-amber-300">'ztake-node'</span>)(<span className="text-amber-300">'sk_live_...'</span>);<br /><br />
                            <span className="text-pink-400">await</span> ztake.payments.create(<span className="text-zinc-200">{'{'}</span><br />
                            &nbsp;&nbsp;amount: <span className="text-pink-400">{payAmount ? parseFloat(payAmount) * 100 : 100000}</span>,<br />
                            &nbsp;&nbsp;currency: <span className="text-amber-300">'INR'</span>,<br />
                            &nbsp;&nbsp;payment_method: <span className="text-amber-300">'{payMethod}'</span>,<br />
                            &nbsp;&nbsp;description: <span className="text-amber-300">'Simulation checkout'</span><br />
                            <span className="text-zinc-200">{'}'}</span>);
                          </>
                        )}
                        {codeLang === "python" && (
                          <>
                            <span className="text-pink-400">import</span> ztake<br /><br />
                            ztake.api_key = <span className="text-amber-300">"sk_live_..."</span><br />
                            payment = ztake.Payment.create(<br />
                            &nbsp;&nbsp;&nbsp;&nbsp;amount=<span className="text-pink-400">{payAmount ? parseFloat(payAmount) * 100 : 100000}</span>,<br />
                            &nbsp;&nbsp;&nbsp;&nbsp;currency=<span className="text-amber-300">"INR"</span>,<br />
                            &nbsp;&nbsp;&nbsp;&nbsp;payment_method=<span className="text-amber-300">"{payMethod}"</span>,<br />
                            &nbsp;&nbsp;&nbsp;&nbsp;description=<span className="text-amber-300">"Simulation checkout"</span><br />
                            )
                          </>
                        )}
                      </code>
                    </pre>
                  </div>
                </div>

                {/* API Response Panel */}
                <div className="mt-6 border-t border-zinc-800/80 pt-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-zinc-400 tracking-wider uppercase">Live JSON Response</span>
                    {payStatus === "success" && (
                      <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-950/50 border border-emerald-900/60 px-2 py-0.5 rounded-full animate-pulse">
                        200 OK
                      </span>
                    )}
                  </div>
                  
                  <div className="bg-zinc-900/50 border border-zinc-900 rounded-xl p-4 font-mono text-[12px] text-zinc-400 h-[150px] overflow-y-auto">
                    {payStatus === "idle" && (
                      <span className="text-zinc-600">// Press "Pay" on the simulator to send API request.</span>
                    )}
                    {payStatus === "processing" && (
                      <span className="text-zinc-500 animate-pulse">// POST /v1/payments processing request...</span>
                    )}
                    {payStatus === "success" && (
                      <pre className="text-zinc-300">
                        {`{
  "id": "pay_${Math.random().toString(36).substring(7)}",
  "object": "payment",
  "amount": ${payAmount ? parseFloat(payAmount) * 100 : 100000},
  "currency": "INR",
  "status": "succeeded",
  "method": "${payMethod}",
  "latency_ms": ${payLatency},
  "created_at": ${Math.floor(Date.now() / 1000)}
}`}
                      </pre>
                    )}
                  </div>
                </div>
              </GlassCard>
            </div>
          </div>
        </div>
      </section>

      {/* Bento Grid Features Section */}
      <section id="features" className="py-24 px-4 sm:px-6 lg:px-8 border-t border-zinc-200/50 dark:border-zinc-800/50">
        <div className="max-w-7xl mx-auto">
          
          <div className="text-center mb-16">
            <span className="text-xs font-semibold tracking-widest text-blue-500 dark:text-blue-400 uppercase">
              Engineered for Speed
            </span>
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight text-zinc-900 dark:text-white mt-3">
              Why Choose Ztake
            </h2>
            <p className="text-zinc-500 dark:text-zinc-400 max-w-2xl mx-auto mt-4 text-base md:text-lg">
              Unlock maximum conversions with our optimized bank infrastructure, unified APIs, and enterprise-grade speed.
            </p>
          </div>

          {/* Apple-style Bento Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto">
            
            {/* Box 1 - Big Feature (Payments) */}
            <GlassCard className="md:col-span-2 p-8 border-zinc-200/60 dark:border-zinc-800/60 flex flex-col justify-between group overflow-hidden" glow>
              <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 dark:bg-blue-500/10 rounded-full blur-3xl group-hover:scale-110 transition-transform duration-700" />
              <div>
                <div className="w-12 h-12 rounded-xl bg-blue-500/10 dark:bg-blue-500/20 text-blue-500 flex items-center justify-center mb-6">
                  <CreditCard className="w-6 h-6" />
                </div>
                <h3 className="text-2xl font-bold text-zinc-900 dark:text-white mb-2">
                  Unified Payment Gateway
                </h3>
                <p className="text-zinc-500 dark:text-zinc-400 text-sm max-w-md leading-relaxed">
                  Accept credit/debit cards, UPI, wallets, and net banking across 140+ countries. Installs in minutes and adjusts formatting dynamically to maximize checkouts.
                </p>
              </div>

              {/* Graphic Mockup inside card */}
              <div className="mt-8 pt-6 border-t border-zinc-200/50 dark:border-zinc-900 flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  <span className="text-xs font-semibold text-zinc-500">UPI Smart Routing Active</span>
                </div>
                <div className="flex gap-2">
                  <span className="text-[10px] font-bold text-zinc-500 border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-900 px-2.5 py-1 rounded-md">VISA</span>
                  <span className="text-[10px] font-bold text-zinc-500 border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-900 px-2.5 py-1 rounded-md">MC</span>
                  <span className="text-[10px] font-bold text-zinc-500 border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-900 px-2.5 py-1 rounded-md">RUPAY</span>
                </div>
              </div>
            </GlassCard>

            {/* Box 2 - Small (Security) */}
            <GlassCard className="p-8 border-zinc-200/60 dark:border-zinc-800/60 flex flex-col justify-between group overflow-hidden" glow>
              <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 dark:bg-emerald-500/10 rounded-full blur-2xl" />
              <div>
                <div className="w-12 h-12 rounded-xl bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-500 flex items-center justify-center mb-6">
                  <Shield className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-zinc-900 dark:text-white mb-2">
                  Bank-Grade Shield
                </h3>
                <p className="text-zinc-500 dark:text-zinc-400 text-xs leading-relaxed">
                  PCI-DSS Level 1 compliant infrastructure protecting every transaction. Fully sandboxed and tokens are rotated regularly.
                </p>
              </div>
              <div className="mt-6 flex items-center gap-1.5 text-xs font-semibold text-emerald-500 dark:text-emerald-400">
                <span>ISO 27001 Certified</span>
              </div>
            </GlassCard>

            {/* Box 3 - Small (Speed) */}
            <GlassCard className="p-8 border-zinc-200/60 dark:border-zinc-800/60 flex flex-col justify-between group overflow-hidden" glow>
              <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 dark:bg-amber-500/10 rounded-full blur-2xl" />
              <div>
                <div className="w-12 h-12 rounded-xl bg-amber-500/10 dark:bg-amber-500/20 text-amber-500 flex items-center justify-center mb-6">
                  <Zap className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-zinc-900 dark:text-white mb-2">
                  Lightning Processing
                </h3>
                <p className="text-zinc-500 dark:text-zinc-400 text-xs leading-relaxed">
                  Payments clear in milliseconds. Our automated multi-path routing guarantees standard checkout failures are bypassed automatically.
                </p>
              </div>
              <div className="mt-6 text-xs text-zinc-400 dark:text-zinc-500 font-mono">
                Avg Latency: &lt; 18ms
              </div>
            </GlassCard>

            {/* Box 4 - Big Feature (Global Reach) */}
            <GlassCard className="md:col-span-2 p-8 border-zinc-200/60 dark:border-zinc-800/60 flex flex-col justify-between group overflow-hidden" glow>
              <div className="absolute top-0 right-0 w-64 h-64 bg-violet-500/5 dark:bg-violet-500/10 rounded-full blur-3xl group-hover:scale-110 transition-transform duration-700" />
              <div>
                <div className="w-12 h-12 rounded-xl bg-violet-500/10 dark:bg-violet-500/20 text-violet-500 flex items-center justify-center mb-6">
                  <Globe className="w-6 h-6" />
                </div>
                <h3 className="text-2xl font-bold text-zinc-900 dark:text-white mb-2">
                  Global Multi-Currency Settlements
                </h3>
                <p className="text-zinc-500 dark:text-zinc-400 text-sm max-w-md leading-relaxed">
                  Clear, accept, and disburse in over 140 currencies. Localized checkout flows dynamically match users' locations and languages, with competitive FX rates.
                </p>
              </div>
              
              {/* Floating badges */}
              <div className="mt-8 pt-4 flex gap-3 flex-wrap">
                <span className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 bg-zinc-200/60 dark:bg-zinc-800/40 border border-zinc-300/40 dark:border-zinc-800/50 px-3 py-1 rounded-full">USD ($)</span>
                <span className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 bg-zinc-200/60 dark:bg-zinc-800/40 border border-zinc-300/40 dark:border-zinc-800/50 px-3 py-1 rounded-full">EUR (€)</span>
                <span className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 bg-zinc-200/60 dark:bg-zinc-800/40 border border-zinc-300/40 dark:border-zinc-800/50 px-3 py-1 rounded-full">INR (₹)</span>
                <span className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 bg-zinc-200/60 dark:bg-zinc-800/40 border border-zinc-300/40 dark:border-zinc-800/50 px-3 py-1 rounded-full">GBP (£)</span>
              </div>
            </GlassCard>

          </div>
        </div>
      </section>

      {/* Tabbed Solutions Section */}
      <section id="solutions" className="py-24 px-4 sm:px-6 lg:px-8 bg-zinc-100/50 dark:bg-zinc-950/20 border-t border-zinc-200/50 dark:border-zinc-800/50">
        <div className="max-w-7xl mx-auto">
          
          <div className="text-center mb-16">
            <span className="text-xs font-semibold tracking-widest text-blue-500 dark:text-blue-400 uppercase">
              Unified Platform
            </span>
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight text-zinc-900 dark:text-white mt-3">
              One Dashboard. Infinite Possibilities.
            </h2>
            <p className="text-zinc-500 dark:text-zinc-400 max-w-2xl mx-auto mt-4 text-base">
              Manage your checkout, recurring invoice collections, corporate expenses, and instant developer integrations under a single visual dashboard.
            </p>
          </div>

          {/* Apple style slider tabs */}
          <div className="flex justify-center mb-12">
            <div className="flex bg-zinc-200/60 dark:bg-zinc-900/60 p-1.5 rounded-2xl border border-zinc-300/30 dark:border-zinc-800/40 shadow-xs max-w-lg w-full">
              <button
                onClick={() => setSolutionTab("checkout")}
                className={`flex-1 py-3 px-4 text-xs sm:text-sm font-semibold rounded-xl transition-all duration-300 ${
                  solutionTab === "checkout"
                    ? "bg-white dark:bg-zinc-850 text-zinc-900 dark:text-white shadow-md scale-[1.01]"
                    : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
                }`}
              >
                Online Checkout
              </button>
              <button
                onClick={() => setSolutionTab("billing")}
                className={`flex-1 py-3 px-4 text-xs sm:text-sm font-semibold rounded-xl transition-all duration-300 ${
                  solutionTab === "billing"
                    ? "bg-white dark:bg-zinc-850 text-zinc-900 dark:text-white shadow-md scale-[1.01]"
                    : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
                }`}
              >
                Subscriptions
              </button>
              <button
                onClick={() => setSolutionTab("banking")}
                className={`flex-1 py-3 px-4 text-xs sm:text-sm font-semibold rounded-xl transition-all duration-300 ${
                  solutionTab === "banking"
                    ? "bg-white dark:bg-zinc-850 text-zinc-900 dark:text-white shadow-md scale-[1.01]"
                    : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
                }`}
              >
                ZtakeX Banking
              </button>
            </div>
          </div>

          {/* Tab content display */}
          <div className="max-w-4xl mx-auto">
            {solutionTab === "checkout" && (
              <GlassCard className="p-8 border-zinc-200/60 dark:border-zinc-800/60 flex flex-col md:flex-row gap-8 items-center animate-scale-up" glow>
                <div className="flex-1 space-y-4">
                  <span className="text-xs font-bold text-blue-500 dark:text-blue-400 uppercase tracking-widest">
                    Checkout SDK
                  </span>
                  <h3 className="text-2xl font-bold text-zinc-900 dark:text-white">
                    Accept online payments in seconds
                  </h3>
                  <p className="text-zinc-500 dark:text-zinc-400 text-sm leading-relaxed">
                    Insert a pre-built modal checkout on your website. Zero redirect flows guarantee your customer never leaves your page, leading to a 15% average increase in checkout completion rates.
                  </p>
                  <div className="space-y-2 pt-2">
                    <div className="flex items-center text-xs text-zinc-600 dark:text-zinc-300">
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mr-2" />
                      Prebuilt modal or fully customized API styles
                    </div>
                    <div className="flex items-center text-xs text-zinc-600 dark:text-zinc-300">
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mr-2" />
                      Automatic support for UPI, Cards, netbanking & BNPL
                    </div>
                  </div>
                  <div className="pt-2">
                    <PillButton variant="default" href="/login" className="bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-white dark:hover:bg-zinc-100 dark:text-zinc-950 text-xs font-semibold px-4 py-2.5 rounded-lg flex items-center gap-1.5 max-w-[150px]">
                      Learn More
                      <ChevronRight className="w-4 h-4" />
                    </PillButton>
                  </div>
                </div>
                
                <div className="flex-1 w-full flex justify-center">
                  <div className="w-full max-w-[340px] bg-zinc-900 border border-zinc-800 rounded-2xl p-5 shadow-2xl space-y-4 font-sans text-zinc-300">
                    <div className="flex justify-between items-center border-b border-zinc-800 pb-3">
                      <span className="text-xs font-bold tracking-wider text-zinc-500 uppercase">Payment Sheet</span>
                      <span className="text-xs text-zinc-400">Total: ₹1,000</span>
                    </div>
                    <div className="space-y-2">
                      <div className="bg-zinc-800/40 hover:bg-zinc-800/80 border border-zinc-800 rounded-xl p-3 flex items-center justify-between cursor-pointer transition-colors">
                        <div className="flex items-center gap-2.5">
                          <Smartphone className="w-4 h-4 text-violet-400" />
                          <span className="text-xs font-semibold text-white">UPI Pay</span>
                        </div>
                        <ChevronRight className="w-3.5 h-3.5 text-zinc-600" />
                      </div>
                      <div className="bg-zinc-800/40 hover:bg-zinc-800/80 border border-zinc-800 rounded-xl p-3 flex items-center justify-between cursor-pointer transition-colors">
                        <div className="flex items-center gap-2.5">
                          <CreditCard className="w-4 h-4 text-blue-400" />
                          <span className="text-xs font-semibold text-white">Card Payment</span>
                        </div>
                        <ChevronRight className="w-3.5 h-3.5 text-zinc-600" />
                      </div>
                    </div>
                  </div>
                </div>
              </GlassCard>
            )}

            {solutionTab === "billing" && (
              <GlassCard className="p-8 border-zinc-200/60 dark:border-zinc-800/60 flex flex-col md:flex-row gap-8 items-center animate-scale-up" glow>
                <div className="flex-1 space-y-4">
                  <span className="text-xs font-bold text-amber-500 dark:text-amber-400 uppercase tracking-widest">
                    Subscriptions
                  </span>
                  <h3 className="text-2xl font-bold text-zinc-900 dark:text-white">
                    Automate recurring customer billing
                  </h3>
                  <p className="text-zinc-500 dark:text-zinc-400 text-sm leading-relaxed">
                    Set up daily, monthly, or customized recurring subscription payments. Auto-dunning engine retries failed cards instantly, notifying subscribers transparently to retain active memberships.
                  </p>
                  <div className="space-y-2 pt-2">
                    <div className="flex items-center text-xs text-zinc-600 dark:text-zinc-300">
                      <div className="w-1.5 h-1.5 rounded-full bg-amber-500 mr-2" />
                      Custom trials, tiers, discounts, and cycles
                    </div>
                    <div className="flex items-center text-xs text-zinc-600 dark:text-zinc-300">
                      <div className="w-1.5 h-1.5 rounded-full bg-amber-500 mr-2" />
                      Automated invoicing and taxation compliance
                    </div>
                  </div>
                  <div className="pt-2">
                    <PillButton variant="default" href="/login" className="bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-white dark:hover:bg-zinc-100 dark:text-zinc-950 text-xs font-semibold px-4 py-2.5 rounded-lg flex items-center gap-1.5 max-w-[150px]">
                      Learn More
                      <ChevronRight className="w-4 h-4" />
                    </PillButton>
                  </div>
                </div>

                <div className="flex-1 w-full flex justify-center">
                  <div className="w-full max-w-[340px] bg-zinc-900 border border-zinc-800 rounded-2xl p-5 shadow-2xl space-y-4 font-sans text-zinc-300">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold tracking-wider text-zinc-500 uppercase font-mono">Monthly Revenue</span>
                      <span className="text-xs text-emerald-400 font-semibold">+18.5%</span>
                    </div>
                    <div className="h-[90px] w-full flex items-end justify-between gap-1.5 pt-3">
                      <div className="w-full bg-zinc-800 h-[30%] rounded-t-sm" />
                      <div className="w-full bg-zinc-800 h-[45%] rounded-t-sm" />
                      <div className="w-full bg-zinc-800 h-[60%] rounded-t-sm" />
                      <div className="w-full bg-blue-600/80 h-[85%] rounded-t-sm" />
                      <div className="w-full bg-blue-500 h-[100%] rounded-t-sm" />
                    </div>
                    <div className="text-center">
                      <span className="text-lg font-bold text-white">₹12,48,500</span>
                      <p className="text-[10px] text-zinc-500 mt-0.5">Recurring active value this period</p>
                    </div>
                  </div>
                </div>
              </GlassCard>
            )}

            {solutionTab === "banking" && (
              <GlassCard className="p-8 border-zinc-200/60 dark:border-zinc-800/60 flex flex-col md:flex-row gap-8 items-center animate-scale-up" glow>
                <div className="flex-1 space-y-4">
                  <span className="text-xs font-bold text-violet-500 dark:text-violet-400 uppercase tracking-widest">
                    Corporate Banking
                  </span>
                  <h3 className="text-2xl font-bold text-zinc-900 dark:text-white">
                    ZtakeX Business Accounts
                  </h3>
                  <p className="text-zinc-500 dark:text-zinc-400 text-sm leading-relaxed">
                    Set up payouts, manage corporate credit accounts, track ledger cards, and clear bulk merchant settlements instantly. Integrate seamlessly with your existing accounting ledger systems.
                  </p>
                  <div className="space-y-2 pt-2">
                    <div className="flex items-center text-xs text-zinc-600 dark:text-zinc-300">
                      <div className="w-1.5 h-1.5 rounded-full bg-violet-500 mr-2" />
                      24/7 instant IMPS, NEFT, and RTGS payouts
                    </div>
                    <div className="flex items-center text-xs text-zinc-600 dark:text-zinc-300">
                      <div className="w-1.5 h-1.5 rounded-full bg-violet-500 mr-2" />
                      Corporate spend cards with custom budget limits
                    </div>
                  </div>
                  <div className="pt-2">
                    <PillButton variant="default" href="/login" className="bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-white dark:hover:bg-zinc-100 dark:text-zinc-950 text-xs font-semibold px-4 py-2.5 rounded-lg flex items-center gap-1.5 max-w-[150px]">
                      Learn More
                      <ChevronRight className="w-4 h-4" />
                    </PillButton>
                  </div>
                </div>

                <div className="flex-1 w-full flex justify-center">
                  <div className="w-full max-w-[340px] h-[190px] rounded-2xl bg-gradient-to-tr from-violet-600 to-indigo-600 p-6 shadow-2xl relative flex flex-col justify-between overflow-hidden">
                    <div className="absolute top-0 right-0 w-44 h-44 bg-white/5 rounded-full blur-xl" />
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-[10px] text-violet-200 font-semibold tracking-widest uppercase">ZtakeX Platinum</span>
                        <div className="text-lg font-bold text-white mt-1">Corporate Card</div>
                      </div>
                      <div className="text-white font-bold italic tracking-tighter">ztake</div>
                    </div>
                    <div className="text-white font-mono text-sm tracking-wider">
                      •••• •••• •••• 8402
                    </div>
                    <div className="flex justify-between items-end">
                      <div>
                        <div className="text-[8px] text-violet-200 uppercase font-semibold">Card Holder</div>
                        <div className="text-xs font-semibold text-white mt-0.5">Karthik R.</div>
                      </div>
                      <div className="w-8 h-5 bg-white/20 rounded-md backdrop-blur-xs flex items-center justify-center">
                        <span className="text-[7px] text-white font-bold">VISA</span>
                      </div>
                    </div>
                  </div>
                </div>
              </GlassCard>
            )}
          </div>

        </div>
      </section>

      {/* Testimonials Section */}
      <section id="testimonials" className="py-24 px-4 sm:px-6 lg:px-8 border-t border-zinc-200/50 dark:border-zinc-800/50">
        <div className="max-w-7xl mx-auto">
          
          <div className="text-center mb-16">
            <span className="text-xs font-semibold tracking-widest text-blue-500 dark:text-blue-400 uppercase">
              Proven Results
            </span>
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight text-zinc-900 dark:text-white mt-3">
              Trusted by Innovators
            </h2>
            <p className="text-zinc-500 dark:text-zinc-400 max-w-2xl mx-auto mt-4 text-base">
              See how modern fast-scaling companies optimize checking conversion metrics with Ztake PG.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            
            <GlassCard className="p-8 border-zinc-200/60 dark:border-zinc-800/60 flex flex-col justify-between" glow>
              <p className="text-zinc-600 dark:text-zinc-300 text-sm italic leading-relaxed">
                "Ztake has revolutionized our payment processing. The sandbox testing is exceptional, and API response speed is consistently under 20 milliseconds."
              </p>
              <div className="flex items-center gap-3 mt-6 pt-4 border-t border-zinc-200/50 dark:border-zinc-850">
                <div className="w-9 h-9 rounded-full bg-zinc-300 dark:bg-zinc-800 flex items-center justify-center font-bold text-xs text-zinc-700 dark:text-zinc-300">RK</div>
                <div>
                  <h4 className="text-xs font-bold text-zinc-900 dark:text-white">Rajesh Kumar</h4>
                  <p className="text-[10px] text-zinc-500 mt-0.5">CTO, TechStart Solutions</p>
                </div>
              </div>
            </GlassCard>

            <GlassCard className="p-8 border-zinc-200/60 dark:border-zinc-800/60 flex flex-col justify-between" glow>
              <p className="text-zinc-600 dark:text-zinc-300 text-sm italic leading-relaxed">
                "Outstanding reliability. Our transaction success rates spiked 14% higher instantly after switching. Smart routing avoids routing failures seamlessly."
              </p>
              <div className="flex items-center gap-3 mt-6 pt-4 border-t border-zinc-200/50 dark:border-zinc-850">
                <div className="w-9 h-9 rounded-full bg-zinc-300 dark:bg-zinc-800 flex items-center justify-center font-bold text-xs text-zinc-700 dark:text-zinc-300">PS</div>
                <div>
                  <h4 className="text-xs font-bold text-zinc-900 dark:text-white">Priya Sharma</h4>
                  <p className="text-[10px] text-zinc-500 mt-0.5">Ops Director, E-commerce Plus</p>
                </div>
              </div>
            </GlassCard>

            <GlassCard className="p-8 border-zinc-200/60 dark:border-zinc-800/60 flex flex-col justify-between" glow>
              <p className="text-zinc-600 dark:text-zinc-300 text-sm italic leading-relaxed">
                "The webhooks and detailed transaction logs dashboard provide incredible insights. Ztake is by far the cleanest payment product built for engineers."
              </p>
              <div className="flex items-center gap-3 mt-6 pt-4 border-t border-zinc-200/50 dark:border-zinc-850">
                <div className="w-9 h-9 rounded-full bg-zinc-300 dark:bg-zinc-800 flex items-center justify-center font-bold text-xs text-zinc-700 dark:text-zinc-300">AP</div>
                <div>
                  <h4 className="text-xs font-bold text-zinc-900 dark:text-white">Amit Patel</h4>
                  <p className="text-[10px] text-zinc-500 mt-0.5">Founder, Digital Ventures</p>
                </div>
              </div>
            </GlassCard>

          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section id="get-started" className="py-24 px-4 sm:px-6 lg:px-8 border-t border-zinc-200/50 dark:border-zinc-800/50">
        <div className="max-w-4xl mx-auto">
          <GlassCard className="p-12 text-center border-zinc-200/60 dark:border-zinc-800/60 relative overflow-hidden" glow>
            {/* Background Glow */}
            <div className="absolute top-[-20%] left-[-20%] w-[400px] h-[400px] bg-blue-500/10 rounded-full blur-[100px]" />
            <div className="absolute bottom-[-20%] right-[-20%] w-[400px] h-[400px] bg-violet-500/10 rounded-full blur-[100px]" />

            <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-zinc-900 dark:text-white mb-4 relative z-10">
              Ready to Upgrade Your Payments?
            </h2>
            <p className="text-zinc-500 dark:text-zinc-400 text-sm md:text-base mb-10 max-w-xl mx-auto leading-relaxed relative z-10">
              Join thousands of businesses already processing securely with zero downtime. Get approved and start in under 10 minutes.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 relative z-10">
              <PillButton 
                variant="default" 
                size="lg" 
                href="/login" 
                testId="cta-button-trial"
                className="w-full sm:w-auto bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-white dark:hover:bg-zinc-100 dark:text-zinc-950 px-8 py-5 rounded-full font-semibold transition-all hover:scale-[1.01]"
              >
                Start Free Trial
              </PillButton>
              <PillButton 
                variant="outline" 
                size="lg" 
                href="/contact" 
                testId="cta-button-sales"
                className="w-full sm:w-auto border-zinc-300 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-900 text-zinc-800 dark:text-zinc-200 px-8 py-5 rounded-full font-semibold transition-all"
              >
                Contact Sales
              </PillButton>
            </div>
          </GlassCard>
        </div>
      </section>

      {/* Trust Compliance Section */}
      <section className="py-12 border-t border-zinc-200/50 dark:border-zinc-850 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            <div className="space-y-1.5">
              <Shield className="w-5 h-5 text-zinc-400 dark:text-zinc-600 mx-auto" />
              <div className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">PCI-DSS Certified</div>
            </div>
            <div className="space-y-1.5">
              <Activity className="w-5 h-5 text-zinc-400 dark:text-zinc-600 mx-auto" />
              <div className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">99.99% Uptime Guarantee</div>
            </div>
            <div className="space-y-1.5">
              <Users className="w-5 h-5 text-zinc-400 dark:text-zinc-600 mx-auto" />
              <div className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">24/7 Dedicated Support</div>
            </div>
            <div className="space-y-1.5">
              <Lock className="w-5 h-5 text-zinc-400 dark:text-zinc-600 mx-auto" />
              <div className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">ISO 27001 Certified</div>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
}
