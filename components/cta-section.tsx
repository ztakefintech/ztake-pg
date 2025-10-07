'use client';

import Link from 'next/link';
import { FiArrowRight, FiCheck } from 'react-icons/fi';

export function CTASection() {
  const features = [
    "No setup fees",
    "24/7 customer support",
    "99.9% uptime guarantee",
    "PCI DSS compliant"
  ];

  return (
    <section className="py-20 bg-gradient-to-r from-blue-600 to-blue-800 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            Ready to Get Started?
          </h2>
          <p className="text-xl mb-8 max-w-3xl mx-auto">
            Join thousands of businesses already using Ztake to process payments, 
            manage transactions, and grow their revenue.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
            <Link
              href="/register"
              className="bg-white text-blue-600 hover:bg-gray-100 px-8 py-4 rounded-lg text-lg font-semibold flex items-center gap-2 transition-colors"
            >
              Start Free Trial
              <FiArrowRight />
            </Link>
            <Link
              href="#contact"
              className="border-2 border-white text-white hover:bg-white hover:text-blue-600 px-8 py-4 rounded-lg text-lg font-semibold transition-colors"
            >
              Contact Sales
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-4xl mx-auto">
            {features.map((feature, index) => (
              <div key={index} className="flex items-center justify-center">
                <FiCheck className="w-5 h-5 mr-2 text-green-300" />
                <span className="text-sm font-medium">{feature}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}