import { GlassCard } from "../GlassCard";
import { PillButton } from "../PillButton";
import { Target, Users, Award, Zap } from "lucide-react";

export default function About() {
  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="relative pt-32 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-purple-500/5" />
        
        <div className="relative max-w-7xl mx-auto text-center">
          <h1 className="text-5xl md:text-6xl font-bold mb-6">
            About
            <br />
            <span className="bg-gradient-to-r from-primary-500 to-purple-600 bg-clip-text text-transparent">
              Ztake
            </span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            We're on a mission to empower modern businesses with seamless payment solutions
          </p>
        </div>
      </section>

      {/* Mission & Vision */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-20">
            <GlassCard className="p-12" glow>
              <Target className="w-12 h-12 text-primary mb-6" />
              <h2 className="text-3xl font-bold mb-4">Our Mission</h2>
              <p className="text-lg text-muted-foreground leading-relaxed">
                To simplify payments for businesses of all sizes, enabling them to focus on growth while we handle the complexity of payment processing, compliance, and security.
              </p>
            </GlassCard>

            <GlassCard className="p-12" glow>
              <Zap className="w-12 h-12 text-primary mb-6" />
              <h2 className="text-3xl font-bold mb-4">Our Vision</h2>
              <p className="text-lg text-muted-foreground leading-relaxed">
                To become the most trusted payment infrastructure for businesses worldwide, powering seamless transactions and enabling financial innovation at scale.
              </p>
            </GlassCard>
          </div>

          {/* Values */}
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold mb-4">Our Values</h2>
            <p className="text-xl text-muted-foreground">
              The principles that guide everything we do
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <GlassCard className="p-8 text-center">
              <Award className="w-10 h-10 mx-auto text-primary mb-4" />
              <h3 className="font-bold text-lg mb-2">Excellence</h3>
              <p className="text-sm text-muted-foreground">
                We strive for excellence in everything we build
              </p>
            </GlassCard>

            <GlassCard className="p-8 text-center">
              <Users className="w-10 h-10 mx-auto text-primary mb-4" />
              <h3 className="font-bold text-lg mb-2">Customer First</h3>
              <p className="text-sm text-muted-foreground">
                Our customers' success is our success
              </p>
            </GlassCard>

            <GlassCard className="p-8 text-center">
              <Zap className="w-10 h-10 mx-auto text-primary mb-4" />
              <h3 className="font-bold text-lg mb-2">Innovation</h3>
              <p className="text-sm text-muted-foreground">
                We continuously innovate to stay ahead
              </p>
            </GlassCard>

            <GlassCard className="p-8 text-center">
              <Target className="w-10 h-10 mx-auto text-primary mb-4" />
              <h3 className="font-bold text-lg mb-2">Integrity</h3>
              <p className="text-sm text-muted-foreground">
                We operate with transparency and trust
              </p>
            </GlassCard>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-accent/10 to-background">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">Our Impact</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <GlassCard className="p-8 text-center" glow>
              <div className="text-5xl font-bold text-primary mb-2">10K+</div>
              <div className="text-muted-foreground">Active Merchants</div>
            </GlassCard>
            <GlassCard className="p-8 text-center" glow>
              <div className="text-5xl font-bold text-primary mb-2">₹500Cr+</div>
              <div className="text-muted-foreground">Processed Monthly</div>
            </GlassCard>
            <GlassCard className="p-8 text-center" glow>
              <div className="text-5xl font-bold text-primary mb-2">99.9%</div>
              <div className="text-muted-foreground">Uptime</div>
            </GlassCard>
            <GlassCard className="p-8 text-center" glow>
              <div className="text-5xl font-bold text-primary mb-2">24/7</div>
              <div className="text-muted-foreground">Support</div>
            </GlassCard>
          </div>
        </div>
      </section>

      {/* Team */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">Leadership Team</h2>
            <p className="text-xl text-muted-foreground">
              Meet the people building the future of payments
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { name: "Aditya Singh", role: "CEO & Co-founder", expertise: "Product & Strategy" },
              { name: "Priya Mehta", role: "CTO & Co-founder", expertise: "Engineering & Technology" },
              { name: "Rahul Verma", role: "CFO", expertise: "Finance & Operations" },
            ].map((member) => (
              <GlassCard key={member.name} className="p-8 text-center" hover glow>
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary-500 to-blue-600 mx-auto mb-6" />
                <h3 className="text-xl font-bold mb-2">{member.name}</h3>
                <p className="text-primary mb-2">{member.role}</p>
                <p className="text-sm text-muted-foreground">{member.expertise}</p>
              </GlassCard>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-accent/10 to-background">
        <div className="max-w-4xl mx-auto">
          <GlassCard className="p-12 text-center" glow>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Join Us on Our Journey
            </h2>
            <p className="text-xl text-muted-foreground mb-8">
              We're always looking for talented people to join our team
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <PillButton variant="default" size="lg" href="/careers" testId="about-careers">
                View Careers
              </PillButton>
              <PillButton variant="outline" size="lg" href="/contact" testId="about-contact">
                Contact Us
              </PillButton>
            </div>
          </GlassCard>
        </div>
      </section>
    </div>
  );
}
