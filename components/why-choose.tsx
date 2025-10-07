'use client';

import { FiShield, FiZap, FiGlobe, FiHeadphones, FiTrendingUp, FiLock } from 'react-icons/fi';

export function WhyChoose() {
  const features = [
    {
      icon: <FiShield className="w-8 h-8" />,
      title: "Bank-Grade Security",
      description: "Advanced encryption and fraud protection to keep your transactions secure."
    },
    {
      icon: <FiZap className="w-8 h-8" />,
      title: "Lightning Fast",
      description: "Process payments in milliseconds with our optimized infrastructure."
    },
    {
      icon: <FiGlobe className="w-8 h-8" />,
      title: "Global Reach",
      description: "Accept payments from customers worldwide with multi-currency support."
    },
    {
      icon: <FiHeadphones className="w-8 h-8" />,
      title: "24/7 Support",
      description: "Round-the-clock customer support to help you succeed."
    },
    {
      icon: <FiTrendingUp className="w-8 h-8" />,
      title: "Scalable Growth",
      description: "Grow your business with our flexible and scalable payment solutions."
    },
    {
      icon: <FiLock className="w-8 h-8" />,
      title: "Compliance Ready",
      description: "PCI DSS compliant with industry-leading security standards."
    }
  ];

  return (
    <section id="about" className="py-20 bg-gray-900 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Why Choose Ztake?
          </h2>
          <p className="text-xl text-gray-400 max-w-3xl mx-auto">
            We provide the tools and infrastructure you need to accept payments, 
            manage transactions, and grow your business with confidence.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <div key={index} className="bg-gray-800 p-6 rounded-lg hover:bg-gray-700 transition-colors">
              <div className="text-blue-400 mb-4">
                {feature.icon}
              </div>
              <h3 className="text-xl font-semibold mb-3">
                {feature.title}
              </h3>
              <p className="text-gray-400">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}