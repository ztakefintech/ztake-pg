import { GlassCard } from "../GlassCard";
import { PillButton } from "../PillButton";
import { Rocket, Heart, Users, TrendingUp } from "lucide-react";

const values = [
  {
    icon: Rocket,
    title: "Innovation First",
    description: "We're building the future of payments. Your ideas can shape how millions of businesses get paid.",
  },
  {
    icon: Heart,
    title: "Work-Life Balance",
    description: "Flexible hours, remote-friendly culture, and generous leave policies. We value your well-being.",
  },
  {
    icon: Users,
    title: "Collaborative",
    description: "Work with brilliant minds from diverse backgrounds. Learn, grow, and build together.",
  },
  {
    icon: TrendingUp,
    title: "Fast Growth",
    description: "Join a rocketship. We're scaling fast, and your career will grow with us.",
  },
];

const openings = [
  {
    title: "Senior Backend Engineer",
    department: "Engineering",
    location: "Bangalore / Remote",
    type: "Full-time",
  },
  {
    title: "Product Designer",
    department: "Design",
    location: "Mumbai / Remote",
    type: "Full-time",
  },
  {
    title: "Growth Marketing Manager",
    department: "Marketing",
    location: "Remote",
    type: "Full-time",
  },
  {
    title: "Customer Success Lead",
    department: "Customer Success",
    location: "Delhi / Remote",
    type: "Full-time",
  },
  {
    title: "DevOps Engineer",
    department: "Engineering",
    location: "Bangalore / Remote",
    type: "Full-time",
  },
  {
    title: "Business Development Manager",
    department: "Sales",
    location: "Multiple Cities",
    type: "Full-time",
  },
];

export default function Careers() {
  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="relative pt-32 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-blue-500/10" />
        
        <div className="relative max-w-7xl mx-auto text-center">
          <h1 className="text-5xl md:text-7xl font-bold mb-6">
            Build the Future
            <br />
            <span className="bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">
              of Payments
            </span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto mb-8">
            Join our mission to empower every business in India with seamless payment solutions
          </p>
          <PillButton variant="default" size="lg" href="#openings" testId="careers-view">
            View Open Positions
          </PillButton>
        </div>
      </section>

      {/* Values */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">Why Ztake?</h2>
            <p className="text-xl text-muted-foreground">
              More than just a job. It's a mission.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {values.map((value) => (
              <GlassCard key={value.title} className="p-8 text-center" glow>
                <value.icon className="w-12 h-12 text-primary mx-auto mb-4" />
                <h3 className="text-xl font-bold mb-3">{value.title}</h3>
                <p className="text-muted-foreground">{value.description}</p>
              </GlassCard>
            ))}
          </div>
        </div>
      </section>

      {/* Perks */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-accent/20">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">Perks & Benefits</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              "Competitive salary & equity",
              "Health insurance for family",
              "Flexible work hours",
              "Remote-first culture",
              "Learning & development budget",
              "Latest tech & equipment",
              "Unlimited coffee & snacks",
              "Team offsites & events",
              "Mental health support",
            ].map((perk) => (
              <GlassCard key={perk} className="p-6 flex items-center gap-4">
                <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />
                <span className="text-muted-foreground">{perk}</span>
              </GlassCard>
            ))}
          </div>
        </div>
      </section>

      {/* Open Positions */}
      <section id="openings" className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">Open Positions</h2>
            <p className="text-xl text-muted-foreground">
              Find your perfect role
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6">
            {openings.map((job) => (
              <GlassCard key={job.title} className="p-8 hover-elevate" glow>
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div>
                    <h3 className="text-2xl font-bold mb-2">{job.title}</h3>
                    <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                      <span>{job.department}</span>
                      <span>•</span>
                      <span>{job.location}</span>
                      <span>•</span>
                      <span>{job.type}</span>
                    </div>
                  </div>
                  <PillButton variant="outline" href="/contact" testId={`career-${job.title.toLowerCase().replace(/\s+/g, "-")}`}>
                    Apply Now
                  </PillButton>
                </div>
              </GlassCard>
            ))}
          </div>

          <div className="text-center mt-12">
            <p className="text-muted-foreground mb-4">
              Don't see the right role? We're always looking for exceptional talent.
            </p>
            <PillButton variant="ghost" href="/contact" testId="careers-general">
              Send us your resume
            </PillButton>
          </div>
        </div>
      </section>
    </div>
  );
}
