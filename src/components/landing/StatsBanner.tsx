"use client";

/** Full-width editorial brand statement — replaces the old StatsBanner */
export function PhilosophyBand() {
  return (
    <section className="bg-white em-divider border-t border-warm-300">
      <div className="em-container py-20 md:py-28">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10 md:gap-16 items-center">
          {/* Left — thin accent rule + overline */}
          <div className="md:col-span-4 flex items-center gap-5">
            <div className="w-12 h-px bg-espresso flex-shrink-0" />
            <span className="em-overline tracking-wide">Our Philosophy</span>
          </div>

          {/* Right — editorial statement */}
          <blockquote className="md:col-span-8">
            <p className="font-display text-[clamp(1.4rem,2.5vw,2rem)] text-ink font-semibold leading-snug tracking-tight">
              &ldquo;The best espresso is the product of discipline — consistent
              pressure, precise temperature, and unwavering attention to every
              variable. We built SCM-BEANS so operators can achieve that
              discipline across an entire fleet, automatically.&rdquo;
            </p>
          </blockquote>
        </div>

        {/* Bottom stats row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-0 mt-16 pt-10 border-t border-warm-200">
          {[
            { num: "200+", label: "Machine models supported" },
            { num: "100ms", label: "Telemetry polling rate" },
            { num: "99.9%", label: "Platform uptime SLA" },
            { num: "TLS 1.3", label: "End-to-end encryption" },
          ].map(({ num, label }, i) => (
            <div
              key={num}
              className={`px-6 py-5 ${i < 3 ? "border-r border-warm-200" : ""} first:pl-0`}
            >
              <div className="font-display text-3xl font-bold text-ink tracking-tight mb-1">
                {num}
              </div>
              <div className="text-[11px] font-sans text-ink-muted uppercase tracking-label">
                {label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
