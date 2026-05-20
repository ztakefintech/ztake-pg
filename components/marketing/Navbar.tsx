import Link from "next/link";
import { Moon, Sun, Menu, X } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import { PillButton } from "./PillButton";
import { useState, useEffect } from "react";
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
  const [scrolled, setScrolled] = useState(false);

  // Monitor scroll for shadow/border transition like Apple's header
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 10) {
        setScrolled(true);
      } else {
        setScrolled(false);
      }
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <nav 
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
        scrolled 
          ? "bg-white/70 dark:bg-black/70 backdrop-blur-xl border-b border-black/[0.06] dark:border-white/[0.08] shadow-[0_2px_15px_-3px_rgba(0,0,0,0.02)]" 
          : "bg-transparent border-b border-transparent"
      )}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2 group cursor-pointer" data-testid="link-home">
            <svg 
              className="w-6 h-6 text-zinc-900 dark:text-white transition-transform duration-300 group-hover:scale-105" 
              viewBox="0 0 24 24" 
              fill="none" 
              xmlns="http://www.w3.org/2000/svg"
            >
              <path 
                d="M19 3H5C3.89543 3 3 3.89543 3 5V19C3 20.1046 3.89543 21 5 21H19C20.1046 21 21 20.1046 21 19V5C21 3.89543 20.1046 3 19 3Z" 
                stroke="currentColor" 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round" 
              />
              <path 
                d="M7 8H17L10 16H17" 
                stroke="currentColor" 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round" 
              />
            </svg>
            <span className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-white group-hover:opacity-80 transition-opacity">
              Ztake
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-1">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={(e) => handleAnchorClick(e, link.href)}
                className={cn(
                  "px-4 py-1.5 rounded-full text-xs font-medium tracking-wide transition-all duration-300 cursor-pointer relative group",
                  "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
                )}
                data-testid={`link-${link.label.toLowerCase()}`}
              >
                {link.label}
                <span className="absolute bottom-0 left-4 right-4 h-[1.5px] bg-zinc-950 dark:bg-white scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-center" />
              </a>
            ))}
          </div>

          {/* Right Actions */}
          <div className="flex items-center space-x-2">
            {/* Theme Toggle Button */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-full text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-all duration-300"
              data-testid="button-theme-toggle"
              aria-label="Toggle theme"
            >
              {theme === "light" ? (
                <Moon className="w-[18px] h-[18px]" />
              ) : (
                <Sun className="w-[18px] h-[18px]" />
              )}
            </button>

            <div className="hidden md:flex items-center pl-1">
              <PillButton 
                variant="default" 
                href="/login" 
                testId="button-get-started"
                className="bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-white dark:hover:bg-zinc-100 dark:text-zinc-950 text-xs font-medium px-5 py-2 shadow-xs transition-all duration-300 hover:scale-[1.02]"
              >
                Get Started
              </PillButton>
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-full text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-all duration-300"
              data-testid="button-mobile-menu"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      <div 
        className={cn(
          "md:hidden fixed inset-x-0 top-16 bg-white/95 dark:bg-black/95 backdrop-blur-2xl border-b border-black/[0.06] dark:border-white/[0.08] transition-all duration-300 ease-in-out transform origin-top shadow-xl",
          mobileMenuOpen ? "opacity-100 scale-y-100 pointer-events-auto" : "opacity-0 scale-y-95 pointer-events-none"
        )}
      >
        <div className="px-4 py-5 space-y-2">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              onClick={(e) => {
                handleAnchorClick(e, link.href);
                setMobileMenuOpen(false);
              }}
              className={cn(
                "block px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 cursor-pointer",
                "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900 hover:text-zinc-900 dark:hover:text-white"
              )}
              data-testid={`mobile-link-${link.label.toLowerCase()}`}
            >
              {link.label}
            </a>
          ))}
          <div className="flex flex-col space-y-2 pt-3 border-t border-zinc-100 dark:border-zinc-900">
            <PillButton 
              variant="outline" 
              href="/contact" 
              testId="mobile-button-contact"
              className="w-full text-center py-2.5 text-xs font-medium rounded-xl transition-all duration-300"
            >
              Contact Sales
            </PillButton>
            <PillButton 
              variant="default" 
              href="/login" 
              testId="mobile-button-start"
              className="w-full text-center py-2.5 text-xs font-medium rounded-xl bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 transition-all duration-300"
            >
              Get Started
            </PillButton>
          </div>
        </div>
      </div>
    </nav>
  );
}
