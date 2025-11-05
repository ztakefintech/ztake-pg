import { GlassCard } from "@/components/marketing/GlassCard";
import { PillButton } from "@/components/marketing/PillButton";
import { Book, FileText, Calendar, PlayCircle } from "lucide-react";

const blogPosts = [
  {
    title: "How to Reduce Payment Failures by 30%",
    excerpt: "Learn proven strategies to improve your payment success rates and reduce customer drop-off.",
    category: "Best Practices",
    readTime: "5 min read",
  },
  {
    title: "Understanding UPI Payments in India",
    excerpt: "A comprehensive guide to UPI payment processing and integration best practices.",
    category: "Guides",
    readTime: "8 min read",
  },
  {
    title: "Subscription Billing Best Practices",
    excerpt: "Everything you need to know about managing recurring payments and reducing churn.",
    category: "SaaS",
    readTime: "6 min read",
  },
];

const caseStudies = [
  {
    company: "TechStart Solutions",
    industry: "SaaS",
    result: "40% reduction in payment failures",
    description: "How TechStart improved their payment success rate and grew revenue",
  },
  {
    company: "E-commerce Plus",
    industry: "E-commerce",
    result: "2x faster checkout",
    description: "Doubling conversion rates with optimized checkout experience",
  },
  {
    company: "Digital Ventures",
    industry: "Marketplace",
    result: "₹50Cr+ processed",
    description: "Scaling payment infrastructure for a growing marketplace",
  },
];

export default function Resources() {
  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="relative pt-32 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-purple-500/5" />
        
        <div className="relative max-w-7xl mx-auto text-center">
          <h1 className="text-5xl md:text-6xl font-bold mb-6">
            Resources &
            <br />
            <span className="bg-gradient-to-r from-primary-500 to-purple-600 bg-clip-text text-transparent">
              Insights
            </span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Learn from industry experts, explore case studies, and stay updated with the latest in payments
          </p>
        </div>
      </section>

      {/* Resource Types */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-20">
            <GlassCard className="p-8 text-center" hover glow>
              <Book className="w-12 h-12 mx-auto text-primary mb-4" />
              <h3 className="font-bold text-lg mb-2">Blog</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Industry insights and best practices
              </p>
              <PillButton variant="outline" size="sm" testId="resources-blog">
                Read Blog
              </PillButton>
            </GlassCard>

            <GlassCard className="p-8 text-center" hover glow>
              <FileText className="w-12 h-12 mx-auto text-primary mb-4" />
              <h3 className="font-bold text-lg mb-2">Case Studies</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Success stories from our customers
              </p>
              <PillButton variant="outline" size="sm" testId="resources-cases">
                View Cases
              </PillButton>
            </GlassCard>

            <GlassCard className="p-8 text-center" hover glow>
              <PlayCircle className="w-12 h-12 mx-auto text-primary mb-4" />
              <h3 className="font-bold text-lg mb-2">Webinars</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Live and on-demand webinars
              </p>
              <PillButton variant="outline" size="sm" testId="resources-webinars">
                Watch Now
              </PillButton>
            </GlassCard>

            <GlassCard className="p-8 text-center" hover glow>
              <Calendar className="w-12 h-12 mx-auto text-primary mb-4" />
              <h3 className="font-bold text-lg mb-2">Events</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Upcoming events and meetups
              </p>
              <PillButton variant="outline" size="sm" testId="resources-events">
                View Events
              </PillButton>
            </GlassCard>
          </div>

          {/* Blog Posts */}
          <div className="mb-20">
            <h2 className="text-3xl font-bold mb-8">Latest from Our Blog</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {blogPosts.map((post, index) => (
                <GlassCard key={index} className="overflow-hidden" hover glow>
                  <div className="h-48 bg-gradient-to-br from-primary/20 to-blue-600/20" />
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-semibold text-primary">{post.category}</span>
                      <span className="text-xs text-muted-foreground">{post.readTime}</span>
                    </div>
                    <h3 className="text-xl font-bold mb-3" data-testid={`blog-title-${index}`}>{post.title}</h3>
                    <p className="text-muted-foreground mb-4">{post.excerpt}</p>
                    <PillButton variant="ghost" size="sm" testId={`blog-read-${index}`}>
                      Read More →
                    </PillButton>
                  </div>
                </GlassCard>
              ))}
            </div>
          </div>

          {/* Case Studies */}
          <div>
            <h2 className="text-3xl font-bold mb-8">Customer Success Stories</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {caseStudies.map((study, index) => (
                <GlassCard key={index} className="p-8" hover glow>
                  <div className="text-sm text-primary font-semibold mb-2">{study.industry}</div>
                  <h3 className="text-2xl font-bold mb-3">{study.company}</h3>
                  <div className="text-3xl font-bold text-primary mb-4">{study.result}</div>
                  <p className="text-muted-foreground mb-6">{study.description}</p>
                  <PillButton variant="outline" size="sm" testId={`case-read-${index}`}>
                    Read Case Study
                  </PillButton>
                </GlassCard>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Newsletter */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-accent/10 to-background">
        <div className="max-w-4xl mx-auto">
          <GlassCard className="p-12 text-center" glow>
            <h2 className="text-3xl font-bold mb-4">Stay Updated</h2>
            <p className="text-xl text-muted-foreground mb-8">
              Get the latest insights, updates, and resources delivered to your inbox
            </p>
            <div className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto">
              <input
                type="email"
                placeholder="Enter your email"
                className="flex-1 px-4 py-3 rounded-full bg-background/50 backdrop-blur-sm border border-white/20 focus:outline-none focus:ring-2 focus:ring-primary"
                data-testid="input-newsletter-email"
              />
              <PillButton variant="default" testId="button-subscribe">
                Subscribe
              </PillButton>
            </div>
          </GlassCard>
        </div>
      </section>
    </div>
  );
}
