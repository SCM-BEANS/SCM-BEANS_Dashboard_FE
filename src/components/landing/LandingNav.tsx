"use client";

import Link from "next/link";
import { useState, useEffect, useCallback } from "react";
import { ArrowRight, Menu, X } from "lucide-react";

const NAV_LINKS = [
  { label: "Platform", href: "#features" },
  { label: "How It Works", href: "#workflow" },
  { label: "Dashboard", href: "/dashboard" },
] as const;

export function LandingNav() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const handleScroll = useCallback(() => {
    setScrolled(window.scrollY > 60);
  }, []);

  useEffect(() => {
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        scrolled
          ? "bg-warm-50/95 backdrop-blur-md border-b border-warm-300"
          : "bg-warm-50/0"
      }`}
    >
      <div className="em-container h-16 flex items-center justify-between">

        {/* Logo */}
        <Link
          href="/landing"
          className="flex items-center gap-3 group"
        >
          {/* Coffee bean mark */}
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="flex-shrink-0">
            <ellipse cx="12" cy="12" rx="9" ry="11" fill="#8B5E3C" />
            <path d="M12 3 Q15 12 12 21" stroke="#5A3A22" strokeWidth="1.5" fill="none" />
            <path d="M12 3 Q9 12 12 21" stroke="#5A3A22" strokeWidth="1.5" fill="none" />
          </svg>
          <span className="font-display text-[15px] font-bold tracking-wide text-ink uppercase">
            SCM-BEANS
          </span>
        </Link>

        {/* Desktop nav links */}
        <div className="hidden md:flex items-center gap-10">
          {NAV_LINKS.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="text-[13px] font-sans font-medium text-ink-muted hover:text-ink transition-colors duration-200 tracking-wide"
            >
              {link.label}
            </a>
          ))}
        </div>

        {/* Desktop CTAs */}
        <div className="hidden md:flex items-center gap-4">
          <Link
            href="/login"
            className="text-[13px] font-sans font-medium text-ink-muted hover:text-ink transition-colors duration-200"
          >
            Sign In
          </Link>
          <Link
            href="/login"
            className="group em-btn-primary text-[13px] py-2 px-5"
          >
            Get Started
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform duration-200" />
          </Link>
        </div>

        {/* Mobile hamburger */}
        <button
          className="md:hidden p-2 text-ink-muted hover:text-ink transition-colors"
          onClick={() => setMenuOpen((v) => !v)}
          aria-label="Toggle menu"
        >
          {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile menu */}
      <div
        className="md:hidden bg-warm-50 border-b border-warm-300 overflow-hidden"
        style={{
          maxHeight: menuOpen ? "280px" : "0",
          opacity: menuOpen ? 1 : 0,
          transition: "max-height 0.3s ease, opacity 0.2s ease",
        }}
      >
        <div className="em-container py-5 flex flex-col gap-4">
          {NAV_LINKS.map((link) => (
            <a
              key={link.label}
              href={link.href}
              onClick={() => setMenuOpen(false)}
              className="text-sm font-sans text-ink-muted hover:text-ink py-1 transition-colors"
            >
              {link.label}
            </a>
          ))}
          <div className="flex flex-col gap-3 pt-4 border-t border-warm-300">
            <Link href="/login" className="em-btn-secondary justify-center text-sm py-2.5">
              Sign In
            </Link>
            <Link href="/login" className="em-btn-primary justify-center text-sm py-2.5">
              Get Started
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}
