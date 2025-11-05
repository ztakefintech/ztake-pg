import { GlassCard } from "@/components/marketing/GlassCard";
import { CodeBlock } from "@/components/marketing/CodeBlock";
import { PillButton } from "@/components/marketing/PillButton";
import { Code, Book, Webhook, Zap, Terminal, Package } from "lucide-react";
import { SiJavascript, SiPython, SiPhp, SiRuby, SiGo } from "react-icons/si";
import { useRoute } from "wouter";

const sampleCode = `// Initialize Ztake
const ztake = require('ztake-node')('your_api_key');

// Create a payment
const payment = await ztake.payments.create({
  amount: 50000, // ₹500.00
  currency: 'INR',
  customer_id: 'cust_123',
  description: 'Order #1234'
});

console.log(payment.id);`;

const webhookCode = `{
  "event": "payment.success",
  "data": {
    "id": "pay_abc123",
    "amount": 50000,
    "currency": "INR",
    "status": "captured",
    "customer_id": "cust_123"
  }
}`;

export default function Developers() {
  const [, params] = useRoute("/docs/:slug?");
  
  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="relative pt-32 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-purple-500/5" />
        
        <div className="relative max-w-7xl mx-auto text-center">
          <h1 className="text-5xl md:text-6xl font-bold mb-6">
            Built for
            <br />
            <span className="bg-gradient-to-r from-primary-500 to-purple-600 bg-clip-text text-transparent">
              Developers
            </span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto mb-8">
            Powerful APIs, comprehensive documentation, and SDKs in your favorite language
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <PillButton variant="default" size="lg" testId="dev-button-docs">
              View Documentation
            </PillButton>
            <PillButton variant="outline" size="lg" testId="dev-button-api">
              API Reference
            </PillButton>
          </div>
        </div>
      </section>

      {/* Quick Start */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold mb-4">Quick Start</h2>
            <p className="text-xl text-muted-foreground">
              Get up and running in minutes
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div>
              <h3 className="text-2xl font-bold mb-6">Install SDK</h3>
              <CodeBlock
                code={`npm install ztake-node`}
                language="bash"
              />
              <div className="mt-6 space-y-3">
                <p className="text-muted-foreground">Also available for:</p>
                <div className="flex flex-wrap gap-3">
                  {[
                    { icon: SiJavascript, label: "Node.js" },
                    { icon: SiPython, label: "Python" },
                    { icon: SiPhp, label: "PHP" },
                    { icon: SiRuby, label: "Ruby" },
                    { icon: SiGo, label: "Go" },
                  ].map((lang) => (
                    <GlassCard key={lang.label} className="px-4 py-2 flex items-center space-x-2" hover>
                      <lang.icon className="w-4 h-4" />
                      <span className="text-sm font-medium">{lang.label}</span>
                    </GlassCard>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-2xl font-bold mb-6">Create Payment</h3>
              <CodeBlock code={sampleCode} language="javascript" />
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-accent/10 to-background">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <GlassCard className="p-8" glow>
              <Code className="w-12 h-12 text-primary mb-4" />
              <h3 className="text-xl font-bold mb-3">RESTful APIs</h3>
              <p className="text-muted-foreground mb-4">
                Clean, well-documented APIs with predictable responses
              </p>
              <ul className="space-y-2 text-sm text-foreground/80">
                <li className="flex items-center">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary mr-2" />
                  JSON request/response
                </li>
                <li className="flex items-center">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary mr-2" />
                  Bearer token authentication
                </li>
                <li className="flex items-center">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary mr-2" />
                  Versioned endpoints
                </li>
              </ul>
            </GlassCard>

            <GlassCard className="p-8" glow>
              <Webhook className="w-12 h-12 text-primary mb-4" />
              <h3 className="text-xl font-bold mb-3">Webhooks</h3>
              <p className="text-muted-foreground mb-4">
                Real-time notifications for payment events
              </p>
              <ul className="space-y-2 text-sm text-foreground/80">
                <li className="flex items-center">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary mr-2" />
                  Instant event delivery
                </li>
                <li className="flex items-center">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary mr-2" />
                  Signature verification
                </li>
                <li className="flex items-center">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary mr-2" />
                  Automatic retries
                </li>
              </ul>
            </GlassCard>

            <GlassCard className="p-8" glow>
              <Book className="w-12 h-12 text-primary mb-4" />
              <h3 className="text-xl font-bold mb-3">Documentation</h3>
              <p className="text-muted-foreground mb-4">
                Comprehensive guides and API reference
              </p>
              <ul className="space-y-2 text-sm text-foreground/80">
                <li className="flex items-center">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary mr-2" />
                  Step-by-step tutorials
                </li>
                <li className="flex items-center">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary mr-2" />
                  Interactive examples
                </li>
                <li className="flex items-center">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary mr-2" />
                  Code snippets
                </li>
              </ul>
            </GlassCard>

            <GlassCard className="p-8" glow>
              <Terminal className="w-12 h-12 text-primary mb-4" />
              <h3 className="text-xl font-bold mb-3">Testing</h3>
              <p className="text-muted-foreground mb-4">
                Complete test environment with sample data
              </p>
              <ul className="space-y-2 text-sm text-foreground/80">
                <li className="flex items-center">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary mr-2" />
                  Sandbox environment
                </li>
                <li className="flex items-center">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary mr-2" />
                  Test card numbers
                </li>
                <li className="flex items-center">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary mr-2" />
                  Mock webhooks
                </li>
              </ul>
            </GlassCard>

            <GlassCard className="p-8" glow>
              <Package className="w-12 h-12 text-primary mb-4" />
              <h3 className="text-xl font-bold mb-3">SDKs</h3>
              <p className="text-muted-foreground mb-4">
                Official SDKs for popular languages
              </p>
              <ul className="space-y-2 text-sm text-foreground/80">
                <li className="flex items-center">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary mr-2" />
                  Node.js, Python, PHP
                </li>
                <li className="flex items-center">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary mr-2" />
                  Ruby, Go, Java
                </li>
                <li className="flex items-center">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary mr-2" />
                  iOS, Android, React Native
                </li>
              </ul>
            </GlassCard>

            <GlassCard className="p-8" glow>
              <Zap className="w-12 h-12 text-primary mb-4" />
              <h3 className="text-xl font-bold mb-3">Performance</h3>
              <p className="text-muted-foreground mb-4">
                Built for speed and reliability
              </p>
              <ul className="space-y-2 text-sm text-foreground/80">
                <li className="flex items-center">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary mr-2" />
                  99.9% uptime SLA
                </li>
                <li className="flex items-center">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary mr-2" />
                  Global CDN
                </li>
                <li className="flex items-center">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary mr-2" />
                  Rate limiting
                </li>
              </ul>
            </GlassCard>
          </div>
        </div>
      </section>

      {/* Webhook Example */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold mb-4">Webhook Payload Example</h2>
            <p className="text-xl text-muted-foreground">
              Receive real-time notifications for payment events
            </p>
          </div>
          <CodeBlock code={webhookCode} language="json" />
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-accent/10 to-background">
        <div className="max-w-4xl mx-auto">
          <GlassCard className="p-12 text-center" glow>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Ready to Start Building?
            </h2>
            <p className="text-xl text-muted-foreground mb-8">
              Get your API keys and start integrating in minutes
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <PillButton variant="default" size="lg" href="/contact" testId="dev-cta-signup">
                Create Account
              </PillButton>
              <PillButton variant="outline" size="lg" testId="dev-cta-docs">
                Read Documentation
              </PillButton>
            </div>
          </GlassCard>
        </div>
      </section>
    </div>
  );
}
