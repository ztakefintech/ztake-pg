'use client';

import { Navbar } from "@/components/marketing/Navbar";
import { Footer } from "@/components/marketing/Footer";

export default function RefundPolicyPage() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <Navbar />
      
      <main className="flex-1 pt-28 pb-16 px-4 md:px-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight bg-gradient-to-r from-zinc-950 to-zinc-600 dark:from-white dark:to-zinc-400 bg-clip-text text-transparent mb-4">
              Refund &amp; Cancellation Policy
            </h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Last updated: {new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>

          {/* Policy Panels */}
          <div className="space-y-8">
            {/* 1. Purpose of This Policy */}
            <section className="glass-card p-6 md:p-8 rounded-2xl">
              <h2 className="text-xl md:text-2xl font-bold text-zinc-900 dark:text-white mb-4">
                1. Purpose of This Policy
              </h2>
              <div className="text-zinc-650 dark:text-zinc-300 leading-relaxed space-y-3 text-sm md:text-base">
                <p>
                  The purpose of this Policy is to establish clear rules regarding refunds &amp; cancellations, responsibilities of merchants and customers, Ztake's limited role as a payment facilitator, procedures for initiating and processing refunds, conditions for allowing or denying refunds, timelines, charges, and settlement treatments.
                </p>
                <p className="font-semibold text-zinc-900 dark:text-white">
                  Ztake maintains full compliance with RBI, NPCI, banking, and card network guidelines.
                </p>
              </div>
            </section>

            {/* 2. Role of Ztake */}
            <section className="glass-card p-6 md:p-8 rounded-2xl">
              <h2 className="text-xl md:text-2xl font-bold text-zinc-900 dark:text-white mb-4">
                2. Role of Ztake
              </h2>
              <div className="text-zinc-650 dark:text-zinc-300 leading-relaxed space-y-3 text-sm md:text-base">
                <p>
                  Ztake operates solely as a Payment Aggregator / Payment Facilitator and does not sell any product or service to customers. All refund decisions are entirely the responsibility of the Merchant.
                </p>
                <p>
                  Ztake cannot force a merchant to approve or deny a refund unless required by law, court order, bank mandate, card network rules, or risk/fraud triggers. Ztake facilitates the refund process only after the Merchant approves the refund.
                </p>
              </div>
            </section>

            {/* 3. Merchant Responsibility */}
            <section className="glass-card p-6 md:p-8 rounded-2xl">
              <h2 className="text-xl md:text-2xl font-bold text-zinc-900 dark:text-white mb-4">
                3. Merchant Responsibility
              </h2>
              <div className="text-zinc-650 dark:text-zinc-300 leading-relaxed space-y-3 text-sm md:text-base">
                <p>
                  Merchants must clearly display their own Refund, Return, Replacement, and Cancellation policy on their website, mobile app, checkout flow, and product pages.
                </p>
                <p>
                  Merchants are solely responsible for investigating refund requests, approving or rejecting claims, communicating outcomes to customers, and providing documentary proof during disputes. Ztake may impose penalties, holds, or risk reserves on merchants with excessive refund/chargeback ratios.
                </p>
              </div>
            </section>

            {/* 4. Types of Refunds */}
            <section className="glass-card p-6 md:p-8 rounded-2xl">
              <h2 className="text-xl md:text-2xl font-bold text-zinc-900 dark:text-white mb-4">
                4. Types of Refunds
              </h2>
              <div className="text-zinc-650 dark:text-zinc-300 leading-relaxed space-y-4 text-sm md:text-base">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-zinc-50 dark:bg-zinc-900/40 p-4 rounded-xl border border-zinc-100 dark:border-zinc-800">
                    <h4 className="font-semibold text-zinc-900 dark:text-white">Full Refund</h4>
                    <p className="text-xs text-zinc-500 mt-1">Returned when the merchant cancels or reverses the entire transaction amount.</p>
                  </div>
                  <div className="bg-zinc-50 dark:bg-zinc-900/40 p-4 rounded-xl border border-zinc-100 dark:border-zinc-800">
                    <h4 className="font-semibold text-zinc-900 dark:text-white">Partial Refund</h4>
                    <p className="text-xs text-zinc-500 mt-1">Returned when the merchant refunds only a portion of the transaction amount.</p>
                  </div>
                  <div className="bg-zinc-50 dark:bg-zinc-900/40 p-4 rounded-xl border border-zinc-100 dark:border-zinc-800">
                    <h4 className="font-semibold text-zinc-900 dark:text-white">Auto-Refund</h4>
                    <p className="text-xs text-zinc-500 mt-1">Triggered due to payment failures (e.g. bank downtime) without transaction confirmation.</p>
                  </div>
                  <div className="bg-zinc-50 dark:bg-zinc-900/40 p-4 rounded-xl border border-zinc-100 dark:border-zinc-800">
                    <h4 className="font-semibold text-zinc-900 dark:text-white">Chargeback-Related</h4>
                    <p className="text-xs text-zinc-500 mt-1">Initiated by the customer through their issuing bank following a formal dispute.</p>
                  </div>
                </div>
              </div>
            </section>

            {/* 5. Timelines */}
            <section className="glass-card p-6 md:p-8 rounded-2xl">
              <h2 className="text-xl md:text-2xl font-bold text-zinc-900 dark:text-white mb-4">
                5. Timelines for Refund Processing
              </h2>
              <div className="text-zinc-650 dark:text-zinc-300 leading-relaxed space-y-3 text-sm md:text-base">
                <p>
                  Once the Merchant approves a refund on the Ztake dashboard, Ztake processes it within <strong>Instant to 24 hours for UPI</strong>, <strong>T+1 to T+3 working days for Cards &amp; Netbanking</strong>, and up to <strong>7 working days</strong> for complex or high-risk cases.
                </p>
                <p className="font-medium">Customer bank credit timelines:</p>
                <ul className="list-disc list-inside space-y-1 pl-2 text-zinc-600 dark:text-zinc-400">
                  <li>UPI refunds: Instant to 48 hours</li>
                  <li>Debit/Credit Cards: 5–7 working days</li>
                  <li>Netbanking: 2–4 working days</li>
                </ul>
              </div>
            </section>

            {/* 6. Conditions for Refund Eligibility */}
            <section className="glass-card p-6 md:p-8 rounded-2xl">
              <h2 className="text-xl md:text-2xl font-bold text-zinc-900 dark:text-white mb-4">
                6. Conditions for Refund Eligibility
              </h2>
              <div className="text-zinc-650 dark:text-zinc-300 leading-relaxed space-y-4 text-sm md:text-base">
                <div>
                  <h4 className="font-semibold text-zinc-900 dark:text-white mb-1.5">Eligible Scenarios</h4>
                  <ul className="list-disc list-inside space-y-1 pl-2 text-zinc-600 dark:text-zinc-400 text-sm">
                    <li>Duplicate payment or failed transaction with amount debited.</li>
                    <li>Payment made to incorrect merchant (verified cases).</li>
                    <li>Merchant-approved refund request.</li>
                    <li>Overcharge or incorrect amount charged.</li>
                    <li>Merchant service/product non-delivery.</li>
                    <li>Regulatory or bank-directed refund.</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold text-zinc-900 dark:text-white mb-1.5">Ineligible Scenarios</h4>
                  <ul className="list-disc list-inside space-y-1 pl-2 text-zinc-600 dark:text-zinc-400 text-sm">
                    <li>Customer change of mind (unless merchant policy explicitly allows).</li>
                    <li>Merchant policy denial.</li>
                    <li>Digital goods already downloaded/used.</li>
                    <li>Fraudulent or unverified refund requests.</li>
                  </ul>
                </div>
              </div>
            </section>

            {/* 7. Refund Process */}
            <section className="glass-card p-6 md:p-8 rounded-2xl">
              <h2 className="text-xl md:text-2xl font-bold text-zinc-900 dark:text-white mb-4">
                7. Refund Process (Step-by-Step)
              </h2>
              <div className="text-zinc-650 dark:text-zinc-300 leading-relaxed space-y-3 text-sm md:text-base">
                <ol className="list-decimal list-inside space-y-2 pl-2">
                  <li><span className="font-semibold text-zinc-900 dark:text-white">Step 1:</span> Customer raises refund request by contacting Merchant directly.</li>
                  <li><span className="font-semibold text-zinc-900 dark:text-white">Step 2:</span> Merchant verifies claim and reviews evidence.</li>
                  <li><span className="font-semibold text-zinc-900 dark:text-white">Step 3:</span> Merchant approves/denies request and communicates to customer.</li>
                  <li><span className="font-semibold text-zinc-900 dark:text-white">Step 4:</span> Merchant triggers refund on Ztake dashboard.</li>
                  <li><span className="font-semibold text-zinc-900 dark:text-white">Step 5:</span> Ztake processes refund with banking partners.</li>
                  <li><span className="font-semibold text-zinc-900 dark:text-white">Step 6:</span> Customer receives money credited to the same payment method.</li>
                </ol>
              </div>
            </section>

            {/* 8. Chargebacks */}
            <section className="glass-card p-6 md:p-8 rounded-2xl">
              <h2 className="text-xl md:text-2xl font-bold text-zinc-900 dark:text-white mb-4">
                8. Chargebacks &amp; Bank Disputes
              </h2>
              <div className="text-zinc-650 dark:text-zinc-300 leading-relaxed space-y-3 text-sm md:text-base">
                <p>
                  Customers may raise a dispute directly with their issuing bank. Ztake forwards all chargeback notifications to Merchants.
                </p>
                <p>
                  Merchants must provide proof within defined timelines (usually 48–72 hours). Failure to respond results in automatic chargeback loss. Ztake may recover the chargeback amount, penalties, fees, and legal costs from the Merchant's settlements.
                </p>
              </div>
            </section>

            {/* 9. No Liability Clause */}
            <section className="glass-card p-6 md:p-8 rounded-2xl">
              <h2 className="text-xl md:text-2xl font-bold text-zinc-900 dark:text-white mb-4">
                9. No Liability Clause
              </h2>
              <div className="text-zinc-650 dark:text-zinc-300 leading-relaxed space-y-3 text-sm md:text-base">
                <p>
                  Ztake is not liable for merchant denial of refund, delays caused by banks or card networks, issues with product delivery or service fulfillment, customer dissatisfaction, or quality/warranty of merchant goods.
                </p>
                <p>
                  Ztake only facilitates payments and refund routing and is not responsible for the underlying merchant services.
                </p>
              </div>
            </section>

            {/* Support */}
            <section className="glass-card p-6 md:p-8 rounded-2xl bg-gradient-to-br from-zinc-500/5 to-zinc-900/5">
              <h2 className="text-xl md:text-2xl font-bold text-zinc-900 dark:text-white mb-4">
                Need Help with a Refund?
              </h2>
              <div className="text-zinc-650 dark:text-zinc-300 leading-relaxed space-y-4 text-sm md:text-base">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-zinc-50 dark:bg-zinc-900/40 p-4 rounded-xl border border-zinc-100 dark:border-zinc-800 text-center">
                    <div className="text-xs text-zinc-400 font-semibold uppercase mb-1">Support Email</div>
                    <a href="mailto:support@ztake.in" className="font-semibold text-zinc-900 dark:text-white hover:underline">
                      support@ztake.in
                    </a>
                  </div>
                  <div className="bg-zinc-50 dark:bg-zinc-900/40 p-4 rounded-xl border border-zinc-100 dark:border-zinc-800 text-center">
                    <div className="text-xs text-zinc-400 font-semibold uppercase mb-1">Care Team</div>
                    <a href="mailto:care@ztake.in" className="font-semibold text-zinc-900 dark:text-white hover:underline">
                      care@ztake.in
                    </a>
                  </div>
                </div>
                <div className="text-center pt-2 text-xs text-zinc-500">
                  Ztake Fintech Private Limited | Business Hub, Technology Park, Sector 90, Noida, Uttar Pradesh, India.
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
