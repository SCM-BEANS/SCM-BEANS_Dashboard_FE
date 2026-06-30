"use client";

import { useRef, useEffect } from "react";

// ── Inline SVG illustrations for each feature ────────────────────────────────

function TelemetryIllustration() {
  return (
    <svg viewBox="0 0 480 360" fill="none" className="w-full">
      {/* Card background */}
      <rect width="480" height="360" rx="4" fill="#FAFAF8" />
      <rect width="480" height="360" rx="4" stroke="#E8E4DE" strokeWidth="1" />

      {/* Header */}
      <rect x="0" y="0" width="480" height="44" rx="4" fill="white" />
      <rect x="0" y="44" width="480" height="1" fill="#E8E4DE" />
      <circle cx="24" cy="22" r="4" fill="#E8E4DE" />
      <circle cx="36" cy="22" r="4" fill="#E8E4DE" />
      <circle cx="48" cy="22" r="4" fill="#E8E4DE" />
      <rect x="80" y="14" width="180" height="16" rx="8" fill="#F5F3F0" />
      <circle cx="455" cy="22" r="7" fill="#22c55e" opacity="0.8" />
      <circle cx="455" cy="22" r="3.5" fill="#22c55e" />

      {/* Sidebar */}
      <rect x="0" y="44" width="130" height="316" fill="#F5F3F0" />
      <rect x="130" y="44" width="1" height="316" fill="#E8E4DE" />
      {/* Sidebar items */}
      {["Overview", "Machines", "Analytics", "Alerts", "Maintenance"].map((label, i) => (
        <g key={label}>
          <rect x="10" y={64 + i * 40} width="110" height="28" rx="3"
            fill={i === 0 ? "#8B5E3C" : "transparent"}
          />
          <rect x="18" y={73 + i * 40} width={i === 0 ? 60 : 50 + i * 5} height="10" rx="5"
            fill={i === 0 ? "white" : "#D4CEC7"} opacity={i === 0 ? 0.9 : 0.7}
          />
        </g>
      ))}

      {/* Main content */}
      {/* KPI cards row */}
      {[
        { x: 150, color: "#8B5E3C" },
        { x: 248, color: "#3b82f6" },
        { x: 346, color: "#22c55e" },
      ].map(({ x, color }, i) => (
        <g key={x}>
          <rect x={x} y="60" width="84" height="60" rx="3" fill="white" stroke="#E8E4DE" strokeWidth="1" />
          <rect x={x + 8} y="72" width="32" height="7" rx="3" fill="#E8E4DE" />
          <rect x={x + 8} y="85" width="50" height="14" rx="3" fill={color} opacity="0.15" />
          <rect x={x + 8} y="85" width={28 + i * 4} height="14" rx="3" fill={color} opacity="0.5" />
          <rect x={x + 8} y="104" width="24" height="6" rx="3" fill={color} opacity="0.4" />
        </g>
      ))}

      {/* Large chart area */}
      <rect x="150" y="132" width="316" height="164" rx="3" fill="white" stroke="#E8E4DE" strokeWidth="1" />
      {/* Chart label */}
      <rect x="162" y="144" width="100" height="8" rx="4" fill="#E8E4DE" />
      {/* Grid lines */}
      {[170, 188, 206, 224].map((y) => (
        <line key={y} x1="162" y1={y} x2="454" y2={y} stroke="#F5F3F0" strokeWidth="1" />
      ))}
      {/* Line chart */}
      <polyline
        points="162,228 185,212 208,218 231,196 254,202 277,184 300,190 323,174 346,180 369,164 392,170 415,156 438,162 454,154"
        fill="none" stroke="#8B5E3C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      />
      <polygon
        points="162,228 185,212 208,218 231,196 254,202 277,184 300,190 323,174 346,180 369,164 392,170 415,156 438,162 454,154 454,242 162,242"
        fill="#8B5E3C" fillOpacity="0.06"
      />
      {/* Tooltip dot */}
      <circle cx="369" cy="164" r="4" fill="#8B5E3C" />
      <circle cx="369" cy="164" r="7" fill="#8B5E3C" fillOpacity="0.15" />
      {/* Tooltip */}
      <rect x="330" y="144" width="68" height="28" rx="3" fill="#1A1714" />
      <rect x="338" y="151" width="28" height="6" rx="3" fill="#7C756E" />
      <rect x="338" y="160" width="40" height="6" rx="3" fill="white" />
      <line x1="369" y1="172" x2="369" y2="144" stroke="#8B5E3C" strokeWidth="1" strokeDasharray="3 2" />

      {/* Bottom table */}
      <rect x="150" y="306" width="316" height="44" rx="3" fill="white" stroke="#E8E4DE" strokeWidth="1" />
      {[0, 1, 2].map((i) => (
        <g key={i}>
          <circle cx={172 + i * 80} cy="328" r="4" fill={["#22c55e", "#22c55e", "#8B5E3C"][i]} />
          <rect x={182 + i * 80} y="322" width="36" height="7" rx="3" fill="#E8E4DE" />
          <rect x={182 + i * 80} y="333" width="28" height="6" rx="3" fill="#F5F3F0" />
        </g>
      ))}
    </svg>
  );
}

