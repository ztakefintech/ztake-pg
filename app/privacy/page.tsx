import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-xl border-b border-white/10">
        <div className="container mx-auto px-6 py-4">
          <Link href="/">
            <Button variant="ghost" className="gap-2 hover:bg-white/5">
              <ArrowLeft className="w-4 h-4" />
              Back to Home
            </Button>
          </Link>
        </div>
      </header>

      {/* Content */}
      <main className="container mx-auto px-6 py-24 max-w-4xl">
        {/* Title Section */}
        <div className="mb-12 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-blue-400 to-blue-600 bg-clip-text text-transparent">
            Privacy Policy
          </h1>
          <p className="text-gray-400">Last Updated: 1/10/2025</p>
        </div>

        {/* Glass Container */}
        <div className="glass-card p-8 md:p-12 space-y-8">
          {/* Section 1: Introduction */}
          <section>
            <h2 className="text-2xl font-semibold mb-4 text-blue-400">1. Introduction</h2>
            <div className="space-y-4 text-gray-300 leading-relaxed">
              <p>
                Ztake Tech Private Limited ("Ztake", "Us", "We", or "Our") operates as a Payment Aggregator and provides
                payouts and verification services, among others, to e-commerce marketplaces, educational institutions,
                financial institutions, web aggregators, and other partners.
              </p>
              <p>
                Our registered office is located at:{" "}
                <span className="text-white">
                  Business Hub, Technology Park, Sector 90, Noida, Uttar Pradesh, India.
                </span>
              </p>
              <p>
                We are committed to ensuring a secure data processing environment and providing a reliable payment
                process infrastructure for Our customers. As Our services rely heavily on data and information shared by
                Our customers, We take all necessary measures to protect Personal and Sensitive Personal Information
                ("Personal Data" as defined below) in accordance with applicable data protection laws in India.
              </p>
              <p>
                This Privacy Policy outlines how We collect, process, use, store, and share Your Personal Data when You
                access or use Our website, software, mobile application, payment infrastructure, or any related services
                (collectively referred to as "Services").
              </p>
              <p className="font-medium text-white">
                By using Our Services, You agree that You have read, understood, and consent to the terms of this
                Privacy Policy, including the collection, processing, and sharing of Your Personal Data as described
                herein.
              </p>
            </div>
          </section>

          {/* Section 2: Scope */}
          <section>
            <h2 className="text-2xl font-semibold mb-4 text-blue-400">2. Scope</h2>
            <p className="text-gray-300 leading-relaxed mb-3">This Privacy Policy applies to:</p>
            <ul className="list-disc list-inside space-y-2 text-gray-300 ml-4">
              <li>
                All Users of Our Services, including merchants, business partners, contractors, vendors, and
                consultants.
              </li>
              <li>All employees, whether full-time, part-time, contractual, or temporary, engaged with Ztake.</li>
            </ul>
            <p className="text-gray-300 leading-relaxed mt-4">
              The terms and conditions of Our Services are provided separately on Our website (ztake.in) and should be
              read in conjunction with this Privacy Policy.
            </p>
          </section>

          {/* Section 3: Definitions */}
          <section>
            <h2 className="text-2xl font-semibold mb-4 text-blue-400">3. Definitions</h2>
            <div className="space-y-4 text-gray-300">
              <div>
                <h3 className="font-semibold text-white mb-2">"Applicable Laws"</h3>
                <p className="leading-relaxed">
                  means all Indian laws related to data protection, information technology, payment systems, and related
                  regulations, including any amendments or updates thereto.
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-white mb-2">"Personal Data"</h3>
                <p className="leading-relaxed mb-2">
                  means any information that can directly or indirectly identify You, including but not limited to:
                </p>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li>Name, date of birth, contact number, email address, and residential address</li>
                  <li>Bank account or payment instrument details</li>
                  <li>Government identification details (such as PAN, Aadhaar, GST, etc.)</li>
                  <li>Payment transaction data</li>
                  <li>Login credentials or passwords</li>
                  <li>Any other information provided by You while using Our Services</li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold text-white mb-2">"Processing"</h3>
                <p className="leading-relaxed">
                  means any operation performed on Personal Data, such as collection, recording, storage, use,
                  disclosure, or deletion.
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-white mb-2">"Reasonable Security Practices and Procedures"</h3>
                <p className="leading-relaxed">
                  refers to industry-accepted standards designed to protect Personal Data from unauthorized access,
                  misuse, or disclosure.
                </p>
              </div>
            </div>
          </section>

          {/* Section 4: Purpose of Collection */}
          <section>
            <h2 className="text-2xl font-semibold mb-4 text-blue-400">4. Purpose of Collection</h2>
            <p className="text-gray-300 leading-relaxed mb-3">
              Ztake collects and processes Your Personal Data for the following purposes:
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-300 ml-4">
              <li>To provide payment aggregation, payout, and verification services</li>
              <li>To complete transactions and process payments securely</li>
              <li>To comply with legal and regulatory requirements</li>
              <li>To detect and prevent fraud or other unlawful activities</li>
              <li>To improve Our Services and user experience</li>
              <li>To communicate with You about updates, offers, or technical notices</li>
              <li>To perform identity verification (KYC) where required</li>
            </ul>
            <p className="text-gray-300 leading-relaxed mt-4 font-medium">
              Failure to provide certain information may limit Your access to Our Services.
            </p>
          </section>

          {/* Section 5: Categories of Data Collected */}
          <section>
            <h2 className="text-2xl font-semibold mb-4 text-blue-400">5. Categories of Data Collected</h2>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-gray-700">
                    <th className="text-left py-3 px-4 text-white font-semibold">Type of Data</th>
                    <th className="text-left py-3 px-4 text-white font-semibold">Purpose</th>
                    <th className="text-left py-3 px-4 text-white font-semibold">Examples of Data</th>
                  </tr>
                </thead>
                <tbody className="text-gray-300">
                  <tr className="border-b border-gray-800">
                    <td className="py-3 px-4">Contact Information</td>
                    <td className="py-3 px-4">Communication and account creation</td>
                    <td className="py-3 px-4">Full name, email, phone, address</td>
                  </tr>
                  <tr className="border-b border-gray-800">
                    <td className="py-3 px-4">Financial Information</td>
                    <td className="py-3 px-4">Payment processing</td>
                    <td className="py-3 px-4">Bank account number, UPI ID, card details</td>
                  </tr>
                  <tr className="border-b border-gray-800">
                    <td className="py-3 px-4">Identification Information</td>
                    <td className="py-3 px-4">KYC and verification</td>
                    <td className="py-3 px-4">PAN, Aadhaar, GST, photograph</td>
                  </tr>
                  <tr className="border-b border-gray-800">
                    <td className="py-3 px-4">Transaction Data</td>
                    <td className="py-3 px-4">Record keeping and compliance</td>
                    <td className="py-3 px-4">Payment ID, transaction amount, date, merchant name</td>
                  </tr>
                  <tr className="border-b border-gray-800">
                    <td className="py-3 px-4">Device & Log Data</td>
                    <td className="py-3 px-4">Security and analytics</td>
                    <td className="py-3 px-4">IP address, browser type, device model, OS, location</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4">Third-Party Information</td>
                    <td className="py-3 px-4">Integration with partner services</td>
                    <td className="py-3 px-4">Data received from payment partners, analytics providers</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* Section 6: Cookies and Tracking */}
          <section>
            <h2 className="text-2xl font-semibold mb-4 text-blue-400">6. Cookies and Tracking</h2>
            <p className="text-gray-300 leading-relaxed">
              We use cookies and similar technologies to improve user experience and analyze usage patterns. You can
              disable cookies in Your browser, but some features of Our Services may not function properly as a result.
            </p>
          </section>

          {/* Section 7: Your Rights */}
          <section>
            <h2 className="text-2xl font-semibold mb-4 text-blue-400">7. Your Rights</h2>
            <p className="text-gray-300 leading-relaxed mb-3">
              You have the following rights regarding Your Personal Data:
            </p>
            <ul className="space-y-3 text-gray-300">
              <li>
                <span className="font-semibold text-white">Right to Review and Correct:</span> You may review and
                request correction of inaccurate or incomplete data.
              </li>
              <li>
                <span className="font-semibold text-white">Right to Withdraw Consent:</span> You may withdraw Your
                consent by contacting Us at{" "}
                <a href="mailto:grievances@ztake.in" className="text-blue-400 hover:text-blue-300">
                  grievances@ztake.in
                </a>
                . However, this may limit Your ability to use certain features of Our Services.
              </li>
              <li>
                <span className="font-semibold text-white">Right to Information:</span> You may request details of how
                We process Your Personal Data.
              </li>
            </ul>
          </section>

          {/* Section 8: Data Security */}
          <section>
            <h2 className="text-2xl font-semibold mb-4 text-blue-400">8. Data Security</h2>
            <p className="text-gray-300 leading-relaxed mb-3">
              We adhere to internationally recognized standards and security frameworks, including ISO/IEC 27001, PCI
              DSS, and SOC 2, and conduct periodic audits by certified professionals to ensure compliance with
              Applicable Laws.
            </p>
            <p className="text-gray-300 leading-relaxed">
              While We strive to maintain robust security, please note that no online system is completely foolproof,
              and We cannot guarantee absolute protection.
            </p>
          </section>

          {/* Section 9: International Data Transfers */}
          <section>
            <h2 className="text-2xl font-semibold mb-4 text-blue-400">9. International Data Transfers</h2>
            <p className="text-gray-300 leading-relaxed">
              Your data may be transferred and stored on servers located outside Your region. By using Our Services, You
              consent to such transfers in accordance with this Privacy Policy.
            </p>
          </section>

          {/* Section 10: Data Retention */}
          <section>
            <h2 className="text-2xl font-semibold mb-4 text-blue-400">10. Data Retention</h2>
            <p className="text-gray-300 leading-relaxed">
              We retain Your Personal Data only for as long as necessary to fulfill the purposes stated in this Policy
              or as required by law.
            </p>
          </section>

          {/* Section 11: Disclosure and Sharing of Data */}
          <section>
            <h2 className="text-2xl font-semibold mb-4 text-blue-400">11. Disclosure and Sharing of Data</h2>
            <p className="text-gray-300 leading-relaxed mb-3">We may share Your Personal Data with:</p>
            <ul className="list-disc list-inside space-y-2 text-gray-300 ml-4">
              <li>Regulatory or government authorities for compliance with Applicable Laws</li>
              <li>Third-party service providers assisting in payment processing, verification, or analytics</li>
              <li>Business partners with whom You transact through Our platform</li>
            </ul>
            <p className="text-gray-300 leading-relaxed mt-4 font-medium">
              We do not sell or rent Your Personal Data to third parties for marketing purposes.
            </p>
          </section>

          {/* Section 12: Government or Legal Disclosure */}
          <section>
            <h2 className="text-2xl font-semibold mb-4 text-blue-400">12. Government or Legal Disclosure</h2>
            <p className="text-gray-300 leading-relaxed">
              Ztake may disclose Personal Data without prior consent to authorized government bodies for the purposes of
              verification of identity, prevention, detection, investigation, or prosecution of offences, as required
              under Applicable Laws.
            </p>
          </section>

          {/* Section 13: Children's Privacy */}
          <section>
            <h2 className="text-2xl font-semibold mb-4 text-blue-400">13. Children's Privacy</h2>
            <p className="text-gray-300 leading-relaxed">
              Our Services are not directed at children under the age of 13. We do not knowingly collect data from
              children. If You believe a child has provided Us with information, please contact Us at{" "}
              <a href="mailto:grievances@ztake.in" className="text-blue-400 hover:text-blue-300">
                grievances@ztake.in
              </a>
              , and We will take immediate action to remove it.
            </p>
          </section>

          {/* Section 14: Changes to This Privacy Policy */}
          <section>
            <h2 className="text-2xl font-semibold mb-4 text-blue-400">14. Changes to This Privacy Policy</h2>
            <p className="text-gray-300 leading-relaxed">
              We may update this Privacy Policy periodically to comply with legal or operational changes. Updated
              versions will be posted on ztake.in, and continued use of Our Services constitutes acceptance of such
              changes.
            </p>
          </section>

          {/* Section 15: Grievance Officer */}
          <section>
            <h2 className="text-2xl font-semibold mb-4 text-blue-400">15. Grievance Officer</h2>
            <p className="text-gray-300 leading-relaxed mb-3">
              As per the Information Technology Act, 2000, the details of Our Grievance Officer are as follows:
            </p>
            <div className="bg-white/5 border border-white/10 rounded-lg p-6 space-y-2">
              <p className="text-white font-semibold">Mr. Vikas Srivastav</p>
              <p className="text-gray-300">Ztake Tech Private Limited</p>
              <p className="text-gray-300">Business Hub, Technology Park, Sector 90, Noida, Uttar Pradesh, India</p>
              <p className="text-gray-300">
                Email:{" "}
                <a href="mailto:grievances@ztake.in" className="text-blue-400 hover:text-blue-300">
                  grievances@ztake.in
                </a>
              </p>
            </div>
          </section>

          {/* Section 16: Contact Us */}
          <section>
            <h2 className="text-2xl font-semibold mb-4 text-blue-400">16. Contact Us</h2>
            <p className="text-gray-300 leading-relaxed mb-4">
              For any questions or concerns about this Privacy Policy or Our data handling practices, please contact Us
              at:
            </p>
            <div className="bg-white/5 border border-white/10 rounded-lg p-6 space-y-2">
              <p className="text-gray-300">
                📧{" "}
                <a href="mailto:grievances@ztake.in" className="text-blue-400 hover:text-blue-300">
                  support@ztake.in
                </a>
              </p>
              <p className="text-gray-300">
                🌐{" "}
                <a href="https://www.ztake.in" className="text-blue-400 hover:text-blue-300">
                  www.ztake.in
                </a>
              </p>
            </div>
          </section>
        </div>
      </main>
    </div>
  )
}
