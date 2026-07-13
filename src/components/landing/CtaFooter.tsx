"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";

const SPECS = [
  { spec: "Supported Protocols", val: "I2C, UART, MQTT" },
  { spec: "Polling Interval", val: "100ms real-time" },
  { spec: "Data Retention", val: "90 days (extendable)" },
  { spec: "API Access", val: "REST + WebSocket" },
  { spec: "Uptime SLA", val: "99.9% guaranteed" },
  { spec: "Security", val: "TLS 1.3, RBAC, Audit Log" },
] as const;

const PLATFORM_LINKS = ["Dashboard", "Analytics", "Fleet Management", "Alerts", "API Access"] as const;
const DEV_LINKS = ["Documentation", "REST API", "WebSocket API", "SDKs", "Status Page"] as const;
const COMPANY_LINKS = ["About", "Blog", "Careers", "Privacy Policy", "Terms of Service"] as const;
const LEGAL_LINKS = ["Privacy", "Terms", "Security"] as const;

export function CtaSection() {
  return (
    <section id="cta" className="relative py-24 md:py-32 overflow-hidden landing-gradient-dark">
      {/* Decorative grain */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.04]" aria-hidden="true"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
          backgroundRepeat: "repeat",
          backgroundSize: "256px",
        }}
      />

      <div className="max-w-[1200px] mx-auto px-6 md:px-10 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">

          {/* Left — Copy */}
          <div className="lg:col-span-7">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-10 h-px bg-coffee-bronze/50" />
              <span className="text-[11px] font-semibold tracking-[0.2em] text-coffee-gold/60 uppercase">
                Get Started Today
              </span>
            </div>

            <h2 className="font-serif text-3xl md:text-[2.75rem] font-bold text-coffee-cream leading-tight tracking-tight mb-6" style={{ textWrap: "balance" }}>
              Ready to Connect
              <br />
              <span className="text-coffee-gold">Your Coffee Fleet?</span>
            </h2>

            <p className="text-coffee-cream/50 text-base leading-relaxed font-light mb-10 max-w-[460px]">
              Get started and see your machines online within the hour.
              Our engineers will guide you through the full onboarding — no
              commitment required.
            </p>

            <div className="flex flex-col sm:flex-row gap-3">
              <Link
                href="/login"
                className="group inline-flex items-center justify-center gap-2 bg-coffee-bronze text-coffee-espresso text-sm font-semibold px-8 py-4 rounded-sm hover:bg-coffee-gold transition-colors duration-300"
              >
                Get Started
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-300" />
              </Link>
              <a
                href="#documentation"
                id="documentation"
                className="inline-flex items-center justify-center gap-2 text-coffee-cream/80 text-sm font-semibold px-8 py-4 border border-coffee-cream/15 rounded-sm hover:border-coffee-gold/50 hover:text-coffee-gold transition-all duration-300"
              >
                Technical Documentation
              </a>
            </div>
          </div>

          {/* Right — Spec Card */}
          <div className="lg:col-span-5">
            <div className="border border-coffee-bronze/15 p-8 rounded-sm bg-coffee-espresso/30 backdrop-blur-sm">
              <div className="text-[10px] uppercase tracking-[0.2em] text-coffee-gold/40 font-mono mb-6">
                Platform Specifications
              </div>
              <div className="space-y-0">
                {SPECS.map(({ spec, val }) => (
                  <div
                    key={spec}
                    className="flex items-baseline justify-between gap-4 py-3 border-b border-coffee-cream/5 last:border-0"
                  >
                    <span className="text-xs text-coffee-cream/35 font-mono uppercase tracking-wider">{spec}</span>
                    <span className="text-xs font-semibold text-coffee-gold text-right">{val}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export function LandingFooter() {
  return (
    <footer className="bg-coffee-cream border-t border-coffee-bronze/10 py-14">
      <div className="max-w-[1200px] mx-auto px-6 md:px-10">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-10 mb-12">

          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-7 h-7 bg-coffee-roast rounded-full flex items-center justify-center">
                <svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <path d="M8 2C5.5 2 3.5 4 3.5 6.5C3.5 8 4 9 5 10.5C5.5 11.2 6 12 6 13H10C10 12 10.5 11.2 11 10.5C12 9 12.5 8 12.5 6.5C12.5 4 10.5 2 8 2Z" fill="#D4A847" />
                  <rect x="6" y="13" width="4" height="1" rx="0.5" fill="#D4A847" />
                </svg>
              </div>
              <span className="text-sm font-serif font-bold text-coffee-roast tracking-tight">
                Deer Coffee IoT
              </span>
            </div>
            <p className="text-xs text-coffee-mocha/60 leading-relaxed font-light">
              Industrial-grade cloud infrastructure for professional coffee operations.
            </p>
            <div className="mt-4 text-[10px] text-coffee-mocha/30 font-mono uppercase tracking-widest">
              SCM-BEANS™ v2.1
            </div>
          </div>

          {/* Platform */}
          <div>
            <div className="text-[10px] uppercase tracking-[0.2em] text-coffee-mocha/40 font-mono mb-4">Platform</div>
            <ul className="space-y-2">
              {PLATFORM_LINKS.map((l) => (
                <li key={l}>
                  <a href="#" className="text-xs text-coffee-mocha/60 hover:text-coffee-roast transition-colors duration-200">{l}</a>
                </li>
              ))}
            </ul>
          </div>

          {/* Developers */}
          <div>
            <div className="text-[10px] uppercase tracking-[0.2em] text-coffee-mocha/40 font-mono mb-4">Developers</div>
            <ul className="space-y-2">
              {DEV_LINKS.map((l) => (
                <li key={l}>
                  <a href="#" className="text-xs text-coffee-mocha/60 hover:text-coffee-roast transition-colors duration-200">{l}</a>
                </li>
              ))}
            </ul>
          </div>

          {/* Company */}
          <div>
            <div className="text-[10px] uppercase tracking-[0.2em] text-coffee-mocha/40 font-mono mb-4">Company</div>
            <ul className="space-y-2">
              {COMPANY_LINKS.map((l) => (
                <li key={l}>
                  <a href="#" className="text-xs text-coffee-mocha/60 hover:text-coffee-roast transition-colors duration-200">{l}</a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-coffee-bronze/10 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-[11px] text-coffee-mocha/30 font-mono">
            © 2025 Deer Coffee IoT Platform. All rights reserved.
          </p>
          <div className="flex items-center gap-6">
            {LEGAL_LINKS.map((l) => (
              <a key={l} href="#" className="text-[11px] text-coffee-mocha/30 hover:text-coffee-roast font-mono transition-colors duration-200">
                {l}
              </a>
            ))}
          </div>
          <Link
            href="/login"
            className="text-[11px] font-semibold text-coffee-roast border border-coffee-roast/20 px-4 py-1.5 rounded-sm hover:bg-coffee-roast hover:text-coffee-cream transition-all duration-300 font-mono uppercase tracking-wider"
          >
            Sign In →
          </Link>
        </div>
      </div>
    </footer>
  );
}
