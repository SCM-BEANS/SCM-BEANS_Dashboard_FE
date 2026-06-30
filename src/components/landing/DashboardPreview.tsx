"use client";

const SIDEBAR_ITEMS = ["Overview", "Machines", "Analytics", "Alerts", "Maintenance", "Settings"] as const;
const KPIS = [
  { label: "Total Shots", val: "1,842", delta: "+12.3%", color: "text-espresso-600" },
  { label: "Avg. Temp", val: "92.6°C", delta: "±0.2°C", color: "text-espresso" },
  { label: "Active Alerts", val: "3", delta: "2 critical", color: "text-red-600" },
  { label: "Fleet Uptime", val: "99.7%", delta: "30-day avg", color: "text-emerald-700" },
] as const;

const BAR_H = [62, 78, 52, 88, 70, 100, 82] as const;
const MACHINES = [
  { id: "A-01", loc: "Bar North", temp: "93°C", status: "Online" },
  { id: "A-02", loc: "Bar South", temp: "91°C", status: "Online" },
  { id: "B-01", loc: "Lounge", temp: "—", status: "Service" },
  { id: "C-01", loc: "Lobby", temp: "94°C", status: "Online" },
  { id: "C-02", loc: "Rooftop", temp: "—", status: "Offline" },
] as const;

const STATUS_DOT: Record<string, string> = {
  Online:  "bg-emerald-500",
  Service: "bg-espresso-400",
  Offline: "bg-red-400",
};

