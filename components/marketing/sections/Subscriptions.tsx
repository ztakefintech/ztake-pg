import { GlassCard } from "@/components/marketing/GlassCard";
import { FeatureCard } from "@/components/marketing/FeatureCard";
import { PillButton } from "@/components/marketing/PillButton";
import { Repeat, CreditCard, Users, BarChart, Bell, Shield } from "lucide-react";

export default function Subscriptions() {
  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="relative pt-32 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-purple-500/5" />
        
        <div className="relative max-w-7xl mx-auto text-center">
          <h1 className="text-5xl md:text-6xl font-bold mb-6">
            Subscription
            <br />
            <span className="bg-gradient-to-r from-primary-500 to-purple-600 bg-clip-text text-transparent">
              Billing Made Simple
            </span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto mb-8">
            Manage recurring payments, automate billing cycles, and grow your subscription business
          </p>
          <PillButton variant="default" size="lg" href="/login" testId="sub-button-start">
            Start Free Trial
          </PillButton>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <FeatureCard
              icon={Repeat}
              title="Flexible Billing Cycles"
              description="Support any billing frequency from daily to annual subscriptions"
              features={[
                "Custom billing intervals",
                "Pro-rated charges",
                "Trial periods",
                "Add-ons & discounts",
              ]}
            />
            <FeatureCard
              icon={CreditCard}
              title="Smart Retry Logic"
              description="Automated dunning to recover failed payments and reduce churn"
              features={[
                "Intelligent retry schedule",
                "Customer notifications",
                "Payment method updates",
                "Grace periods",
              ]}
            />
            <FeatureCard
              icon={Users}
              title="Customer Portal"
              description="Self-service portal for customers to manage subscriptions"
              features={[
                "Update payment methods",
                "Change plans",
                "View invoices",
                "Cancel subscription",
              ]}
            />
            <FeatureCard
              icon={BarChart}
              title="Analytics & Metrics"
              description="Track MRR, churn, and customer lifetime value"
              features={[
                "Revenue analytics",
                "Cohort analysis",
                "Churn prediction",
                "Custom reports",
              ]}
            />
            <FeatureCard
              icon={Bell}
              title="Automated Notifications"
              description="Keep customers informed throughout the billing lifecycle"
              features={[
                "Payment reminders",
                "Invoice emails",
                "Renewal notifications",
                "Custom messaging",
              ]}
            />
            <FeatureCard
              icon={Shield}
              title="Compliance"
              description="Built-in compliance with tax regulations and accounting standards"
              features={[
                "Automated tax calculation",
                "Invoice generation",
                "Revenue recognition",
                "Audit trails",
              ]}
            />
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-accent/10 to-background">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">Why Choose Ztake Subscriptions</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <GlassCard className="p-8 text-center" glow>
              <div className="text-5xl font-bold text-primary mb-2">95%+</div>
              <div className="text-lg font-semibold mb-2">Retention Rate</div>
              <p className="text-muted-foreground">
                Reduce churn with smart retry logic and automated dunning
              </p>
            </GlassCard>
            <GlassCard className="p-8 text-center" glow>
              <div className="text-5xl font-bold text-primary mb-2">2x</div>
              <div className="text-lg font-semibold mb-2">Faster Setup</div>
              <p className="text-muted-foreground">
                Launch your subscription business in hours, not weeks
              </p>
            </GlassCard>
            <GlassCard className="p-8 text-center" glow>
              <div className="text-5xl font-bold text-primary mb-2">24/7</div>
              <div className="text-lg font-semibold mb-2">Support</div>
              <p className="text-muted-foreground">
                Expert support to help you grow your recurring revenue
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
              Ready to Grow Your Subscription Business?
            </h2>
            <p className="text-xl text-muted-foreground mb-8">
              Start accepting recurring payments today
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <PillButton variant="default" size="lg" href="/login" testId="sub-cta-start">
                Get Started
              </PillButton>
              <PillButton variant="outline" size="lg" href="/docs" testId="sub-cta-docs">
                View Documentation
              </PillButton>
            </div>
          </GlassCard>
        </div>
      </section>
    </div>
  );
}
