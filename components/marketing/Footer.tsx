import Link from "next/link";
import { Github, Twitter, Linkedin, Mail } from "lucide-react";
import Image from "next/image";

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
      { label: "API Reference", href: "/docs" },
      { label: "SDKs", href: "/docs" },
      { label: "Webhooks", href: "/docs" },
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
      { label: "Case Studies", href: "/resources" },
      { label: "Support", href: "/support" },
      { label: "Pricing", href: "/pricing" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Privacy Policy", href: "/privacy" },
      { label: "Terms of Service", href: "/terms" },
      { label: "Refund Policy", href: "/refund-policy" },
      { label: "API Use", href: "/api-use" },
    ],
  },
];

export function Footer() {
  return (
    <footer
      className="relative overflow-hidden"
      style={{
        background: 'var(--layout-sidebar-bg)',
        borderTop: '1px solid var(--layout-sidebar-border)',
      }}
    >
      {/* Gradient overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse 60% 40% at 50% 0%, var(--brand-glow), transparent 60%)' }}
      />
      
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-8 mb-12">
          {/* Brand */}
          <div className="col-span-2 md:col-span-3 lg:col-span-1">
            <Link href="/" className="inline-flex items-center gap-2.5 cursor-pointer mb-4" data-testid="footer-link-home">
              <Image src="/ztake-icon.png" alt="Ztake" width={24} height={24} className="rounded" />
              <span className="ztake-wordmark" style={{ fontSize: '18px' }}>
                ztake
              </span>
            </Link>
            <p style={{ fontSize: '14px', color: 'var(--layout-text-secondary)', lineHeight: '1.6' }}>
              Empowering modern businesses to get paid instantly.
            </p>
            <div className="flex space-x-3 mt-4">
              <a
                href="https://twitter.com"
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-full transition-all duration-200"
                style={{ background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', color: 'var(--layout-text-secondary)' }}
                onMouseEnter={e => { e.currentTarget.style.background = 'var(--glass-bg-medium)'; e.currentTarget.style.color = 'var(--layout-text-primary)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'var(--glass-bg)'; e.currentTarget.style.color = 'var(--layout-text-secondary)'; }}
                data-testid="social-twitter"
                aria-label="Twitter"
              >
                <Twitter className="w-4 h-4" />
              </a>
              <a
                href="https://github.com"
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-full transition-all duration-200"
                style={{ background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', color: 'var(--layout-text-secondary)' }}
                onMouseEnter={e => { e.currentTarget.style.background = 'var(--glass-bg-medium)'; e.currentTarget.style.color = 'var(--layout-text-primary)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'var(--glass-bg)'; e.currentTarget.style.color = 'var(--layout-text-secondary)'; }}
                data-testid="social-github"
                aria-label="GitHub"
              >
                <Github className="w-4 h-4" />
              </a>
              <a
                href="https://linkedin.com"
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-full transition-all duration-200"
                style={{ background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', color: 'var(--layout-text-secondary)' }}
                onMouseEnter={e => { e.currentTarget.style.background = 'var(--glass-bg-medium)'; e.currentTarget.style.color = 'var(--layout-text-primary)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'var(--glass-bg)'; e.currentTarget.style.color = 'var(--layout-text-secondary)'; }}
                data-testid="social-linkedin"
                aria-label="LinkedIn"
              >
                <Linkedin className="w-4 h-4" />
              </a>
              <a
                href="mailto:sales@ztake.in"
                className="p-2 rounded-full transition-all duration-200"
                style={{ background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', color: 'var(--layout-text-secondary)' }}
                onMouseEnter={e => { e.currentTarget.style.background = 'var(--glass-bg-medium)'; e.currentTarget.style.color = 'var(--layout-text-primary)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'var(--glass-bg)'; e.currentTarget.style.color = 'var(--layout-text-secondary)'; }}
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
              <h3 style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' as any, color: 'var(--layout-text-secondary)', marginBottom: '16px' }}>
                {section.title}
              </h3>
              <ul className="space-y-3">
                {section.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="transition-colors duration-200 cursor-pointer"
                      style={{ fontSize: '14px', color: 'var(--layout-text-secondary)' }}
                      onMouseEnter={e => e.currentTarget.style.color = 'var(--layout-text-primary)'}
                      onMouseLeave={e => e.currentTarget.style.color = 'var(--layout-text-secondary)'}
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

        <div className="pt-8" style={{ borderTop: '1px solid var(--layout-sidebar-border)' }}>
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <p style={{ fontSize: '13px', color: 'var(--layout-text-secondary)', opacity: 0.8 }}>
              © {new Date().getFullYear()} Ztake Payments. All rights reserved.
            </p>
            <div className="flex items-center space-x-6" style={{ fontSize: '13px', color: 'var(--layout-text-secondary)', opacity: 0.8 }}>
              <span>Made with precision in India</span>
              <span className="hidden md:inline">•</span>
              <a href="tel:+919220592512" className="hover:text-zinc-900 dark:hover:text-white transition-colors">
                +91 9220592512
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
