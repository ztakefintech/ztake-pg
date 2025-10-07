'use client';

import { FiCreditCard, FiSmartphone, FiGlobe, FiTrendingUp, FiShield, FiSettings } from 'react-icons/fi';

export function Services() {
  const services = [
    {
      icon: <FiCreditCard className="w-12 h-12" />,
      title: "Payment Processing",
      description: "Accept credit cards, debit cards, and digital wallets with our secure payment gateway.",
      features: ["Multiple payment methods", "Real-time processing", "Fraud protection", "PCI compliance"]
    },
    {
      icon: <FiSmartphone className="w-12 h-12" />,
      title: "Mobile Payments",
      description: "Enable seamless mobile payments with our mobile-optimized solutions.",
      features: ["Mobile SDK", "QR code payments", "In-app payments", "Push notifications"]
    },
    {
      icon: <FiGlobe className="w-12 h-12" />,
      title: "International Payments",
      description: "Expand globally with multi-currency support and international payment methods.",
      features: ["150+ currencies", "Local payment methods", "Cross-border transfers", "Currency conversion"]
    },
    {
      icon: <FiTrendingUp className="w-12 h-12" />,
      title: "Analytics & Reporting",
      description: "Gain insights into your business with comprehensive analytics and reporting tools.",
      features: ["Real-time dashboards", "Custom reports", "Revenue tracking", "Performance metrics"]
    },
    {
      icon: <FiShield className="w-12 h-12" />,
      title: "Security & Compliance",
      description: "Bank-grade security with industry-leading compliance and fraud protection.",
      features: ["End-to-end encryption", "3D Secure", "Risk management", "Compliance monitoring"]
    },
    {
      icon: <FiSettings className="w-12 h-12" />,
      title: "API Integration",
      description: "Easy integration with our developer-friendly APIs and comprehensive documentation.",
      features: ["RESTful APIs", "Webhooks", "SDKs", "Developer tools"]
    }
  ];

  return (
    <section id="services" className="py-20 bg-black text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Our Services
          </h2>
          <p className="text-xl text-gray-400 max-w-3xl mx-auto">
            Comprehensive payment solutions designed to meet the needs of businesses of all sizes.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {services.map((service, index) => (
            <div key={index} className="bg-gray-900 p-8 rounded-lg hover:bg-gray-800 transition-colors">
              <div className="text-blue-400 mb-6">
                {service.icon}
              </div>
              <h3 className="text-2xl font-semibold mb-4">
                {service.title}
              </h3>
              <p className="text-gray-400 mb-6">
                {service.description}
              </p>
              <ul className="space-y-2">
                {service.features.map((feature, featureIndex) => (
                  <li key={featureIndex} className="text-gray-300 flex items-center">
                    <span className="w-2 h-2 bg-blue-400 rounded-full mr-3"></span>
                    {feature}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}