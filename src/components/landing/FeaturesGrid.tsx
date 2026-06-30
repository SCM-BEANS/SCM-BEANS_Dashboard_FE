"use client";

import { useRef, useEffect, memo } from "react";

type FeatureDef = {
  id: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  tag: string;
};

const features: FeatureDef[] = [
  {
    id: "telemetry",
    icon: (
      <svg viewBox="0 0 32 32" className="w-7 h-7" fill="none">
        <rect x="2" y="22" width="4" height="8" stroke="#3C2415" strokeWidth="1.5" />
        <rect x="9" y="16" width="4" height="14" stroke="#3C2415" strokeWidth="1.5" />
        <rect x="16" y="10" width="4" height="20" stroke="#3C2415" strokeWidth="1.5" />
        <rect x="23" y="4" width="4" height="26" stroke="#3C2415" strokeWidth="1.5" />
        <polyline points="4,21 11,15 18,9 25,3" stroke="#B8860B" strokeWidth="1" strokeDasharray="2 2" />
        <circle cx="4" cy="21" r="1.5" fill="#B8860B" />
        <circle cx="11" cy="15" r="1.5" fill="#B8860B" />
        <circle cx="18" cy="9" r="1.5" fill="#B8860B" />
        <circle cx="25" cy="3" r="1.5" fill="#B8860B" />
      </svg>
    ),
    title: "Remote Telemetry & Control",
    description:
      "Stream live sensor data — temperature, pressure, extraction time — from every machine in your fleet. Adjust parameters remotely in real time.",
    tag: "Core",
  },
  {
    id: "alerts",
    icon: (
      <svg viewBox="0 0 32 32" className="w-7 h-7" fill="none">
        <path d="M16 2L4 28h24L16 2z" stroke="#3C2415" strokeWidth="1.5" strokeLinejoin="round" />
        <line x1="16" y1="13" x2="16" y2="20" stroke="#3C2415" strokeWidth="1.5" strokeLinecap="round" />
        <circle cx="16" cy="23.5" r="1" fill="#3C2415" />
        <circle cx="26" cy="7" r="4" fill="#B8860B" />
        <line x1="26" y1="5" x2="26" y2="8" stroke="white" strokeWidth="1.2" strokeLinecap="round" />
        <circle cx="26" cy="9.5" r="0.6" fill="white" />
      </svg>
    ),
    title: "Predictive Maintenance",
    description:
      "Anomaly detection across extraction curves and sensor thresholds triggers predictive alerts — before breakdowns occur.",
    tag: "Predictive",
  },
  {
    id: "hardware",
    icon: (
      <svg viewBox="0 0 32 32" className="w-7 h-7" fill="none">
        <rect x="8" y="8" width="16" height="16" stroke="#3C2415" strokeWidth="1.5" />
        <rect x="11" y="11" width="10" height="10" fill="#B8860B" fillOpacity="0.1" stroke="#3C2415" strokeWidth="1" />
        <line x1="10" y1="8" x2="10" y2="4" stroke="#3C2415" strokeWidth="1.5" />
        <line x1="14" y1="8" x2="14" y2="4" stroke="#3C2415" strokeWidth="1.5" />
        <line x1="18" y1="8" x2="18" y2="4" stroke="#3C2415" strokeWidth="1.5" />
        <line x1="22" y1="8" x2="22" y2="4" stroke="#3C2415" strokeWidth="1.5" />
        <line x1="10" y1="24" x2="10" y2="28" stroke="#3C2415" strokeWidth="1.5" />
        <line x1="14" y1="24" x2="14" y2="28" stroke="#3C2415" strokeWidth="1.5" />
        <line x1="18" y1="24" x2="18" y2="28" stroke="#3C2415" strokeWidth="1.5" />
        <line x1="22" y1="24" x2="22" y2="28" stroke="#3C2415" strokeWidth="1.5" />
        <line x1="8" y1="10" x2="4" y2="10" stroke="#3C2415" strokeWidth="1.5" />
        <line x1="8" y1="14" x2="4" y2="14" stroke="#3C2415" strokeWidth="1.5" />
        <line x1="24" y1="14" x2="28" y2="14" stroke="#3C2415" strokeWidth="1.5" />
        <line x1="24" y1="18" x2="28" y2="18" stroke="#3C2415" strokeWidth="1.5" />
      </svg>
    ),
    title: "Hardware-Agnostic Setup",
    description:
      "Our SCM adapter board integrates with legacy and modern espresso machines via I2C/UART bridges. No proprietary hardware required.",
    tag: "Plug & Play",
  },
  {
    id: "analytics",
    icon: (
      <svg viewBox="0 0 32 32" className="w-7 h-7" fill="none">
        <circle cx="16" cy="16" r="12" stroke="#3C2415" strokeWidth="1.5" />
        <path d="M16 16 L16 4 A12 12 0 0 1 26.4 22 Z" fill="#B8860B" fillOpacity="0.15" stroke="#3C2415" strokeWidth="1" />
        <path d="M16 16 L26.4 22 A12 12 0 0 1 5.6 22 Z" fill="#B8860B" fillOpacity="0.08" stroke="#3C2415" strokeWidth="1" />
        <circle cx="16" cy="16" r="2" fill="#B8860B" />
      </svg>
    ),
    title: "Cloud Analytics",
    description:
      "Aggregate telemetry across all locations into unified dashboards. Track shift-based usage patterns and export raw data for BI tools.",
    tag: "Insights",
  },
];

