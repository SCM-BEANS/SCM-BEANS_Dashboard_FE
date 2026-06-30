"use client";

import { useState } from "react";

type Hotspot = {
  id: string;
  x: string;
  y: string;
  label: string;
  metric: string;
  value: string;
  unit: string;
  status: "optimal" | "warning" | "info";
};

const HOTSPOTS: Hotspot[] = [
  {
    id: "boiler",
    x: "35%",
    y: "28%",
    label: "Boiler Temp",
    metric: "Group Boiler",
    value: "93.4",
    unit: "°C",
    status: "optimal",
  },
  {
    id: "pressure",
    x: "68%",
    y: "52%",
    label: "Pump Pressure",
    metric: "Rotary Pump",
    value: "9.2",
    unit: "bar",
    status: "optimal",
  },
  {
    id: "grouphead",
    x: "50%",
    y: "60%",
    label: "Group Head",
    metric: "E61 Temp",
    value: "91.8",
    unit: "°C",
    status: "optimal",
  },
  {
    id: "steam",
    x: "78%",
    y: "35%",
    label: "Steam Wand",
    metric: "Steam Pressure",
    value: "1.2",
    unit: "bar",
    status: "info",
  },
  {
    id: "portafilter",
    x: "42%",
    y: "72%",
    label: "Extraction",
    metric: "Flow Rate",
    value: "2.1",
    unit: "ml/s",
    status: "warning",
  },
];

const STATUS_COLORS = {
  optimal: {
    dot: "bg-emerald-500",
    dotBorder: "border-emerald-600",
    border: "border-emerald-200",
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    label: "Optimal",
    ring: "bg-emerald-400",
  },
  warning: {
    dot: "bg-amber-500",
    dotBorder: "border-amber-600",
    border: "border-amber-200",
    bg: "bg-amber-50",
    text: "text-amber-700",
    label: "Attention",
    ring: "bg-amber-400",
  },
  info: {
    dot: "bg-blue-500",
    dotBorder: "border-blue-600",
    border: "border-blue-200",
    bg: "bg-blue-50",
    text: "text-blue-700",
    label: "Info",
    ring: "bg-blue-400",
  },
};

function HotspotPin({ spot, isActive, onClick }: { spot: Hotspot; isActive: boolean; onClick: () => void }) {
  const colors = STATUS_COLORS[spot.status];
  return (
    <button
      onClick={onClick}
      className="absolute -translate-x-1/2 -translate-y-1/2 group z-20"
      style={{ left: spot.x, top: spot.y }}
      aria-label={`View ${spot.label} details`}
    >
      <span
        className={`absolute inset-0 rounded-full ${colors.ring} opacity-25`}
        style={{ animation: "hotspot-pulse 2.5s ease-in-out infinite", transform: "scale(2.5)" }}
      />
      <span
        className={`relative flex items-center justify-center w-5 h-5 rounded-full ${colors.dot} shadow-md border-2 border-white transition-transform duration-200 ${isActive ? "scale-125" : "group-hover:scale-110"}`}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-white/60" />
      </span>
    </button>
  );
}

