import Link from "next/link";
import { Moon, Sun, Menu, X } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import { PillButton } from "./PillButton";
import { useState } from "react";
import { cn } from "@/lib/utils";

const handleAnchorClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
  if (href.startsWith("#") && typeof window !== "undefined") {
    e.preventDefault();
    const element = document.querySelector(href);
    if (element) {
      const navbarHeight = 64; // h-16 = 64px
      const elementPosition = element.getBoundingClientRect().top + window.pageYOffset;
      const offsetPosition = elementPosition - navbarHeight;
      
      window.scrollTo({
        top: offsetPosition,
        behavior: "smooth"
      });
    }
  }
};

const navLinks = [
  { label: "Features", href: "#features" },
  { label: "Solutions", href: "#solutions" },
  { label: "Testimonials", href: "#testimonials" },
  { label: "Get Started", href: "#get-started" },
];

export function Navbar() {
  const { theme, toggleTheme } = useTheme();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur-2xl bg-white/80 dark:bg-gray-900/80 border-b border-white/20 dark:border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2 group cursor-pointer" data-testid="link-home">
            <div className="text-2xl font-bold bg-gradient-to-r from-primary-500 to-blue-600 bg-clip-text text-transparent">
              Ztake
            </div>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-1">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={(e) => handleAnchorClick(e, link.href)}
                className={cn(
                  "px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 cursor-pointer",
                  "hover-elevate",
                  "text-foreground/70 hover:text-foreground"
                )}
                data-testid={`link-${link.label.toLowerCase()}`}
              >
                {link.label}
              </a>
            ))}
          </div>

          {/* Right Actions */}
          <div className="flex items-center space-x-3">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-full hover-elevate transition-all duration-200"
              data-testid="button-theme-toggle"
              aria-label="Toggle theme"
            >
              {theme === "light" ? (
                <Moon className="w-5 h-5" />
              ) : (
                <Sun className="w-5 h-5" />
              )}
            </button>

            <div className="hidden md:flex items-center space-x-2">
              {/* <PillButton variant="ghost" href="/contact" testId="button-contact-sales">
                Contact Sales
              </PillButton> */}
              <PillButton variant="default" href="/login" testId="button-get-started">
                Get Started
              </PillButton>
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-full hover-elevate transition-all duration-200"
              data-testid="button-mobile-menu"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden backdrop-blur-2xl bg-white/95 dark:bg-gray-900/95 border-t border-white/20 dark:border-white/10">
          <div className="px-4 py-4 space-y-2">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={(e) => {
                  handleAnchorClick(e, link.href);
                  setMobileMenuOpen(false);
                }}
                className={cn(
                  "block px-4 py-3 rounded-2xl text-sm font-medium transition-all duration-200 cursor-pointer",
                  "text-foreground/70 hover:bg-accent"
                )}
                data-testid={`mobile-link-${link.label.toLowerCase()}`}
              >
                {link.label}
              </a>
            ))}
            <div className="flex flex-col space-y-2 pt-2">
              <PillButton variant="outline" href="/contact" testId="mobile-button-contact">
                Contact Sales
              </PillButton>
              <PillButton variant="default" href="/login" testId="mobile-button-start">
                Get Started
              </PillButton>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
