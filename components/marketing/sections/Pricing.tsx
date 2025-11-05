import { GlassCard } from "@/components/marketing/GlassCard";
import { PillButton } from "@/components/marketing/PillButton";
import { Check, Zap, TrendingUp, Building } from "lucide-react";

const pricingTiers = [
  {
    name: "Starter",
    icon: Zap,
    price: "1.95%",
    description: "Perfect for growing businesses",
    features: [
      "All payment methods",
      "Payment Links & Pages",
      "Basic analytics",
      "Email support",
      "Standard settlements (T+3)",
      "Up to ₹10L/month volume",
      "Basic fraud protection",
    ],
    cta: "Get Started",
    popular: false,
  },
  {
    name: "Growth",
    icon: TrendingUp,
    price: "1.75%",
    description: "For scaling businesses",
    features: [
      "Everything in Starter",
      "Priority support",
      "Advanced analytics",
      "Instant settlements",
      "Up to ₹1Cr/month volume",
      "Advanced fraud protection",
      "Custom branding",
      "Subscription billing",
      "Webhooks & APIs",
    ],
    cta: "Get Started",
    popular: true,
  },
  {
    name: "Enterprise",
    icon: Building,
    price: "Custom",
    description: "For large enterprises",
    features: [
      "Everything in Growth",
      "Dedicated account manager",
      "Custom pricing",
      "Unlimited volume",
      "SLA guarantees",
      "White-label solutions",
      "Custom integrations",
      "Advanced reporting",
      "Multi-entity support",
      "Priority feature requests",
    ],
    cta: "Contact Sales",
    popular: false,
  },
];

export default function Pricing() {
  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="relative pt-32 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-purple-500/5" />
        
        <div className="relative max-w-7xl mx-auto text-center">
          <h1 className="text-5xl md:text-6xl font-bold mb-6">
            Simple, Transparent
            <br />
            <span className="bg-gradient-to-r from-primary-500 to-purple-600 bg-clip-text text-transparent">
              Pricing
            </span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
            Choose the plan that fits your business needs. No hidden fees, no surprises.
          </p>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {pricingTiers.map((tier, index) => {
              const Icon = tier.icon;
              return (
                <div key={tier.name} className="relative">
                  {tier.popular && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-10">
                      <div className="bg-gradient-to-r from-primary-500 to-blue-600 text-white px-4 py-1 rounded-full text-sm font-semibold">
                        Most Popular
                      </div>
                    </div>
                  )}
                  <GlassCard
                    className={tier.popular ? "ring-2 ring-primary/50" : ""}
                    hover
                    glow={tier.popular}
                  >
                    <div className="p-8">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary-500 to-blue-600 flex items-center justify-center mb-4">
                        <Icon className="w-6 h-6 text-white" />
                      </div>
                      <h3 className="text-2xl font-bold mb-2" data-testid={`pricing-tier-${tier.name.toLowerCase()}`}>{tier.name}</h3>
                      <p className="text-muted-foreground mb-6">{tier.description}</p>
                      
                      <div className="mb-6">
                        <span className="text-4xl font-bold">{tier.price}</span>
                        {tier.price !== "Custom" && (
                          <span className="text-muted-foreground ml-2">per transaction</span>
                        )}
                      </div>

                      <ul className="space-y-3 mb-8">
                        {tier.features.map((feature) => (
                          <li key={feature} className="flex items-start">
                            <Check className="w-5 h-5 text-primary mr-2 mt-0.5 flex-shrink-0" />
                            <span className="text-sm">{feature}</span>
                          </li>
                        ))}
                      </ul>

                      <PillButton
                        variant={tier.popular ? "default" : "outline"}
                        className="w-full"
                        href="/contact"
                        testId={`pricing-button-${tier.name.toLowerCase()}`}
                      >
                        {tier.cta}
                      </PillButton>
                    </div>
                  </GlassCard>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Additional Fees */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-accent/10 to-background">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">Additional Pricing Details</h2>
          
          <div className="space-y-4">
            <GlassCard className="p-6">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="font-semibold mb-1">International Cards</h3>
                  <p className="text-sm text-muted-foreground">Accept payments from international customers</p>
                </div>
                <div className="text-xl font-bold">2.99%</div>
              </div>
            </GlassCard>

            <GlassCard className="p-6">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="font-semibold mb-1">UPI Payments</h3>
                  <p className="text-sm text-muted-foreground">No additional charges for UPI transactions</p>
                </div>
                <div className="text-xl font-bold text-primary">Included</div>
              </div>
            </GlassCard>

            <GlassCard className="p-6">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="font-semibold mb-1">Instant Settlements</h3>
                  <p className="text-sm text-muted-foreground">Get your money within minutes</p>
                </div>
                <div className="text-xl font-bold">0.25%</div>
              </div>
            </GlassCard>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">Frequently Asked Questions</h2>
          
          <div className="space-y-4">
            <GlassCard className="p-6">
              <h3 className="font-semibold mb-2">Are there any setup fees?</h3>
              <p className="text-muted-foreground">No, there are no setup fees, integration fees, or annual maintenance charges.</p>
            </GlassCard>

            <GlassCard className="p-6">
              <h3 className="font-semibold mb-2">Can I upgrade or downgrade my plan?</h3>
              <p className="text-muted-foreground">Yes, you can change your plan at any time based on your business needs.</p>
            </GlassCard>

            <GlassCard className="p-6">
              <h3 className="font-semibold mb-2">What payment methods are supported?</h3>
              <p className="text-muted-foreground">We support 180+ payment methods including UPI, Cards, Wallets, Net Banking, EMI, and more.</p>
            </GlassCard>
          </div>
        </div>
      </section>
    </div>
  );
}
