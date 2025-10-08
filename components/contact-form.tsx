"use client"

import type React from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Phone, Mail, MapPin } from "lucide-react"
import { useState } from "react"

export function ContactForm() {
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    company: "",
    message: "",
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    console.log("[v0] Form submitted:", formData)
    alert("Thank you for your message! We'll get back to you soon.")
  }

  return (
    <section id="contact" className="py-20 px-6 bg-black relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-blue-600/5 via-transparent to-transparent pointer-events-none" />

      <div className="container mx-auto max-w-7xl relative z-10">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">Get in Touch</h2>
          <p className="text-gray-400 text-lg max-w-3xl mx-auto">
            Ready to transform your payment processing? Contact our experts today for a personalized consultation.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 glass-card p-8 rounded-2xl">
            <h3 className="text-2xl font-semibold text-white mb-6">Send us a Message</h3>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-gray-300 mb-2 text-sm">Full Name</label>
                <Input
                  placeholder="Your full name"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  className="glass border-white/10 text-white placeholder:text-gray-500 focus:border-blue-500/50"
                  required
                />
              </div>
              <div>
                <label className="block text-gray-300 mb-2 text-sm">Email Address</label>
                <Input
                  type="email"
                  placeholder="your@email.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="glass border-white/10 text-white placeholder:text-gray-500 focus:border-blue-500/50"
                  required
                />
              </div>
              <div>
                <label className="block text-gray-300 mb-2 text-sm">Phone Number</label>
                <Input
                  type="tel"
                  placeholder="+91 XXXXX XXXXX"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="glass border-white/10 text-white placeholder:text-gray-500 focus:border-blue-500/50"
                  required
                />
              </div>
              <div>
                <label className="block text-gray-300 mb-2 text-sm">Company Name</label>
                <Input
                  placeholder="Your company"
                  value={formData.company}
                  onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                  className="glass border-white/10 text-white placeholder:text-gray-500 focus:border-blue-500/50"
                />
              </div>
              <div>
                <label className="block text-gray-300 mb-2 text-sm">Message</label>
                <Textarea
                  placeholder="Tell us about your requirements..."
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  className="glass border-white/10 text-white placeholder:text-gray-500 min-h-32 focus:border-blue-500/50"
                  required
                />
              </div>
              <Button type="submit" className="glass-button w-full py-6 text-white font-semibold rounded-xl border-0">
                Send Message
              </Button>
            </form>
          </div>

          <div className="space-y-6">
            <div className="glass-card p-6 rounded-2xl">
              <h3 className="text-xl font-semibold text-white mb-6">Contact Information</h3>
              <div className="space-y-4">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600/20 to-blue-600/5 flex items-center justify-center flex-shrink-0 backdrop-blur-sm border border-blue-600/20">
                    <Phone className="w-5 h-5 text-blue-400" />
                  </div>
                  <div>
                    <div className="text-gray-400 text-sm mb-1">Phone</div>
                    <div className="text-white">+91 9220592512</div>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600/20 to-blue-600/5 flex items-center justify-center flex-shrink-0 backdrop-blur-sm border border-blue-600/20">
                    <Mail className="w-5 h-5 text-blue-400" />
                  </div>
                  <div>
                    <div className="text-gray-400 text-sm mb-1">Email</div>
                    <div className="text-white">sales@ztake.in</div>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600/20 to-blue-600/5 flex items-center justify-center flex-shrink-0 backdrop-blur-sm border border-blue-600/20">
                    <MapPin className="w-5 h-5 text-blue-400" />
                  </div>
                  <div>
                    <div className="text-gray-400 text-sm mb-1">Address</div>
                    <div className="text-white">Business Hub, Technology Park</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="glass-card p-6 rounded-2xl">
              <h3 className="text-xl font-semibold text-white mb-6">Business Hours</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Monday - Friday</span>
                  <span className="text-white">9:00 AM - 6:00 PM</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Saturday</span>
                  <span className="text-white">10:00 AM - 4:00 PM</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Sunday</span>
                  <span className="text-white">Closed</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
