import { GlassCard } from "../GlassCard";
import { PillButton } from "../PillButton";
import { TrendingUp, Zap, Shield, BarChart3 } from "lucide-react";

export default function Capital() {
  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="relative pt-32 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-blue-500/10" />
        
        <div className="relative max-w-7xl mx-auto text-center">
          <h1 className="text-5xl md:text-7xl font-bold mb-6">
            Access
            <br />
            <span className="bg-gradient-to-r from-primary-500 to-blue-600 bg-clip-text text-transparent">
              Business Capital
            </span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto mb-8">
            Get instant access to working capital based on your payment history. Fuel your growth with flexible financing.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <PillButton variant="default" size="lg" href="/contact" testId="capital-apply">
              Apply for Capital
            </PillButton>
            <PillButton variant="outline" size="lg" href="/contact" testId="capital-learn">
              Learn More
            </PillButton>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">Why Ztake Capital?</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Fast, flexible financing designed for modern businesses
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <GlassCard className="p-8 text-center" glow>
              <TrendingUp className="w-12 h-12 text-primary mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-3">Fast Approval</h3>
              <p className="text-muted-foreground">
                Get approved in minutes, funds in your account within 24 hours
              </p>
            </GlassCard>

            <GlassCard className="p-8 text-center" glow>
              <Zap className="w-12 h-12 text-primary mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-3">Flexible Repayment</h3>
              <p className="text-muted-foreground">
                Repay based on your revenue flow with automatic deductions
              </p>
            </GlassCard>

            <GlassCard className="p-8 text-center" glow>
              <Shield className="w-12 h-12 text-primary mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-3">No Collateral</h3>
              <p className="text-muted-foreground">
                Unsecured loans based on your payment processing history
              </p>
            </GlassCard>

            <GlassCard className="p-8 text-center" glow>
              <BarChart3 className="w-12 h-12 text-primary mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-3">Grow Your Limit</h3>
              <p className="text-muted-foreground">
                Your credit limit increases as your business grows
              </p>
            </GlassCard>
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-accent/20">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">How It Works</h2>
          </div>

          <div className="space-y-8">
            {[
              {
                step: "1",
                title: "Apply in Minutes",
                description: "Simple online application with minimal documentation required",
              },
              {
                step: "2",
                title: "Instant Evaluation",
                description: "We analyze your payment history and business metrics automatically",
              },
              {
                step: "3",
                title: "Get Funded",
                description: "Receive funds directly to your account within 24 hours",
              },
              {
                step: "4",
                title: "Repay Flexibly",
                description: "Automatic repayment from your daily settlements",
              },
            ].map((item) => (
              <GlassCard key={item.step} className="p-8 flex items-start gap-6">
                <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-2xl font-bold text-primary">{item.step}</span>
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2">{item.title}</h3>
                  <p className="text-muted-foreground">{item.description}</p>
                </div>
              </GlassCard>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <GlassCard className="p-12" glow>
            <h2 className="text-4xl font-bold mb-4">Ready to Fuel Your Growth?</h2>
            <p className="text-xl text-muted-foreground mb-8">
              Apply for Ztake Capital today and access the funds you need to scale
            </p>
            <PillButton variant="default" size="lg" href="/contact" testId="capital-cta">
              Apply Now
            </PillButton>
          </GlassCard>
        </div>
      </section>
    </div>
  );
}
