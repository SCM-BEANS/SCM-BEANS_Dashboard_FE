"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useEffect, useRef } from "react";

// ── Machine Illustration SVG ─────────────────────────────────────────────────
function MachineIllustration() {
  return (
    <svg
      viewBox="0 0 560 480"
      className="w-full max-w-[560px] mx-auto"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Drop shadow blur */}
      <ellipse cx="280" cy="455" rx="160" ry="18" fill="#1A1714" opacity="0.08" />

      {/* Machine body */}
      <rect x="100" y="80" width="360" height="340" rx="6" fill="#2D2A26" />
      <rect x="108" y="88" width="344" height="332" rx="4" fill="#1A1714" />

      {/* Top accent line */}
      <rect x="108" y="88" width="344" height="3" rx="1" fill="#8B5E3C" />

      {/* Display panel */}
      <rect x="120" y="104" width="200" height="108" rx="3" fill="#111" stroke="#2D2A26" strokeWidth="1" />
      {/* Display screen glow */}
      <rect x="124" y="108" width="192" height="100" rx="2" fill="#0A0806" />
      {/* Screen content */}
      <text x="136" y="130" fontSize="8" fill="#8B5E3C" fontFamily="monospace" opacity="0.9" fontWeight="600">MACHINE A-01 · LIVE</text>
      <line x1="136" y1="136" x2="304" y2="136" stroke="#2D2A26" strokeWidth="0.5" />
      {/* Temp readout */}
      <text x="136" y="154" fontSize="7" fill="#7C756E" fontFamily="monospace">BOILER TEMP</text>
      <text x="136" y="168" fontSize="16" fill="#E8E4DE" fontFamily="monospace" fontWeight="700">93.4°C</text>
      {/* Pressure readout */}
      <text x="224" y="154" fontSize="7" fill="#7C756E" fontFamily="monospace">PRESSURE</text>
      <text x="224" y="168" fontSize="16" fill="#E8E4DE" fontFamily="monospace" fontWeight="700">9.2<tspan fontSize="10">bar</tspan></text>
      {/* Mini chart line */}
      <polyline points="136,190 150,184 164,188 178,176 192,180 206,170 220,174 234,166 248,170 262,162 276,166 290,158 304,162"
        fill="none" stroke="#8B5E3C" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.8" />
      <polygon points="136,190 150,184 164,188 178,176 192,180 206,170 220,174 234,166 248,170 262,162 276,166 290,158 304,162 304,200 136,200"
        fill="#8B5E3C" fillOpacity="0.08" />

      {/* Knobs panel */}
      <rect x="336" y="104" width="108" height="108" rx="3" fill="#141210" stroke="#2D2A26" strokeWidth="1" />
      {/* Large knob */}
      <circle cx="390" cy="140" r="26" fill="#1A1714" stroke="#2D2A26" strokeWidth="1.5" />
      <circle cx="390" cy="140" r="18" fill="#141210" stroke="#2D2A26" strokeWidth="1" />
      <line x1="390" y1="124" x2="390" y2="132" stroke="#8B5E3C" strokeWidth="2.5" strokeLinecap="round" />
      {/* Small knobs */}
      <circle cx="355" cy="186" r="12" fill="#1A1714" stroke="#2D2A26" strokeWidth="1" />
      <circle cx="355" cy="186" r="7" fill="#141210" />
      <line x1="355" y1="178" x2="358" y2="183" stroke="#7C756E" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="385" cy="186" r="12" fill="#1A1714" stroke="#2D2A26" strokeWidth="1" />
      <circle cx="385" cy="186" r="7" fill="#141210" />
      <line x1="385" y1="178" x2="385" y2="182" stroke="#7C756E" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="415" cy="186" r="12" fill="#1A1714" stroke="#2D2A26" strokeWidth="1" />
      <circle cx="415" cy="186" r="7" fill="#141210" />
      <line x1="415" y1="178" x2="418" y2="183" stroke="#7C756E" strokeWidth="1.5" strokeLinecap="round" />

      {/* Status LEDs */}
      <circle cx="340" cy="118" r="3.5" fill="#22c55e" />
      <circle cx="352" cy="118" r="3.5" fill="#8B5E3C" />
      <circle cx="364" cy="118" r="3.5" fill="#2D2A26" />

      {/* Group head rail */}
      <rect x="120" y="224" width="324" height="44" rx="4" fill="#1A1714" stroke="#2D2A26" strokeWidth="1" />
      <rect x="128" y="230" width="308" height="32" rx="2" fill="#141210" />

      {/* Group heads × 2 */}
      <ellipse cx="210" cy="268" rx="52" ry="14" fill="#1A1714" stroke="#2D2A26" strokeWidth="1" />
      <rect x="168" y="268" width="84" height="52" rx="3" fill="#1A1714" stroke="#2D2A26" strokeWidth="1" />
      <ellipse cx="210" cy="320" rx="46" ry="10" fill="#111" stroke="#1A1714" strokeWidth="0.5" />
      {/* Portafilter spouts */}
      <rect x="196" y="320" width="9" height="36" rx="1" fill="#0E0C0A" />
      <rect x="215" y="320" width="9" height="36" rx="1" fill="#0E0C0A" />
      {/* Espresso drops */}
      <circle cx="200" cy="362" r="2.5" fill="#8B5E3C" opacity="0.5" />
      <circle cx="220" cy="366" r="2" fill="#714A2D" opacity="0.4" />
      <circle cx="210" cy="372" r="3" fill="#8B5E3C" opacity="0.35" />

      <ellipse cx="370" cy="268" rx="52" ry="14" fill="#1A1714" stroke="#2D2A26" strokeWidth="1" />
      <rect x="328" y="268" width="84" height="52" rx="3" fill="#1A1714" stroke="#2D2A26" strokeWidth="1" />
      <ellipse cx="370" cy="320" rx="46" ry="10" fill="#111" stroke="#1A1714" strokeWidth="0.5" />
      <rect x="356" y="320" width="9" height="36" rx="1" fill="#0E0C0A" />
      <rect x="375" y="320" width="9" height="36" rx="1" fill="#0E0C0A" />

      {/* Drip tray */}
      <rect x="100" y="392" width="360" height="42" rx="5" fill="#1A1714" stroke="#2D2A26" strokeWidth="1" />
      <rect x="112" y="399" width="336" height="30" rx="2" fill="#111" />
      {/* Tray grill lines */}
      {Array.from({ length: 20 }, (_, i) => 124 + i * 16).map((x) => (
        <line key={x} x1={x} y1="399" x2={x} y2="429" stroke="#1A1714" strokeWidth="1" />
      ))}

      {/* Steam wand */}
      <line x1="460" y1="170" x2="490" y2="285" stroke="#2D2A26" strokeWidth="6" strokeLinecap="round" />
      <line x1="490" y1="285" x2="476" y2="335" stroke="#2D2A26" strokeWidth="5" strokeLinecap="round" />
      <circle cx="476" cy="338" r="7" fill="#1A1714" stroke="#2D2A26" strokeWidth="1" />
      {/* Steam particles */}
      <circle cx="475" cy="348" r="1.5" fill="#BDB6AD" opacity="0.3" />
      <circle cx="472" cy="356" r="1" fill="#BDB6AD" opacity="0.2" />
      <circle cx="478" cy="353" r="1.2" fill="#BDB6AD" opacity="0.2" />

      {/* Water inlet pipe */}
      <rect x="88" y="200" width="14" height="60" rx="3" fill="#1A1714" stroke="#2D2A26" strokeWidth="1" />
      <circle cx="95" cy="196" r="6" fill="#1A1714" stroke="#2D2A26" strokeWidth="1" />

      {/* Machine feet */}
      <rect x="112" y="432" width="48" height="10" rx="5" fill="#111" />
      <rect x="220" y="432" width="120" height="10" rx="5" fill="#111" />
      <rect x="400" y="432" width="48" height="10" rx="5" fill="#111" />
    </svg>
  );
}

