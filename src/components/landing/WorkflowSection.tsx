"use client";

import { useRef, useEffect, memo } from "react";

const steps = [
  {
    num: "01",
    title: "Hardware Connection",
    subtitle: "Retrofit & Activate",
    description:
      "Mount the SCM adapter module onto your existing espresso machine via the I2C/UART bridge. Power up — the device self-registers on the secure cloud endpoint within 60 seconds.",
    detail: [
      "Supports 200+ machine models",
      "IP-protected hardware enclosure",
      "Self-healing Wi-Fi reconnect",
    ],
    icon: (
      <svg viewBox="0 0 48 48" className="w-10 h-10" fill="none">
        <rect x="8" y="12" width="32" height="24" stroke="#3C2415" strokeWidth="1.5" rx="1" />
        <rect x="13" y="17" width="10" height="8" stroke="#3C2415" strokeWidth="1" fill="#B8860B" fillOpacity="0.08" />
        <line x1="15" y1="12" x2="15" y2="8" stroke="#3C2415" strokeWidth="1.5" />
        <line x1="18" y1="12" x2="18" y2="8" stroke="#3C2415" strokeWidth="1.5" />
        <line x1="21" y1="12" x2="21" y2="8" stroke="#3C2415" strokeWidth="1.5" />
        <line x1="40" y1="20" x2="44" y2="20" stroke="#3C2415" strokeWidth="1.5" />
        <line x1="40" y1="26" x2="44" y2="26" stroke="#3C2415" strokeWidth="1.5" />
        <path d="M30 18 Q36 24 30 30" stroke="#B8860B" strokeWidth="1" strokeDasharray="2 2" fill="none" />
        <path d="M33 16 Q42 24 33 32" stroke="#B8860B" strokeWidth="1" strokeDasharray="2 2" fill="none" opacity="0.4" />
        <circle cx="30" cy="24" r="2" fill="#B8860B" />
      </svg>
    ),
  },
  {
    num: "02",
    title: "Cloud Sync",
    subtitle: "Secure Data Pipeline",
    description:
      "Telemetry streams are encrypted (TLS 1.3) and ingested into our time-series cloud infrastructure at 100ms polling intervals. Available via REST and WebSocket APIs.",
    detail: [
      "TLS 1.3 end-to-end encryption",
      "100ms polling resolution",
      "99.9% uptime SLA",
    ],
    icon: (
      <svg viewBox="0 0 48 48" className="w-10 h-10" fill="none">
        <path d="M14 34 C8 34 6 28 10 25 C10 18 16 14 24 16 C26 12 32 10 36 14 C42 14 44 20 40 24 C44 26 42 34 36 34 Z" stroke="#3C2415" strokeWidth="1.5" />
        <line x1="24" y1="22" x2="24" y2="40" stroke="#3C2415" strokeWidth="1.5" />
        <polyline points="20,36 24,40 28,36" stroke="#3C2415" strokeWidth="1.5" strokeLinejoin="round" />
        <circle cx="18" cy="20" r="1.5" fill="#B8860B" />
        <circle cx="24" cy="22" r="1.5" fill="#B8860B" opacity="0.7" />
        <circle cx="30" cy="24" r="1.5" fill="#B8860B" opacity="0.4" />
      </svg>
    ),
  },
  {
    num: "03",
    title: "Remote Management",
    subtitle: "Full Fleet Control",
    description:
      "Access the unified dashboard from any browser. View real-time telemetry, respond to alerts, schedule maintenance, and download analytics — from anywhere.",
    detail: [
      "Browser-based, zero install",
      "Role-based access control",
      "Full audit log & compliance",
    ],
    icon: (
      <svg viewBox="0 0 48 48" className="w-10 h-10" fill="none">
        <rect x="6" y="8" width="36" height="24" stroke="#3C2415" strokeWidth="1.5" rx="1" />
        <rect x="9" y="11" width="30" height="18" fill="#B8860B" fillOpacity="0.06" stroke="#3C2415" strokeWidth="1" />
        <line x1="12" y1="16" x2="28" y2="16" stroke="#3C2415" strokeWidth="1" opacity="0.4" />
        <line x1="12" y1="20" x2="22" y2="20" stroke="#3C2415" strokeWidth="1" opacity="0.25" />
        <rect x="24" y="20" width="3" height="8" fill="#B8860B" fillOpacity="0.2" stroke="#3C2415" strokeWidth="0.5" />
        <rect x="28" y="17" width="3" height="11" fill="#B8860B" fillOpacity="0.35" stroke="#3C2415" strokeWidth="0.5" />
        <rect x="32" y="22" width="3" height="6" fill="#B8860B" fillOpacity="0.15" stroke="#3C2415" strokeWidth="0.5" />
        <line x1="24" y1="32" x2="24" y2="38" stroke="#3C2415" strokeWidth="1.5" />
        <line x1="18" y1="38" x2="30" y2="38" stroke="#3C2415" strokeWidth="1.5" />
      </svg>
    ),
  },
];

