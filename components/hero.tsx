'use client';

import Link from 'next/link';
import { FiArrowRight, FiPlay } from 'react-icons/fi';

export function Hero() {
  return (
    <section className="pt-16 bg-black text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center">
          <h1 className="text-4xl md:text-6xl font-bold mb-6">
            Revolutionize Your
            <span className="block text-blue-400">Payment Processing</span>
          </h1>
          <p className="text-xl md:text-2xl text-gray-300 mb-8 max-w-3xl mx-auto">
            Seamless, secure, and lightning-fast payment solutions for modern businesses. 
            Accept payments, manage payouts, and grow your revenue with confidence.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
            <Link
              href="/register"
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-lg text-lg font-semibold flex items-center gap-2 transition-colors"
            >
              Start Free Trial
              <FiArrowRight />
            </Link>
            <button className="border border-gray-600 hover:border-gray-400 text-white px-8 py-4 rounded-lg text-lg font-semibold flex items-center gap-2 transition-colors">
              <FiPlay />
              Watch Demo
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-400 mb-2">99.9%</div>
              <div className="text-gray-400">Uptime</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-400 mb-2">10M+</div>
              <div className="text-gray-400">Transactions</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-400 mb-2">500+</div>
              <div className="text-gray-400">Happy Clients</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}