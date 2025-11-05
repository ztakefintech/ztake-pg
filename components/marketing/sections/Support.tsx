import { GlassCard } from "../GlassCard";
import { PillButton } from "../PillButton";
import { MessageCircle, Book, Mail, Phone, HelpCircle } from "lucide-react";

const faqs = [
  {
    question: "How do I integrate Ztake with my website?",
    answer: "You can integrate Ztake using our SDKs, APIs, or plugins. Check our documentation for step-by-step guides for your platform.",
  },
  {
    question: "What payment methods are supported?",
    answer: "We support 180+ payment methods including UPI, Cards, Wallets, Net Banking, EMI, Pay Later, and international payment methods.",
  },
  {
    question: "How long does it take to get activated?",
    answer: "Account activation typically takes 24-48 hours after document verification. You can start testing immediately in sandbox mode.",
  },
  {
    question: "What are the settlement timings?",
    answer: "Standard settlements are T+3 days. We also offer instant settlement options for faster access to your funds.",
  },
  {
    question: "Is there a setup fee?",
    answer: "No, there are no setup fees, integration fees, or annual maintenance charges. You only pay per transaction.",
  },
  {
    question: "How do I handle refunds?",
    answer: "Refunds can be processed instantly through your dashboard or via API. The amount is credited back to the customer within 5-7 business days.",
  },
];

export default function Support() {
  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="relative pt-32 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-blue-500/5" />
        
        <div className="relative max-w-7xl mx-auto text-center">
          <h1 className="text-5xl md:text-6xl font-bold mb-6">
            How Can We
            <br />
            <span className="bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">
              Help You?
            </span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Get the support you need, when you need it
          </p>
        </div>
      </section>

      {/* Support Channels */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-20">
            <GlassCard className="p-8 text-center" hover glow>
              <MessageCircle className="w-12 h-12 mx-auto text-primary mb-4" />
              <h3 className="font-bold text-lg mb-2">Live Chat</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Chat with our support team
              </p>
              <PillButton variant="outline" size="sm" testId="support-chat">
                Start Chat
              </PillButton>
            </GlassCard>

            <GlassCard className="p-8 text-center" hover glow>
              <Book className="w-12 h-12 mx-auto text-primary mb-4" />
              <h3 className="font-bold text-lg mb-2">Documentation</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Browse our comprehensive guides
              </p>
              <PillButton variant="outline" size="sm" href="/docs" testId="support-docs">
                View Docs
              </PillButton>
            </GlassCard>

            <GlassCard className="p-8 text-center" hover glow>
              <Mail className="w-12 h-12 mx-auto text-primary mb-4" />
              <h3 className="font-bold text-lg mb-2">Email</h3>
              <p className="text-sm text-muted-foreground mb-4">
                support@ztake.in
              </p>
              <PillButton variant="outline" size="sm" testId="support-email">
                Send Email
              </PillButton>
            </GlassCard>

            <GlassCard className="p-8 text-center" hover glow>
              <Phone className="w-12 h-12 mx-auto text-primary mb-4" />
              <h3 className="font-bold text-lg mb-2">Phone</h3>
              <p className="text-sm text-muted-foreground mb-4">
                +91 9220592512
              </p>
              <PillButton variant="outline" size="sm" testId="support-phone">
                Call Us
              </PillButton>
            </GlassCard>
          </div>

          {/* FAQs */}
          <div>
            <div className="text-center mb-12">
              <HelpCircle className="w-16 h-16 mx-auto text-primary mb-4" />
              <h2 className="text-4xl font-bold mb-4">Frequently Asked Questions</h2>
              <p className="text-xl text-muted-foreground">
                Quick answers to common questions
              </p>
            </div>

            <div className="max-w-4xl mx-auto space-y-4">
              {faqs.map((faq, index) => (
                <GlassCard key={index} className="p-6">
                  <h3 className="font-bold text-lg mb-3" data-testid={`faq-question-${index}`}>{faq.question}</h3>
                  <p className="text-muted-foreground">{faq.answer}</p>
                </GlassCard>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Contact CTA */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-accent/10 to-background">
        <div className="max-w-4xl mx-auto">
          <GlassCard className="p-12 text-center" glow>
            <h2 className="text-3xl font-bold mb-4">Still Have Questions?</h2>
            <p className="text-xl text-muted-foreground mb-8">
              Our team is here to help you succeed
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <PillButton variant="default" size="lg" href="/contact" testId="support-contact">
                Contact Support
              </PillButton>
              <PillButton variant="outline" size="lg" href="/docs" testId="support-browse-docs">
                Browse Documentation
              </PillButton>
            </div>
          </GlassCard>
        </div>
      </section>
    </div>
  );
}
