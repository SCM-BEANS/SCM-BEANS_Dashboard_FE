"use client";

import Link from "next/link";
import { useState, useEffect, useCallback } from "react";

// Static nav items — never re-created
const NAV_ITEMS = ["Features", "Dashboard", "Workflow", "Documentation"] as const;

export function LandingNav() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  // Throttled scroll handler with passive listener — no main thread blocking
  const handleScroll = useCallback(() => {
    const next = window.scrollY > 20;
    // Only trigger re-render when state actually changes
    setScrolled((prev) => (prev !== next ? next : prev));
  }, []);

  useEffect(() => {
    // { passive: true } tells browser this handler won't call preventDefault
    // so it can safely optimise scroll without waiting for JS
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  const closeMenu = useCallback(() => setMenuOpen(false), []);
  const toggleMenu = useCallback(() => setMenuOpen((v) => !v), []);

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-colors duration-300 ${scrolled
        ? "bg-white/95 backdrop-blur-sm border-b border-[#111]/10"
        : "bg-transparent"
        }`}
    >
      <div className="max-w-[1200px] mx-auto px-6 md:px-10 h-16 flex items-center justify-between">

        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 group">
          <div className="w-7 h-7 bg-[#111] flex items-center justify-center transition-transform duration-200 group-hover:scale-105">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
              <rect x="1" y="1" width="5" height="5" fill="white" />
              <rect x="8" y="1" width="5" height="5" fill="white" />
              <rect x="1" y="8" width="5" height="5" fill="white" />
              <rect x="8" y="8" width="5" height="5" stroke="white" strokeWidth="1" />
            </svg>
          </div>
          <span className="font-semibold text-[#111] tracking-tight text-sm uppercase">
            Deer Coffee
            <span className="block text-[10px] font-normal text-[#888] tracking-widest -mt-1 uppercase">
              IoT Platform
            </span>
          </span>
        </Link>

        {/* Desktop Nav */}
        <div className="hidden md:flex items-center gap-8">
          {NAV_ITEMS.map((item) => (
            <a
              key={item}
              href={`#${item.toLowerCase()}`}
              className="text-[#555] hover:text-[#111] text-sm font-medium tracking-wide transition-colors duration-200"
            >
              {item}
            </a>
          ))}
        </div>

        {/* Desktop CTA */}
        <div className="hidden md:flex items-center gap-3">
          <Link
            href="/dashboard"
            className="text-sm font-medium text-[#111] bg-white border border-[#111] px-4 py-1.5 hover:bg-[#111] hover:text-white transition-colors duration-200"
          >
            Xem dashboard demo
          </Link>
          <Link
            href="/login"
            className="text-sm font-medium text-white bg-[#111] border border-[#111] px-4 py-1.5 hover:bg-black transition-colors duration-200"
          >
            Sign In
          </Link>
        </div>

        {/* Mobile Hamburger */}
        <button
          className="md:hidden flex flex-col gap-1.5 p-1"
          onClick={toggleMenu}
          aria-label="Toggle menu"
          aria-expanded={menuOpen}
        >
          <span
            className="block w-5 h-0.5 bg-[#111] transition-transform duration-250 origin-center"
            style={{ transform: menuOpen ? "rotate(45deg) translateY(8px)" : undefined }}
          />
          <span
            className="block w-5 h-0.5 bg-[#111] transition-opacity duration-250"
            style={{ opacity: menuOpen ? 0 : 1 }}
          />
          <span
            className="block w-5 h-0.5 bg-[#111] transition-transform duration-250 origin-center"
            style={{ transform: menuOpen ? "rotate(-45deg) translateY(-8px)" : undefined }}
          />
        </button>
      </div>

      {/* Mobile Menu — height animation via max-height avoids layout thrash */}
      <div
        className="md:hidden overflow-hidden bg-white border-b border-[#111]/10"
        style={{
          maxHeight: menuOpen ? "320px" : "0",
          opacity: menuOpen ? 1 : 0,
          transition: "max-height 0.3s ease, opacity 0.25s ease",
        }}
      >
        <div className="px-6 py-4 flex flex-col gap-4">
          {NAV_ITEMS.map((item) => (
            <a
              key={item}
              href={`#${item.toLowerCase()}`}
              onClick={closeMenu}
              className="text-sm font-medium text-[#555] hover:text-[#111] transition-colors duration-150"
            >
              {item}
            </a>
          ))}
          <div className="pt-2 border-t border-[#eee] flex flex-col gap-2">
            <Link
              href="/dashboard"
              className="block text-center text-sm font-medium text-[#111] border border-[#111] px-4 py-2 hover:bg-[#111] hover:text-white transition-colors duration-200"
            >
              Xem dashboard demo
            </Link>
            <Link
              href="/login"
              className="block text-center text-sm font-medium text-white bg-[#111] border border-[#111] px-4 py-2 hover:bg-black transition-colors duration-200"
            >
              Sign In
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}
