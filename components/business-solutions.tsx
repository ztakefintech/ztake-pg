'use client';

import { FiShoppingCart, FiUsers, FiBriefcase, FiHome } from 'react-icons/fi';

export function BusinessSolutions() {
  const solutions = [
    {
      icon: <FiShoppingCart className="w-16 h-16" />,
      title: "E-commerce",
      description: "Complete payment solutions for online stores and marketplaces.",
      features: [
        "Shopping cart integration",
        "Subscription billing",
        "Inventory management",
        "Order tracking"
      ]
    },
    {
      icon: <FiUsers className="w-16 h-16" />,
      title: "SaaS Platforms",
      description: "Subscription and usage-based billing for software companies.",
      features: [
        "Recurring billing",
        "Usage tracking",
        "Proration handling",
        "Customer management"
      ]
    },
    {
      icon: <FiBriefcase className="w-16 h-16" />,
      title: "Enterprise",
      description: "Custom payment solutions for large organizations.",
      features: [
        "Custom integrations",
        "Dedicated support",
        "Advanced analytics",
        "Compliance assistance"
      ]
    },
    {
      icon: <FiHome className="w-16 h-16" />,
      title: "Small Business",
      description: "Simple, affordable payment solutions for growing businesses.",
      features: [
        "Easy setup",
        "Low fees",
        "Basic reporting",
        "Phone support"
      ]
    }
  ];

  return (
    <section id="solutions" className="py-20 bg-gray-900 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Business Solutions
          </h2>
          <p className="text-xl text-gray-400 max-w-3xl mx-auto">
            Tailored payment solutions for every type of business, from startups to enterprises.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          {solutions.map((solution, index) => (
            <div key={index} className="bg-gray-800 p-8 rounded-lg hover:bg-gray-700 transition-colors">
              <div className="text-blue-400 mb-6">
                {solution.icon}
              </div>
              <h3 className="text-2xl font-semibold mb-4">
                {solution.title}
              </h3>
              <p className="text-gray-400 mb-6 text-lg">
                {solution.description}
              </p>
              <ul className="space-y-3">
                {solution.features.map((feature, featureIndex) => (
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