// ── Live Telemetry Ticker (subtle) ───────────────────────────────────────────
function TelemetryTicker() {
  const values = [
    { label: "Boiler", value: "93.4°C", dot: "bg-green-500" },
    { label: "Pressure", value: "9.2 bar", dot: "bg-espresso" },
    { label: "Flow", value: "2.1 ml/s", dot: "bg-blue-500" },
    { label: "Shots Today", value: "342", dot: "bg-warm-500" },
    { label: "Uptime", value: "99.7%", dot: "bg-green-500" },
  ];

  return (
    <div className="flex items-center gap-8 text-[11px] font-mono text-ink-muted border-t border-warm-300 pt-6">
      {values.map(({ label, value, dot }) => (
        <div key={label} className="flex items-center gap-2">
          <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${dot}`} />
          <span className="text-ink-subtle uppercase tracking-label">{label}</span>
          <span className="text-ink font-semibold">{value}</span>
        </div>
      ))}
    </div>
  );
}

// ── Fade-in on mount ─────────────────────────────────────────────────────────
function FadeIn({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.opacity = "0";
    el.style.transform = "translateY(20px)";
    const timer = setTimeout(() => {
      el.style.transition = "opacity 0.8s ease, transform 0.8s ease";
      el.style.opacity = "1";
      el.style.transform = "translateY(0)";
    }, delay);
    return () => clearTimeout(timer);
  }, [delay]);

  return <div ref={ref}>{children}</div>;
}

// ── Hero Section ─────────────────────────────────────────────────────────────
export function HeroSection() {
  return (
    <section className="relative bg-warm-50 pt-16 overflow-hidden em-divider">
      {/* Very subtle warm grain texture via SVG filter */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.015]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
          backgroundSize: "200px 200px",
        }}
      />

      <div className="em-container">
        {/* ── Top label ── */}
        <FadeIn delay={0}>
          <div className="pt-16 md:pt-24 text-center mb-10">
            <span className="em-overline">
              Industrial IoT Platform for Espresso — v2.1
            </span>
          </div>
        </FadeIn>

        {/* ── Headline ── */}
        <FadeIn delay={120}>
          <h1 className="em-heading text-center text-[clamp(3rem,6vw,5.5rem)] font-bold mb-6 mx-auto max-w-[800px]">
            Precision at
            <br />
            <em className="not-italic text-espresso">Every Pour.</em>
          </h1>
        </FadeIn>

        {/* ── Subtext ── */}
        <FadeIn delay={240}>
          <p className="em-body text-center text-base md:text-lg max-w-[500px] mx-auto mb-10">
            SCM-BEANS connects your commercial espresso fleet to a unified
            cloud platform. Monitor thermodynamics, track inventory, and
            predict failures — in real time.
          </p>
        </FadeIn>

        {/* ── CTA Buttons ── */}
        <FadeIn delay={360}>
          <div className="flex flex-col sm:flex-row gap-3 justify-center mb-16">
            <Link href="/login" className="em-btn-primary text-sm py-3 px-7">
              Start Free Trial
              <ArrowRight className="w-4 h-4" />
            </Link>
            <a href="#workflow" className="em-btn-secondary text-sm py-3 px-7 justify-center">
              See How It Works
            </a>
          </div>
        </FadeIn>

        {/* ── Machine Illustration ── */}
        <FadeIn delay={200}>
          <div className="relative">
            {/* Subtle warm glow beneath machine */}
            <div
              className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[480px] h-[80px] blur-3xl pointer-events-none"
              style={{ background: "radial-gradient(ellipse, rgba(139,94,60,0.12) 0%, transparent 70%)" }}
            />
            <MachineIllustration />
          </div>
        </FadeIn>

        {/* ── Telemetry ticker ── */}
        <FadeIn delay={500}>
          <div className="pb-10 overflow-x-auto">
            <TelemetryTicker />
          </div>
        </FadeIn>
      </div>
    </section>
  );
}
