import { GlassCard } from "../GlassCard";
import { PillButton } from "../PillButton";
import { ShoppingCart, Repeat, Building2, Smartphone, Globe, Users } from "lucide-react";

const solutions = [
  {
    icon: ShoppingCart,
    title: "E-commerce",
    description: "Complete payment solutions for online stores with checkout optimization and fraud prevention",
    features: ["One-click checkout", "Multiple payment methods", "Fraud detection", "Cart recovery"],
    href: "/payments",
  },
  {
    icon: Repeat,
    title: "SaaS & Subscriptions",
    description: "Automated recurring billing with smart dunning and subscription management",
    features: ["Automated billing", "Trial management", "Plan upgrades", "Churn prevention"],
    href: "/subscriptions",
  },
  {
    icon: Building2,
    title: "Marketplaces",
    description: "Split payments, escrow services, and vendor payouts for multi-vendor platforms",
    features: ["Split payments", "Vendor payouts", "Escrow", "Commission management"],
    href: "/ztakex",
  },
  {
    icon: Smartphone,
    title: "Mobile Apps",
    description: "Native SDKs for iOS and Android with seamless in-app payment experiences",
    features: ["Native SDKs", "In-app payments", "App store compliance", "Digital wallets"],
    href: "/docs",
  },
  {
    icon: Globe,
    title: "Global Businesses",
    description: "Accept payments in 135+ currencies with multi-currency settlements",
    features: ["135+ currencies", "Multi-currency", "Local methods", "FX optimization"],
    href: "/payments",
  },
  {
    icon: Users,
    title: "Enterprise",
    description: "Customized payment infrastructure with dedicated support and SLAs",
    features: ["Custom integration", "Dedicated support", "99.99% uptime SLA", "Volume discounts"],
    href: "/contact",
  },
];

export default function Solutions() {
  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="relative pt-32 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-blue-500/10" />
        
        <div className="relative max-w-7xl mx-auto text-center">
          <h1 className="text-5xl md:text-7xl font-bold mb-6">
            Solutions for
            <br />
            <span className="bg-gradient-to-r from-primary-500 to-blue-600 bg-clip-text text-transparent">
              Every Business
            </span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto mb-8">
            Tailored payment solutions designed for your industry and business model
          </p>
        </div>
      </section>

      {/* Solutions Grid */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {solutions.map((solution) => (
              <GlassCard key={solution.title} className="p-8 hover-elevate" glow>
                <solution.icon className="w-12 h-12 text-primary mb-4" />
                <h3 className="text-2xl font-bold mb-3">{solution.title}</h3>
                <p className="text-muted-foreground mb-6">{solution.description}</p>
                
                <ul className="space-y-2 mb-6">
                  {solution.features.map((feature) => (
                    <li key={feature} className="flex items-center text-sm text-muted-foreground">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary mr-2" />
                      {feature}
                    </li>
                  ))}
                </ul>

                <PillButton variant="outline" href={solution.href} testId={`solution-${solution.title.toLowerCase().replace(/\s+/g, "-")}`}>
                  Learn More
                </PillButton>
              </GlassCard>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <GlassCard className="p-12" glow>
            <h2 className="text-4xl font-bold mb-4">Don't See Your Use Case?</h2>
            <p className="text-xl text-muted-foreground mb-8">
              Our team will work with you to build a custom solution
            </p>
            <PillButton variant="default" size="lg" href="/contact" testId="solutions-contact">
              Contact Sales
            </PillButton>
          </GlassCard>
        </div>
      </section>
    </div>
  );
}
