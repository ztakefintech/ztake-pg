import { GlassCard } from "../GlassCard";
import { FeatureCard } from "../FeatureCard";
import { PillButton } from "../PillButton";
import { Wallet, CreditCard, TrendingUp, Building2, Clock, Shield } from "lucide-react";

export default function ZtakeX() {
  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="relative pt-32 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-blue-500/5" />
        
        <div className="relative max-w-7xl mx-auto text-center">
          <h1 className="text-5xl md:text-6xl font-bold mb-6">
            <span className="bg-gradient-to-r from-primary-500 to-blue-600 bg-clip-text text-transparent">
              ZtakeX
            </span>
            <br />
            Business Banking
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto mb-8">
            Complete banking solution with instant payouts, corporate cards, and accounting integrations
          </p>
          <PillButton variant="default" size="lg" href="/contact" testId="ztakex-button-start">
            Get Started
          </PillButton>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <FeatureCard
              icon={Wallet}
              title="Instant Payouts"
              description="Send money to any bank account, UPI ID, or wallet instantly 24/7"
              features={[
                "Real-time transfers",
                "Bulk payouts",
                "UPI payouts",
                "International transfers",
              ]}
            />
            <FeatureCard
              icon={CreditCard}
              title="Corporate Cards"
              description="Virtual and physical cards for business expenses with real-time controls"
              features={[
                "Unlimited virtual cards",
                "Physical cards",
                "Spend controls",
                "Real-time tracking",
              ]}
            />
            <FeatureCard
              icon={TrendingUp}
              title="Cash Flow Management"
              description="Get real-time visibility into your business cash flow"
              features={[
                "Real-time balance",
                "Automated reconciliation",
                "Expense categorization",
                "Cash flow forecasting",
              ]}
            />
            <FeatureCard
              icon={Building2}
              title="Accounting Integrations"
              description="Seamlessly sync with popular accounting software"
              features={[
                "Tally integration",
                "QuickBooks sync",
                "Zoho Books",
                "Auto-reconciliation",
              ]}
            />
            <FeatureCard
              icon={Clock}
              title="Instant Settlements"
              description="Get paid faster with instant settlement options"
              features={[
                "T+0 settlements",
                "Split settlements",
                "Scheduled payouts",
                "Settlement alerts",
              ]}
            />
            <FeatureCard
              icon={Shield}
              title="Security & Compliance"
              description="Enterprise-grade security with full regulatory compliance"
              features={[
                "AML/KYC checks",
                "Fraud monitoring",
                "Encrypted transactions",
                "Audit logs",
              ]}
            />
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-accent/10 to-background">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">Trusted by Growing Businesses</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <GlassCard className="p-8 text-center" glow>
              <div className="text-5xl font-bold text-primary mb-2">₹1000Cr+</div>
              <div className="text-muted-foreground">Payouts Processed</div>
            </GlassCard>
            <GlassCard className="p-8 text-center" glow>
              <div className="text-5xl font-bold text-primary mb-2">99.99%</div>
              <div className="text-muted-foreground">Success Rate</div>
            </GlassCard>
            <GlassCard className="p-8 text-center" glow>
              <div className="text-5xl font-bold text-primary mb-2">24/7</div>
              <div className="text-muted-foreground">Availability</div>
            </GlassCard>
            <GlassCard className="p-8 text-center" glow>
              <div className="text-5xl font-bold text-primary mb-2">5K+</div>
              <div className="text-muted-foreground">Active Businesses</div>
            </GlassCard>
          </div>
        </div>
      </section>

      {/* Use Cases */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">Perfect For</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <GlassCard className="p-8">
              <h3 className="text-xl font-bold mb-4">E-commerce</h3>
              <p className="text-muted-foreground mb-4">
                Pay vendors, manage refunds, and settle with delivery partners instantly
              </p>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary mr-2" />
                  Vendor payments
                </li>
                <li className="flex items-center">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary mr-2" />
                  COD remittance
                </li>
                <li className="flex items-center">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary mr-2" />
                  Refund automation
                </li>
              </ul>
            </GlassCard>

            <GlassCard className="p-8">
              <h3 className="text-xl font-bold mb-4">Marketplaces</h3>
              <p className="text-muted-foreground mb-4">
                Split payments, manage seller payouts, and handle complex settlement logic
              </p>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary mr-2" />
                  Split settlements
                </li>
                <li className="flex items-center">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary mr-2" />
                  Seller payouts
                </li>
                <li className="flex items-center">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary mr-2" />
                  Escrow support
                </li>
              </ul>
            </GlassCard>

            <GlassCard className="p-8">
              <h3 className="text-xl font-bold mb-4">SaaS Platforms</h3>
              <p className="text-muted-foreground mb-4">
                Automate payroll, pay contractors, and manage business expenses
              </p>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary mr-2" />
                  Payroll automation
                </li>
                <li className="flex items-center">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary mr-2" />
                  Contractor payments
                </li>
                <li className="flex items-center">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary mr-2" />
                  Expense management
                </li>
              </ul>
            </GlassCard>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-accent/10 to-background">
        <div className="max-w-4xl mx-auto">
          <GlassCard className="p-12 text-center" glow>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Ready to Transform Your Business Banking?
            </h2>
            <p className="text-xl text-muted-foreground mb-8">
              Start with ZtakeX today and experience the future of business banking
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <PillButton variant="default" size="lg" href="/contact" testId="ztakex-cta-start">
                Get Started
              </PillButton>
              <PillButton variant="outline" size="lg" href="/docs" testId="ztakex-cta-docs">
                Learn More
              </PillButton>
            </div>
          </GlassCard>
        </div>
      </section>
    </div>
  );
}