function AnalyticsIllustration() {
  const bars = [58, 72, 45, 88, 66, 94, 78, 52, 84, 70, 96, 62];
  return (
    <svg viewBox="0 0 480 360" fill="none" className="w-full">
      <rect width="480" height="360" rx="4" fill="#FAFAF8" stroke="#E8E4DE" strokeWidth="1" />

      {/* Header bar */}
      <rect width="480" height="44" rx="4" fill="white" />
      <rect y="44" width="480" height="1" fill="#E8E4DE" />
      <rect x="16" y="15" width="120" height="14" rx="7" fill="#F5F3F0" />
      <rect x="360" y="14" width="60" height="16" rx="4" fill="#8B5E3C" />
      <rect x="366" y="19" width="48" height="6" rx="3" fill="white" opacity="0.8" />

      {/* Two columns */}
      {/* Left: ring chart */}
      <circle cx="170" cy="210" r="80" fill="none" stroke="#EDE9E4" strokeWidth="24" />
      <circle cx="170" cy="210" r="80" fill="none" stroke="#8B5E3C" strokeWidth="24"
        strokeDasharray="330 170" strokeDashoffset="83" strokeLinecap="round" />
      <circle cx="170" cy="210" r="80" fill="none" stroke="#D9B99A" strokeWidth="24"
        strokeDasharray="130 370" strokeDashoffset="-247" strokeLinecap="round" />
      {/* Center label */}
      <rect x="142" y="198" width="56" height="24" rx="4" fill="white" />
      <rect x="150" y="202" width="40" height="8" rx="4" fill="#8B5E3C" opacity="0.3" />
      <rect x="154" y="212" width="32" height="6" rx="3" fill="#EDE9E4" />

      {/* Legend */}
      {[
        { color: "#8B5E3C", label: "Arabica Blend", y: 300 },
        { color: "#D9B99A", label: "Single Origin", y: 318 },
        { color: "#EDE9E4", label: "Other", y: 336 },
      ].map(({ color, label, y }) => (
        <g key={label}>
          <rect x="80" y={y - 8} width="12" height="12" rx="2" fill={color} />
          <rect x="100" y={y - 7} width="60" height="8" rx="4" fill="#D4CEC7" />
        </g>
      ))}

      {/* Right: bar chart */}
      <rect x="290" y="60" width="174" height="280" rx="3" fill="white" stroke="#E8E4DE" strokeWidth="1" />
      <rect x="302" y="70" width="90" height="8" rx="4" fill="#EDE9E4" />
      <rect x="404" y="70" width="44" height="8" rx="4" fill="#EDE9E4" />
      {/* Bar chart */}
      <g>
        {bars.map((h, i) => (
          <rect
            key={i}
            x={302 + i * 13}
            y={270 - (h / 100) * 150}
            width="10"
            height={(h / 100) * 150}
            rx="2"
            fill="#8B5E3C"
            opacity={0.15 + (i / bars.length) * 0.85}
          />
        ))}
      </g>
      {/* X axis */}
      <line x1="302" y1="272" x2="454" y2="272" stroke="#E8E4DE" strokeWidth="1" />
      {/* Trend line */}
      <polyline
        points={bars.map((h, i) => `${307 + i * 13},${270 - (h / 100) * 150}`).join(" ")}
        fill="none" stroke="#8B5E3C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
        opacity="0.7"
      />
      {/* Grid lines */}
      {[120, 160, 200, 240].map((y) => (
        <line key={y} x1="302" y1={y + 2} x2="454" y2={y + 2} stroke="#F5F3F0" strokeWidth="1" />
      ))}
      {/* Bottom labels */}
      {["M", "T", "W", "T", "F", "S", "S", "M", "T", "W", "T", "F"].map((l, i) => (
        <text key={i} x={305 + i * 13} y="285" fontSize="7" fill="#9B9288" fontFamily="monospace" textAnchor="middle">
          {l}
        </text>
      ))}
    </svg>
  );
}

