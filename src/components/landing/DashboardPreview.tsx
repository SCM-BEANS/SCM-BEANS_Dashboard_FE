"use client";

const NAV_ITEMS = [
  { label: "Overview", active: true, badge: "" },
  { label: "Machines", active: false, badge: "" },
  { label: "Analytics", active: false, badge: "" },
  { label: "Alerts", active: false, badge: "3" },
  { label: "Maintenance", active: false, badge: "" },
  { label: "Settings", active: false, badge: "" },
] as const;

const FLEET_STATUS = [
  { s: "Online", n: "47", cls: "bg-coffee-bronze" },
  { s: "Offline", n: "2", cls: "border border-coffee-mocha/40" },
  { s: "Service", n: "3", cls: "bg-coffee-steam" },
] as const;

const KPIS = [
  { label: "Total Shots", val: "1,842", delta: "+12.3%" },
  { label: "Avg Temp", val: "92.6°C", delta: "±0.2°C" },
  { label: "Alerts", val: "3", delta: "active" },
  { label: "Uptime", val: "99.7%", delta: "30d avg" },
] as const;

const BAR_DATA = [
  { h: 65, label: "M" },
  { h: 80, label: "T" },
  { h: 55, label: "W" },
  { h: 90, label: "T" },
  { h: 75, label: "F" },
  { h: 100, label: "S" },
  { h: 85, label: "S" },
] as const;

const BAR_OPACITIES = [0.2, 0.35, 0.25, 0.5, 0.4, 1, 0.6] as const;

const MACHINES = [
  { id: "A-01", status: "Online", temp: "93°C", dot: "bg-coffee-bronze" },
  { id: "A-02", status: "Online", temp: "91°C", dot: "bg-coffee-bronze" },
  { id: "B-01", status: "Service", temp: "—", dot: "bg-coffee-steam" },
  { id: "B-02", status: "Offline", temp: "—", dot: "border border-coffee-mocha/30" },
  { id: "C-01", status: "Online", temp: "93°C", dot: "bg-coffee-bronze" },
] as const;

