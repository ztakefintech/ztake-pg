'use client';

import { Navbar } from "@/components/marketing/Navbar";
import { Footer } from "@/components/marketing/Footer";

export default function ApiUsePolicyPage() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <Navbar />
      
      <main className="flex-1 pt-28 pb-16 px-4 md:px-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight bg-gradient-to-r from-zinc-950 to-zinc-600 dark:from-white dark:to-zinc-400 bg-clip-text text-transparent mb-4">
              API Terms of Use
            </h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Last updated: {new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>

          {/* Policy Panels */}
          <div className="space-y-8">
            {/* 1. Purpose & Scope */}
            <section className="glass-card p-6 md:p-8 rounded-2xl">
              <h2 className="text-xl md:text-2xl font-bold text-zinc-900 dark:text-white mb-4">
                1. Purpose &amp; Scope of Ztake APIs
              </h2>
              <div className="text-zinc-650 dark:text-zinc-300 leading-relaxed space-y-3 text-sm md:text-base">
                <p>
                  Ztake APIs enable You to collect payments via UPI, Cards, Netbanking, Wallets, initiate payouts &amp; settlements, verify bank accounts and identity data, retrieve transaction logs, receive webhook notifications, generate tokens and manage users, and access merchant dashboards programmatically.
                </p>
                <p className="font-semibold text-zinc-900 dark:text-white">
                  APIs must be used solely for legitimate business operations approved by Ztake.
                </p>
              </div>
            </section>

            {/* 2. API Credentials & Security */}
            <section className="glass-card p-6 md:p-8 rounded-2xl">
              <h2 className="text-xl md:text-2xl font-bold text-zinc-900 dark:text-white mb-4">
                2. API Credentials &amp; Security Requirements
              </h2>
              <div className="text-zinc-650 dark:text-zinc-300 leading-relaxed space-y-3 text-sm md:text-base">
                <p>
                  You are responsible for securing API Keys, Access Tokens, and Secrets. Credentials must never be shared publicly, embedded in client-side code, or stored insecurely.
                </p>
                <p>
                  If You suspect key leakage, You must immediately rotate Your keys, inform Ztake, and review access logs. You must implement HTTPS, secure storage, authentication layers, and IP whitelisting. Failure to follow security practices may result in API suspension.
                </p>
              </div>
            </section>

            {/* 3. Permitted Uses */}
            <section className="glass-card p-6 md:p-8 rounded-2xl">
              <h2 className="text-xl md:text-2xl font-bold text-zinc-900 dark:text-white mb-4">
                3. Permitted Uses of API
              </h2>
              <div className="text-zinc-650 dark:text-zinc-300 leading-relaxed space-y-3 text-sm md:text-base">
                <p>You may use Ztake APIs to:</p>
                <ul className="list-disc list-inside space-y-1.5 pl-2 text-zinc-600 dark:text-zinc-400">
                  <li>Process legitimate customer payments.</li>
                  <li>Integrate Ztake into Your website/app checkouts.</li>
                  <li>Automate backend payment and payout workflows.</li>
                  <li>Use the sandbox environment for testing and development.</li>
                  <li>Create secure server-side integrations.</li>
                  <li>Receive secure webhook event notifications.</li>
                </ul>
                <p className="mt-2 text-zinc-900 dark:text-white font-medium">
                  All uses must be fully compliant with Indian laws and Ztake's policies.
                </p>
              </div>
            </section>

            {/* 4. Prohibited Uses */}
            <section className="glass-card p-6 md:p-8 rounded-2xl">
              <h2 className="text-xl md:text-2xl font-bold text-zinc-900 dark:text-white mb-4">
                4. Prohibited Uses of API
              </h2>
              <div className="text-zinc-650 dark:text-zinc-300 leading-relaxed space-y-3 text-sm md:text-base">
                <p>You must NOT use the APIs to:</p>
                <ul className="list-disc list-inside space-y-1.5 pl-2 text-zinc-600 dark:text-zinc-400">
                  <li>Conduct fraudulent, illegal, or unauthorized activities.</li>
                  <li>Process payments for prohibited business categories (gambling, drugs, pornography).</li>
                  <li>Misuse, spam, or overload Ztake servers.</li>
                  <li>Share, rent, or resell Ztake APIs without written permission.</li>
                  <li>Perform reverse engineering, decompilation, or vulnerability scanning.</li>
                  <li>Expose credentials in client-side frontend code.</li>
                  <li>Tamper with transaction parameters or signature responses.</li>
                  <li>Conduct transaction laundering or masking.</li>
                </ul>
                <p className="mt-2 text-xs text-red-500 font-semibold italic">
                  Violations will result in immediate API access termination and potential legal action.
                </p>
              </div>
            </section>

            {/* 5. Rate Limits */}
            <section className="glass-card p-6 md:p-8 rounded-2xl">
              <h2 className="text-xl md:text-2xl font-bold text-zinc-900 dark:text-white mb-4">
                5. Rate Limits &amp; Performance
              </h2>
              <div className="text-zinc-650 dark:text-zinc-300 leading-relaxed space-y-3 text-sm md:text-base">
                <p>
                  Ztake APIs include rate limits to ensure platform stability and protect resources.
                </p>
                <p>
                  You agree to respect published rate limits, avoid sending bulk API requests unnecessarily, use batching wherever allowed, and implement retry logic with exponential backoff. Repeated rate limit abuse may result in throttling or suspension.
                </p>
              </div>
            </section>

            {/* 6. Webhooks Management */}
            <section className="glass-card p-6 md:p-8 rounded-2xl">
              <h2 className="text-xl md:text-2xl font-bold text-zinc-900 dark:text-white mb-4">
                6. Webhooks Management
              </h2>
              <div className="text-zinc-650 dark:text-zinc-300 leading-relaxed space-y-3 text-sm md:text-base">
                <p>
                  You must provide a secure HTTPS webhook URL and validate Ztake signatures on all events.
                </p>
                <p>
                  Duplicate webhook events must be handled idempotently. Failure to acknowledge events may lead to retries or webhook disabling.
                </p>
                <p>
                  Webhooks may include events such as: <em>Payment Success/Failure, Refund Status, Payout Status, Settlement Alerts, KYC Changes, and Fraud Flags</em>. You are responsible for securing Your webhook server.
                </p>
              </div>
            </section>

            {/* 7. Data Usage & Privacy */}
            <section className="glass-card p-6 md:p-8 rounded-2xl">
              <h2 className="text-xl md:text-2xl font-bold text-zinc-900 dark:text-white mb-4">
                7. Data Usage &amp; Privacy
              </h2>
              <div className="text-zinc-650 dark:text-zinc-300 leading-relaxed space-y-3 text-sm md:text-base">
                <p>
                  All data received via APIs must be used only for business purposes approved by Ztake. You must comply with Ztake's Privacy Policy &amp; Indian data protection laws.
                </p>
                <p>
                  You may not store card details, raw Aadhaar, PINs, passwords, or other sensitive information. User data cannot be sold, rented, or used for profiling without consent. Ztake reserves the right to audit Your data usage practices.
                </p>
              </div>
            </section>

            {/* 8. Suspension & Termination */}
            <section className="glass-card p-6 md:p-8 rounded-2xl">
              <h2 className="text-xl md:text-2xl font-bold text-zinc-900 dark:text-white mb-4">
                8. API Suspension &amp; Termination
              </h2>
              <div className="text-zinc-650 dark:text-zinc-300 leading-relaxed space-y-3 text-sm md:text-base">
                <p>
                  Ztake may suspend or terminate API access without notice if:
                </p>
                <ul className="list-disc list-inside space-y-1 pl-2 text-zinc-600 dark:text-zinc-400 text-sm">
                  <li>Fraud or security breach is detected.</li>
                  <li>API misuse or rate limit abuse occurs.</li>
                  <li>Risk policies or prohibited items constraints are violated.</li>
                  <li>Chargeback fraud ratios increase significantly.</li>
                  <li>KYC documents are found to be invalid or expired.</li>
                  <li>Regulatory or bank partner orders require action.</li>
                </ul>
              </div>
            </section>

            {/* Developer Support */}
            <section className="glass-card p-6 md:p-8 rounded-2xl bg-gradient-to-br from-zinc-500/5 to-zinc-900/5">
              <h2 className="text-xl md:text-2xl font-bold text-zinc-900 dark:text-white mb-4">
                Developer Support &amp; Resources
              </h2>
              <div className="text-zinc-650 dark:text-zinc-300 leading-relaxed space-y-4 text-sm md:text-base">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="bg-zinc-50 dark:bg-zinc-900/40 p-4 rounded-xl border border-zinc-100 dark:border-zinc-800 text-center">
                    <div className="text-xs text-zinc-400 font-semibold uppercase mb-1">Dev Support</div>
                    <a href="mailto:dev@ztake.in" className="font-semibold text-zinc-900 dark:text-white hover:underline">
                      dev@ztake.in
                    </a>
                  </div>
                  <div className="bg-zinc-50 dark:bg-zinc-900/40 p-4 rounded-xl border border-zinc-100 dark:border-zinc-800 text-center">
                    <div className="text-xs text-zinc-400 font-semibold uppercase mb-1">Tech Support</div>
                    <a href="mailto:support@ztake.in" className="font-semibold text-zinc-900 dark:text-white hover:underline">
                      support@ztake.in
                    </a>
                  </div>
                  <div className="bg-zinc-50 dark:bg-zinc-900/40 p-4 rounded-xl border border-zinc-100 dark:border-zinc-800 text-center">
                    <div className="text-xs text-zinc-400 font-semibold uppercase mb-1">Compliance</div>
                    <a href="mailto:compliance@ztake.in" className="font-semibold text-zinc-900 dark:text-white hover:underline">
                      compliance@ztake.in
                    </a>
                  </div>
                </div>
                <div className="text-center pt-2 text-xs text-zinc-500">
                  Ztake Fintech Private Limited | Business Hub, Technology Park, Sector 90, Noida, Uttar Pradesh, India – 201305.
                </div>
              </div>
            </section>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
