import { MetricDisplay } from "@/components/marketing/MetricDisplay";
import { FeatureCard } from "@/components/marketing/FeatureCard";
import { TestimonialCard } from "@/components/marketing/TestimonialCard";
import { PillButton } from "@/components/marketing/PillButton";
import { GlassCard } from "@/components/marketing/GlassCard";
import {
  CreditCard,
  Zap,
  Globe,
  Shield,
  Code,
  TrendingUp,
  Wallet,
  Users,
  CheckCircle,
  ArrowRight,
} from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section id="home" className="relative pt-32 pb-20 px-4 sm:px-6 lg:px-8 overflow-hidden">
        {/* Animated background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-blue-500/5 to-purple-500/5 dark:from-primary/10 dark:via-blue-500/10 dark:to-purple-500/10" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(59,130,246,0.1),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(147,51,234,0.1),transparent_50%)]" />

        <div className="relative max-w-7xl mx-auto">
          <div className="text-center mb-16 animate-fade-in">
            <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight">
              Empowering Modern
              <br />
              <span className="bg-gradient-to-r from-primary-500 via-blue-600 to-purple-600 bg-clip-text text-transparent">
                Businesses to Get Paid
              </span>
              <br />
              Instantly
            </h1>
            <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto mb-8 leading-relaxed">
              Accept payments with 180+ methods including UPI, Cards, Wallets, and more.
              Built for developers, loved by businesses.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <PillButton variant="default" size="lg" href="/login" testId="hero-button-start">
                Get Started Now
                <ArrowRight className="w-5 h-5 ml-2" />
              </PillButton>
              <PillButton variant="outline" size="lg" href="/docs" testId="hero-button-docs">
                View Documentation
              </PillButton>
            </div>
          </div>

          {/* Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            <MetricDisplay value="10K+" label="Active Merchants" />
            <MetricDisplay value="₹500Cr+" label="Transactions Processed" />
            <MetricDisplay value="99.9%" label="Uptime Guarantee" />
          </div>
        </div>
      </section>

      {/* Why Choose Ztake */}
      <section id="features" className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-background to-accent/10">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">Why Choose Ztake</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Experience the future of digital payments with our innovative solutions
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <FeatureCard
              icon={Shield}
              title="Secure Payments"
              description="Bank-grade security with end-to-end encryption for all transactions"
            />
            <FeatureCard
              icon={Zap}
              title="Lightning Fast"
              description="Process payments in milliseconds with our optimized infrastructure"
            />
            <FeatureCard
              icon={Globe}
              title="Global Reach"
              description="Accept payments from customers worldwide with multi-currency support"
            />
            <FeatureCard
              icon={Users}
              title="24/7 Support"
              description="Round-the-clock customer support to help you succeed"
            />
          </div>
        </div>
      </section>

      {/* Core Features */}
      <section id="solutions" className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">Complete Payment Solutions</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Everything you need to accept and manage payments at scale
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <FeatureCard
              icon={CreditCard}
              title="Payment Gateway"
              description="Seamless payment processing with support for all major payment methods"
              features={[
                "Multi-currency support",
                "Real-time processing",
                "Advanced fraud protection",
              ]}
              href="/payments"
            />
            <FeatureCard
              icon={TrendingUp}
              title="Subscriptions"
              description="Manage recurring billing and subscription plans effortlessly"
              features={[
                "Flexible billing cycles",
                "Automated dunning",
                "Customer portal",
              ]}
              href="/subscriptions"
            />
            <FeatureCard
              icon={Wallet}
              title="ZtakeX Banking"
              description="Business banking with payouts, corporate cards, and more"
              features={[
                "Instant payouts 24/7",
                "Virtual corporate cards",
                "Accounting integrations",
              ]}
              href="/ztakex"
            />
            <FeatureCard
              icon={Code}
              title="Developer APIs"
              description="Developer-friendly APIs with comprehensive documentation"
              features={[
                "RESTful APIs",
                "Multiple SDKs",
                "Webhook notifications",
              ]}
              href="/docs"
            />
            <FeatureCard
              icon={Shield}
              title="Security & Compliance"
              description="Enterprise-grade security with PCI DSS compliance"
              features={[
                "PCI DSS Level 1",
                "AES-256 encryption",
                "Real-time monitoring",
              ]}
              href="/security"
            />
            <FeatureCard
              icon={Globe}
              title="International Payments"
              description="Accept payments in 140+ currencies from customers worldwide"
              features={[
                "Multi-currency processing",
                "Competitive FX rates",
                "Local payment methods",
              ]}
              href="/payments/international"
            />
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section id="testimonials" className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-accent/10 to-background">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">Trusted by Businesses</h2>
            <p className="text-xl text-muted-foreground">
              See what our customers have to say
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <TestimonialCard
              quote="Ztake has revolutionized our payment processing. The integration was seamless and the support team is exceptional."
              author="Rajesh Kumar"
              role="CTO"
              company="TechStart Solutions"
            />
            <TestimonialCard
              quote="Outstanding service and reliability. Our transaction success rate has improved significantly since switching to Ztake."
              author="Priya Sharma"
              role="Operations Manager"
              company="E-commerce Plus"
            />
            <TestimonialCard
              quote="The analytics dashboard provides incredible insights. Ztake is definitely the best payment gateway we have used."
              author="Amit Patel"
              role="Founder"
              company="Digital Ventures"
            />
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section id="get-started" className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <GlassCard className="p-12 text-center" glow>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Ready to Get Started?
            </h2>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Join thousands of businesses already using Ztake to process their payments securely and efficiently
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <PillButton variant="default" size="lg" href="/login" testId="cta-button-trial">
                Start Free Trial
              </PillButton>
              <PillButton variant="outline" size="lg" href="/contact" testId="cta-button-sales">
                Contact Sales
              </PillButton>
            </div>
          </GlassCard>
        </div>
      </section>

      {/* Trust Indicators */}
      <section id="trust" className="py-16 px-4 sm:px-6 lg:px-8 border-t border-white/10">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div>
              <CheckCircle className="w-8 h-8 mx-auto mb-2 text-primary" />
              <div className="font-semibold">PCI DSS Certified</div>
            </div>
            <div>
              <CheckCircle className="w-8 h-8 mx-auto mb-2 text-primary" />
              <div className="font-semibold">99.9% Uptime SLA</div>
            </div>
            <div>
              <CheckCircle className="w-8 h-8 mx-auto mb-2 text-primary" />
              <div className="font-semibold">24/7 Support</div>
            </div>
            <div>
              <CheckCircle className="w-8 h-8 mx-auto mb-2 text-primary" />
              <div className="font-semibold">ISO 27001 Certified</div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
