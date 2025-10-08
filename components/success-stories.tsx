"use client"

import { Users, TrendingUp, Shield, Clock } from "lucide-react"

const stats = [
  {
    icon: Users,
    value: "10K+",
    label: "Active Merchants",
  },
  {
    icon: TrendingUp,
    value: "₹500Cr+",
    label: "Transactions Processed",
  },
  {
    icon: Shield,
    value: "99.9%",
    label: "Uptime Guarantee",
  },
  {
    icon: Clock,
    value: "24/7",
    label: "Customer Support",
  },
]

const testimonials = [
  {
    quote:
      "Ztake has revolutionized our payment processing. The integration was seamless and the support team is exceptional.",
    author: "Rajesh Kumar",
    company: "TechStart Solutions",
  },
  {
    quote:
      "Outstanding service and reliability. Our transaction success rate has improved significantly since switching to Ztake.",
    author: "Priya Sharma",
    company: "E-commerce Plus",
  },
  {
    quote:
      "The analytics dashboard provides incredible insights. Ztake is definitely the best payment gateway we have used.",
    author: "Amit Patel",
    company: "Digital Ventures",
  },
]

export function SuccessStories() {
  return (
    <section id="success-stories" className="py-20 px-6 bg-black relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-blue-600/3 to-transparent pointer-events-none" />

      <div className="container mx-auto max-w-7xl relative z-10">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">Success Stories</h2>
          <p className="text-gray-400 text-lg max-w-3xl mx-auto">
            Join thousands of businesses that trust Ztake for their payment needs
          </p>
        </div>

        <div className="mb-16">
          <h3 className="text-2xl font-semibold text-white text-center mb-8">What Our Clients Say</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {stats.map((stat, index) => (
              <div key={index} className="glass-card glass-hover p-6 text-center rounded-2xl">
                <div className="flex justify-center mb-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-600/20 to-blue-600/5 flex items-center justify-center backdrop-blur-sm border border-blue-600/20">
                    <stat.icon className="w-6 h-6 text-blue-400" />
                  </div>
                </div>
                <div className="text-3xl font-bold text-white mb-2">{stat.value}</div>
                <div className="text-gray-400 text-sm">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {testimonials.map((testimonial, index) => (
            <div key={index} className="glass-card glass-hover p-8 rounded-2xl">
              <div className="mb-6">
                <svg className="w-10 h-10 text-blue-400" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
                </svg>
              </div>
              <p className="text-gray-300 leading-relaxed mb-6">{testimonial.quote}</p>
              <div>
                <div className="font-semibold text-white">{testimonial.author}</div>
                <div className="text-gray-500 text-sm">{testimonial.company}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
