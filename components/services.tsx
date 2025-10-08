"use client"

import { CreditCard, Smartphone, BarChart3, Lock, Code, Headphones } from "lucide-react"

const services = [
  {
    icon: CreditCard,
    title: "Payment Gateway",
    description:
      "Seamless payment processing with support for all major payment methods including cards, UPI, and digital wallets.",
    features: ["Multi-currency support", "Real-time processing", "Advanced fraud protection"],
  },
  {
    icon: Smartphone,
    title: "Mobile Solutions",
    description:
      "Native mobile payment solutions optimized for iOS and Android platforms with superior user experience.",
    features: ["Native app integration", "Biometric authentication", "Offline payment capability"],
  },
  {
    icon: BarChart3,
    title: "Analytics Dashboard",
    description:
      "Comprehensive analytics and reporting tools to track your business performance and customer insights.",
    features: ["Real-time analytics", "Custom reports", "Business intelligence"],
  },
  {
    icon: Lock,
    title: "Security Solutions",
    description: "Enterprise-grade security with PCI DSS compliance and advanced threat detection systems.",
    features: ["PCI DSS compliant", "Threat detection", "Data encryption"],
  },
  {
    icon: Code,
    title: "API Integration",
    description: "Developer-friendly APIs with comprehensive documentation for seamless integration.",
    features: ["RESTful APIs", "SDK support", "Webhook notifications"],
  },
  {
    icon: Headphones,
    title: "Merchant Support",
    description: "24/7 dedicated support team to help you with technical issues and business growth.",
    features: ["24/7 support", "Technical assistance", "Business consultation"],
  },
]

export function Services() {
  return (
    <section id="services" className="py-20 px-6 bg-black relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-blue-600/3 to-transparent pointer-events-none" />

      <div className="container mx-auto max-w-7xl relative z-10">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">Our Services</h2>
          <p className="text-gray-400 text-lg max-w-3xl mx-auto">
            Comprehensive payment solutions tailored to meet your business needs
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {services.map((service, index) => (
            <div key={index} className="glass-card glass-hover p-8 rounded-2xl group">
              <div className="mb-6">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-600/20 to-blue-600/5 flex items-center justify-center group-hover:from-blue-600/30 group-hover:to-blue-600/10 transition-all duration-300 backdrop-blur-sm border border-blue-600/20">
                  <service.icon className="w-7 h-7 text-blue-400" />
                </div>
              </div>
              <h3 className="text-2xl font-semibold text-white mb-3">{service.title}</h3>
              <p className="text-gray-400 leading-relaxed mb-6">{service.description}</p>
              <ul className="space-y-2">
                {service.features.map((feature, idx) => (
                  <li key={idx} className="flex items-center text-gray-400 text-sm">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mr-3 shadow-lg shadow-blue-500/50" />
                    {feature}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
