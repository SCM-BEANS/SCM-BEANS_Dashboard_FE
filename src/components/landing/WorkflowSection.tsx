"use client";

import { useRef, useEffect } from "react";

const STEPS = [
  {
    num: "01",
    title: "Connect the Hardware",
    body: "Mount the SCM adapter onto your existing machine via the I2C/UART bridge. The device self-registers on the secure cloud endpoint within 60 seconds — no firmware expertise required.",
    note: "Compatible with 200+ commercial machine models",
  },
  {
    num: "02",
    title: "Sync to the Cloud",
    body: "Telemetry streams are encrypted via TLS 1.3 and ingested into our time-series infrastructure at 100ms resolution. Data is indexed and served via REST and WebSocket APIs.",
    note: "99.9% uptime SLA — data is never lost",
  },
  {
    num: "03",
    title: "Manage Your Fleet",
    body: "Access the unified dashboard from any browser. Monitor telemetry, respond to alerts, schedule maintenance, and download analytics reports — from anywhere in the world.",
    note: "Role-based access control for operators, technicians, and owners",
  },
] as const;

export function WorkflowSection() {
  const refs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const observers: IntersectionObserver[] = [];
    refs.current.forEach((el, i) => {
      if (!el) return;
      el.style.opacity = "0";
      el.style.transform = "translateY(24px)";
      const obs = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            el.style.transition = `opacity 0.7s ease ${i * 0.15}s, transform 0.7s ease ${i * 0.15}s`;
            el.style.opacity = "1";
            el.style.transform = "translateY(0)";
            obs.disconnect();
          }
        },
        { threshold: 0.2 }
      );
      obs.observe(el);
      observers.push(obs);
    });
    return () => observers.forEach((o) => o.disconnect());
  }, []);

  return (
    <section id="workflow" className="bg-white border-t border-warm-300">
      <div className="em-container py-20 md:py-28">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-16">
          <div>
            <div className="em-overline mb-4">Technical Workflow</div>
            <h2 className="em-heading text-3xl md:text-4xl font-bold">
              From machine to cloud
              <br />in three steps.
            </h2>
          </div>
          <p className="em-body text-sm max-w-[300px] md:text-right">
            Average onboarding time: under five minutes per machine.
          </p>
        </div>

        {/* Steps */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-0 border border-warm-300 rounded-sm overflow-hidden">
          {STEPS.map((step, i) => (
            <div
              key={step.num}
              ref={(el) => { refs.current[i] = el; }}
              className={`p-8 md:p-10 bg-white ${i < 2 ? "md:border-r border-warm-300" : ""} ${i < 2 ? "border-b md:border-b-0 border-warm-300" : ""}`}
            >
              {/* Step number */}
              <div className="font-display text-5xl font-bold text-warm-200 mb-6 leading-none">
                {step.num}
              </div>

              {/* Espresso accent rule */}
              <div className="w-8 h-px bg-espresso mb-6" />

              <h3 className="font-sans text-[17px] font-semibold text-ink mb-3 leading-snug">
                {step.title}
              </h3>
              <p className="text-sm font-sans text-ink-muted leading-relaxed mb-6">
                {step.body}
              </p>

              {/* Note */}
              <div className="flex items-start gap-2 pt-5 border-t border-warm-200">
                <span className="mt-0.5 w-3.5 h-3.5 flex-shrink-0 border border-espresso-300 rounded-full flex items-center justify-center">
                  <span className="w-1.5 h-1.5 bg-espresso rounded-full" />
                </span>
                <span className="text-[11px] font-sans text-ink-subtle leading-relaxed">
                  {step.note}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
