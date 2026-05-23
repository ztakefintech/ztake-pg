'use client';

import { Navbar } from "@/components/marketing/Navbar";
import { Footer } from "@/components/marketing/Footer";

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <Navbar />
      
      <main className="flex-1 pt-28 pb-16 px-4 md:px-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight bg-gradient-to-r from-zinc-950 to-zinc-600 dark:from-white dark:to-zinc-400 bg-clip-text text-transparent mb-4">
              Terms &amp; Conditions
            </h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Last updated: {new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>

          {/* Terms Panels */}
          <div className="space-y-8">
            {/* 1. Acceptance of Terms */}
            <section className="glass-card p-6 md:p-8 rounded-2xl">
              <h2 className="text-xl md:text-2xl font-bold text-zinc-900 dark:text-white mb-4">
                1. Acceptance of Terms
              </h2>
              <div className="text-zinc-650 dark:text-zinc-300 leading-relaxed space-y-3 text-sm md:text-base">
                <p>
                  By accessing Ztake Services, You confirm that You have read, understood, and agreed to these Terms. These Terms form a legally binding contract between You and Ztake.
                </p>
                <p>
                  Continued use of the platform shall be considered Your explicit consent to all updates, new clauses, or revisions incorporated in the Terms.
                </p>
                <p>
                  Ztake reserves the right to modify, amend, update, or replace these Terms at any time without prior notice.
                </p>
              </div>
            </section>

            {/* 2. About Ztake */}
            <section className="glass-card p-6 md:p-8 rounded-2xl">
              <h2 className="text-xl md:text-2xl font-bold text-zinc-900 dark:text-white mb-4">
                2. About Ztake
              </h2>
              <div className="text-zinc-650 dark:text-zinc-300 leading-relaxed space-y-3 text-sm md:text-base">
                <p>
                  Ztake Fintech Private Limited is a company incorporated under the Companies Act, 2013.
                </p>
                <p>
                  <strong>Registered Office:</strong> Business Hub, Technology Park, Sector 90, Noida, Uttar Pradesh, India – 201305.
                </p>
                <p>
                  Ztake operates as a Payment Aggregator, offering payouts, settlements, collections, identity verification, risk analysis, and related services. We work with regulated financial institutions, partner banks, payment networks, and KYC verification partners.
                </p>
              </div>
            </section>

            {/* 3. Eligibility */}
            <section className="glass-card p-6 md:p-8 rounded-2xl">
              <h2 className="text-xl md:text-2xl font-bold text-zinc-900 dark:text-white mb-4">
                3. Eligibility &amp; Registration Requirements
              </h2>
              <div className="text-zinc-650 dark:text-zinc-300 leading-relaxed space-y-3 text-sm md:text-base">
                <ul className="list-disc list-inside space-y-1.5 pl-2 text-zinc-600 dark:text-zinc-400">
                  <li>You must be at least 18 years of age.</li>
                  <li>You must be an Indian citizen, legal resident, or legally recognized Indian entity.</li>
                  <li>You must be competent to enter into a contract under the Indian Contract Act, 1872.</li>
                  <li>You shall provide true, accurate, complete, and updated information during registration.</li>
                  <li>You shall not impersonate any individual, business, or government entity.</li>
                </ul>
                <p className="mt-2 text-xs text-zinc-500 italic">
                  Ztake reserves the right to reject any registration or onboarding request without assigning any reason.
                </p>
              </div>
            </section>

            {/* 4. Payment Processing */}
            <section className="glass-card p-6 md:p-8 rounded-2xl">
              <h2 className="text-xl md:text-2xl font-bold text-zinc-900 dark:text-white mb-4">
                4. Payment Processing &amp; Settlements
              </h2>
              <div className="text-zinc-650 dark:text-zinc-300 leading-relaxed space-y-3 text-sm md:text-base">
                <p>
                  Ztake collects payments for You into a nodal/escrow/settlement account in compliance with RBI regulations.
                </p>
                <p>
                  Settlement will be processed on a <strong>T+2 basis</strong> (where T = transaction date), subject to banking hours and risk assessment.
                </p>
                <p>
                  Ztake may hold or delay settlements for reasons including chargebacks, risk alerts, suspicious patterns, or regulatory orders, and may impose rolling reserves or security deposits based on risk evaluation.
                </p>
              </div>
            </section>

            {/* 5. Prohibited Activities */}
            <section className="glass-card p-6 md:p-8 rounded-2xl">
              <h2 className="text-xl md:text-2xl font-bold text-zinc-900 dark:text-white mb-4">
                5. Prohibited Activities
              </h2>
              <div className="text-zinc-650 dark:text-zinc-300 leading-relaxed space-y-3 text-sm md:text-base">
                <p>You agree not to use the Services for:</p>
                <ul className="list-disc list-inside space-y-1.5 pl-2 text-zinc-600 dark:text-zinc-400">
                  <li>Illegal, unlawful, or unauthorized transactions.</li>
                  <li>Products/services prohibited by Indian law, RBI, or card associations.</li>
                  <li>Fraudulent, misleading, or deceptive business practices.</li>
                  <li>Money laundering or terrorist financing.</li>
                  <li>Adult content, escort services, drugs, arms, counterfeit items, gambling, or pyramid schemes.</li>
                  <li>Attempting to reverse engineer, hack, or disrupt the Ztake platform.</li>
                </ul>
              </div>
            </section>

            {/* 6. Service Usage Obligations */}
            <section className="glass-card p-6 md:p-8 rounded-2xl">
              <h2 className="text-xl md:text-2xl font-bold text-zinc-900 dark:text-white mb-4">
                6. Service Usage Obligations
              </h2>
              <div className="text-zinc-650 dark:text-zinc-300 leading-relaxed space-y-3 text-sm md:text-base">
                <ul className="list-disc list-inside space-y-1.5 pl-2 text-zinc-600 dark:text-zinc-400">
                  <li>Maintain strict confidentiality of login credentials.</li>
                  <li>Integrate Ztake APIs and SDKs exactly as per official documentation.</li>
                  <li>Comply with all applicable laws including IT Act 2000, KYC norms, and RBI guidelines.</li>
                  <li>Promptly notify Ztake of any unauthorized access or security breach.</li>
                </ul>
              </div>
            </section>

            {/* 7. Fees & Charges */}
            <section className="glass-card p-6 md:p-8 rounded-2xl">
              <h2 className="text-xl md:text-2xl font-bold text-zinc-900 dark:text-white mb-4">
                7. Fees &amp; Charges
              </h2>
              <div className="text-zinc-650 dark:text-zinc-300 leading-relaxed space-y-3 text-sm md:text-base">
                <p>
                  Ztake will charge service fees, MDR, platform fees, verification fees, or dispute fees as applicable. We reserve the right to modify pricing at any time.
                </p>
                <p>
                  All charges are exclusive of taxes unless stated otherwise. You permit Ztake to auto-debit applicable fees from settlement amounts or wallet balance.
                </p>
              </div>
            </section>

            {/* 8. Refunds & Disputes */}
            <section className="glass-card p-6 md:p-8 rounded-2xl">
              <h2 className="text-xl md:text-2xl font-bold text-zinc-900 dark:text-white mb-4">
                8. Refunds, Disputes &amp; Chargebacks
              </h2>
              <div className="text-zinc-650 dark:text-zinc-300 leading-relaxed space-y-3 text-sm md:text-base">
                <p>
                  All refund decisions shall be made by the Merchant; Ztake is only a facilitator.
                </p>
                <p>
                  For disputes/chargebacks initiated by customers, the Merchant must respond within the required timeline. Failure to respond may result in loss of dispute by default, and Ztake may debit the disputed amount plus chargeback fees from the Merchant's accounts.
                </p>
              </div>
            </section>

            {/* 9. Security & Compliance */}
            <section className="glass-card p-6 md:p-8 rounded-2xl">
              <h2 className="text-xl md:text-2xl font-bold text-zinc-900 dark:text-white mb-4">
                9. Security &amp; Compliance
              </h2>
              <div className="text-zinc-650 dark:text-zinc-300 leading-relaxed space-y-3 text-sm md:text-base">
                <p>
                  Ztake implements advanced security measures including PCI DSS Compliance, encryption, and fraud detection.
                </p>
                <p>
                  You must ensure Your website/app follows secure checkout flows and compliance requirements. Ztake is not responsible for Your website's content, security, or customer disputes.
                </p>
              </div>
            </section>

            {/* 10. Intellectual Property */}
            <section className="glass-card p-6 md:p-8 rounded-2xl">
              <h2 className="text-xl md:text-2xl font-bold text-zinc-900 dark:text-white mb-4">
                10. Intellectual Property
              </h2>
              <div className="text-zinc-650 dark:text-zinc-300 leading-relaxed space-y-3 text-sm md:text-base">
                <p>
                  All Ztake trademarks, logos, code, algorithms, dashboards, and UI/UX are proprietary assets.
                </p>
                <p>
                  You may not copy, reproduce, sell, license, or reverse-engineer Ztake's intellectual property without prior written permission.
                </p>
              </div>
            </section>

            {/* 11. Termination */}
            <section className="glass-card p-6 md:p-8 rounded-2xl">
              <h2 className="text-xl md:text-2xl font-bold text-zinc-900 dark:text-white mb-4">
                11. Termination
              </h2>
              <div className="text-zinc-650 dark:text-zinc-300 leading-relaxed space-y-3 text-sm md:text-base">
                <p>
                  Ztake may terminate or suspend Your access with 30 days' notice. Immediate termination may occur for illegal activities, fraud, chargeback abuse, or regulatory directives.
                </p>
                <p>
                  Post-termination, pending dues must be cleared and Ztake may hold funds for up to 180 days for risk assessment.
                </p>
              </div>
            </section>

            {/* 12. Indemnity */}
            <section className="glass-card p-6 md:p-8 rounded-2xl">
              <h2 className="text-xl md:text-2xl font-bold text-zinc-900 dark:text-white mb-4">
                12. Indemnity
              </h2>
              <div className="text-zinc-650 dark:text-zinc-300 leading-relaxed space-y-3 text-sm md:text-base">
                <p>
                  You agree to indemnify, defend, and hold harmless Ztake from losses, liabilities, claims, or damages arising from Your misuse of Ztake Services, illegal transactions, or violation of these Terms.
                </p>
              </div>
            </section>

            {/* 13. Limitation of Liability */}
            <section className="glass-card p-6 md:p-8 rounded-2xl">
              <h2 className="text-xl md:text-2xl font-bold text-zinc-900 dark:text-white mb-4">
                13. Limitation of Liability
              </h2>
              <div className="text-zinc-650 dark:text-zinc-300 leading-relaxed space-y-3 text-sm md:text-base">
                <p>
                  Ztake's total liability shall not exceed the fees earned from You in the previous 30 days. We shall not be liable for loss of profits, loss of business, indirect damages, or data loss.
                </p>
                <p className="text-xs text-zinc-500">
                  Ztake does not guarantee uninterrupted availability or error-free performance of the platform.
                </p>
              </div>
            </section>

            {/* 14. Governing Law */}
            <section className="glass-card p-6 md:p-8 rounded-2xl">
              <h2 className="text-xl md:text-2xl font-bold text-zinc-900 dark:text-white mb-4">
                14. Governing Law &amp; Jurisdiction
              </h2>
              <div className="text-zinc-650 dark:text-zinc-300 leading-relaxed space-y-3 text-sm md:text-base">
                <p>
                  These Terms are governed by the laws of India. All disputes shall be subject to the exclusive jurisdiction of courts in Noida, Uttar Pradesh.
                </p>
                <p>
                  Arbitration may be conducted under the Arbitration and Conciliation Act, 1996.
                </p>
              </div>
            </section>

            {/* KYC & AML */}
            <section className="glass-card p-6 md:p-8 rounded-2xl">
              <h2 className="text-xl md:text-2xl font-bold text-zinc-900 dark:text-white mb-4">
                KYC &amp; AML Compliance
              </h2>
              <div className="text-zinc-650 dark:text-zinc-300 leading-relaxed space-y-3 text-sm md:text-base">
                <p>
                  This Policy outlines the standards, procedures, responsibilities, and controls used by Ztake to verify the identity of users and prevent money laundering, terrorist financing, fraud, and unlawful financial activity in accordance with RBI Master Directions, PMLA 2002, and FATF Recommendations.
                </p>
                <p>
                  All Ztake onboarding documents are authenticated using secure, legally compliant APIs including PAN Verification, Aadhaar Offline Verification, Voter ID/Driving License Validation, Bank Account Verification, and Sanctions Screening.
                </p>
              </div>
            </section>

            {/* Support */}
            <section className="glass-card p-6 md:p-8 rounded-2xl bg-gradient-to-br from-zinc-500/5 to-zinc-900/5">
              <h2 className="text-xl md:text-2xl font-bold text-zinc-900 dark:text-white mb-4">
                Contact &amp; Support
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