export function DashboardPreview() {
  return (
    <section id="dashboard" className="bg-coffee-cream py-24 md:py-32 border-t border-coffee-bronze/10 relative landing-grain">
      <div className="max-w-[1200px] mx-auto px-6 md:px-10 relative z-10">

        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-14">
          <div>
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-px bg-coffee-bronze" />
              <span className="text-[11px] font-semibold tracking-[0.2em] text-coffee-mocha/60 uppercase">
                Remote Management Interface
              </span>
            </div>
            <h2 className="font-serif text-3xl md:text-4xl font-bold text-coffee-roast leading-tight tracking-tight" style={{ textWrap: "balance" }}>
              Dashboard
              <br />
              <span className="text-coffee-bronze">UI Preview</span>
            </h2>
          </div>
          <p className="text-coffee-roast/90 text-sm leading-relaxed font-medium max-w-xs md:max-w-sm md:text-right">
            Get complete visibility into extraction curves, pressure profiles, and 
            machine health across your entire fleet, all in real time.
          </p>
        </div>

        {/* Dashboard Mockup */}
        <div className="border border-coffee-roast/12 bg-white overflow-hidden rounded-sm shadow-[0_24px_64px_-16px_rgba(60,36,21,0.15)]">

          {/* Window Chrome */}
          <div className="flex items-center gap-2 px-5 py-3 border-b border-coffee-roast/10 bg-coffee-espresso">
            <div className="w-2.5 h-2.5 rounded-full border border-white/20" />
            <div className="w-2.5 h-2.5 rounded-full border border-white/20" />
            <div className="w-2.5 h-2.5 rounded-full border border-white/20" />
            <div className="ml-4 flex-1 h-4 rounded-sm bg-white/10 max-w-[220px] flex items-center px-2">
              <span className="text-[9px] font-mono text-white/40">cloud.deercoffee.io/fleet/overview</span>
            </div>
            <div className="ml-auto flex items-center gap-1.5">
              <span
                className="w-1.5 h-1.5 rounded-full bg-coffee-bronze inline-block"
                style={{ animation: "landing-pulse-bronze 2s ease-in-out infinite" }}
              />
              <span className="text-[9px] font-mono text-white/50 uppercase tracking-wider">Live</span>
            </div>
          </div>

          {/* Dashboard Body */}
          <div className="grid grid-cols-[180px_1fr] md:grid-cols-[220px_1fr] min-h-[480px]">

            {/* Sidebar */}
            <div className="border-r border-coffee-roast/8 bg-coffee-cream flex flex-col">
              <div className="px-5 py-4 border-b border-coffee-roast/8">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 bg-coffee-roast rounded-full flex items-center justify-center flex-shrink-0">
                    <div className="w-2 h-2 bg-coffee-gold rounded-sm" />
                  </div>
                  <div>
                    <div className="text-[10px] font-bold text-coffee-roast uppercase tracking-widest">Deer Coffee</div>
                    <div className="text-[8px] text-coffee-mocha/50 font-mono">Fleet Control</div>
                  </div>
                </div>
              </div>

              <nav className="flex-1 p-3 space-y-0.5">
                {NAV_ITEMS.map(({ label, active, badge }) => (
                  <div
                    key={label}
                    className={`flex items-center justify-between px-3 py-2 text-[11px] font-medium rounded-sm ${
                      active ? "bg-coffee-roast text-coffee-cream" : "text-coffee-mocha/60 hover:bg-coffee-latte/60"
                    }`}
                  >
                    <span>{label}</span>
                    {badge && (
                      <span className={`text-[9px] w-4 h-4 flex items-center justify-center font-mono rounded-sm ${active ? "bg-coffee-bronze text-coffee-espresso" : "bg-coffee-roast text-white"}`}>
                        {badge}
                      </span>
                    )}
                  </div>
                ))}
              </nav>

              <div className="p-4 border-t border-coffee-roast/8">
                <div className="text-[8px] uppercase tracking-[0.15em] text-coffee-mocha/40 font-mono mb-2">Fleet Status</div>
                <div className="space-y-1">
                  {FLEET_STATUS.map(({ s, n, cls }) => (
                    <div key={s} className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <div className={`w-1.5 h-1.5 rounded-full ${cls}`} />
                        <span className="text-[9px] text-coffee-mocha/60">{s}</span>
                      </div>
                      <span className="text-[9px] font-mono text-coffee-roast">{n}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Main Content */}
            <div className="flex flex-col">
              <div className="flex items-center justify-between px-5 py-3 border-b border-coffee-roast/8">
                <div>
                  <div className="text-xs font-semibold text-coffee-roast">Fleet Overview</div>
                  <div className="text-[9px] text-coffee-mocha/50 font-mono">Last synced: 12s ago</div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-7 px-3 border border-coffee-roast/20 text-[10px] font-mono text-coffee-mocha/60 flex items-center rounded-sm">Today</div>
                  <div className="h-7 px-3 bg-coffee-roast text-[10px] font-mono text-coffee-cream flex items-center rounded-sm">Export</div>
                </div>
              </div>

              <div className="flex-1 p-4 flex flex-col gap-4">
                {/* KPI Row */}
                <div className="grid grid-cols-4 gap-3">
                  {KPIS.map(({ label, val, delta }) => (
                    <div key={label} className="border border-coffee-roast/8 p-3 rounded-sm">
                      <div className="text-[8px] uppercase tracking-[0.12em] text-coffee-mocha/40 font-mono mb-1">{label}</div>
                      <div className="text-sm font-bold text-coffee-roast" style={{ fontVariantNumeric: "tabular-nums" }}>{val}</div>
                      <div className="text-[8px] text-coffee-bronze font-mono mt-0.5">{delta}</div>
                    </div>
                  ))}
                </div>

                {/* Chart + Table */}
                <div className="grid grid-cols-3 gap-3 flex-1">
                  <div className="col-span-2 border border-coffee-roast/8 p-4 rounded-sm">
                    <div className="flex items-center justify-between mb-3">
                      <div className="text-[9px] uppercase tracking-wider text-coffee-mocha/50 font-mono">Extraction Volume — 7 days</div>
                      <div className="flex gap-1">
                        <div className="px-2 py-0.5 text-[8px] font-mono bg-coffee-roast text-coffee-cream rounded-sm">1W</div>
                        <div className="px-2 py-0.5 text-[8px] font-mono text-coffee-mocha/40">1M</div>
                        <div className="px-2 py-0.5 text-[8px] font-mono text-coffee-mocha/40">3M</div>
                      </div>
                    </div>
                    <div className="flex items-end gap-2 h-24">
                      {BAR_DATA.map(({ h, label }, i) => (
                        <div key={label + i} className="flex-1 flex flex-col items-center gap-1">
                          <div
                            className="w-full bg-coffee-bronze rounded-t-sm"
                            style={{ height: `${h}%`, opacity: BAR_OPACITIES[i] }}
                          />
                          <div className="text-[7px] text-coffee-mocha/30 font-mono">{label}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="border border-coffee-roast/8 p-3 flex flex-col rounded-sm">
                    <div className="text-[9px] uppercase tracking-wider text-coffee-mocha/50 font-mono mb-3">Machine Status</div>
                    <div className="flex-1 space-y-1.5">
                      {MACHINES.map(({ id, temp, dot }) => (
                        <div key={id} className="flex items-center justify-between py-1 border-b border-coffee-roast/5 last:border-0">
                          <div className="flex items-center gap-2">
                            <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${dot}`} />
                            <span className="text-[9px] font-mono text-coffee-mocha/60">{id}</span>
                          </div>
                          <span className="text-[8px] font-mono text-coffee-mocha/40">{temp}</span>
                        </div>
                      ))}
                    </div>
                    <div className="mt-2 pt-2 border-t border-coffee-roast/8 text-[8px] font-mono text-coffee-mocha/30">
                      52 machines total
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <p className="mt-4 text-[11px] text-coffee-mocha/30 font-mono tracking-wide text-center">
          Fig. 1 — SCM-BEANS Cloud Console · Remote Management Interface
        </p>
      </div>
    </section>
  );
}
