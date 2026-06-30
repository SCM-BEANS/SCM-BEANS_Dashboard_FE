"use client";

import { ArrowRight } from "lucide-react";
import { useEffect, useRef } from "react";
import Image from "next/image";

// RAF-based animated counter — runs only when element is visible
function useCountUp(target: number, duration = 2000) {
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

export function HeroSection() {
  const c1 = useCountUp(3200);
  const c2 = useCountUp(99);
  const c3 = useCountUp(47);

  return (
    <section className="relative min-h-screen flex flex-col justify-center overflow-hidden pt-16 landing-gradient-warm landing-grain">
      {/* Decorative elements */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        {/* Soft curved line decoration */}
        <svg className="absolute top-0 right-0 w-1/2 h-full opacity-[0.04]" viewBox="0 0 600 800" fill="none" preserveAspectRatio="none">
          <path d="M0,200 Q300,100 600,300 T600,600" stroke="#B8860B" strokeWidth="1" fill="none"/>
          <path d="M0,400 Q300,300 600,500 T600,800" stroke="#B8860B" strokeWidth="1" fill="none"/>
          <path d="M0,100 Q300,0 600,200 T600,500" stroke="#3C2415" strokeWidth="0.5" fill="none"/>
        </svg>
        {/* Warm radial glow behind hero image */}
        <div className="absolute top-1/4 right-1/4 w-[500px] h-[500px] rounded-full bg-coffee-bronze/5 blur-3xl" />
      </div>

      {/* Steam animation keyframe */}
      <style>{`
        @keyframes steam-rise {
          0% { opacity: 0; transform: translateY(0) scaleX(1); }
          30% { opacity: 0.15; }
          70% { opacity: 0.08; }
          100% { opacity: 0; transform: translateY(-60px) scaleX(0.6); }
        }
      `}</style>

      <div className="max-w-[1200px] mx-auto px-6 md:px-10 w-full relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center min-h-[calc(100vh-64px)] py-16">

          {/* Left — Copy */}
          <div className="lg:col-span-6 flex flex-col justify-center">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-10 h-px bg-coffee-bronze" />
              <span className="text-[11px] font-semibold tracking-[0.2em] text-coffee-mocha/70 uppercase">
                IoT SaaS Platform — v2.1
              </span>
            </div>

            <h1 className="font-serif text-[clamp(2.8rem,5.5vw,4.5rem)] font-bold text-coffee-roast leading-[1.05] tracking-tight mb-6" style={{ textWrap: "balance" }}>
              Precision in
              <br />
              <span className="text-coffee-bronze">Every Drop</span>
            </h1>

            <p className="text-base md:text-lg text-coffee-mocha/80 leading-relaxed mb-10 max-w-[480px] font-light">
              Master the art of espresso with cloud-connected intelligence.
              Monitor, configure, and optimize your entire coffee fleet from
              a single elegant dashboard.
            </p>

            <div className="flex flex-col sm:flex-row gap-3">
              <a
                href="#dashboard"
                className="group inline-flex items-center justify-center gap-2 bg-coffee-roast text-coffee-cream text-sm font-semibold px-8 py-4 rounded-sm hover:bg-coffee-espresso transition-colors duration-300"
              >
                Explore Dashboard
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-300" />
              </a>
              <a
                href="#workflow"
                className="inline-flex items-center justify-center gap-2 text-coffee-roast text-sm font-semibold px-8 py-4 border border-coffee-roast/20 rounded-sm hover:border-coffee-bronze hover:text-coffee-bronze transition-all duration-300"
              >
                How It Works
              </a>
            </div>

            {/* Stats Row */}
            <div className="flex gap-8 mt-14 pt-8 border-t border-coffee-bronze/15">
              <div>
                <div className="text-2xl font-bold text-coffee-roast" style={{ fontVariantNumeric: "tabular-nums" }}>
                  <span ref={c1}>0</span>+
                </div>
                <div className="text-xs text-coffee-mocha/60 uppercase tracking-widest mt-1">Machines Online</div>
              </div>
              <div className="w-px bg-coffee-bronze/20" />
              <div>
                <div className="text-2xl font-bold text-coffee-roast" style={{ fontVariantNumeric: "tabular-nums" }}>
                  <span ref={c2}>0</span>.9%
                </div>
                <div className="text-xs text-coffee-mocha/60 uppercase tracking-widest mt-1">Uptime SLA</div>
              </div>
              <div className="w-px bg-coffee-bronze/20" />
              <div>
                <div className="text-2xl font-bold text-coffee-roast" style={{ fontVariantNumeric: "tabular-nums" }}>
                  <span ref={c3}>0</span>ms
                </div>
                <div className="text-xs text-coffee-mocha/60 uppercase tracking-widest mt-1">Avg. Latency</div>
              </div>
            </div>
          </div>

          {/* Right — Hero Image + Real-time Teaser */}
          <div className="lg:col-span-6 flex items-center justify-center relative">
            {/* Main image container with float animation */}
            <div
              className="relative w-full max-w-[520px]"
              style={{ animation: "landing-float 6s ease-in-out infinite" }}
            >
              {/* Image with warm shadow */}
              <div className="relative rounded-lg overflow-hidden shadow-[0_32px_80px_-12px_rgba(60,36,21,0.25)]">
                <Image
                  src="/images/hero-espresso.png"
                  alt="Professional espresso machine with steam rising from freshly brewed coffee"
                  width={520}
                  height={390}
                  priority
                  className="w-full h-auto object-cover"
                />
                {/* Warm overlay gradient */}
                <div className="absolute inset-0 bg-gradient-to-t from-coffee-espresso/20 via-transparent to-transparent" />
              </div>

              {/* Real-time Teaser Widget — Glassmorphism */}
              <div className="absolute -bottom-4 -left-4 sm:-left-8 glass-card rounded-lg p-4 shadow-lg">
                <div className="flex items-center gap-2 mb-2">
                  <div
                    className="w-2 h-2 rounded-full bg-coffee-bronze"
                    style={{ animation: "landing-pulse-bronze 2s ease-in-out infinite" }}
                  />
                  <span className="text-[10px] font-mono text-coffee-mocha/70 uppercase tracking-wider">Live Telemetry</span>
                </div>
                <div className="space-y-1.5">
                  {([
                    ["Boiler", "93\u00a0°C"],
                    ["Pressure", "9\u00a0bar"],
                    ["Today", "42 shots"],
                  ] as const).map(([label, val]) => (
                    <div key={label} className="flex justify-between gap-6 text-xs">
                      <span className="text-coffee-mocha/50 font-mono">{label}</span>
                      <span className="text-coffee-roast font-semibold" style={{ fontVariantNumeric: "tabular-nums" }}>{val}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Steam decorative elements */}
              <div className="absolute -top-6 right-1/4 flex gap-3" aria-hidden="true">
                {[0, 0.6, 1.2].map((delay) => (
                  <div
                    key={delay}
                    className="w-1 h-8 rounded-full bg-coffee-steam/30"
                    style={{
                      animation: `steam-rise 3s ease-out infinite`,
                      animationDelay: `${delay}s`,
                    }}
                  />
                ))}
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
