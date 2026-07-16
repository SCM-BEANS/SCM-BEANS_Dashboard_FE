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

export function LandingNav() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const handleScroll = useCallback(() => {
    setScrolled(window.scrollY > 20);
  }, []);

  useEffect(() => {
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  const closeMenu = useCallback(() => setMenuOpen(false), []);
  const toggleMenu = useCallback(() => setMenuOpen((v) => !v), []);

  return (
    <>
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 bg-white ${
          scrolled
            ? "shadow-[0px_4px_8px_rgba(171,190,209,0.4)]"
            : "border-b border-[#ABBED1]/25"
        }`}
      >
        <div className="max-w-[1320px] mx-auto px-4 sm:px-6 h-[72px] flex items-center justify-between">

          {/* ── Logo ── */}
          <Link
            href="/"
            className="flex items-center gap-2.5 group shrink-0"
            id="nav-logo"
          >
            <div className="w-9 h-9 rounded-xl overflow-hidden shrink-0 shadow-[0px_2px_4px_rgba(171,190,209,0.5)] group-hover:scale-105 transition-transform duration-300">
              <Image
                src="/images/logo.jpg"
                alt="DEER COFFEE Logo"
                width={36}
                height={36}
                className="w-full h-full object-cover"
                priority
              />
            </div>
            <div className="flex flex-col leading-none">
              <span className="font-bold text-base tracking-[0.08em] text-[#18191F] group-hover:text-[#0671E0] transition-colors duration-300">
                DEER
              </span>
              <span className="font-light text-[10px] text-[#89939E] tracking-[0.18em] uppercase -mt-0.5">
                COFFEE
              </span>
            </div>
          </Link>

          {/* ── Desktop Nav ── */}
          <div className="hidden md:flex items-center gap-7">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className="text-[#4D4D4D] hover:text-[#18191F] text-sm font-medium tracking-wide transition-colors duration-200 relative group py-1"
                id={`nav-${item.name.toLowerCase()}`}
              >
                {item.name}
                <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-[#0671E0] transition-all duration-300 group-hover:w-full rounded-full" />
              </Link>
            ))}
          </div>

          {/* ── Desktop CTA ── */}
          <div className="hidden md:flex items-center gap-3">
            <Link
              href="/login"
              id="nav-login-btn"
              className="flex items-center gap-1.5 text-sm font-semibold text-[#263238] border border-[#ABBED1] px-4 py-2 hover:bg-[#F5F7FA] hover:border-[#263238] transition-all duration-200 rounded-[4px]"
            >
              <User size={13} />
              Login
            </Link>
            <Link
              href="/login"
              id="nav-getstarted-btn"
              className="text-sm font-semibold text-white bg-[#0671E0] px-4 py-2 rounded-[4px] hover:bg-[#0557B0] transition-all duration-200 shadow-[0px_2px_4px_rgba(171,190,209,0.5)] hover:shadow-[0px_4px_8px_rgba(6,113,224,0.3)] hover:-translate-y-px"
            >
              Get Started
            </Link>
          </div>

          {/* ── Mobile hamburger ── */}
          <button
            className="md:hidden p-2 text-[#263238] transition-colors"
            onClick={toggleMenu}
            aria-label="Toggle menu"
            aria-expanded={menuOpen}
            id="nav-mobile-menu-btn"
          >
            <span className={`transition-all duration-200 ${menuOpen ? "opacity-0 scale-75" : "opacity-100 scale-100"} absolute`}>
              <Menu size={22} />
            </span>
            <span className={`transition-all duration-200 ${menuOpen ? "opacity-100 scale-100" : "opacity-0 scale-75"} ${menuOpen ? "relative" : "absolute"}`}>
              <X size={22} />
            </span>
          </button>
        </div>
      </nav>

      {/* ── Mobile Menu Overlay ── */}
      <div
        className={`fixed inset-0 z-40 bg-white transition-all duration-300 md:hidden flex flex-col pt-[72px] ${
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
            className="text-center py-3.5 border border-[#ABBED1] text-[#263238] rounded-[4px] font-semibold text-sm hover:bg-[#F5F7FA] transition-all"
          >
            Login
          </Link>
          <Link
            href="/login"
            onClick={closeMenu}
            className="text-center py-3.5 bg-[#0671E0] text-white rounded-[4px] font-semibold text-sm hover:bg-[#0557B0] transition-all shadow-[0px_4px_8px_rgba(6,113,224,0.25)]"
          >
            Get Started
          </Link>
        </div>
      </div>
    </>
  );
}
