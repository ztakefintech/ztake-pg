"use client"

import { Button } from "@/components/ui/button"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"

export function Hero() {
  const [mounted, setMounted] = useState(false)
  const router = useRouter()
  useEffect(() => {
    setMounted(true)
  }, [])

  const scrollToContact = () => {
    const contactSection = document.getElementById("contact")
    if (contactSection) {
      contactSection.scrollIntoView({ behavior: "smooth" })
    }
  }

  return (
    <section className="relative min-h-screen flex items-center justify-center px-6 overflow-hidden">
      {/* Animated background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-black via-black to-gray-900 text-[rgba(219,0,0,1)] bg-[rgba(0,0,0,1)] opacity-50" />

      {/* Subtle animated orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-400/5 rounded-full blur-3xl animate-pulse delay-1000" />

      {/* Content */}
      <div
        className={`relative z-10 text-center max-w-4xl mx-auto transition-all duration-1000 ${
          mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
        }`}
      >
        <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-white mb-6 leading-tight">
          Welcome to <span className="text-blue-600 inline-block hover:scale-105 transition-transform">Ztake</span>
        </h1>

        <p className="text-gray-400 text-lg md:text-xl mb-10 max-w-3xl mx-auto leading-relaxed">
          Your trusted partner for comprehensive payment gateway solutions, financial services, and cutting-edge
          technology solutions.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Button
            size="lg"
            className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-6 text-base font-medium rounded-md transition-all hover:shadow-xl hover:shadow-blue-600/50 hover:scale-105 w-full sm:w-auto"
            onClick={() => router.push("/dashboard")}
          >
            Get Started
          </Button>
          <Button
            size="lg"
            variant="outline"
            onClick={scrollToContact}
            className="border-2 bg-transparent hover:bg-gray-900 px-8 py-6 text-base font-medium rounded-md transition-all hover:border-gray-600 w-full sm:w-auto text-blue-500 border-blue-950"
          >
            Learn More
          </Button>
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
        <div className="w-6 h-10 border-2 border-gray-700 rounded-full flex items-start justify-center p-2">
          <div className="w-1.5 h-3 bg-blue-600 rounded-full animate-pulse" />
        </div>
      </div>
    </section>
  )
}
