"use client";

import Link from "next/link";
import { useState, useEffect, useCallback } from "react";

const NAV_ITEMS = ["Features", "Dashboard", "Workflow", "Documentation"] as const;

export function LandingNav() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const handleScroll = useCallback(() => {
    const next = window.scrollY > 20;
    setScrolled((prev) => (prev !== next ? next : prev));
  }, []);

  useEffect(() => {
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  const closeMenu = useCallback(() => setMenuOpen(false), []);
  const toggleMenu = useCallback(() => setMenuOpen((v) => !v), []);

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        scrolled
          ? "bg-coffee-cream/95 backdrop-blur-md border-b border-coffee-bronze/10 shadow-sm"
          : "bg-transparent"
      }`}
    >
      <div className="max-w-[1200px] mx-auto px-6 md:px-10 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-8 h-8 rounded-full bg-coffee-roast flex items-center justify-center transition-transform duration-300 group-hover:scale-105">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M8 2C5.5 2 3.5 4 3.5 6.5C3.5 8 4 9 5 10.5C5.5 11.2 6 12 6 13H10C10 12 10.5 11.2 11 10.5C12 9 12.5 8 12.5 6.5C12.5 4 10.5 2 8 2Z" fill="#D4A847"/>
              <rect x="6" y="13" width="4" height="1" rx="0.5" fill="#D4A847"/>
            </svg>
          </div>
          <div>
            <span className="font-serif text-base font-bold text-coffee-roast tracking-tight">
              Deer Coffee
            </span>
            <span className="block text-[10px] font-sans font-medium text-coffee-mocha/60 tracking-[0.15em] uppercase -mt-0.5">
              IoT Platform
            </span>
          </div>
        </Link>

        {/* Desktop Nav */}
        <div className="hidden md:flex items-center gap-8">
          {NAV_ITEMS.map((item) => (
            <a
              key={item}
              href={`#${item.toLowerCase()}`}
              className="relative text-coffee-mocha/80 hover:text-coffee-roast text-sm font-medium tracking-wide transition-colors duration-300 after:absolute after:bottom-[-4px] after:left-0 after:w-0 after:h-[1.5px] after:bg-coffee-bronze after:transition-[width] after:duration-300 hover:after:w-full"
            >
              {item}
            </a>
          ))}
        </div>

        {/* Desktop CTA */}
        <div className="hidden md:flex items-center gap-3">
          <Link
            href="/dashboard"
            className="text-sm font-medium text-coffee-roast border border-coffee-roast/20 px-5 py-2 rounded-sm hover:bg-coffee-roast hover:text-coffee-cream transition-all duration-300"
          >
            Dashboard Demo
          </Link>
          <Link
            href="/login"
            className="text-sm font-medium text-coffee-cream bg-coffee-roast border border-coffee-roast px-5 py-2 rounded-sm hover:bg-coffee-espresso transition-all duration-300"
          >
            Sign In
          </Link>
        </div>

        {/* Mobile Hamburger */}
        <button
          className="md:hidden flex flex-col gap-1.5 p-2"
          onClick={toggleMenu}
          aria-label="Toggle menu"
          aria-expanded={menuOpen}
        >
          <span
            className="block w-5 h-[1.5px] bg-coffee-roast transition-transform duration-300 origin-center"
            style={{ transform: menuOpen ? "rotate(45deg) translateY(6px)" : undefined }}
          />
          <span
            className="block w-5 h-[1.5px] bg-coffee-roast transition-opacity duration-300"
            style={{ opacity: menuOpen ? 0 : 1 }}
          />
          <span
            className="block w-5 h-[1.5px] bg-coffee-roast transition-transform duration-300 origin-center"
            style={{ transform: menuOpen ? "rotate(-45deg) translateY(-6px)" : undefined }}
          />
        </button>
      </div>

      {/* Mobile Menu */}
      <div
        className="md:hidden overflow-hidden bg-coffee-cream border-b border-coffee-bronze/10"
        style={{
          maxHeight: menuOpen ? "360px" : "0",
          opacity: menuOpen ? 1 : 0,
          transition: "max-height 0.35s ease, opacity 0.3s ease",
        }}
      >
        <div className="px-6 py-5 flex flex-col gap-4">
          {NAV_ITEMS.map((item) => (
            <a
              key={item}
              href={`#${item.toLowerCase()}`}
              onClick={closeMenu}
              className="text-sm font-medium text-coffee-mocha hover:text-coffee-roast transition-colors duration-200"
            >
              {item}
            </a>
          ))}
          <div className="pt-3 border-t border-coffee-latte flex flex-col gap-2">
            <Link
              href="/dashboard"
              onClick={closeMenu}
              className="block text-center text-sm font-medium text-coffee-roast border border-coffee-roast/20 px-4 py-2.5 rounded-sm hover:bg-coffee-roast hover:text-coffee-cream transition-all duration-300"
            >
              Dashboard Demo
            </Link>
            <Link
              href="/login"
              onClick={closeMenu}
              className="block text-center text-sm font-medium text-coffee-cream bg-coffee-roast px-4 py-2.5 rounded-sm hover:bg-coffee-espresso transition-all duration-300"
            >
              Sign In
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}
