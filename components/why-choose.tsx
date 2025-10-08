"use client"

import { Shield, Zap, Globe, Clock } from "lucide-react"

const features = [
  {
    icon: Shield,
    title: "Secure Payments",
    description: "Bank-grade security with end-to-end encryption for all transactions",
  },
  {
    icon: Zap,
    title: "Lightning Fast",
    description: "Process payments in milliseconds with our optimized infrastructure",
  },
  {
    icon: Globe,
    title: "Global Reach",
    description: "Accept payments from customers worldwide with multi-currency support",
  },
  {
    icon: Clock,
    title: "24/7 Support",
    description: "Round-the-clock customer support to help you succeed",
  },
]

export function WhyChoose() {
  return (
    <section id="features" className="py-20 px-6 bg-black relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-blue-600/5 via-transparent to-transparent pointer-events-none" />

      <div className="container mx-auto max-w-7xl relative z-10">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">Why Choose Ztake</h2>
          <p className="text-gray-400 text-lg max-w-3xl mx-auto">
            Experience the future of digital payments with our innovative solutions designed for modern businesses
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => (
            <div key={index} className="glass-card glass-hover p-8 rounded-2xl group">
              <div className="mb-6">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-600/20 to-blue-600/5 flex items-center justify-center group-hover:from-blue-600/30 group-hover:to-blue-600/10 transition-all duration-300 backdrop-blur-sm border border-blue-600/20">
                  <feature.icon className="w-7 h-7 text-blue-400" />
                </div>
              </div>
              <h3 className="text-xl font-semibold text-white mb-3">{feature.title}</h3>
              <p className="text-gray-400 leading-relaxed">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
