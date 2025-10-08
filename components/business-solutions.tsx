"use client"

import { Building2, Store } from "lucide-react"
import { Button } from "@/components/ui/button"

const solutions = [
  {
    icon: Building2,
    title: "Enterprise Solutions",
    description: "Scalable payment infrastructure designed for large enterprises with high transaction volumes.",
    features: ["Custom integration", "Dedicated support", "SLA guarantees", "Advanced reporting"],
  },
  {
    icon: Store,
    title: "Small Business",
    description: "Affordable and easy-to-use payment solutions perfect for small and medium businesses.",
    features: ["Quick setup", "Low fees", "Mobile-friendly", "Basic analytics"],
  },
]

export function BusinessSolutions() {
  return (
    <section className="py-20 px-6 bg-black relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-blue-600/5 via-transparent to-transparent pointer-events-none" />

      <div className="container mx-auto max-w-7xl relative z-10">
        <div className="text-center mb-4">
          <p className="text-blue-400 font-semibold text-sm uppercase tracking-wider mb-2">Trusted Partners</p>
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">Business Solutions</h2>
          <p className="text-gray-400 text-lg max-w-3xl mx-auto">Tailored solutions for businesses of all sizes</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-12">
          {solutions.map((solution, index) => (
            <div key={index} className="glass-card glass-hover p-10 rounded-2xl group">
              <div className="mb-6">
                <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-blue-600/20 to-blue-600/5 flex items-center justify-center group-hover:from-blue-600/30 group-hover:to-blue-600/10 transition-all duration-300 backdrop-blur-sm border border-blue-600/20">
                  <solution.icon className="w-8 h-8 text-blue-400" />
                </div>
              </div>
              <h3 className="text-3xl font-semibold text-white mb-4">{solution.title}</h3>
              <p className="text-gray-400 leading-relaxed mb-6">{solution.description}</p>
              <ul className="space-y-3 mb-8">
                {solution.features.map((feature, idx) => (
                  <li key={idx} className="flex items-center text-gray-300">
                    <div className="w-2 h-2 rounded-full bg-blue-500 mr-3 shadow-lg shadow-blue-500/50" />
                    {feature}
                  </li>
                ))}
              </ul>
              <Button className="glass-button w-full py-6 text-white font-semibold rounded-xl border-0">
                Learn More
              </Button>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
