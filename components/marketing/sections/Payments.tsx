import { FeatureCard } from "@/components/marketing/FeatureCard";
import { GlassCard } from "@/components/marketing/GlassCard";
import { PillButton } from "@/components/marketing/PillButton";
import {
  CreditCard,
  Link as LinkIcon,
  Globe,
  Smartphone,
  QrCode,
  Zap,
  Shield,
  TrendingUp,
} from "lucide-react";

export default function Payments() {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-blue-500/5" />
        
        <div className="relative max-w-7xl mx-auto text-center">
          <h1 className="text-5xl md:text-6xl font-bold mb-6">
            Complete Payment
            <br />
            <span className="bg-gradient-to-r from-primary-500 to-blue-600 bg-clip-text text-transparent">
              Solutions
            </span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto mb-8">
            Accept payments with 180+ payment methods including UPI, Cards, Wallets, Net Banking, and more
          </p>
          <PillButton variant="default" size="lg" href="/contact" testId="payments-button-start">
            Start Accepting Payments
          </PillButton>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <FeatureCard
              icon={CreditCard}
              title="Smart Checkout"
              description="Customizable checkout that loads in under 200ms with optimized payment flows"
              features={[
                "One-click checkout",
                "Saved cards and addresses",
                "Mobile optimized",
                "Multi-language support",
              ]}
            />
            <FeatureCard
              icon={LinkIcon}
              title="Payment Links"
              description="Create and share payment links via SMS, email, or social media"
              features={[
                "No coding required",
                "Instant link generation",
                "Custom branding",
                "Track payment status",
              ]}
            />
            <FeatureCard
              icon={Globe}
              title="Payment Pages"
              description="Beautiful, hosted payment pages for your products and services"
              features={[
                "Drag-and-drop builder",
                "Mobile responsive",
                "SEO optimized",
                "Analytics included",
              ]}
            />
            <FeatureCard
              icon={QrCode}
              title="UPI Payments"
              description="Accept UPI payments with autopay and collect requests"
              features={[
                "UPI intent flow",
                "QR code payments",
                "UPI autopay",
                "Instant settlements",
              ]}
            />
            <FeatureCard
              icon={Smartphone}
              title="Mobile SDKs"
              description="Native iOS and Android SDKs for seamless in-app payments"
              features={[
                "React Native support",
                "Flutter integration",
                "Kotlin & Swift SDKs",
                "Offline capability",
              ]}
            />
            <FeatureCard
              icon={Globe}
              title="International Payments"
              description="Accept payments in 140+ currencies from customers worldwide"
              features={[
                "Multi-currency processing",
                "Competitive FX rates",
                "Local payment methods",
                "Compliance support",
              ]}
            />
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-accent/10 to-background">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">Why Businesses Choose Ztake</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <GlassCard className="p-8 text-center" glow>
              <Zap className="w-12 h-12 mx-auto mb-4 text-primary" />
              <h3 className="text-2xl font-bold mb-2">99.9% Success Rate</h3>
              <p className="text-muted-foreground">
                Industry-leading payment success rates powered by smart routing and direct bank integrations
              </p>
            </GlassCard>
            <GlassCard className="p-8 text-center" glow>
              <Shield className="w-12 h-12 mx-auto mb-4 text-primary" />
              <h3 className="text-2xl font-bold mb-2">Bank-Grade Security</h3>
              <p className="text-muted-foreground">
                PCI DSS Level 1 certified with end-to-end encryption and fraud detection
              </p>
            </GlassCard>
            <GlassCard className="p-8 text-center" glow>
              <TrendingUp className="w-12 h-12 mx-auto mb-4 text-primary" />
              <h3 className="text-2xl font-bold mb-2">Instant Settlements</h3>
              <p className="text-muted-foreground">
                Get your money faster with instant settlements and T+0 payouts
              </p>
            </GlassCard>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <GlassCard className="p-12 text-center" glow>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Ready to Start Accepting Payments?
            </h2>
            <p className="text-xl text-muted-foreground mb-8">
              Get started in minutes with our simple integration
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <PillButton variant="default" size="lg" href="/contact" testId="payments-cta-signup">
                Create Account
              </PillButton>
              <PillButton variant="outline" size="lg" href="/docs" testId="payments-cta-docs">
                View Documentation
              </PillButton>
            </div>
          </GlassCard>
        </div>
      </section>
    </div>
  );
}
