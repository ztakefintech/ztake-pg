"use client"

import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation" 
export function CTASection() {
  const router = useRouter()
  const scrollToContact = () => {
    document.getElementById("contact")?.scrollIntoView({ behavior: "smooth" })
  }

  return (
    <section className="py-20 px-6 bg-gradient-to-b from-gray-950 to-black">
      <div className="container mx-auto max-w-4xl text-center">
        <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">Ready to Get Started?</h2>
        <p className="text-gray-400 text-lg mb-10 max-w-2xl mx-auto">
          Join thousands of businesses already using Ztake to process their payments securely and efficiently.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Button className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-6 text-base font-medium rounded-md transition-all hover:shadow-xl hover:shadow-blue-600/50 w-full sm:w-auto" 
          onClick={() => router.push("/dashboard")}
          >
            Start Free Trial
          </Button>
          <Button
            variant="outline"
            onClick={scrollToContact}
            className="border-2 border-gray-700 bg-transparent hover:bg-gray-900 text-white px-8 py-6 text-base font-medium rounded-md transition-all hover:border-gray-600 w-full sm:w-auto"
          >
            Contact Sales
          </Button>
        </div>
      </div>
    </section>
  )
}
