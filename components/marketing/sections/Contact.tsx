import { GlassCard } from "@/components/marketing/GlassCard";
import { PillButton } from "@/components/marketing/PillButton";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Mail, Phone, MapPin, MessageSquare } from "lucide-react";
import { useState, FormEvent } from "react";
import { useToast } from "@/hooks/use-toast";

export default function Contact() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    company: "",
    message: "",
  });

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: "Message sent!",
          description: "We'll get back to you within 24 hours.",
        });
        setFormData({
          fullName: "",
          email: "",
          phone: "",
          company: "",
          message: "",
        });
      } else {
        toast({
          title: "Error",
          description: data.message || "Failed to send message. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="relative pt-32 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-blue-500/5" />
        
        <div className="relative max-w-7xl mx-auto text-center">
          <h1 className="text-5xl md:text-6xl font-bold mb-6">
            Get in
            <br />
            <span className="bg-gradient-to-r from-primary-500 to-blue-600 bg-clip-text text-transparent">
              Touch
            </span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Ready to transform your payment processing? Contact our experts today.
          </p>
        </div>
      </section>

      {/* Contact Form & Info */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Contact Information */}
            <div className="space-y-6">
              <GlassCard className="p-6" glow>
                <Phone className="w-8 h-8 text-primary mb-3" />
                <h3 className="font-semibold mb-2">Phone</h3>
                <a
                  href="tel:+919220592512"
                  className="text-muted-foreground hover:text-primary transition-colors"
                  data-testid="contact-phone"
                >
                  +91 9220592512
                </a>
              </GlassCard>

              <GlassCard className="p-6" glow>
                <Mail className="w-8 h-8 text-primary mb-3" />
                <h3 className="font-semibold mb-2">Email</h3>
                <a
                  href="mailto:sales@ztake.in"
                  className="text-muted-foreground hover:text-primary transition-colors"
                  data-testid="contact-email"
                >
                  sales@ztake.in
                </a>
              </GlassCard>

              <GlassCard className="p-6" glow>
                <MapPin className="w-8 h-8 text-primary mb-3" />
                <h3 className="font-semibold mb-2">Address</h3>
                <p className="text-muted-foreground">
                  Business Hub<br />
                  Technology Park<br />
                  India
                </p>
              </GlassCard>

              <GlassCard className="p-6" glow>
                <MessageSquare className="w-8 h-8 text-primary mb-3" />
                <h3 className="font-semibold mb-2">WhatsApp</h3>
                <a
                  href="https://wa.me/919220592512"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-primary transition-colors"
                  data-testid="contact-whatsapp"
                >
                  Chat with us
                </a>
              </GlassCard>
            </div>

            {/* Contact Form */}
            <div className="lg:col-span-2">
              <GlassCard className="p-8" glow>
                <h2 className="text-2xl font-bold mb-6">Send us a Message</h2>
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="text-sm font-medium mb-2 block">
                        Full Name *
                      </label>
                      <Input
                        required
                        placeholder="John Doe"
                        value={formData.fullName}
                        onChange={(e) =>
                          setFormData({ ...formData, fullName: e.target.value })
                        }
                        data-testid="input-fullname"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-2 block">
                        Email Address *
                      </label>
                      <Input
                        required
                        type="email"
                        placeholder="john@company.com"
                        value={formData.email}
                        onChange={(e) =>
                          setFormData({ ...formData, email: e.target.value })
                        }
                        data-testid="input-email"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="text-sm font-medium mb-2 block">
                        Phone Number
                      </label>
                      <Input
                        placeholder="+91 9876543210"
                        value={formData.phone}
                        onChange={(e) =>
                          setFormData({ ...formData, phone: e.target.value })
                        }
                        data-testid="input-phone"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-2 block">
                        Company Name
                      </label>
                      <Input
                        placeholder="Your Company"
                        value={formData.company}
                        onChange={(e) =>
                          setFormData({ ...formData, company: e.target.value })
                        }
                        data-testid="input-company"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      Message *
                    </label>
                    <Textarea
                      required
                      placeholder="Tell us about your requirements..."
                      value={formData.message}
                      onChange={(e) =>
                        setFormData({ ...formData, message: e.target.value })
                      }
                      rows={6}
                      data-testid="input-message"
                    />
                  </div>

                  <PillButton
                    type="submit"
                    variant="default"
                    size="lg"
                    className="w-full"
                    testId="button-submit"
                  >
                    {loading ? "Sending..." : "Send Message"}
                  </PillButton>
                </form>
              </GlassCard>
            </div>
          </div>
        </div>
      </section>

      {/* Business Hours */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-accent/10 to-background">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">Business Hours</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <GlassCard className="p-6 text-center">
              <div className="font-semibold mb-2">Monday - Friday</div>
              <div className="text-muted-foreground">9:00 AM - 6:00 PM</div>
            </GlassCard>
            <GlassCard className="p-6 text-center">
              <div className="font-semibold mb-2">Saturday</div>
              <div className="text-muted-foreground">10:00 AM - 4:00 PM</div>
            </GlassCard>
            <GlassCard className="p-6 text-center">
              <div className="font-semibold mb-2">Sunday</div>
              <div className="text-muted-foreground">Closed</div>
            </GlassCard>
          </div>
        </div>
      </section>
    </div>
  );
}
