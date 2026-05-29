"use client";

// All static data lifted outside component — zero re-creation cost
const NAV_ITEMS = [
  { label: "Overview", active: true, badge: "" },
  { label: "Machines", active: false, badge: "" },
  { label: "Analytics", active: false, badge: "" },
  { label: "Alerts", active: false, badge: "3" },
  { label: "Maintenance", active: false, badge: "" },
  { label: "Settings", active: false, badge: "" },
] as const;

const FLEET_STATUS = [
  { s: "Online", n: "47", cls: "bg-[#111]" },
  { s: "Offline", n: "2",  cls: "border border-[#888]" },
  { s: "Service", n: "3",  cls: "bg-[#ddd]" },
] as const;

const KPIS = [
  { label: "Total Shots", val: "1,842", delta: "+12.3%" },
  { label: "Avg Temp",    val: "92.6°C", delta: "±0.2°C" },
  { label: "Alerts",      val: "3",      delta: "active"  },
  { label: "Uptime",      val: "99.7%",  delta: "30d avg" },
] as const;

const BAR_DATA = [
  { h: 65, label: "M" },
  { h: 80, label: "T" },
  { h: 55, label: "W" },
  { h: 90, label: "T" },
  { h: 75, label: "F" },
  { h: 100, label: "S" },
  { h: 85,  label: "S" },
] as const;

const BAR_OPACITIES = [0.15, 0.24, 0.33, 0.42, 0.51, 1, 0.72] as const;

const MACHINES = [
  { id: "A-01", status: "Online",  temp: "93°C", dot: "bg-[#111]" },
  { id: "A-02", status: "Online",  temp: "91°C", dot: "bg-[#111]" },
  { id: "B-01", status: "Service", temp: "—",    dot: "bg-[#888]" },
  { id: "B-02", status: "Offline", temp: "—",    dot: "border border-[#ccc]" },
  { id: "C-01", status: "Online",  temp: "93°C", dot: "bg-[#111]" },
] as const;

