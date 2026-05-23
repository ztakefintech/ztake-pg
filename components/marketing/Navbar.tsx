import Link from "next/link";
import { Moon, Sun, Menu, X } from "lucide-react";
import { useTheme } from "next-themes";
import { PillButton } from "./PillButton";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";

const navLinks = [
  { label: "Features", href: "#features" },
  { label: "Solutions", href: "#solutions" },
  { label: "Testimonials", href: "#testimonials" },
  { label: "Get Started", href: "#get-started" },
];

export function Navbar() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
  }, []);

  const toggleTheme = () => setTheme(theme === "dark" ? "light" : "dark");

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

  const handleAnchorClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    if (href.startsWith("#") && typeof window !== "undefined") {
      if (pathname === "/") {
        e.preventDefault();
        const element = document.querySelector(href);
        if (element) {
          const navbarHeight = scrolled ? 72 : 64;
          const elementPosition = element.getBoundingClientRect().top + window.pageYOffset;
          const offsetPosition = elementPosition - navbarHeight;
          
          window.scrollTo({
            top: offsetPosition,
            behavior: "smooth"
          });
        }
      }
    }
  };

  return (
    <nav 
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-500",
        scrolled 
          ? "py-3 px-4 md:px-8 flex justify-center bg-transparent border-none"
          : "py-0 flex justify-center bg-transparent border-none"
      )}
    >
      <div 
        className={cn(
          "w-full transition-all duration-500 ease-in-out flex items-center justify-between",
          scrolled 
            ? "max-w-5xl rounded-full px-6 h-14 border shadow-[0_8px_32px_rgba(0,0,0,0.06)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.4)]" 
            : "max-w-7xl rounded-none px-4 sm:px-6 lg:px-8 h-16 bg-transparent border-b border-transparent"
        )}
        style={{
          background: scrolled ? 'var(--layout-header-bg)' : 'transparent',
          borderColor: scrolled ? 'var(--layout-sidebar-border)' : 'transparent',
          backdropFilter: scrolled ? 'blur(20px) saturate(180%)' : 'none',
          WebkitBackdropFilter: scrolled ? 'blur(20px) saturate(180%)' : 'none',
        }}
      >
        {/* Logo */}
        <Link href="/" className="flex items-center space-x-2.5 group cursor-pointer" data-testid="link-home">
          <Image 
            src="/ztake-icon.png" 
            alt="Ztake" 
            width={28} 
            height={28} 
            className="transition-transform duration-300 group-hover:scale-105 rounded" 
          />
          <span className="ztake-wordmark group-hover:opacity-80 transition-opacity">
            ztake
          </span>
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center space-x-1">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={pathname === "/" ? link.href : `/${link.href}`}
              onClick={(e) => handleAnchorClick(e, link.href)}
              className={cn(
                "px-4 py-1.5 rounded-full text-xs font-medium tracking-wide transition-all duration-300 cursor-pointer relative group",
                "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
              )}
              data-testid={`link-${link.label.toLowerCase()}`}
            >
              {link.label}
              <span className="absolute bottom-0 left-4 right-4 h-[1.5px] bg-zinc-900 dark:bg-white scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-center" />
            </Link>
          ))}
        </div>

        {/* Right Actions */}
        <div className="flex items-center space-x-2">
          {/* Theme Toggle Button */}
          {mounted && (
            <button
              onClick={toggleTheme}
              className="p-2 rounded-full transition-all duration-300"
              style={{ color: 'var(--layout-text-secondary)' }}
              data-testid="button-theme-toggle"
              aria-label="Toggle theme"
              onMouseEnter={e => e.currentTarget.style.color = 'var(--layout-text-primary)'}
              onMouseLeave={e => e.currentTarget.style.color = 'var(--layout-text-secondary)'}
            >
              {theme === "light" ? (
                <Moon className="w-[18px] h-[18px]" />
              ) : (
                <Sun className="w-[18px] h-[18px]" />
              )}
            </button>
          )}

          <div className="hidden md:flex items-center pl-1">
            <PillButton 
              variant="default" 
              href="/login" 
              testId="button-get-started"
              className="glass-button-primary text-xs font-medium px-5 py-2 transition-all duration-300 hover:scale-[1.02]"
            >
              Get Started
            </PillButton>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-full transition-all duration-300"
            style={{ color: 'var(--layout-text-secondary)' }}
            data-testid="button-mobile-menu"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <div 
        className={cn(
          "md:hidden fixed left-4 right-4 backdrop-blur-2xl transition-all duration-300 ease-in-out transform origin-top shadow-xl rounded-2xl border",
          scrolled ? "top-[72px]" : "top-18",
          mobileMenuOpen ? "opacity-100 scale-y-100 pointer-events-auto" : "opacity-0 scale-y-95 pointer-events-none"
        )}
        style={{
          background: 'var(--layout-sidebar-bg)',
          borderColor: 'var(--layout-sidebar-border)',
        }}
      >
        <div className="px-4 py-5 space-y-2">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={pathname === "/" ? link.href : `/${link.href}`}
              onClick={(e) => {
                handleAnchorClick(e, link.href);
                setMobileMenuOpen(false);
              }}
              className={cn(
                "block px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 cursor-pointer",
                "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
              )}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--glass-bg)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              data-testid={`mobile-link-${link.label.toLowerCase()}`}
            >
              {link.label}
            </Link>
          ))}
          <div className="flex flex-col space-y-2 pt-3" style={{ borderTop: '1px solid var(--layout-sidebar-border)' }}>
            <PillButton 
              variant="outline" 
              href="/contact" 
              testId="mobile-button-contact"
              className="w-full text-center py-2.5 text-xs font-medium rounded-xl glass-button-secondary transition-all duration-300"
            >
              Contact Sales
            </PillButton>
            <PillButton 
              variant="default" 
              href="/login" 
              testId="mobile-button-start"
              className="w-full text-center py-2.5 text-xs font-medium rounded-xl glass-button-primary transition-all duration-300"
            >
              Get Started
            </PillButton>
          </div>
        </div>
      </div>
    </nav>
  );
}