function SecurityIllustration() {
  return (
    <svg viewBox="0 0 480 360" fill="none" className="w-full">
      <rect width="480" height="360" rx="4" fill="#FAFAF8" stroke="#E8E4DE" strokeWidth="1" />

      {/* Center shield */}
      <g transform="translate(160, 50)">
        <path d="M80 10 L148 36 L148 100 Q148 162 80 190 Q12 162 12 100 L12 36 Z"
          fill="#F5EDE4" stroke="#8B5E3C" strokeWidth="1.5" />
        <path d="M80 28 L132 50 L132 104 Q132 148 80 170 Q28 148 28 104 L28 50 Z"
          fill="#EDD8C6" stroke="#8B5E3C" strokeWidth="1" opacity="0.5" />
        {/* Check mark */}
        <path d="M50 100 L70 120 L110 80" stroke="#8B5E3C" strokeWidth="5"
          strokeLinecap="round" strokeLinejoin="round" />
      </g>

      {/* Connection lines */}
      <line x1="240" y1="135" x2="56" y2="200" stroke="#E8E4DE" strokeWidth="1" strokeDasharray="4 3" />
      <line x1="240" y1="135" x2="424" y2="200" stroke="#E8E4DE" strokeWidth="1" strokeDasharray="4 3" />
      <line x1="240" y1="200" x2="56" y2="310" stroke="#E8E4DE" strokeWidth="1" strokeDasharray="4 3" />
      <line x1="240" y1="200" x2="424" y2="310" stroke="#E8E4DE" strokeWidth="1" strokeDasharray="4 3" />

      {/* Nodes */}
      {[
        { x: 32, y: 186, label: "Machine A", ok: true },
        { x: 400, y: 186, label: "Machine B", ok: true },
        { x: 32, y: 296, label: "Machine C", ok: true },
        { x: 400, y: 296, label: "Machine D", ok: false },
      ].map(({ x, y, label, ok }) => (
        <g key={label}>
          <rect x={x} y={y} width="48" height="36" rx="4" fill="white" stroke="#E8E4DE" strokeWidth="1" />
          <circle cx={x + 8} cy={y + 8} r="4" fill={ok ? "#22c55e" : "#8B5E3C"} opacity="0.8" />
          <rect x={x + 6} y={y + 18} width="36" height="6" rx="3" fill="#EDE9E4" />
          <rect x={x + 6} y={y + 26} width="24" height="4" rx="2" fill="#F5F3F0" />
        </g>
      ))}

      {/* TLS badge */}
      <rect x="180" y="270" width="120" height="44" rx="4" fill="#1A1714" />
      <rect x="192" y="280" width="40" height="8" rx="4" fill="#8B5E3C" opacity="0.8" />
      <rect x="192" y="292" width="80" height="6" rx="3" fill="#7C756E" />
      <circle cx="278" cy="284" r="8" fill="#8B5E3C" opacity="0.2" />
      <path d="M274 287 L278 291 L284 283" stroke="#8B5E3C" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />

      {/* RBAC label top right */}
      <rect x="334" y="60" width="128" height="72" rx="4" fill="white" stroke="#E8E4DE" strokeWidth="1" />
      <rect x="346" y="72" width="40" height="7" rx="3" fill="#EDE9E4" />
      {[
        { y: 85, w: 60, color: "#8B5E3C" },
        { y: 98, w: 44, color: "#D9B99A" },
        { y: 111, w: 52, color: "#EDE9E4" },
      ].map(({ y, w, color }) => (
        <g key={y}>
          <rect x="346" y={y} width={w} height="7" rx="3" fill={color} opacity="0.4" />
          <rect x={346 + w + 4} y={y} width="40" height="7" rx="3" fill="#F5F3F0" />
        </g>
      ))}
    </svg>
  );
}