export function DashboardPreview() {
  return (
    <section id="dashboard" className="bg-[#fafafa] py-24 md:py-32 border-t border-[#111]/8">
      <div className="max-w-[1200px] mx-auto px-6 md:px-10">

        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-14">
          <div>
            <div className="flex items-center gap-3 mb-5">
              <div className="w-8 h-px bg-[#111]" />
              <span className="text-[11px] font-semibold tracking-[0.2em] text-[#555] uppercase">
                Remote Management Interface
              </span>
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-[#111] leading-tight tracking-tight">
              Dashboard
              <br />
              UI Preview
            </h2>
          </div>
          <p className="text-[#666] text-sm leading-relaxed font-light max-w-xs md:max-w-sm md:text-right">
            A unified control surface designed for operators, technicians, and
            fleet managers — accessible from any browser.
          </p>
        </div>

        {/* Dashboard Mockup */}
        <div className="border border-[#111]/12 bg-white overflow-hidden">

          {/* Window Chrome */}
          <div className="flex items-center gap-2 px-5 py-3 border-b border-[#111]/8 bg-[#111]">
            <div className="w-2.5 h-2.5 rounded-full border border-white/20" />
            <div className="w-2.5 h-2.5 rounded-full border border-white/20" />
            <div className="w-2.5 h-2.5 rounded-full border border-white/20" />
            <div className="ml-4 flex-1 h-4 rounded-sm bg-white/10 max-w-[220px] flex items-center px-2">
              <span className="text-[9px] font-mono text-white/40">cloud.deercoffee.io/fleet/overview</span>
            </div>
            <div className="ml-auto flex items-center gap-1.5">
              {/* CSS-only pulse — no Tailwind animate-pulse */}
              <span
                className="w-1.5 h-1.5 rounded-full bg-white inline-block"
                style={{ animation: "dp-pulse 2s ease-in-out infinite" }}
              />
              <style>{`@keyframes dp-pulse{0%,100%{opacity:1}50%{opacity:.3}}`}</style>
              <span className="text-[9px] font-mono text-white/50 uppercase tracking-wider">Live</span>
            </div>
          </div>

          {/* Dashboard Body */}
          <div className="grid grid-cols-[180px_1fr] md:grid-cols-[220px_1fr] min-h-[480px]">

            {/* Sidebar */}
            <div className="border-r border-[#111]/8 bg-[#fafafa] flex flex-col">
              {/* Brand */}
              <div className="px-5 py-4 border-b border-[#111]/8">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 bg-[#111] flex items-center justify-center flex-shrink-0">
                    <div className="w-2 h-2 bg-white rounded-sm" />
                  </div>
                  <div>
                    <div className="text-[10px] font-bold text-[#111] uppercase tracking-widest">Deer Coffee</div>
                    <div className="text-[8px] text-[#aaa] font-mono">Fleet Control</div>
                  </div>
                </div>
              </div>

              {/* Nav */}
              <nav className="flex-1 p-3 space-y-0.5">
                {NAV_ITEMS.map(({ label, active, badge }) => (
                  <div
                    key={label}
                    className={`flex items-center justify-between px-3 py-2 text-[11px] font-medium ${
                      active ? "bg-[#111] text-white" : "text-[#666]"
                    }`}
                  >
                    <span>{label}</span>
                    {badge && (
                      <span className={`text-[9px] w-4 h-4 flex items-center justify-center font-mono ${active ? "bg-white text-[#111]" : "bg-[#111] text-white"}`}>
                        {badge}
                      </span>
                    )}
                  </div>
                ))}
              </nav>

              {/* Fleet Status */}
              <div className="p-4 border-t border-[#111]/8">
                <div className="text-[8px] uppercase tracking-[0.15em] text-[#aaa] font-mono mb-2">Fleet Status</div>
                <div className="space-y-1">
                  {FLEET_STATUS.map(({ s, n, cls }) => (
                    <div key={s} className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <div className={`w-1.5 h-1.5 rounded-full ${cls}`} />
                        <span className="text-[9px] text-[#666]">{s}</span>
                      </div>
                      <span className="text-[9px] font-mono text-[#111]">{n}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Main Content */}
            <div className="flex flex-col">
              {/* Top Bar */}
              <div className="flex items-center justify-between px-5 py-3 border-b border-[#111]/8">
                <div>
                  <div className="text-xs font-semibold text-[#111]">Fleet Overview</div>
                  <div className="text-[9px] text-[#aaa] font-mono">Last synced: 12s ago</div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-7 px-3 border border-[#111]/20 text-[10px] font-mono text-[#666] flex items-center">Today</div>
                  <div className="h-7 px-3 bg-[#111] text-[10px] font-mono text-white flex items-center">Export</div>
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 p-4 flex flex-col gap-4">
                {/* KPI Row */}
                <div className="grid grid-cols-4 gap-3">
                  {KPIS.map(({ label, val, delta }) => (
                    <div key={label} className="border border-[#111]/8 p-3">
                      <div className="text-[8px] uppercase tracking-[0.12em] text-[#aaa] font-mono mb-1">{label}</div>
                      <div className="text-sm font-bold text-[#111]">{val}</div>
                      <div className="text-[8px] text-[#888] font-mono mt-0.5">{delta}</div>
                    </div>
                  ))}
                </div>

                {/* Chart + Table */}
                <div className="grid grid-cols-3 gap-3 flex-1">
                  {/* Bar Chart */}
                  <div className="col-span-2 border border-[#111]/8 p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="text-[9px] uppercase tracking-wider text-[#888] font-mono">Extraction Volume — 7 days</div>
                      <div className="flex gap-1">
                        <div className="px-2 py-0.5 text-[8px] font-mono bg-[#111] text-white">1W</div>
                        <div className="px-2 py-0.5 text-[8px] font-mono text-[#888]">1M</div>
                        <div className="px-2 py-0.5 text-[8px] font-mono text-[#888]">3M</div>
                      </div>
                    </div>
                    <div className="flex items-end gap-2 h-24">
                      {BAR_DATA.map(({ h, label }, i) => (
                        <div key={label + i} className="flex-1 flex flex-col items-center gap-1">
                          <div
                            className="w-full bg-[#111]"
                            style={{ height: `${h}%`, opacity: BAR_OPACITIES[i] }}
                          />
                          <div className="text-[7px] text-[#ccc] font-mono">{label}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Machine Status */}
                  <div className="border border-[#111]/8 p-3 flex flex-col">
                    <div className="text-[9px] uppercase tracking-wider text-[#888] font-mono mb-3">Machine Status</div>
                    <div className="flex-1 space-y-1.5">
                      {MACHINES.map(({ id, temp, dot }) => (
                        <div key={id} className="flex items-center justify-between py-1 border-b border-[#111]/5 last:border-0">
                          <div className="flex items-center gap-2">
                            <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${dot}`} />
                            <span className="text-[9px] font-mono text-[#555]">{id}</span>
                          </div>
                          <span className="text-[8px] font-mono text-[#888]">{temp}</span>
                        </div>
                      ))}
                    </div>
                    <div className="mt-2 pt-2 border-t border-[#111]/8 text-[8px] font-mono text-[#aaa]">
                      52 machines total
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <p className="mt-4 text-[11px] text-[#bbb] font-mono tracking-wide text-center">
          Fig. 1 — SCM-BEANS Cloud Console · Remote Management Interface · Strictly Black/White/Grey
        </p>
      </div>
    </section>
  );
}