function TooltipCard({ spot }: { spot: Hotspot }) {
  const colors = STATUS_COLORS[spot.status];
  const leftAligned = parseFloat(spot.x) <= 55;
  return (
    <div
      className={`absolute z-30 bg-white border ${colors.border} rounded-xl p-4 shadow-xl shadow-stone-200/60 min-w-[180px] pointer-events-none`}
      style={{
        left: leftAligned ? `calc(${spot.x} + 24px)` : "auto",
        right: !leftAligned ? `calc(${100 - parseFloat(spot.x)}% + 24px)` : "auto",
        top: `calc(${spot.y} - 40px)`,
        animation: "tooltip-in 0.2s ease-out forwards",
      }}
    >
      <div className={`text-[9px] font-mono uppercase tracking-widest ${colors.text} font-semibold mb-2`}>{spot.metric}</div>
      <div className="flex items-end gap-1 mb-1.5">
        <span className="text-2xl font-black text-stone-900">{spot.value}</span>
        <span className="text-sm text-stone-400 mb-0.5">{spot.unit}</span>
      </div>
      <div className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full ${colors.bg} border ${colors.border}`}>
        <span className={`w-1.5 h-1.5 rounded-full ${colors.dot}`} />
        <span className={`text-[9px] font-mono ${colors.text} font-semibold`}>{colors.label}</span>
      </div>
    </div>
  );
}

const MachineSVG = () => (
  <svg viewBox="0 0 400 500" className="w-full h-full" fill="none">
    <rect x="40" y="60" width="320" height="380" rx="12" fill="#1c1917" stroke="#292524" strokeWidth="1" />
    <rect x="50" y="70" width="300" height="370" rx="8" fill="#231f1d" />
    <rect x="60" y="80" width="280" height="100" rx="6" fill="#2c2825" stroke="#3a3532" strokeWidth="0.5" />
    <rect x="70" y="88" width="160" height="80" rx="4" fill="#1c1917" stroke="#2a2725" strokeWidth="0.5" />
    <line x1="80" y1="105" x2="180" y2="105" stroke="#f59e0b" strokeWidth="1.5" opacity="0.8" />
    <line x1="80" y1="115" x2="160" y2="115" stroke="#44403c" strokeWidth="1" opacity="0.6" />
    <line x1="80" y1="125" x2="170" y2="125" stroke="#44403c" strokeWidth="1" opacity="0.4" />
    <line x1="80" y1="135" x2="150" y2="135" stroke="#44403c" strokeWidth="1" opacity="0.3" />
    <line x1="80" y1="145" x2="155" y2="145" stroke="#44403c" strokeWidth="1" opacity="0.25" />
    <text x="90" y="100" fontSize="7" fill="#f59e0b" fontFamily="monospace" opacity="0.8">DEER_01 • LIVE</text>
    <circle cx="260" cy="108" r="18" fill="#2a2725" stroke="#3d3835" strokeWidth="1" />
    <circle cx="260" cy="108" r="10" fill="#1c1917" stroke="#292624" strokeWidth="0.5" />
    <line x1="260" y1="100" x2="260" y2="105" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" opacity="0.9" />
    <circle cx="310" cy="108" r="14" fill="#2a2725" stroke="#3d3835" strokeWidth="1" />
    <circle cx="310" cy="108" r="7" fill="#1c1917" stroke="#292624" strokeWidth="0.5" />
    <line x1="310" y1="102" x2="313" y2="106" stroke="#a8a29e" strokeWidth="1.5" strokeLinecap="round" opacity="0.5" />
    <circle cx="244" cy="158" r="3" fill="#22c55e" opacity="0.9" />
    <circle cx="256" cy="158" r="3" fill="#f59e0b" opacity="0.6" />
    <circle cx="268" cy="158" r="3" fill="#44403c" />
    <rect x="100" y="195" width="200" height="50" rx="4" fill="#2c2825" stroke="#3a3532" strokeWidth="0.5" />
    <rect x="120" y="200" width="160" height="40" rx="3" fill="#231f1d" />
    <ellipse cx="200" cy="245" rx="45" ry="10" fill="#1c1917" stroke="#292624" strokeWidth="0.5" />
    <rect x="160" y="240" width="80" height="40" rx="2" fill="#2a2725" stroke="#363330" strokeWidth="0.5" />
    <ellipse cx="200" cy="280" rx="40" ry="8" fill="#231f1d" stroke="#2e2b29" strokeWidth="0.5" />
    <rect x="185" y="280" width="8" height="30" rx="1" fill="#211e1c" stroke="#2c2925" strokeWidth="0.5" />
    <rect x="207" y="280" width="8" height="30" rx="1" fill="#211e1c" stroke="#2c2925" strokeWidth="0.5" />
    <rect x="70" y="360" width="260" height="50" rx="4" fill="#211e1c" stroke="#2e2b29" strokeWidth="0.5" />
    <rect x="80" y="366" width="240" height="38" rx="2" fill="#1c1917" />
    {[90,100,110,120,130,140,150,160,170,180,190,200,210,220,230,240,250,260,270,280,290,300].map((x) => (
      <line key={x} x1={x} y1="366" x2={x} y2="404" stroke="#2c2825" strokeWidth="0.5" />
    ))}
    <line x1="330" y1="150" x2="350" y2="250" stroke="#3a3532" strokeWidth="4" strokeLinecap="round" />
    <line x1="350" y1="250" x2="340" y2="290" stroke="#3a3532" strokeWidth="3" strokeLinecap="round" />
    <circle cx="340" cy="293" r="6" fill="#2c2825" stroke="#44403c" strokeWidth="0.5" />
    <circle cx="340" cy="300" r="1" fill="#93c5fd" opacity="0.5" />
    <circle cx="337" cy="306" r="0.8" fill="#93c5fd" opacity="0.35" />
    <circle cx="193" cy="316" r="2" fill="#f59e0b" opacity="0.6" />
    <circle cx="213" cy="320" r="1.5" fill="#d97706" opacity="0.5" />
    <circle cx="200" cy="325" r="2.5" fill="#f59e0b" opacity="0.45" />
    <rect x="60" y="432" width="280" height="16" rx="4" fill="#1c1917" stroke="#252220" strokeWidth="0.5" />
    <rect x="80" y="428" width="240" height="4" rx="2" fill="#211e1c" />
  </svg>
);

export function InteractiveMachineShowcase() {
  const [activeId, setActiveId] = useState<string | null>(null);

  const handleHotspotClick = (id: string) => {
    setActiveId((prev) => (prev === id ? null : id));
  };

  const activeSpot = HOTSPOTS.find((h) => h.id === activeId);

  return (
    <section className="relative bg-stone-50 py-24 md:py-32 overflow-hidden border-t border-stone-100">
      <style>{`
        @keyframes hotspot-pulse {
          0%, 100% { opacity: 0.25; transform: scale(2.5); }
          50% { opacity: 0.0; transform: scale(3.5); }
        }
        @keyframes tooltip-in {
          from { opacity: 0; transform: translateY(-8px) scale(0.96); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>

      {/* Warm tint */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full bg-amber-50 blur-[100px] opacity-60 pointer-events-none" />

      <div className="max-w-[1280px] mx-auto px-6 md:px-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">

          {/* Left — Machine */}
          <div className="lg:col-span-6 flex justify-center">
            <div className="relative w-full max-w-[460px]">
              {/* Shadow glow */}
              <div className="absolute -inset-6 bg-stone-200/40 blur-3xl rounded-3xl pointer-events-none" />

              <div className="relative bg-white border border-stone-200 rounded-3xl overflow-hidden shadow-2xl shadow-stone-200/60 p-4">
                <div className="relative">
                  <MachineSVG />
                  {HOTSPOTS.map((spot) => (
                    <HotspotPin
                      key={spot.id}
                      spot={spot}
                      isActive={activeId === spot.id}
                      onClick={() => handleHotspotClick(spot.id)}
                    />
                  ))}
                  {activeSpot && <TooltipCard spot={activeSpot} />}
                </div>
                <p className="text-center text-[9px] font-mono text-stone-400 tracking-widest uppercase mt-3">
                  Click on indicators to inspect sensors
                </p>
              </div>
            </div>
          </div>

          {/* Right — Content */}
          <div className="lg:col-span-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-0.5 bg-amber-500 rounded-full" />
              <span className="text-[11px] font-semibold tracking-[0.2em] text-amber-700 uppercase font-mono">
                Machine Intelligence
              </span>
            </div>
            <h2 className="text-4xl md:text-5xl font-black text-stone-900 leading-tight tracking-tight mb-6">
              Every Sensor,
              <br />
              <span className="text-stone-300">One Platform.</span>
            </h2>
            <p className="text-stone-500 text-base leading-relaxed font-light mb-10">
              Our SCM adapter board taps into your machine&apos;s internal data streams.
              Temperature probes on boilers, flow meters on pump lines, and pressure
              transducers on group heads — all unified and visualized in real time.
            </p>

            {/* Sensor readouts */}
            <div className="space-y-3">
              {HOTSPOTS.map((spot) => {
                const colors = STATUS_COLORS[spot.status];
                const isActive = activeId === spot.id;
                return (
                  <button
                    key={spot.id}
                    onClick={() => handleHotspotClick(spot.id)}
                    className={`w-full flex items-center justify-between p-4 rounded-xl border transition-all duration-200 text-left ${
                      isActive
                        ? `${colors.bg} ${colors.border} border shadow-sm`
                        : "bg-white border-stone-200 hover:border-stone-300 hover:bg-stone-50 hover:shadow-sm"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${colors.dot}`} />
                      <div>
                        <div className="text-[12px] font-semibold text-stone-800">{spot.label}</div>
                        <div className="text-[10px] font-mono text-stone-400 uppercase tracking-wider">{spot.metric}</div>
                      </div>
                    </div>
                    <div className={`text-base font-black font-mono ${isActive ? colors.text : "text-stone-600"}`}>
                      {spot.value}
                      <span className="text-xs font-normal ml-0.5 text-stone-400">{spot.unit}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
