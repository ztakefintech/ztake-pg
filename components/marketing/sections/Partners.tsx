import { GlassCard } from "@/components/marketing/GlassCard";
import { PillButton } from "@/components/marketing/PillButton";
import { Handshake, Rocket, DollarSign, Users } from "lucide-react";

const partnerTypes = [
  {
    icon: Rocket,
    title: "Technology Partners",
    description: "Integrate Ztake into your platform and offer payment capabilities to your users",
    benefits: ["Revenue sharing", "Co-marketing", "Technical support", "Dedicated account manager"],
  },
  {
    icon: Users,
    title: "Referral Partners",
    description: "Refer businesses to Ztake and earn attractive commissions on every successful signup",
    benefits: ["Up to 20% commission", "Recurring revenue", "Marketing materials", "Partner portal"],
  },
  {
    icon: Handshake,
    title: "Agency Partners",
    description: "Build and manage payment solutions for your clients with white-label capabilities",
    benefits: ["White-label option", "Priority support", "Volume discounts", "Training programs"],
  },
  {
    icon: DollarSign,
    title: "Financial Partners",
    description: "Collaborate on lending, banking, and financial services for shared customers",
    benefits: ["Joint products", "Shared infrastructure", "Risk sharing", "Market expansion"],
  },
];

export default function Partners() {
  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="relative pt-32 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-blue-500/10" />
        
        <div className="relative max-w-7xl mx-auto text-center">
          <h1 className="text-5xl md:text-7xl font-bold mb-6">
            Partner with
            <br />
            <span className="bg-gradient-to-r from-primary-500 to-blue-600 bg-clip-text text-transparent">
              Ztake
            </span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto mb-8">
            Join our partner ecosystem and grow your business with India's fastest-growing payment platform
          </p>
          <PillButton variant="default" size="lg" href="/contact" testId="partners-apply">
            Become a Partner
          </PillButton>
        </div>
      </section>

      {/* Partner Types */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">Partnership Programs</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Choose the partnership model that fits your business
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {partnerTypes.map((partner) => (
              <GlassCard key={partner.title} className="p-8" glow>
                <partner.icon className="w-12 h-12 text-primary mb-4" />
                <h3 className="text-2xl font-bold mb-3">{partner.title}</h3>
                <p className="text-muted-foreground mb-6">{partner.description}</p>
                
                <div className="space-y-2">
                  <p className="text-sm font-medium">Benefits:</p>
                  <ul className="space-y-2">
                    {partner.benefits.map((benefit) => (
                      <li key={benefit} className="flex items-center text-sm text-muted-foreground">
                        <div className="w-1.5 h-1.5 rounded-full bg-primary mr-2" />
                        {benefit}
                      </li>
                    ))}
                  </ul>
                </div>
              </GlassCard>
            ))}
          </div>
        </div>
      </section>

      {/* Success Stories */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-accent/20">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">Partner Success</h2>
            <p className="text-xl text-muted-foreground">
              Real results from our partner network
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <GlassCard className="p-8 text-center" glow>
              <div className="text-5xl font-bold text-primary mb-2">500+</div>
              <p className="text-muted-foreground">Active Partners</p>
            </GlassCard>

            <GlassCard className="p-8 text-center" glow>
              <div className="text-5xl font-bold text-primary mb-2">₹50Cr+</div>
              <p className="text-muted-foreground">Partner Revenue Generated</p>
            </GlassCard>

            <GlassCard className="p-8 text-center" glow>
              <div className="text-5xl font-bold text-primary mb-2">10K+</div>
              <p className="text-muted-foreground">Businesses Onboarded</p>
            </GlassCard>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <GlassCard className="p-12" glow>
            <h2 className="text-4xl font-bold mb-4">Ready to Partner?</h2>
            <p className="text-xl text-muted-foreground mb-8">
              Join hundreds of successful partners growing with Ztake
            </p>
            <PillButton variant="default" size="lg" href="/contact" testId="partners-cta">
              Apply Now
            </PillButton>
          </GlassCard>
        </div>
      </section>
    </div>
  );
}