// ── Feature data ─────────────────────────────────────────────────────────────
const FEATURES = [
  {
    id: "telemetry",
    overline: "Real-time Telemetry",
    headline: "Live data from every sensor, at 100ms resolution.",
    body: "The SCM adapter board connects directly to your machine's internal bus — boiler RTDs, pressure transducers, flow meters, and steam-wand sensors. All readings are timestamped, encrypted, and streamed to the cloud instantly.",
    points: [
      "100ms polling across all sensor types",
      "Automatic anomaly flagging on extraction curves",
      "WebSocket stream API for custom integrations",
    ],
    illustration: <TelemetryIllustration />,
    imageLeft: false,
  },
  {
    id: "analytics",
    overline: "Production Analytics",
    headline: "Understand your fleet's performance over time.",
    body: "Aggregate shot counts, yield consistency, extraction ratios, and machine utilisation across your entire fleet. Identify underperforming units, track seasonal trends, and export raw data to your BI tools via REST.",
    points: [
      "Fleet-wide extraction ratio benchmarking",
      "Weekly & monthly performance reports",
      "CSV export and BI tool integration",
    ],
    illustration: <AnalyticsIllustration />,
    imageLeft: true,
  },
  {
    id: "security",
    overline: "Enterprise Security",
    headline: "Industrial-grade security for commercial operations.",
    body: "Every data point travels over TLS 1.3. Role-based access control lets you grant technicians, managers, and owners the right level of visibility. A full audit log records every command issued to every machine.",
    points: [
      "TLS 1.3 end-to-end encryption",
      "Role-based access control (RBAC)",
      "Immutable audit log, compliance-ready",
    ],
    illustration: <SecurityIllustration />,
    imageLeft: false,
  },
] as const;

// ── Animated section wrapper ──────────────────────────────────────────────────
function AnimatedSection({ children, id }: { children: React.ReactNode; id: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.opacity = "0";
    el.style.transform = "translateY(32px)";
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.style.transition = "opacity 0.8s ease, transform 0.8s ease";
          el.style.opacity = "1";
          el.style.transform = "translateY(0)";
          obs.disconnect();
        }
      },
      { threshold: 0.12 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <div ref={ref} id={id}>
      {children}
    </div>
  );
}

// ── FeaturesAlt Component ─────────────────────────────────────────────────────
export function FeaturesGrid() {
  return (
    <section id="features" className="bg-warm-50">
      {/* Section title row */}
      <div className="em-container py-16 md:py-20 em-divider border-t border-warm-300">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
          <div>
            <div className="em-overline mb-4">Platform Capabilities</div>
            <h2 className="em-heading text-3xl md:text-4xl font-bold max-w-[440px]">
              Everything your fleet requires.
            </h2>
          </div>
          <p className="em-body text-sm max-w-[340px] md:text-right">
            Engineered for the demands of commercial coffee — from a single
            boutique café to a nationwide chain operation.
          </p>
        </div>
      </div>

      {/* Alternating feature sections */}
      {FEATURES.map((feature, idx) => (
        <AnimatedSection key={feature.id} id={`feature-${feature.id}`}>
          <div className={`border-t border-warm-300 ${idx % 2 === 0 ? "bg-white" : "bg-warm-50"}`}>
            <div className="em-container py-16 md:py-24">
              <div className={`grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center ${feature.imageLeft ? "lg:grid-flow-col-dense" : ""}`}>

                {/* Text */}
                <div className={feature.imageLeft ? "lg:col-start-2" : ""}>
                  <div className="em-overline mb-5">{feature.overline}</div>
                  <h3 className="em-heading text-2xl md:text-3xl font-semibold mb-5 leading-snug">
                    {feature.headline}
                  </h3>
                  <p className="em-body text-sm mb-8">
                    {feature.body}
                  </p>
                  <ul className="space-y-3">
                    {feature.points.map((pt) => (
                      <li key={pt} className="flex items-start gap-3">
                        <span className="mt-1 w-4 h-4 flex-shrink-0 border border-espresso rounded-sm flex items-center justify-center">
                          <span className="w-2 h-2 bg-espresso rounded-sm" />
                        </span>
                        <span className="text-sm font-sans text-ink-muted leading-relaxed">{pt}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Illustration */}
                <div className={`${feature.imageLeft ? "lg:col-start-1" : ""} rounded-lg overflow-hidden border border-warm-300 shadow-sm`}>
                  {feature.illustration}
                </div>

              </div>
            </div>
          </div>
        </AnimatedSection>
      ))}
    </section>
  );
}
