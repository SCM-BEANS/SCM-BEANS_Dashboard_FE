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
            : "bg-[#FDFBF7]/95 backdrop-blur-xl shadow-[0px_6px_20px_rgba(114,28,36,0.06)] border-b border-[#E0E0E0]"
        }`}
      >
        <div className="relative max-w-[1440px] mx-auto px-6 sm:px-10 h-[88px] flex items-center justify-between">
          <Link href="/" className="group flex shrink-0 items-center" id="nav-logo" aria-label="DOLORES COFFEE">
            <div className={`relative overflow-hidden transition-all duration-300 group-hover:scale-105 rounded-2xl p-1.5 ${
              isDarkHeader 
                ? "bg-white/95 shadow-[0_4px_24px_rgba(0,0,0,0.45)] border border-white/20" 
                : "bg-white shadow-[0_4px_16px_rgba(114,28,36,0.08)] border border-[#E0E0E0]"
            }`}>
              <Image
                src="/images/logo.png"
                alt="DOLORES COFFEE"
                width={80}
                height={80}
                priority
                className="h-14 w-14 sm:h-[68px] sm:w-[68px] object-contain rounded-xl"
              />
            </div>
          </Link>

          {/* ── Desktop Nav ── */}
          <div className="hidden md:flex items-center gap-1.5 lg:absolute lg:left-1/2 lg:-translate-x-1/2 lg:gap-2.5">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className={`text-[15px] font-semibold tracking-wide transition-all duration-300 px-4 py-2 rounded-full relative group ${
                  isDarkHeader
                    ? "text-white/85 hover:text-white hover:bg-white/10"
                    : "text-[rgba(0,0,0,0.87)] hover:text-[#721C24] hover:bg-[#721C24]/8"
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
                  : "text-[rgba(0,0,0,0.87)] border border-[#E0E0E0] bg-transparent hover:bg-white hover:border-[#721C24] hover:text-[#721C24] shadow-sm"
              }`}
            >
              <User size={15} />
              <span>Login</span>
            </Link>
            <Link
              href="/login"
              id="nav-getstarted-btn"
              className="text-[15px] font-semibold text-white bg-gradient-to-r from-[#721C24] to-[#5A141A] hover:from-[#5A141A] hover:to-[#420E13] px-7 py-2.5 rounded-full transition-all duration-300 shadow-[0_4px_16px_rgba(114,28,36,0.3)] hover:shadow-[0_6px_22px_rgba(114,28,36,0.45)] hover:-translate-y-0.5 active:translate-y-0"
            >
              Get Started
            </Link>
          </div>

          {/* ── Mobile hamburger ── */}
          <button
            className={`md:hidden p-2.5 rounded-xl transition-colors duration-300 ${
              isDarkHeader ? "text-white hover:bg-white/10" : "text-[#18191F] hover:bg-gray-100"
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
        className={`fixed inset-0 z-40 bg-[#FDFBF7] transition-all duration-300 md:hidden flex flex-col pt-[88px] ${
          menuOpen
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none"
        }`}
      >
        <div className="flex flex-col px-6 py-6 gap-1 border-b border-[#E0E0E0]">
          {NAV_ITEMS.map((item, i) => (
            <Link
              key={item.name}
              href={item.href}
              onClick={closeMenu}
              className={`flex items-center justify-between text-base font-semibold text-[rgba(0,0,0,0.87)] hover:text-[#721C24] py-4 border-b border-[#E0E0E0]/60 last:border-0 transition-all duration-200 ${
                menuOpen ? "translate-x-0 opacity-100" : "translate-x-4 opacity-0"
              }`}
              style={{ transitionDelay: menuOpen ? `${i * 50}ms` : "0ms" }}
            >
              {item.name}
              <span className="text-[#9E9E9E] text-lg">›</span>
            </Link>
          ))}
        </div>
        <div className="flex flex-col gap-3 px-6 py-6">
          <Link
            href="/login"
            onClick={closeMenu}
            className="text-center py-3.5 border border-[#E0E0E0] text-[rgba(0,0,0,0.87)] rounded-full font-semibold text-sm hover:bg-white transition-all"
          >
            Login
          </Link>
          <Link
            href="/login"
            onClick={closeMenu}
            className="text-center py-3.5 bg-gradient-to-r from-[#721C24] to-[#5A141A] text-white rounded-full font-semibold text-sm shadow-[0_4px_14px_rgba(114,28,36,0.3)] transition-all"
          >
            Get Started
          </Link>
        </div>
      </div>
    </>
  );
}
