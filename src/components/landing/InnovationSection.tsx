"use client";

import { ArrowRight, Cpu, Cloud, Activity, Zap } from "lucide-react";
import Link from "next/link";

const features = [
  { icon: <Cpu className="w-5 h-5" />, title: "Edge Computing", desc: "Xử lý dữ liệu ngay tại máy — không phụ thuộc vào internet" },
  { icon: <Cloud className="w-5 h-5" />, title: "Cloud Sync", desc: "Đồng bộ dữ liệu lên cloud liên tục — truy cập từ bất kỳ thiết bị nào" },
  { icon: <Activity className="w-5 h-5" />, title: "Real-time Monitoring", desc: "Xem trạng thái tất cả các máy theo thời gian thực" },
  { icon: <Zap className="w-5 h-5" />, title: "Predictive AI", desc: "AI dự đoán hỏng hóc trước khi xảy ra, giảm downtime tối đa" },
];

export function InnovationSection() {
  return (
    <section id="technology" className="bg-black py-32 px-6 overflow-hidden">
      <div className="max-w-[1400px] mx-auto grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">

        {/* Left: Content */}
        <div className="text-left flex flex-col items-start relative z-10">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-0.5 bg-lp-card"></div>
            <span className="text-lp-card tracking-[0.2em] uppercase text-xs font-bold">Technology</span>
          </div>

          <h2 className="text-5xl md:text-6xl font-black uppercase tracking-tight text-white mb-8 leading-tight">
            IoT & Cloud<br />
            <span className="text-white/40">cho máy pha cà phê</span>
          </h2>

          <p className="text-white/60 text-lg font-light mb-10 max-w-lg leading-relaxed">
            Nền tảng của chúng tôi gắn kết mỗi chiếc máy pha cà phê vào một hệ sinh thái dữ liệu thông minh — từ cảm biến IoT đến dashboard quản lý doanh nghiệp.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-12 w-full">
            {features.map((f, i) => (
              <div key={i} className="flex flex-col gap-2 bg-white/5 hover:bg-white/10 transition-all p-5 rounded-xl border border-white/10">
                <div className="text-lp-card">{f.icon}</div>
                <div className="text-white font-bold text-sm">{f.title}</div>
                <div className="text-white/50 text-xs font-light leading-relaxed">{f.desc}</div>
              </div>
            ))}
          </div>

          <Link
            href="/technology"
            id="innovation-cta-btn"
            className="group inline-flex items-center gap-3 px-8 py-4 border border-lp-card/50 text-lp-card rounded-full font-bold uppercase tracking-widest text-sm hover:bg-lp-card hover:text-black transition-all duration-300"
          >
            Khám phá công nghệ <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        {/* Right: Visual mock of dashboard on laptop/tablet */}
        <div className="relative w-full h-[500px] lg:h-[650px] flex items-center justify-center">
          {/* Decorative rings */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] aspect-square border border-white/5 rounded-full animate-[spin_60s_linear_infinite]" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[60%] aspect-square border border-lp-card/10 rounded-full animate-[spin_40s_linear_infinite_reverse]" />

          {/* Dashboard mockup */}
          <div className="relative z-10 w-full max-w-[440px] bg-[#0d0d0d] border border-white/10 rounded-2xl p-5 shadow-[0_0_80px_rgba(203,175,135,0.1)]">
            <div className="flex items-center gap-2 mb-4">
              <span className="w-3 h-3 rounded-full bg-red-500/80"></span>
              <span className="w-3 h-3 rounded-full bg-yellow-500/80"></span>
              <span className="w-3 h-3 rounded-full bg-green-500/80"></span>
              <span className="text-white/30 text-xs ml-2 tracking-widest">DEER COFFEE · DASHBOARD</span>
            </div>

            <div className="grid grid-cols-3 gap-3 mb-4">
              {[
                { label: "Machines Online", value: "23 / 25", color: "text-green-400" },
                { label: "Today's Brews", value: "1,247", color: "text-lp-card" },
                { label: "Alerts", value: "2", color: "text-orange-400" },
              ].map((stat, i) => (
                <div key={i} className="bg-white/5 border border-white/5 rounded-lg p-3">
                  <div className={`text-xl font-black ${stat.color}`}>{stat.value}</div>
                  <div className="text-white/30 text-[10px] mt-1 tracking-wider uppercase">{stat.label}</div>
                </div>
              ))}
            </div>

            {/* Fake chart bars */}
            <div className="bg-white/5 border border-white/5 rounded-xl p-4 mb-4">
              <div className="text-white/30 text-[10px] tracking-widest uppercase mb-3">Hourly Extraction Volume</div>
              <div className="flex items-end gap-1.5 h-16">
                {[30, 55, 45, 70, 90, 65, 80, 75, 55, 85, 60, 45].map((h, i) => (
                  <div key={i} className="flex-1 bg-lp-card/50 rounded-sm" style={{ height: `${h}%` }}></div>
                ))}
              </div>
            </div>

            {/* Machine list */}
            <div className="flex flex-col gap-2">
              {[
                { name: "Machine #A01 — Floor 1", status: "Online", ok: true },
                { name: "Machine #A03 — Floor 3", status: "Low Water", ok: false },
              ].map((m, i) => (
                <div key={i} className="flex items-center justify-between bg-white/5 border border-white/5 px-3 py-2 rounded-lg">
                  <span className="text-white/50 text-xs">{m.name}</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${m.ok ? "bg-green-500/20 text-green-400" : "bg-orange-500/20 text-orange-400"}`}>
                    {m.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
