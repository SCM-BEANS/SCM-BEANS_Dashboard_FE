"use client";

import Link from "next/link";

// Static data outside component — never re-created
const SPECS = [
  { spec: "Supported Protocols", val: "I2C, UART, MQTT" },
  { spec: "Polling Interval",    val: "100ms real-time" },
  { spec: "Data Retention",      val: "90 days (extendable)" },
  { spec: "API Access",          val: "REST + WebSocket" },
  { spec: "Uptime SLA",          val: "99.9% guaranteed" },
  { spec: "Security",            val: "TLS 1.3, RBAC, Audit Log" },
] as const;

const PLATFORM_LINKS  = ["Dashboard", "Analytics", "Fleet Management", "Alerts", "API Access"] as const;
const DEV_LINKS       = ["Documentation", "REST API", "WebSocket API", "SDKs", "Status Page"] as const;
const COMPANY_LINKS   = ["About", "Blog", "Careers", "Privacy Policy", "Terms of Service"] as const;
const LEGAL_LINKS     = ["Privacy", "Terms", "Security"] as const;

export function CtaSection() {
  return (
    <section id="cta" className="bg-[#111] py-24 md:py-32">
      <div className="max-w-[1200px] mx-auto px-6 md:px-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">

          {/* Left — Copy */}
          <div className="lg:col-span-7">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-8 h-px bg-white/30" />
              <span className="text-[11px] font-semibold tracking-[0.2em] text-white/50 uppercase">
                Get Started Today
              </span>
            </div>

            <h2 className="text-3xl md:text-[2.75rem] font-bold text-white leading-tight tracking-tight mb-6">
              Ready to Connect
              <br />
              Your Coffee Fleet?
            </h2>

            <p className="text-white/60 text-base leading-relaxed font-light mb-10 max-w-[460px]">
              Get started and see your machines online within the hour.
              Our engineers will guide you through the full onboarding — no
              commitment required.
            </p>

            <div className="flex flex-col sm:flex-row gap-3">
              <a
                href="#documentation"
                id="documentation"
                className="inline-flex items-center justify-center gap-2 text-white text-sm font-semibold px-7 py-3.5 border border-white/20 hover:border-white/50 transition-colors duration-200"
              >
                Technical Documentation
              </a>
            </div>
          </div>

          {/* Right — Spec Card */}
          <div className="lg:col-span-5">
            <div className="border border-white/10 p-8">
              <div className="text-[10px] uppercase tracking-[0.2em] text-white/40 font-mono mb-6">
                Platform Specifications
              </div>
              <div className="space-y-0">
                {SPECS.map(({ spec, val }) => (
                  <div
                    key={spec}
                    className="flex items-baseline justify-between gap-4 py-3 border-b border-white/8 last:border-0"
                  >
                    <span className="text-xs text-white/40 font-mono uppercase tracking-wider">{spec}</span>
                    <span className="text-xs font-semibold text-white text-right">{val}</span>
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
    <footer className="bg-white border-t border-[#111]/10 py-14">
      <div className="max-w-[1200px] mx-auto px-6 md:px-10">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-10 mb-12">

          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-6 h-6 bg-[#111] flex items-center justify-center">
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
                  <rect x="0.5" y="0.5" width="4" height="4" fill="white" />
                  <rect x="5.5" y="0.5" width="4" height="4" fill="white" />
                  <rect x="0.5" y="5.5" width="4" height="4" fill="white" />
                  <rect x="5.5" y="5.5" width="4" height="4" stroke="white" strokeWidth="0.8" />
                </svg>
              </div>
              <span className="text-sm font-semibold text-[#111] uppercase tracking-tight">
                Deer Coffee IoT
              </span>
            </div>
            <p className="text-xs text-[#888] leading-relaxed font-light">
              Industrial-grade cloud infrastructure for professional coffee operations.
            </p>
            <div className="mt-4 text-[10px] text-[#bbb] font-mono uppercase tracking-widest">
              SCM-BEANS™ v2.1
            </div>
          </div>

          {/* Platform */}
          <div>
            <div className="text-[10px] uppercase tracking-[0.2em] text-[#aaa] font-mono mb-4">Platform</div>
            <ul className="space-y-2">
              {PLATFORM_LINKS.map((l) => (
                <li key={l}>
                  <a href="#" className="text-xs text-[#666] hover:text-[#111] transition-colors duration-150">{l}</a>
                </li>
              ))}
            </ul>
          </div>

          {/* Developers */}
          <div>
            <div className="text-[10px] uppercase tracking-[0.2em] text-[#aaa] font-mono mb-4">Developers</div>
            <ul className="space-y-2">
              {DEV_LINKS.map((l) => (
                <li key={l}>
                  <a href="#" className="text-xs text-[#666] hover:text-[#111] transition-colors duration-150">{l}</a>
                </li>
              ))}
            </ul>
          </div>

          {/* Company */}
          <div>
            <div className="text-[10px] uppercase tracking-[0.2em] text-[#aaa] font-mono mb-4">Company</div>
            <ul className="space-y-2">
              {COMPANY_LINKS.map((l) => (
                <li key={l}>
                  <a href="#" className="text-xs text-[#666] hover:text-[#111] transition-colors duration-150">{l}</a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-[#111]/8 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-[11px] text-[#bbb] font-mono">
            © 2025 Deer Coffee IoT Platform. All rights reserved.
          </p>
          <div className="flex items-center gap-6">
            {LEGAL_LINKS.map((l) => (
              <a key={l} href="#" className="text-[11px] text-[#bbb] hover:text-[#111] font-mono transition-colors duration-150">
                {l}
              </a>
            ))}
          </div>
          <Link
            href="/login"
            className="text-[11px] font-semibold text-[#111] border border-[#111]/20 px-4 py-1.5 hover:bg-[#111] hover:text-white transition-colors duration-200 font-mono uppercase tracking-wider"
          >
            Sign In →
          </Link>
        </div>
      </div>
    </footer>
  );
}
