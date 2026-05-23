'use client';

import { Navbar } from "@/components/marketing/Navbar";
import { Footer } from "@/components/marketing/Footer";

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <Navbar />
      
      <main className="flex-1 pt-28 pb-16 px-4 md:px-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight bg-gradient-to-r from-zinc-950 to-zinc-600 dark:from-white dark:to-zinc-400 bg-clip-text text-transparent mb-4">
              Privacy Policy
            </h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Last updated: {new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>

          {/* Policy Panels */}
          <div className="space-y-8">
            {/* Who We Are */}
            <section className="glass-card p-6 md:p-8 rounded-2xl">
              <h2 className="text-xl md:text-2xl font-bold text-zinc-900 dark:text-white mb-4">
                Who We Are
              </h2>
              <div className="text-zinc-650 dark:text-zinc-300 leading-relaxed space-y-4 text-sm md:text-base">
                <p>
                  Ztake Fintech Private Limited (&quot;Ztake&quot;, &quot;Company&quot;, &quot;We&quot;, &quot;Us&quot;, &quot;Our&quot;) operates as a Payment Aggregator and provides payouts, KYV/KYC verification, risk monitoring, identity validation, and settlement infrastructure to e-commerce platforms, educational institutions, financial service providers, digital marketplaces, and enterprise partners.
                </p>
                <p>
                  <strong>Registered Office:</strong> Business Hub, Technology Park, Sector 90, Noida, Uttar Pradesh, India.
                </p>
                <p>
                  By accessing or using any Ztake website, mobile app, API, dashboard, SDK, partner portal, web-hooks, or affiliated services (&quot;Services&quot;), You (&quot;User&quot;, &quot;You&quot;, &quot;Your&quot;) acknowledge, understand, and agree to the practices described in this Policy.
                </p>
              </div>
            </section>

            {/* Purpose & Vision */}
            <section className="glass-card p-6 md:p-8 rounded-2xl">
              <h2 className="text-xl md:text-2xl font-bold text-zinc-900 dark:text-white mb-4">
                1. Purpose &amp; Vision
              </h2>
              <div className="text-zinc-650 dark:text-zinc-300 leading-relaxed space-y-3 text-sm md:text-base">
                <p>
                  At Ztake, privacy is not a legal requirement — it is a core engineering rule. Every product, algorithm, interface, and workflow is built on the foundation of privacy-by-design and security-by-default.
                </p>
                <p>This Policy explains:</p>
                <ul className="list-disc list-inside space-y-1.5 pl-2 text-zinc-600 dark:text-zinc-400">
                  <li>What data we collect</li>
                  <li>Why we collect it</li>
                  <li>How we secure it</li>
                  <li>When we share it</li>
                  <li>What control you have</li>
                  <li>What rights you can exercise</li>
                  <li>How we keep accountability inside Ztake</li>
                  <li>How to contact us anytime</li>
                </ul>
                <p className="mt-2 font-medium">
                  Ztake commits to minimum data, maximum protection, and absolute clarity.
                </p>
              </div>
            </section>

            {/* Data We Collect */}
            <section className="glass-card p-6 md:p-8 rounded-2xl">
              <h2 className="text-xl md:text-2xl font-bold text-zinc-900 dark:text-white mb-4">
                2. Data We Collect
              </h2>
              <div className="text-zinc-650 dark:text-zinc-300 leading-relaxed space-y-4 text-sm md:text-base">
                <div>
                  <h3 className="font-semibold text-zinc-900 dark:text-white mb-1.5">2.1 Contact Information</h3>
                  <p className="text-zinc-600 dark:text-zinc-400">
                    Full Name, Email Address, Mobile Number, Business Name, Billing &amp; Registered Address.
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold text-zinc-900 dark:text-white mb-1.5">2.2 Financial Information</h3>
                  <p className="text-zinc-600 dark:text-zinc-400 mb-2">
                    Required for payments, settlements, payouts, refunds, and identity mapping:
                  </p>
                  <p className="text-zinc-600 dark:text-zinc-400">
                    Bank Account Number, IFSC Code, UPI ID, Debit/Credit Card Tokenized Information, Virtual Payment Addresses, Settlement Profiles, and Chargeback Records.
                  </p>
                  <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-450 italic">
                    We never store raw card numbers. All card information is tokenized as per RBI &amp; PCI-DSS norms.
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold text-zinc-900 dark:text-white mb-1.5">2.3 Identification Information</h3>
                  <p className="text-zinc-600 dark:text-zinc-400">
                    Collected solely for compliance: PAN, Aadhaar (masked), GST Details, Certificate of Incorporation, Business Proof, User Photograph, IP-Verified E-Sign Records, and Device-Synced E-mandate Identity Data.
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold text-zinc-900 dark:text-white mb-1.5">2.4 Transaction Information</h3>
                  <p className="text-zinc-600 dark:text-zinc-400">
                    Payment ID, Merchant Name, Amount, Time &amp; Date, Payment Method, Transaction Status, Location Derived From Transaction, Settlement Logs, and Refund &amp; Dispute Notes.
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold text-zinc-900 dark:text-white mb-1.5">2.5 Technical, Device &amp; Log Data</h3>
                  <p className="text-zinc-600 dark:text-zinc-400">
                    IP Address, Browser &amp; OS Details, Device Model &amp; Type, Timezone &amp; Language, Screen Resolution, App Crash Logs, API Usage Logs, and Geolocation (only if required to comply with RBI risk monitoring).
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold text-zinc-900 dark:text-white mb-1.5">2.6 Behavioral, Risk &amp; Fraud Signals</h3>
                  <p className="text-zinc-600 dark:text-zinc-400">
                    To maintain platform safety and detect suspicious patterns: Velocity Checks, Login Patterns, OTP Failure Rate, Multiple Device Sign-ins, High-risk Transaction Flags, and AML/CTRM Indicators.
                  </p>
                </div>
              </div>
            </section>

            {/* Why We Collect Data */}
            <section className="glass-card p-6 md:p-8 rounded-2xl">
              <h2 className="text-xl md:text-2xl font-bold text-zinc-900 dark:text-white mb-4">
                3. Why We Collect Data
              </h2>
              <div className="text-zinc-650 dark:text-zinc-300 leading-relaxed space-y-3 text-sm md:text-base">
                <p>Every dataset serves a legally compliant and functional purpose:</p>
                <ul className="list-disc list-inside space-y-1.5 pl-2 text-zinc-600 dark:text-zinc-400">
                  <li>To process payments, payouts, settlements, refunds, and verifications</li>
                  <li>To perform KYC / AML checks required by law</li>
                  <li>To prevent fraud, identity theft, or unauthorized access</li>
                  <li>To monitor system performance and improve reliability</li>
                  <li>To comply with RBI, NPCI, IT Act 2000, Aadhaar Act, and other regulations</li>
                  <li>To personalize dashboards and generate actionable insights</li>
                  <li>To provide customer support via phone, chat, or email</li>
                </ul>
                <p className="mt-2 font-medium">
                  Ztake never sells your data. We use it only to deliver secure and compliant financial infrastructure.
                </p>
              </div>
            </section>

            {/* Legal Basis */}
            <section className="glass-card p-6 md:p-8 rounded-2xl">
              <h2 className="text-xl md:text-2xl font-bold text-zinc-900 dark:text-white mb-4">
                4. Legal Basis for Processing
              </h2>
              <div className="text-zinc-650 dark:text-zinc-300 leading-relaxed space-y-3 text-sm md:text-base">
                <p>We process your data based on:</p>
                <ul className="list-disc list-inside space-y-1.5 pl-2 text-zinc-600 dark:text-zinc-400">
                  <li><strong>Consent:</strong> When you sign up or complete verification</li>
                  <li><strong>Contractual necessity:</strong> Critical for payments and settlements</li>
                  <li><strong>Legal obligation:</strong> RBI, NPCI, tax, and compliance audits</li>
                  <li><strong>Legitimate interest:</strong> Security, fraud prevention, and service improvement</li>
                </ul>
              </div>
            </section>

            {/* How We Use Your Data */}
            <section className="glass-card p-6 md:p-8 rounded-2xl">
              <h2 className="text-xl md:text-2xl font-bold text-zinc-900 dark:text-white mb-4">
                5. How We Use Your Data
              </h2>
              <div className="text-zinc-650 dark:text-zinc-300 leading-relaxed space-y-4 text-sm md:text-base">
                <div>
                  <h3 className="font-semibold text-zinc-900 dark:text-white mb-1.5">5.1 Operational Use</h3>
                  <p className="text-zinc-600 dark:text-zinc-400">
                    Payment processing, automated settlements, identity verification, payout routing, dashboard analytics, ledger synchronization, and order-to-transaction mapping.
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold text-zinc-900 dark:text-white mb-1.5">5.2 Security &amp; Protection</h3>
                  <p className="text-zinc-600 dark:text-zinc-400">
                    Fraud detection algorithms, suspicious activity flags, risk patterning, enforcement of MFA &amp; device locks, and API abuse monitoring.
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold text-zinc-900 dark:text-white mb-1.5">5.3 Communication</h3>
                  <p className="text-zinc-600 dark:text-zinc-400">
                    Transactional alerts, security notifications, account verification, important service updates, and customer service responses.
                  </p>
                  <p className="mt-1.5 text-xs text-zinc-500">
                    We do not send marketing messages without your explicit opt-in.
                  </p>
                </div>
              </div>
            </section>

            {/* Sharing & Disclosure */}
            <section className="glass-card p-6 md:p-8 rounded-2xl">
              <h2 className="text-xl md:text-2xl font-bold text-zinc-900 dark:text-white mb-4">
                6. Data Sharing &amp; Disclosure
              </h2>
              <div className="text-zinc-650 dark:text-zinc-300 leading-relaxed space-y-4 text-sm md:text-base">
                <div>
                  <h3 className="font-semibold text-zinc-900 dark:text-white mb-1.5">6.1 With Service Providers</h3>
                  <p className="text-zinc-600 dark:text-zinc-400">
                    Payment Networks (NPCI, Card Networks), Banks &amp; Financial Institutions, Verification Providers (PAN/Aadhaar validation), Cloud Providers (ISO-certified &amp; India-region servers), and SMS/Email Communication Partners.
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold text-zinc-900 dark:text-white mb-1.5">6.2 With Regulatory &amp; Law-Enforcement Bodies</h3>
                  <p className="text-zinc-600 dark:text-zinc-400">
                    Only when legally required, including: RBI, Enforcement Directorate (ED), State Police Departments, Income Tax Authorities, and Court Orders &amp; Summons.
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold text-zinc-900 dark:text-white mb-1.5">6.3 Never Shared For</h3>
                  <p className="text-zinc-600 dark:text-zinc-400">
                    Advertising, selling user profiles, third-party marketing, or data monetization.
                  </p>
                  <p className="mt-2 text-zinc-900 dark:text-white font-medium">
                    Ztake strictly prohibits any unauthorized data resale or lateral sharing.
                  </p>
                </div>
              </div>
            </section>

            {/* Data Retention */}
            <section className="glass-card p-6 md:p-8 rounded-2xl">
              <h2 className="text-xl md:text-2xl font-bold text-zinc-900 dark:text-white mb-4">
                7. Data Retention
              </h2>
              <div className="text-zinc-650 dark:text-zinc-300 leading-relaxed space-y-3 text-sm md:text-base">
                <p>We retain data only for required durations:</p>
                <ul className="list-disc list-inside space-y-1.5 pl-2 text-zinc-600 dark:text-zinc-400">
                  <li><strong>Transaction Data:</strong> 8 years (RBI regulation)</li>
                  <li><strong>KYC Documents:</strong> As per governing laws</li>
                  <li><strong>Logs &amp; Risk Signals:</strong> Minimum necessary for audits</li>
                  <li><strong>Deleted Accounts:</strong> Permanently purged within 90 days</li>
                </ul>
                <p className="mt-2 italic text-zinc-500">
                  When retention ends, data is irreversibly destroyed.
                </p>
              </div>
            </section>

            {/* Storage & Security */}
            <section className="glass-card p-6 md:p-8 rounded-2xl">
              <h2 className="text-xl md:text-2xl font-bold text-zinc-900 dark:text-white mb-4">
                8. Data Storage &amp; Security
              </h2>
              <div className="text-zinc-650 dark:text-zinc-300 leading-relaxed space-y-3 text-sm md:text-base">
                <p>Ztake follows international-grade security standards:</p>
                <ul className="list-disc list-inside space-y-1.5 pl-2 text-zinc-600 dark:text-zinc-400">
                  <li>ISO/IEC 27001</li>
                  <li>PCI DSS Level 1</li>
                  <li>SOC 2 Type II</li>
                  <li>AES-256 Data Encryption</li>
                  <li>TLS 1.3 Network Encryption</li>
                  <li>HSM-Backed Tokenization</li>
                </ul>
                <p className="mt-2">Additional layers include:</p>
                <p className="text-zinc-600 dark:text-zinc-400">
                  Zero-Trust Infrastructure, Multi-Factor Authentication, Database Field-Level Encryption, Continuous Penetration Testing, AI-Driven Fraud Monitoring, and 24/7 Security Operation Centre.
                </p>
              </div>
            </section>

            {/* Your Rights */}
            <section className="glass-card p-6 md:p-8 rounded-2xl">
              <h2 className="text-xl md:text-2xl font-bold text-zinc-900 dark:text-white mb-4">
                9. Your Rights
              </h2>
              <div className="text-zinc-650 dark:text-zinc-300 leading-relaxed space-y-4 text-sm md:text-base">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-zinc-50 dark:bg-zinc-900/40 p-4 rounded-xl border border-zinc-100 dark:border-zinc-800">
                    <h4 className="font-semibold text-zinc-900 dark:text-white">9.1 Right to Access</h4>
                    <p className="text-xs text-zinc-500 mt-1">You may request a copy of your personal data.</p>
                  </div>
                  <div className="bg-zinc-50 dark:bg-zinc-900/40 p-4 rounded-xl border border-zinc-100 dark:border-zinc-800">
                    <h4 className="font-semibold text-zinc-900 dark:text-white">9.2 Right to Correction</h4>
                    <p className="text-xs text-zinc-500 mt-1">You may request corrections for inaccurate data.</p>
                  </div>
                  <div className="bg-zinc-50 dark:bg-zinc-900/40 p-4 rounded-xl border border-zinc-100 dark:border-zinc-800">
                    <h4 className="font-semibold text-zinc-900 dark:text-white">9.3 Right to Withdraw Consent</h4>
                    <p className="text-xs text-zinc-500 mt-1">Contact us at care@ztake.in to revoke or modify consent.</p>
                  </div>
                  <div className="bg-zinc-50 dark:bg-zinc-900/40 p-4 rounded-xl border border-zinc-100 dark:border-zinc-800">
                    <h4 className="font-semibold text-zinc-900 dark:text-white">9.4 Right to Deletion</h4>
                    <p className="text-xs text-zinc-500 mt-1">You may request deletion of your account (unless legally restricted).</p>
                  </div>
                </div>
              </div>
            </section>

            {/* Cookies & Tracking */}
            <section className="glass-card p-6 md:p-8 rounded-2xl">
              <h2 className="text-xl md:text-2xl font-bold text-zinc-900 dark:text-white mb-4">
                10. Cookies &amp; Tracking
              </h2>
              <div className="text-zinc-650 dark:text-zinc-300 leading-relaxed space-y-3 text-sm md:text-base">
                <p>Ztake uses:</p>
                <p className="text-zinc-600 dark:text-zinc-400">
                  Essential Cookies, Security Cookies, Session Tokens, API Authentication Cookies, and Machine Learning-Based Fraud Markers.
                </p>
                <p className="font-medium text-zinc-900 dark:text-white">
                  No advertising cookies, no behavioral tracking for marketing, and no external trackers are used.
                </p>
              </div>
            </section>

            {/* Contact Us */}
            <section className="glass-card p-6 md:p-8 rounded-2xl">
              <h2 className="text-xl md:text-2xl font-bold text-zinc-900 dark:text-white mb-4">
                Contact Us
              </h2>
              <div className="text-zinc-650 dark:text-zinc-300 leading-relaxed space-y-4 text-sm md:text-base">
                <p>
                  For all privacy-related concerns, please reach out to us:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="bg-zinc-50 dark:bg-zinc-900/40 p-4 rounded-xl border border-zinc-100 dark:border-zinc-800 text-center">
                    <div className="text-xs text-zinc-400 font-semibold uppercase mb-1">Email</div>
                    <a href="mailto:care@ztake.in" className="font-semibold text-zinc-900 dark:text-white hover:underline">
                      care@ztake.in
                    </a>
                  </div>
                  <div className="bg-zinc-50 dark:bg-zinc-900/40 p-4 rounded-xl border border-zinc-100 dark:border-zinc-800 text-center">
                    <div className="text-xs text-zinc-400 font-semibold uppercase mb-1">Phone</div>
                    <a href="tel:+919220592512" className="font-semibold text-zinc-900 dark:text-white hover:underline">
                      +91 9220592512
                    </a>
                  </div>
                  <div className="bg-zinc-50 dark:bg-zinc-900/40 p-4 rounded-xl border border-zinc-100 dark:border-zinc-800 text-center">
                    <div className="text-xs text-zinc-400 font-semibold uppercase mb-1">Website</div>
                    <a href="https://www.ztake.in" target="_blank" rel="noopener noreferrer" className="font-semibold text-zinc-900 dark:text-white hover:underline">
                      www.ztake.in
                    </a>
                  </div>
                </div>
                <div className="text-center pt-2 text-xs text-zinc-500">
                  Ztake Fintech Private Limited, Business Hub, Technology Park, Sector 90, Noida, Uttar Pradesh, India.
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