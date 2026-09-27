"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useEffect, useCallback } from "react";
import { User, Menu, X } from "lucide-react";

const NAV_ITEMS = [
  { name: "Solutions", href: "/solutions" },
  { name: "Products", href: "/products" },
  { name: "Technology", href: "/technology" },
  { name: "Pricing", href: "/pricing" },
  { name: "About", href: "/about" },
];

interface LandingNavProps {
  isLandingHero?: boolean;
  videoEnded?: boolean; // kept for backwards compatibility
}

export function LandingNav({ isLandingHero = false }: LandingNavProps) {
  const [isPastHero, setIsPastHero] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const handleScroll = useCallback(() => {
    if (!isLandingHero) {
      setIsPastHero(true);
      return;
    }
    // As long as header is over the Hero section (full viewport height), header is dark
    // When scrolled past hero, it transitions to light
    const heroHeight = (typeof window !== "undefined" ? window.innerHeight : 800) - 88;
    setIsPastHero(window.scrollY >= heroHeight);
  }, [isLandingHero]);

  useEffect(() => {
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleScroll);
    };
  }, [handleScroll]);

  const closeMenu = useCallback(() => setMenuOpen(false), []);
  const toggleMenu = useCallback(() => setMenuOpen((v) => !v), []);

  // When over dark video background (Hero section), header is Dark
  // When scrolled down into light content sections, header is Light
  const isDarkHeader = isLandingHero && !isPastHero;

  return (
    <>
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ease-in-out ${
          isDarkHeader
            ? "bg-black/55 backdrop-blur-xl border-b border-white/15 shadow-none"
            : "bg-white/95 backdrop-blur-xl shadow-[0px_6px_20px_rgba(171,190,209,0.3)] border-b border-[#ABBED1]/30"
        }`}
      >
        <div className="max-w-[1440px] mx-auto px-6 sm:px-10 h-[88px] flex items-center justify-between">

          {/* ── Logo ── */}
          <Link
            href="/"
            className="flex items-center gap-3.5 group shrink-0"
            id="nav-logo"
          >
            <div className="w-12 h-12 rounded-2xl overflow-hidden shrink-0 shadow-[0px_4px_12px_rgba(0,0,0,0.25)] border border-white/10 group-hover:scale-105 group-hover:border-[#0671E0]/50 transition-all duration-300">
              <Image
                src="/images/logo.jpg"
                alt="DOLORES COFFEE Logo"
                width={48}
                height={48}
                className="w-full h-full object-cover"
                priority
              />
            </div>
            <div className="flex flex-col leading-none">
              <span className={`font-bold text-xl tracking-[0.1em] transition-colors duration-500 font-serif ${
                isDarkHeader ? "text-white group-hover:text-[#38bdf8]" : "text-[#18191F] group-hover:text-[#0671E0]"
              }`}>
                DOLORES
              </span>
              <span className={`font-medium text-[11px] tracking-[0.24em] uppercase mt-1 transition-colors duration-500 ${
                isDarkHeader ? "text-white/75" : "text-[#89939E]"
              }`}>
                COFFEE
              </span>
            </div>
          </Link>

          {/* ── Desktop Nav ── */}
          <div className="hidden md:flex items-center gap-1.5 lg:gap-2.5">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className={`text-[15px] font-semibold tracking-wide transition-all duration-300 px-4 py-2 rounded-full relative group ${
                  isDarkHeader
                    ? "text-white/85 hover:text-white hover:bg-white/10"
                    : "text-[#4D4D4D] hover:text-[#0671E0] hover:bg-[#0671E0]/8"
                }`}
                id={`nav-${item.name.toLowerCase()}`}
              >
                {item.name}
              </Link>
            ))}
          </div>

          {/* ── Desktop CTA ── */}
          <div className="hidden md:flex items-center gap-3.5">
            <Link
              href="/login"
              id="nav-login-btn"
              className={`flex items-center gap-2 text-[15px] font-semibold px-6 py-2.5 transition-all duration-300 rounded-full ${
                isDarkHeader
                  ? "text-white border border-white/25 bg-white/5 hover:bg-white/15 hover:border-white/60 shadow-sm"
                  : "text-[#18191F] border border-[#ABBED1]/60 bg-transparent hover:bg-[#F5F7FA] hover:border-[#0671E0] hover:text-[#0671E0] shadow-sm"
              }`}
            >
              <User size={15} />
              <span>Login</span>
            </Link>
            <Link
              href="/login"
              id="nav-getstarted-btn"
              className="text-[15px] font-semibold text-white bg-gradient-to-r from-[#0671E0] to-[#005bbd] hover:from-[#0557B0] hover:to-[#004a9e] px-7 py-2.5 rounded-full transition-all duration-300 shadow-[0_4px_16px_rgba(6,113,224,0.35)] hover:shadow-[0_6px_22px_rgba(6,113,224,0.48)] hover:-translate-y-0.5 active:translate-y-0"
            >
              Get Started
            </Link>
          </div>

          {/* ── Mobile hamburger ── */}
          <button
            className={`md:hidden p-2.5 rounded-xl transition-colors duration-300 ${
              isDarkHeader ? "text-white hover:bg-white/10" : "text-[#263238] hover:bg-gray-100"
            }`}
            onClick={toggleMenu}
            aria-label="Toggle menu"
            aria-expanded={menuOpen}
            id="nav-mobile-menu-btn"
          >
            <span className={`transition-all duration-200 ${menuOpen ? "opacity-0 scale-75" : "opacity-100 scale-100"} absolute`}>
              <Menu size={24} />
            </span>
            <span className={`transition-all duration-200 ${menuOpen ? "opacity-100 scale-100" : "opacity-0 scale-75"} ${menuOpen ? "relative" : "absolute"}`}>
              <X size={24} />
            </span>
          </button>
        </div>
      </nav>

      {/* ── Mobile Menu Overlay ── */}
      <div
        className={`fixed inset-0 z-40 bg-white transition-all duration-300 md:hidden flex flex-col pt-[88px] ${
          menuOpen
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none"
        }`}
      >
        <div className="flex flex-col px-6 py-6 gap-1 border-b border-[#F5F7FA]">
          {NAV_ITEMS.map((item, i) => (
            <Link
              key={item.name}
              href={item.href}
              onClick={closeMenu}
              className={`flex items-center justify-between text-base font-semibold text-[#263238] hover:text-[#0671E0] py-4 border-b border-[#F5F7FA] last:border-0 transition-all duration-200 ${
                menuOpen ? "translate-x-0 opacity-100" : "translate-x-4 opacity-0"
              }`}
              style={{ transitionDelay: menuOpen ? `${i * 50}ms` : "0ms" }}
            >
              {item.name}
              <span className="text-[#ABBED1] text-lg">›</span>
            </Link>
          ))}
        </div>
        <div className="flex flex-col gap-3 px-6 py-6">
          <Link
            href="/login"
            onClick={closeMenu}
            className="text-center py-3.5 border border-[#ABBED1] text-[#263238] rounded-full font-semibold text-sm hover:bg-[#F5F7FA] transition-all"
          >
            Login
          </Link>
          <Link
            href="/login"
            onClick={closeMenu}
            className="text-center py-3.5 bg-gradient-to-r from-[#0671E0] to-[#005bbd] text-white rounded-full font-semibold text-sm shadow-[0_4px_14px_rgba(6,113,224,0.35)] transition-all"
          >
            Get Started
          </Link>
        </div>
      </div>
    </>
  );
}