export function DashboardPreview() {
  return (
    <section id="dashboard" className="bg-warm-50 border-t border-warm-300">
      <div className="em-container py-20 md:py-28">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-12">
          <div>
            <div className="em-overline mb-4">Remote Management Interface</div>
            <h2 className="em-heading text-3xl md:text-4xl font-bold">
              One dashboard for your
              <br />entire fleet.
            </h2>
          </div>
          <p className="em-body text-sm max-w-[300px] md:text-right">
            Designed for operators and technicians. No special software —
            just your browser.
          </p>
        </div>

        {/* Mockup */}
        <div className="border border-warm-300 rounded-sm overflow-hidden bg-white shadow-lg shadow-warm-200/50">
          {/* Window chrome */}
          <div className="bg-warm-100 border-b border-warm-300 h-10 flex items-center px-4 gap-2">
            <div className="flex gap-1.5">
              <div className="w-3 h-3 rounded-full bg-warm-300" />
              <div className="w-3 h-3 rounded-full bg-warm-300" />
              <div className="w-3 h-3 rounded-full bg-warm-300" />
            </div>
            <div className="ml-3 flex-1 max-w-[260px] h-5 rounded bg-warm-200 flex items-center px-2.5">
              <span className="text-[10px] font-mono text-warm-500">cloud.scmbeans.io/fleet</span>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="text-[10px] font-mono text-warm-500 uppercase tracking-wide">Live</span>
            </div>
          </div>

          {/* Dashboard body */}
          <div className="grid grid-cols-[180px_1fr] min-h-[440px]">
            {/* Sidebar */}
            <div className="border-r border-warm-200 bg-warm-50 flex flex-col">
              {/* Brand */}
              <div className="px-4 py-4 border-b border-warm-200">
                <div className="flex items-center gap-2.5">
                  <svg width="16" height="18" viewBox="0 0 16 18" fill="none">
                    <ellipse cx="8" cy="9" rx="6.5" ry="8" fill="#8B5E3C" />
                    <path d="M8 1 Q10.5 9 8 17" stroke="#5A3A22" strokeWidth="1" fill="none" />
                    <path d="M8 1 Q5.5 9 8 17" stroke="#5A3A22" strokeWidth="1" fill="none" />
                  </svg>
                  <div>
                    <div className="text-[10px] font-bold text-ink uppercase tracking-widest">SCM-BEANS</div>
                    <div className="text-[8px] text-ink-subtle font-mono">Fleet v2.1</div>
                  </div>
                </div>
              </div>

              {/* Nav */}
              <nav className="flex-1 py-3">
                {SIDEBAR_ITEMS.map((item, i) => (
                  <div
                    key={item}
                    className={`flex items-center px-4 py-2.5 text-[11px] font-sans font-medium ${
                      i === 0
                        ? "text-espresso bg-espresso-50 border-l-2 border-espresso"
                        : "text-ink-muted hover:text-ink"
                    }`}
                  >
                    {item}
                    {item === "Alerts" && (
                      <span className="ml-auto w-4 h-4 rounded-full bg-red-100 text-red-600 text-[9px] font-mono flex items-center justify-center">
                        3
                      </span>
                    )}
                  </div>
                ))}
              </nav>

              {/* Fleet summary */}
              <div className="p-4 border-t border-warm-200">
                <div className="text-[8px] font-mono text-warm-500 uppercase tracking-widest mb-2">Fleet</div>
                {[{ s: "Online", n: "47", c: "text-emerald-600" }, { s: "Service", n: "3", c: "text-espresso-500" }, { s: "Offline", n: "2", c: "text-red-500" }].map(({ s, n, c }) => (
                  <div key={s} className="flex justify-between text-[10px] py-0.5">
                    <span className="text-ink-subtle">{s}</span>
                    <span className={`font-mono font-semibold ${c}`}>{n}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Main */}
            <div className="flex flex-col bg-white">
              {/* Top bar */}
              <div className="flex items-center justify-between px-6 py-3 border-b border-warm-200">
                <div>
                  <div className="text-[12px] font-semibold text-ink">Fleet Overview</div>
                  <div className="text-[9px] text-ink-subtle font-mono">Synced 8s ago</div>
                </div>
                <div className="flex gap-2">
                  <div className="h-7 px-3 border border-warm-200 rounded text-[10px] font-sans text-ink-muted flex items-center">Today</div>
                  <div className="h-7 px-3 bg-ink rounded text-[10px] font-sans text-white font-semibold flex items-center">Export</div>
                </div>
              </div>

              <div className="flex-1 p-5 flex flex-col gap-4">
                {/* KPI row */}
                <div className="grid grid-cols-4 gap-3">
                  {KPIS.map(({ label, val, delta, color }) => (
                    <div key={label} className="bg-warm-50 border border-warm-200 rounded-sm p-3">
                      <div className="text-[8px] font-mono text-warm-500 uppercase tracking-wide mb-1.5">{label}</div>
                      <div className={`text-[15px] font-bold font-sans ${color}`}>{val}</div>
                      <div className="text-[9px] font-mono text-warm-400 mt-0.5">{delta}</div>
                    </div>
                  ))}
                </div>

                {/* Chart + Table */}
                <div className="grid grid-cols-3 gap-3 flex-1">
                  {/* Bar chart */}
                  <div className="col-span-2 bg-warm-50 border border-warm-200 rounded-sm p-4">
                    <div className="flex justify-between items-center mb-3">
                      <div className="text-[9px] font-mono text-warm-500 uppercase tracking-wide">Shot Volume — 7 days</div>
                      <div className="flex gap-1">
                        <div className="px-2 py-0.5 text-[8px] font-mono bg-ink text-white rounded-sm">1W</div>
                        <div className="px-2 py-0.5 text-[8px] font-mono text-warm-400">1M</div>
                      </div>
                    </div>
                    <div className="flex items-end gap-2 h-20">
                      {BAR_H.map((h, i) => (
                        <div key={i} className="flex-1 flex flex-col items-center gap-1">
                          <div
                            className="w-full bg-espresso rounded-t-sm"
                            style={{ height: `${h}%`, opacity: 0.15 + (i / BAR_H.length) * 0.85 }}
                          />
                          <div className="text-[7px] font-mono text-warm-400">
                            {["M","T","W","T","F","S","S"][i]}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Machine list */}
                  <div className="bg-warm-50 border border-warm-200 rounded-sm p-3 flex flex-col">
                    <div className="text-[9px] font-mono text-warm-500 uppercase tracking-wide mb-3">Machine Status</div>
                    <div className="flex-1 space-y-1.5">
                      {MACHINES.map(({ id, loc, temp, status }) => (
                        <div key={id} className="flex items-center gap-2 py-1 border-b border-warm-100 last:border-0">
                          <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${STATUS_DOT[status]}`} />
                          <div className="flex-1 min-w-0">
                            <div className="text-[9px] font-mono font-semibold text-ink truncate">{id}</div>
                            <div className="text-[8px] text-warm-400 font-mono truncate">{loc}</div>
                          </div>
                          <div className="text-[8px] font-mono text-ink-muted flex-shrink-0">{temp}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <p className="text-center text-[10px] font-mono text-warm-400 tracking-wide mt-4">
          SCM-BEANS Cloud Console · Fleet Overview · Interface Preview
        </p>
      </div>
    </section>
  );
}
