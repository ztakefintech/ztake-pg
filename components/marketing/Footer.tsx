import Link from "next/link";
import { Github, Twitter, Linkedin, Mail } from "lucide-react";

const footerSections = [
  {
    title: "Products",
    links: [
      { label: "Payment Gateway", href: "/payments" },
      { label: "Subscriptions", href: "/subscriptions" },
      { label: "ZtakeX Banking", href: "/ztakex" },
      { label: "Capital", href: "/capital" },
    ],
  },
  {
    title: "Developers",
    links: [
      { label: "Documentation", href: "/docs" },
      { label: "API Reference", href: "/docs/api-reference" },
      { label: "SDKs", href: "/docs/sdks" },
      { label: "Webhooks", href: "/docs/webhooks" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About Us", href: "/about" },
      { label: "Careers", href: "/careers" },
      { label: "Partners", href: "/partners" },
      { label: "Contact", href: "/contact" },
    ],
  },
  {
    title: "Resources",
    links: [
      { label: "Blog", href: "/resources" },
      { label: "Case Studies", href: "/case-studies" },
      { label: "Support", href: "/support" },
      { label: "Pricing", href: "/pricing" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Privacy Policy", href: "/privacy" },
      { label: "Terms of Service", href: "/terms" },
      { label: "Security", href: "/security" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="relative overflow-hidden bg-gradient-to-b from-background to-accent/20 dark:from-gray-900 dark:to-gray-950 border-t border-white/10">
      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-primary/5 via-transparent to-transparent pointer-events-none" />
      
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-8 mb-12">
          {/* Brand */}
          <div className="col-span-2 md:col-span-3 lg:col-span-1">
            <Link href="/" className="inline-block cursor-pointer" data-testid="footer-link-home">
              <div className="text-2xl font-bold bg-gradient-to-r from-primary-500 to-blue-600 bg-clip-text text-transparent mb-4">
                Ztake
              </div>
            </Link>
            <p className="text-sm text-muted-foreground mb-4">
              Empowering modern businesses to get paid instantly.
            </p>
            <div className="flex space-x-3">
              <a
                href="https://twitter.com"
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-full hover-elevate bg-accent/50 transition-all duration-200"
                data-testid="social-twitter"
                aria-label="Twitter"
              >
                <Twitter className="w-4 h-4" />
              </a>
              <a
                href="https://github.com"
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-full hover-elevate bg-accent/50 transition-all duration-200"
                data-testid="social-github"
                aria-label="GitHub"
              >
                <Github className="w-4 h-4" />
              </a>
              <a
                href="https://linkedin.com"
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-full hover-elevate bg-accent/50 transition-all duration-200"
                data-testid="social-linkedin"
                aria-label="LinkedIn"
              >
                <Linkedin className="w-4 h-4" />
              </a>
              <a
                href="mailto:sales@ztake.in"
                className="p-2 rounded-full hover-elevate bg-accent/50 transition-all duration-200"
                data-testid="social-email"
                aria-label="Email"
              >
                <Mail className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Links */}
          {footerSections.map((section) => (
            <div key={section.title}>
              <h3 className="font-semibold text-sm mb-4">{section.title}</h3>
              <ul className="space-y-3">
                {section.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-muted-foreground hover:text-foreground transition-colors duration-200 cursor-pointer"
                      data-testid={`footer-link-${link.label.toLowerCase().replace(/\s+/g, "-")}`}
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="pt-8 border-t border-white/10">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} Ztake Payments. All rights reserved.
            </p>
            <div className="flex items-center space-x-6 text-sm text-muted-foreground">
              <span>Made with precision in India</span>
              <span className="hidden md:inline">•</span>
              <a href="tel:+919220592512" className="hover:text-foreground transition-colors">
                +91 9220592512
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