const FeatureCard = memo(function FeatureCard({
  feature,
  index,
}: {
  feature: FeatureDef;
  index: number;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.style.opacity = "1";
          el.style.transform = "translateY(0)";
          obs.disconnect();
        }
      },
      { threshold: 0.15 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className="group p-8 bg-white hover:shadow-[0_8px_32px_-8px_rgba(60,36,21,0.1)] cursor-default transition-shadow duration-500"
      style={{
        opacity: 0,
        transform: "translateY(24px)",
        transition: `opacity 0.6s ease ${index * 0.1}s, transform 0.6s ease ${index * 0.1}s, box-shadow 0.5s ease`,
      }}
    >
      <div className="flex items-start justify-between mb-6">
        <div className="text-[10px] font-mono text-coffee-bronze/40 uppercase tracking-[0.2em]">
          0{index + 1}
        </div>
        <span className="text-[9px] uppercase tracking-[0.15em] text-coffee-mocha/60 border border-coffee-bronze/20 px-2.5 py-0.5 font-mono rounded-sm">
          {feature.tag}
        </span>
      </div>

      <div className="mb-5 w-12 h-12 border border-coffee-bronze/15 flex items-center justify-center bg-coffee-cream group-hover:border-coffee-bronze/40 transition-colors duration-300 rounded-sm">
        {feature.icon}
      </div>

      <h3 className="text-base font-semibold text-coffee-roast tracking-tight mb-3">
        {feature.title}
      </h3>

      <p className="text-sm text-coffee-mocha/70 leading-relaxed font-light">
        {feature.description}
      </p>

      {/* Hover underline — bronze */}
      <div className="mt-6 h-[1.5px] w-0 bg-coffee-bronze group-hover:w-full transition-[width] duration-500" />
    </div>
  );
});

export function FeaturesGrid() {
  return (
    <section id="features" className="bg-coffee-cream py-24 md:py-32 relative landing-grain">
      <div className="max-w-[1200px] mx-auto px-6 md:px-10 relative z-10">
        {/* Section Header */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-16">
          <div className="lg:col-span-4">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-px bg-coffee-bronze" />
              <span className="text-[11px] font-semibold tracking-[0.2em] text-coffee-mocha/60 uppercase">
                Platform Capabilities
              </span>
            </div>
            <h2 className="font-serif text-3xl md:text-4xl font-bold text-coffee-roast leading-tight tracking-tight" style={{ textWrap: "balance" }}>
              Built for
              <br />
              <span className="text-coffee-bronze">Industrial Scale</span>
            </h2>
          </div>
          <div className="lg:col-span-5 lg:col-start-7 flex items-end">
            <p className="text-coffee-mocha/70 text-base leading-relaxed font-light">
              Every feature is engineered for the demanding requirements of commercial
              coffee operations — from a single boutique café to a nationwide chain
              of thousands of machines.
            </p>
          </div>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 border border-coffee-roast/10 rounded-sm overflow-hidden">
          {features.map((f, i) => (
            <div
              key={f.id}
              className={[
                i % 2 === 0 && i < features.length - 1 ? "sm:border-r border-coffee-roast/10" : "",
                i < 2 ? "sm:border-b border-coffee-roast/10 lg:border-b-0" : "",
                i < 3 ? "lg:border-r border-coffee-roast/10" : "",
              ].join(" ")}
            >
              <FeatureCard feature={f} index={i} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
