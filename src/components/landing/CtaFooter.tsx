"use client";

import Link from "next/link";
import { ArrowRight, Coffee } from "lucide-react";

const FOOTER_COLS = [
  {
    title: "Platform",
    links: ["Dashboard", "Telemetry API", "Analytics", "Fleet Management", "Alerts"],
  },
  {
    title: "Developers",
    links: ["Documentation", "REST API", "WebSocket API", "SDKs", "Status Page"],
  },
  {
    title: "Company",
    links: ["About", "Blog", "Careers", "Privacy Policy", "Terms of Service"],
  },
] as const;

// ── CTA Section ───────────────────────────────────────────────────────────────
export function CtaSection() {
  return (
    <section id="cta" className="bg-white border-t border-warm-300">
      <div className="em-container py-20 md:py-28">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Left */}
          <div>
            <div className="em-overline mb-6">Get Started</div>
            <h2 className="em-heading text-3xl md:text-[2.8rem] font-bold leading-tight mb-6">
              Ready to connect
              <br />your coffee fleet?
            </h2>
            <p className="em-body text-base mb-10 max-w-[440px]">
              Get your first machine online in under five minutes. Our engineers
              will guide you through the onboarding process — no commitment
              required.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Link href="/login" className="em-btn-primary text-sm py-3.5 px-7">
                Start Free Trial
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link href="/login" className="em-btn-secondary text-sm py-3.5 px-7 justify-center">
                Sign In →
              </Link>
            </div>
          </div>

          {/* Right — Specs table */}
          <div className="border border-warm-300 rounded-sm divide-y divide-warm-200 bg-warm-50">
            <div className="px-6 py-3">
              <span className="em-overline">Platform Specifications</span>
            </div>
            {[
              { spec: "Supported Protocols", val: "I2C, UART, MQTT" },
              { spec: "Polling Interval", val: "100ms" },
              { spec: "Data Retention", val: "90 days (extendable)" },
              { spec: "API Access", val: "REST + WebSocket" },
              { spec: "Uptime SLA", val: "99.9% guaranteed" },
              { spec: "Security", val: "TLS 1.3 · RBAC · Audit Log" },
            ].map(({ spec, val }) => (
              <div key={spec} className="flex items-center justify-between px-6 py-3.5 bg-white">
                <span className="text-[12px] font-sans text-ink-muted">{spec}</span>
                <span className="text-[12px] font-sans font-semibold text-ink">{val}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// ── Footer ────────────────────────────────────────────────────────────────────
export function LandingFooter() {
  return (
    <footer className="bg-ink text-white border-t border-ink-soft">
      <div className="em-container py-16">
        {/* Top row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-10 pb-12 border-b border-ink-soft">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2.5 mb-5">
              <svg width="20" height="22" viewBox="0 0 16 18" fill="none">
                <ellipse cx="8" cy="9" rx="6.5" ry="8" fill="#8B5E3C" />
                <path d="M8 1 Q10.5 9 8 17" stroke="#5A3A22" strokeWidth="1" fill="none" />
                <path d="M8 1 Q5.5 9 8 17" stroke="#5A3A22" strokeWidth="1" fill="none" />
              </svg>
              <span className="font-display text-sm font-bold text-white uppercase tracking-wide">
                SCM-BEANS
              </span>
            </div>
            <p className="text-[12px] text-warm-600 leading-relaxed font-light mb-5">
              Industrial-grade cloud platform for commercial espresso fleet management.
            </p>
            <div className="text-[10px] font-mono text-warm-700 uppercase tracking-widest">
              v2.1.0 · MIT License
            </div>
          </div>

          {/* Link columns */}
          {FOOTER_COLS.map(({ title, links }) => (
            <div key={title}>
              <div className="text-[10px] font-sans font-semibold uppercase tracking-label text-warm-600 mb-4">
                {title}
              </div>
              <ul className="space-y-2.5">
                {links.map((l) => (
                  <li key={l}>
                    <a
                      href="#"
                      className="text-[12px] font-sans text-warm-700 hover:text-white transition-colors duration-150"
                    >
                      {l}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 pt-8">
          <p className="text-[11px] font-mono text-warm-700">
            © 2025 SCM-BEANS IoT Platform. All rights reserved.
          </p>
          <div className="flex items-center gap-6">
            {["Privacy", "Terms", "Security"].map((l) => (
              <a
                key={l}
                href="#"
                className="text-[11px] font-mono text-warm-700 hover:text-white transition-colors duration-150"
              >
                {l}
              </a>
            ))}
          </div>
          <Link
            href="/login"
            className="group inline-flex items-center gap-2 text-[11px] font-sans font-semibold text-white border border-warm-700 hover:border-white px-4 py-2 rounded-sm transition-colors duration-200 uppercase tracking-wide"
          >
            Sign In
            <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform duration-200" />
          </Link>
        </div>
      </div>
    </footer>
  );
}