const StepCard = memo(function StepCard({
  step,
  index,
  isLast,
  divRef,
}: {
  step: (typeof steps)[0];
  index: number;
  isLast: boolean;
  divRef: (el: HTMLDivElement | null) => void;
}) {
  return (
    <div
      ref={divRef}
      className={`p-8 lg:p-10 ${!isLast ? "border-b lg:border-b-0 lg:border-r border-coffee-roast/10" : ""}`}
      style={{
        opacity: 0,
        transform: "translateY(20px)",
        transition: `opacity 0.6s ease ${index * 0.15}s, transform 0.6s ease ${index * 0.15}s`,
      }}
    >
      <div className="flex items-start justify-between mb-6">
        <div className="w-14 h-14 border border-coffee-bronze/20 flex items-center justify-center bg-coffee-cream rounded-sm">
          {step.icon}
        </div>
        <span className="text-4xl font-bold text-coffee-bronze/15 font-serif" style={{ fontVariantNumeric: "tabular-nums" }}>
          {step.num}
        </span>
      </div>

      <div className="text-[10px] font-mono uppercase tracking-[0.15em] text-coffee-bronze/60 mb-2">
        {step.subtitle}
      </div>

      <h3 className="text-xl font-bold text-coffee-roast tracking-tight mb-4">
        {step.title}
      </h3>

      <p className="text-sm text-coffee-roast/90 leading-relaxed font-medium mb-6">
        {step.description}
      </p>

      <ul className="space-y-2">
        {step.detail.map((d) => (
          <li key={d} className="flex items-center gap-2.5 text-xs text-coffee-mocha/60">
            <div className="w-3 h-px bg-coffee-bronze/50 flex-shrink-0" />
            {d}
          </li>
        ))}
      </ul>

      {!isLast && (
        <div className="lg:hidden flex justify-center mt-6">
          <svg width="12" height="24" viewBox="0 0 12 24" fill="none" aria-hidden="true">
            <line x1="6" y1="0" x2="6" y2="20" stroke="#B8860B" strokeOpacity="0.3" strokeWidth="1" />
            <polyline points="3,16 6,20 9,16" stroke="#B8860B" strokeOpacity="0.3" strokeWidth="1" />
          </svg>
        </div>
      )}
    </div>
  );
});

export function WorkflowSection() {
  const refs = useRef<(HTMLDivElement | null)[]>([null, null, null]);
  const observers = useRef<IntersectionObserver[]>([]);

  useEffect(() => {
    observers.current.forEach((o) => o.disconnect());
    observers.current = [];

    refs.current.forEach((el) => {
      if (!el) return;
      const obs = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            (entry.target as HTMLElement).style.opacity = "1";
            (entry.target as HTMLElement).style.transform = "translateY(0)";
            obs.disconnect();
          }
        },
        { threshold: 0.2 }
      );
      obs.observe(el);
      observers.current.push(obs);
    });

    return () => observers.current.forEach((o) => o.disconnect());
  }, []);

  return (
    <section id="workflow" className="bg-white py-24 md:py-32 border-t border-coffee-bronze/10">
      <div className="max-w-[1200px] mx-auto px-6 md:px-10">

        <div className="text-center mb-16">
          <div className="flex items-center justify-center gap-3 mb-5">
            <div className="w-10 h-px bg-coffee-bronze" />
            <span className="text-[11px] font-semibold tracking-[0.2em] text-coffee-mocha/60 uppercase">
              Technical Workflow
            </span>
            <div className="w-10 h-px bg-coffee-bronze" />
          </div>
          <h2 className="font-serif text-3xl md:text-4xl font-bold text-coffee-roast tracking-tight mb-4" style={{ textWrap: "balance" }}>
            From Machine to Cloud
            <br />
            <span className="text-coffee-bronze">in Three Steps</span>
          </h2>
          <p className="text-coffee-roast/90 text-base max-w-lg mx-auto font-medium leading-relaxed">
            From physical sensors on the boiler to cloud-based predictive maintenance, 
            understand the data journey of your espresso fleet.
          </p>
        </div>

        <div className="relative">
          {/* Desktop connector line — bronze gradient */}
          <div className="hidden lg:block absolute top-[56px] left-[calc(16.66%+20px)] right-[calc(16.66%+20px)] h-px bg-gradient-to-r from-coffee-bronze/10 via-coffee-bronze/30 to-coffee-bronze/10" />

          <div className="grid grid-cols-1 lg:grid-cols-3 border border-coffee-roast/10 rounded-sm overflow-hidden bg-white">
            {steps.map((step, i) => (
              <StepCard
                key={step.num}
                step={step}
                index={i}
                isLast={i === steps.length - 1}
                divRef={(el) => { refs.current[i] = el; }}
              />
            ))}
          </div>
        </div>

        <div className="mt-8 flex items-center gap-4 justify-center">
          <div className="h-px flex-1 bg-coffee-bronze/10 max-w-[120px]" />
          <p className="text-[11px] text-coffee-mocha/40 font-mono uppercase tracking-widest">
            Average onboarding time: &lt; 5 min per machine
          </p>
          <div className="h-px flex-1 bg-coffee-bronze/10 max-w-[120px]" />
        </div>
      </div>
    </section>
  );
}
