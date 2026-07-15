"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useEffect, useCallback } from "react";
import { Search, User } from "lucide-react";

const NAV_ITEMS = [
  { name: "Solutions", href: "/solutions" },
  { name: "Products", href: "/products" },
  { name: "Technology", href: "/technology" },
  { name: "Pricing", href: "/pricing" },
  { name: "About", href: "/about" },
];

// Minimalist Deer SVG Logo
function DeerLogo({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Deer Coffee Logo"
    >
      {/* Antlers */}
      <path d="M17 6 L17 18 M17 10 L13 6 M17 10 L20 7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M31 6 L31 18 M31 10 L35 6 M31 10 L28 7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      {/* Head */}
      <ellipse cx="24" cy="22" rx="8" ry="9" fill="currentColor" />
      {/* Eyes */}
      <circle cx="21" cy="20" r="1.2" fill="white" />
      <circle cx="27" cy="20" r="1.2" fill="white" />
      {/* Nose */}
      <ellipse cx="24" cy="26" rx="2" ry="1.2" fill="white" opacity="0.7" />
      {/* Neck / Body */}
      <path d="M18 30 Q24 35 30 30 L32 44 Q24 48 16 44 Z" fill="currentColor" opacity="0.8" />
      {/* Coffee cup detail */}
      <rect x="20" y="36" width="8" height="5" rx="1" fill="white" opacity="0.3" />
    </svg>
  );
}

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
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? "bg-white shadow-sm" : `bg-white/95 ${menuOpen ? "" : "backdrop-blur-sm"}`
        }`}
    >
      <div className="max-w-[1400px] mx-auto px-6 h-20 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 group" id="nav-logo">
          <div className="flex flex-col leading-none">
            <span className="font-black text-4xl tracking-[0.15em] uppercase group-hover:scale-105 transition-transform origin-left duration-300">
              DEER
            </span>
            <span className=" font-light text-[21px] text-black/60 tracking-[0.25em] uppercase -mt-0.5 group-hover:scale-105 transition-transform">
              COFFEE
            </span>
          </div>
        </Link>

        {/* Desktop Nav */}
        <div className="hidden md:flex items-center gap-8">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              className="text-black/70 hover:text-black text-sm font-medium tracking-wider transition-colors duration-200 relative group"
              id={`nav-${item.name.toLowerCase()}`}
            >
              {item.name}
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-black transition-all duration-300 group-hover:w-full"></span>
            </Link>
          ))}
        </div>

        {/* Desktop CTA */}
        <div className="hidden md:flex items-center gap-4">
          <Link
            href="/login"
            id="nav-login-btn"
            className="flex items-center gap-2 text-sm font-semibold text-black border border-black/20 px-5 py-2 hover:bg-black hover:text-white transition-all duration-300 rounded-full"
          >
            <User size={14} />
            Login
          </Link>
          <Link
            href="/login"
            id="nav-getstarted-btn"
            className="text-sm font-semibold text-white bg-black px-5 py-2 rounded-full hover:bg-black/80 transition-all duration-300"
          >
            Get Started
          </Link>
        </div>

        {/* Mobile Hamburger */}
        <button
          className="md:hidden flex flex-col gap-1.5 p-2 z-50 relative"
          onClick={toggleMenu}
          aria-label="Toggle menu"
          aria-expanded={menuOpen}
          id="nav-mobile-menu-btn"
        >
          <span className={`block w-6 h-0.5 transition-all duration-300 ${menuOpen ? "bg-white translate-y-2 rotate-45" : "bg-black"}`} />
          <span className={`block w-6 h-0.5 transition-all duration-300 ${menuOpen ? "opacity-0 bg-white" : "bg-black opacity-100"}`} />
          <span className={`block w-6 h-0.5 transition-all duration-300 ${menuOpen ? "bg-white -translate-y-2 -rotate-45" : "bg-black"}`} />
        </button>
      </div>

      {/* Mobile Menu */}
      <div
        className={`fixed inset-0 bg-coffee-espresso z-40 transition-all duration-500 flex flex-col items-center pt-28 pb-10 overflow-y-auto md:hidden ${menuOpen ? "translate-y-0 opacity-100" : "-translate-y-full opacity-0 pointer-events-none"
          }`}
      >
        <div className="flex flex-col leading-none text-center mb-10">
          <span className="font-black text-3xl text-white tracking-[0.15em] uppercase">
            DEER
          </span>
          <span className="font-light text-sm text-white/60 tracking-[0.25em] uppercase mt-1">
            COFFEE
          </span>
        </div>
        <div className="flex flex-col items-center gap-6 w-full">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              onClick={closeMenu}
              className="text-2xl font-bold uppercase tracking-widest text-white/90 hover:text-white transition-colors"
            >
              {item.name}
            </Link>
          ))}
        </div>
        <div className="flex flex-col gap-4 mt-10 w-64 shrink-0">
          <Link href="/login" onClick={closeMenu} className="text-center py-4 border border-white/30 text-white rounded-full font-bold text-sm tracking-widest uppercase hover:bg-white/10 transition-all">
            Login
          </Link>
          <Link href="/login" onClick={closeMenu} className="text-center py-4 bg-white text-coffee-espresso rounded-full font-bold text-sm tracking-widest uppercase hover:bg-white/90 transition-all">
            Get Started
          </Link>
        </div>
      </div>
    </nav>
  );
}
