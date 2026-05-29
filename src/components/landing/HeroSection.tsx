"use client";

import { ArrowRight } from "lucide-react";
import { useEffect, useRef } from "react";

// RAF-based animated counter — chỉ chạy khi element visible
function useCountUp(target: number, duration = 1800) {
  const ref = useRef<HTMLSpanElement>(null);
  const hasRun = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasRun.current) {
          hasRun.current = true;
          obs.disconnect();
          let startTime: number | null = null;

          const tick = (now: number) => {
            if (!startTime) startTime = now;
            const elapsed = now - startTime;
            const progress = Math.min(elapsed / duration, 1);
            // easeOut cubic
            const eased = 1 - Math.pow(1 - progress, 3);
            if (el) el.textContent = Math.floor(eased * target).toString();
            if (progress < 1) requestAnimationFrame(tick);
          };

          requestAnimationFrame(tick);
        }
      },
      { threshold: 0.5 }
    );

    obs.observe(el);
    return () => obs.disconnect();
  }, [target, duration]);

  return ref;
}

// Static machine illustration — memoised outside component
const MachineIllustration = () => (
  <div className="relative w-full max-w-[520px] aspect-[4/3]">
    {/* Outer Frame */}
    <div className="absolute inset-0 border border-[#111]/10 bg-[#fafafa]" />

    {/* Top Status Bar */}
    <div className="absolute top-0 left-0 right-0 h-8 bg-[#111] flex items-center px-4 gap-3">
      <div className="flex gap-1.5">
        <div className="w-2 h-2 rounded-full border border-white/30" />
        <div className="w-2 h-2 rounded-full border border-white/30" />
        <div className="w-2 h-2 rounded-full border border-white/30" />
      </div>
      <span className="text-[10px] text-white/60 font-mono tracking-wider ml-2">
        DEER_01 — REMOTE CONTROL CONSOLE
      </span>
      <div className="ml-auto flex items-center gap-2">
        {/* Replaced animate-pulse with CSS animation via inline style for GPU compositing */}
        <div
          className="w-1.5 h-1.5 rounded-full bg-white"
          style={{ animation: "pulse-dot 2s ease-in-out infinite" }}
        />
        <span className="text-[10px] text-white/50 font-mono">LIVE</span>
      </div>
    </div>

    {/* Main Content Area */}
    <div className="absolute top-8 bottom-0 left-0 right-0 grid grid-cols-5">
      {/* Left Panel */}
      <div className="col-span-2 border-r border-[#111]/10 flex flex-col items-center justify-center p-4 gap-3">
        <span className="text-[9px] uppercase tracking-[0.2em] text-[#888] font-mono">Machine A-01</span>
        <svg viewBox="0 0 80 100" className="w-16 h-20" fill="none">
          <rect x="10" y="20" width="60" height="65" rx="2" fill="#111" />
          <rect x="18" y="28" width="44" height="22" fill="#333" />
          <rect x="20" y="30" width="40" height="18" fill="#111" />
          <line x1="23" y1="35" x2="45" y2="35" stroke="#555" strokeWidth="1" />
          <line x1="23" y1="39" x2="38" y2="39" stroke="#555" strokeWidth="1" />
          <line x1="23" y1="43" x2="42" y2="43" stroke="#555" strokeWidth="1" />
          <rect x="24" y="56" width="32" height="8" rx="1" fill="#333" />
          <rect x="30" y="64" width="20" height="4" rx="1" fill="#444" />
          <rect x="32" y="68" width="16" height="3" rx="1" fill="#555" />
          <rect x="6" y="85" width="68" height="8" rx="2" fill="#222" />
          <rect x="14" y="80" width="52" height="5" rx="1" fill="#333" />
          <line x1="65" y1="55" x2="72" y2="68" stroke="#444" strokeWidth="2" />
          <circle cx="72" cy="70" r="2" fill="#444" />
          <circle cx="62" cy="64" r="4" fill="#444" />
          <circle cx="62" cy="64" r="2" fill="#555" />
          <path d="M 14 26 Q 20 20 26 26" stroke="white" strokeWidth="1" fill="none" opacity="0.6" />
          <path d="M 11 23 Q 20 14 29 23" stroke="white" strokeWidth="1" fill="none" opacity="0.3" />
          <circle cx="20" cy="28" r="1.5" fill="white" opacity="0.8" />
        </svg>
        <div className="flex items-center gap-1.5 px-2 py-0.5 border border-[#111]/20 bg-white">
          <div
            className="w-1.5 h-1.5 rounded-full bg-[#111]"
            style={{ animation: "pulse-dot 2s ease-in-out infinite" }}
          />
          <span className="text-[9px] font-mono text-[#111] uppercase">Online</span>
        </div>
        <div className="w-full space-y-1 mt-1">
          {([ ["TEMP","93°C"], ["PRESS","9 bar"], ["SHOTS","42"] ] as const).map(([k, v]) => (
            <div key={k} className="flex justify-between text-[8px] font-mono">
              <span className="text-[#888]">{k}</span>
              <span className="text-[#111]">{v}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Right Panel */}
      <div className="col-span-3 p-3 flex flex-col gap-2">
        <div className="border border-[#111]/8 p-2 bg-white">
          <div className="text-[8px] font-mono text-[#888] uppercase tracking-wider mb-1.5">
            Shot Pressure — 24h
          </div>
          <svg viewBox="0 0 160 40" className="w-full h-8" preserveAspectRatio="none">
            <polyline points="0,30 20,20 40,25 60,10 80,15 100,8 120,18 140,12 160,20" fill="none" stroke="#111" strokeWidth="1.5" />
            <polyline points="0,30 20,20 40,25 60,10 80,15 100,8 120,18 140,12 160,20 160,40 0,40" fill="#111" fillOpacity="0.04" />
            <line x1="0" y1="10" x2="160" y2="10" stroke="#111" strokeOpacity="0.05" strokeWidth="1" />
            <line x1="0" y1="20" x2="160" y2="20" stroke="#111" strokeOpacity="0.05" strokeWidth="1" />
            <line x1="0" y1="30" x2="160" y2="30" stroke="#111" strokeOpacity="0.05" strokeWidth="1" />
          </svg>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {([ ["Extractions","1,247","this week"], ["Avg. Temp","92.4°C","±0.3°C"], ["Uptime","99.7%","30-day avg"], ["Next Service","12 days","scheduled"] ] as const).map(([label, val, sub]) => (
            <div key={label} className="border border-[#111]/8 p-2 bg-white">
              <div className="text-[7px] font-mono text-[#888] uppercase tracking-wider">{label}</div>
              <div className="text-xs font-bold text-[#111] mt-0.5">{val}</div>
              <div className="text-[7px] text-[#aaa] font-mono">{sub}</div>
            </div>
          ))}
        </div>
        <div className="border border-[#111] p-2 bg-[#111] flex items-center gap-2">
          <div className="w-1 h-8 bg-white/20 flex-shrink-0" />
          <div>
            <div className="text-[8px] font-mono text-white uppercase tracking-wider">Alert</div>
            <div className="text-[9px] text-white/70 font-mono">Descaling due in 3 days</div>
          </div>
        </div>
      </div>
    </div>

    <div className="absolute bottom-3 right-3 text-[8px] font-mono text-[#bbb] tracking-wider">
      SCM-BEANS™ CLOUD v2.1
    </div>
  </div>
);

export function HeroSection() {
  const c1 = useCountUp(3200);
  const c2 = useCountUp(99);
  const c3 = useCountUp(47);

  return (
    <section className="relative min-h-screen flex flex-col justify-center bg-white overflow-hidden pt-16">
      {/* Architectural grid lines — will-change hint for GPU */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true" style={{ willChange: "auto" }}>
        <div className="absolute left-[8.33%] top-0 bottom-0 w-px bg-[#111]/[0.04]" />
        <div className="absolute left-1/2 top-0 bottom-0 w-px bg-[#111]/[0.04]" />
        <div className="absolute right-[8.33%] top-0 bottom-0 w-px bg-[#111]/[0.04]" />
        <div className="absolute left-0 right-0 top-1/3 h-px bg-[#111]/[0.04]" />
        <div className="absolute left-0 right-0 top-2/3 h-px bg-[#111]/[0.04]" />
      </div>

      {/* Keyframe for pulse — defined once, no Tailwind animate-pulse overhead */}
      <style>{`
        @keyframes pulse-dot {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
      `}</style>

      <div className="max-w-[1200px] mx-auto px-6 md:px-10 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center min-h-[calc(100vh-64px)] py-16">

          {/* Left — Copy */}
          <div className="lg:col-span-6 flex flex-col justify-center">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-8 h-px bg-[#111]" />
              <span className="text-[11px] font-semibold tracking-[0.2em] text-[#555] uppercase">
                IoT SaaS Platform — v2.1
              </span>
            </div>

            <h1 className="text-[clamp(2.5rem,5vw,4rem)] font-bold text-[#111] leading-[1.05] tracking-tight mb-6">
              Cloud Integration
              <br />
              <span className="text-[#888]">for Existing</span>
              <br />
              Coffee Fleets
            </h1>

            <p className="text-base md:text-lg text-[#555] leading-relaxed mb-10 max-w-[480px] font-light">
              Retrofit any espresso machine with plug-and-play hardware. Monitor,
              configure, and maintain your entire fleet from a single cloud dashboard
              — no replacement required.
            </p>

            <div className="flex flex-col sm:flex-row gap-3">
              <a
                href="#dashboard"
                className="group inline-flex items-center justify-center gap-2 bg-[#111] text-white text-sm font-semibold px-7 py-3.5 hover:bg-black transition-colors duration-200"
              >
                Explore Dashboard
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-200" />
              </a>
              <a
                href="#workflow"
                className="inline-flex items-center justify-center gap-2 text-[#111] text-sm font-semibold px-7 py-3.5 border border-[#111]/20 hover:border-[#111] transition-colors duration-200"
              >
                See How It Works
              </a>
            </div>

            {/* Stats Row */}
            <div className="flex gap-8 mt-12 pt-8 border-t border-[#111]/8">
              <div>
                <div className="text-2xl font-bold text-[#111] tabular-nums">
                  <span ref={c1}>0</span>+
                </div>
                <div className="text-xs text-[#888] uppercase tracking-widest mt-1">Machines Online</div>
              </div>
              <div className="w-px bg-[#111]/10" />
              <div>
                <div className="text-2xl font-bold text-[#111] tabular-nums">
                  <span ref={c2}>0</span>.9%
                </div>
                <div className="text-xs text-[#888] uppercase tracking-widest mt-1">Uptime SLA</div>
              </div>
              <div className="w-px bg-[#111]/10" />
              <div>
                <div className="text-2xl font-bold text-[#111] tabular-nums">
                  <span ref={c3}>0</span>ms
                </div>
                <div className="text-xs text-[#888] uppercase tracking-widest mt-1">Avg. Latency</div>
              </div>
            </div>
          </div>

          {/* Right — Illustration */}
          <div className="lg:col-span-6 flex items-center justify-center">
            <MachineIllustration />
          </div>

        </div>
      </div>


    </section>
  );
}
