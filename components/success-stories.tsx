'use client';

import { FiStar, FiTrendingUp, FiUsers, FiDollarSign } from 'react-icons/fi';

export function SuccessStories() {
  const stories = [
    {
      company: "TechStart Inc.",
      industry: "E-commerce",
      growth: "300%",
      testimonial: "Ztake helped us scale from 100 to 10,000+ transactions per day. The integration was seamless and the support team is incredible.",
      author: "Sarah Johnson",
      role: "CTO",
      metrics: [
        { icon: <FiTrendingUp />, label: "Revenue Growth", value: "300%" },
        { icon: <FiUsers />, label: "New Customers", value: "5,000+" },
        { icon: <FiDollarSign />, label: "Monthly Volume", value: "$2M+" }
      ]
    },
    {
      company: "GlobalSaaS",
      industry: "Software",
      growth: "500%",
      testimonial: "The subscription billing features saved us months of development time. Our churn rate dropped by 40% after implementing Ztake.",
      author: "Michael Chen",
      role: "Founder",
      metrics: [
        { icon: <FiTrendingUp />, label: "MRR Growth", value: "500%" },
        { icon: <FiUsers />, label: "Active Users", value: "50,000+" },
        { icon: <FiDollarSign />, label: "ARPU", value: "$89" }
      ]
    },
    {
      company: "RetailPlus",
      industry: "Retail",
      growth: "200%",
      testimonial: "We can now accept payments in 15+ countries. The international payment features opened up new markets for us.",
      author: "Emma Rodriguez",
      role: "Operations Director",
      metrics: [
        { icon: <FiTrendingUp />, label: "International Sales", value: "200%" },
        { icon: <FiUsers />, label: "Global Customers", value: "25,000+" },
        { icon: <FiDollarSign />, label: "Cross-border Volume", value: "$5M+" }
      ]
    }
  ];

  return (
    <section className="py-20 bg-black text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Success Stories
          </h2>
          <p className="text-xl text-gray-400 max-w-3xl mx-auto">
            See how businesses like yours are growing with Ztake's payment solutions.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {stories.map((story, index) => (
            <div key={index} className="bg-gray-900 p-8 rounded-lg hover:bg-gray-800 transition-colors">
              <div className="flex items-center mb-4">
                <div className="flex text-yellow-400">
                  {[...Array(5)].map((_, i) => (
                    <FiStar key={i} className="w-5 h-5 fill-current" />
                  ))}
                </div>
                <span className="ml-2 text-sm text-gray-400">{story.growth} growth</span>
              </div>
              
              <blockquote className="text-gray-300 mb-6 italic">
                "{story.testimonial}"
              </blockquote>
              
              <div className="border-t border-gray-700 pt-4">
                <div className="font-semibold text-white">{story.author}</div>
                <div className="text-sm text-gray-400">{story.role}, {story.company}</div>
                <div className="text-sm text-blue-400">{story.industry}</div>
              </div>

              <div className="mt-6 grid grid-cols-1 gap-4">
                {story.metrics.map((metric, metricIndex) => (
                  <div key={metricIndex} className="flex items-center justify-between">
                    <div className="flex items-center text-gray-400">
                      <span className="mr-2 text-blue-400">{metric.icon}</span>
                      <span className="text-sm">{metric.label}</span>
                    </div>
                    <span className="font-semibold text-white">{metric.value}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}