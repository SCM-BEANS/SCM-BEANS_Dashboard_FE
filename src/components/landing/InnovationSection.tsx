"use client";

import { ArrowRight, Cpu, Cloud, Activity, Zap, BarChart3, Wifi } from "lucide-react";
import Link from "next/link";
import { AnimateOnScroll, StaggerContainer } from "./AnimateOnScroll";

const features = [
  {
    icon: <Cpu className="w-5 h-5" />,
    title: "Edge Computing",
    desc: "Xử lý dữ liệu ngay tại máy — không phụ thuộc vào internet",
  },
  {
    icon: <Cloud className="w-5 h-5" />,
    title: "Cloud Sync",
    desc: "Đồng bộ dữ liệu lên cloud liên tục — truy cập từ bất kỳ thiết bị nào",
  },
  {
    icon: <Activity className="w-5 h-5" />,
    title: "Real-time Monitoring",
    desc: "Xem trạng thái tất cả các máy theo thời gian thực",
  },
  {
    icon: <Zap className="w-5 h-5" />,
    title: "Predictive AI",
    desc: "AI dự đoán hỏng hóc trước khi xảy ra, giảm downtime tối đa",
  },
];

export function InnovationSection() {
  return (
    <section id="technology" className="bg-[#F5F7FA] py-24 px-6 overflow-hidden">
      <div className="max-w-[1320px] mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">

        {/* ── LEFT: Dashboard Mockup (light) ── */}
        <AnimateOnScroll direction="left" className="relative w-full flex items-center justify-center order-2 lg:order-1">
          {/* Background glow */}
          <div className="absolute inset-0 bg-[#0671E0]/5 rounded-3xl blur-2xl pointer-events-none" />

          {/* Main mockup card */}
          <div className="relative z-10 w-full max-w-[460px] bg-white border border-[#ABBED1]/40 rounded-2xl shadow-figma-16 overflow-hidden">
            {/* Window chrome */}
            <div className="flex items-center gap-2 px-5 py-3.5 border-b border-[#F5F7FA] bg-[#FAFBFC]">
              <span className="w-2.5 h-2.5 rounded-full bg-[#E53835]/70" />
              <span className="w-2.5 h-2.5 rounded-full bg-[#FBC02D]/70" />
              <span className="w-2.5 h-2.5 rounded-full bg-[#2E7D31]/70" />
              <span className="text-[#89939E] text-xs ml-3 font-medium tracking-wider">
                IoT Monitor · Live
              </span>
              <div className="ml-auto flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#0671E0] animate-[pulse-dot_2s_ease-in-out_infinite]" />
                <span className="text-[10px] text-[#0671E0] font-semibold">LIVE</span>
              </div>
            </div>

            <div className="p-5 space-y-4">
              {/* Status row */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: "Machines Online", value: "23/25", color: "text-[#0671E0]", bg: "bg-[#0671E0]/8", icon: <Wifi className="w-3.5 h-3.5" /> },
                  { label: "Today's Brews", value: "1,247", color: "text-[#2E7D31]", bg: "bg-[#2E7D31]/8", icon: <BarChart3 className="w-3.5 h-3.5" /> },
                  { label: "Alerts", value: "2", color: "text-[#FBC02D]", bg: "bg-[#FBC02D]/10", icon: <Zap className="w-3.5 h-3.5" /> },
                ].map((stat, i) => (
                  <div key={i} className="bg-[#F5F7FA] rounded-xl p-3 border border-[#ABBED1]/30">
                    <div className={`inline-flex p-1 rounded-md mb-2 ${stat.bg} ${stat.color}`}>
                      {stat.icon}
                    </div>
                    <div className={`text-lg font-bold ${stat.color}`}>{stat.value}</div>
                    <div className="text-[#89939E] text-[10px] mt-0.5 tracking-wide">{stat.label}</div>
                  </div>
                ))}
              </div>

              {/* Chart */}
              <div className="bg-[#F5F7FA] border border-[#ABBED1]/30 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-[#89939E] text-[10px] tracking-widest uppercase font-semibold">
                    Hourly Extraction Volume
                  </div>
                  <span className="text-[10px] text-[#0671E0] font-semibold">+12.4%</span>
                </div>
                <div className="flex items-end gap-1 h-16">
                  {[30, 55, 45, 70, 90, 65, 80, 75, 55, 85, 60, 45].map((h, i) => (
                    <div
                      key={i}
                      className={`flex-1 rounded-sm transition-colors ${
                        h === 90 ? "bg-[#0671E0]" : "bg-[#0671E0]/20"
                      }`}
                      style={{ height: `${h}%` }}
                    />
                  ))}
                </div>
              </div>

              {/* Alert item */}
              <div className="flex items-start gap-3 bg-[#FBC02D]/8 border border-[#FBC02D]/20 rounded-xl px-4 py-3">
                <Zap className="w-4 h-4 text-[#FBC02D] mt-0.5 shrink-0" />
                <div>
                  <div className="text-xs font-semibold text-[#4D4D4D]">AI Predictive Alert</div>
                  <div className="text-[11px] text-[#89939E] mt-0.5">Machine #A03 — Maintenance due in 2 days</div>
                </div>
              </div>

              {/* Machine list */}
              <div className="flex flex-col gap-2">
                {[
                  { name: "Machine #A01 — Floor 1", status: "Online" },
                  { name: "Machine #B02 — Office", status: "Online" },
                ].map((m, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between bg-[#F5F7FA] border border-[#ABBED1]/30 px-3 py-2.5 rounded-lg"
                  >
                    <span className="text-[#4D4D4D] text-xs font-medium">{m.name}</span>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#0671E0]/10 text-[#0671E0]">
                      {m.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </AnimateOnScroll>

        {/* ── RIGHT: Content ── */}
        <AnimateOnScroll direction="right" className="order-1 lg:order-2 flex flex-col items-start">
          {/* Eyebrow */}
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-0.5 bg-[#0671E0]" />
            <span className="text-[#0671E0] tracking-[0.2em] uppercase text-xs font-semibold">Technology</span>
          </div>

          <h2
            className="text-[#18191F] font-semibold mb-5 leading-tight"
            style={{ fontSize: "clamp(28px, 4vw, 36px)", lineHeight: "44px" }}
          >
            IoT &amp; Cloud cho máy pha cà phê
          </h2>

          <p className="text-[#89939E] mb-10 max-w-[480px]" style={{ fontSize: "18px", lineHeight: "28px" }}>
            Nền tảng của chúng tôi gắn kết mỗi chiếc máy pha cà phê vào một hệ sinh thái
            dữ liệu thông minh — từ cảm biến IoT đến dashboard quản lý doanh nghiệp.
          </p>

          {/* Feature cards */}
          <StaggerContainer staggerMs={100} className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-10 w-full">
            {features.map((f, i) => (
              <div
                key={i}
                className="flex flex-col gap-3 bg-white hover:bg-[#0671E0]/3 transition-colors p-5 rounded-xl border border-[#ABBED1]/40 hover:border-[#0671E0]/30 shadow-figma-2 hover:shadow-figma-4 h-full group"
              >
                <div className="w-9 h-9 rounded-lg bg-[#0671E0]/8 flex items-center justify-center text-[#0671E0] group-hover:bg-[#0671E0] group-hover:text-white transition-colors duration-300">
                  {f.icon}
                </div>
                <div className="text-[#18191F] font-semibold text-sm">{f.title}</div>
                <div className="text-[#89939E] text-sm leading-relaxed">{f.desc}</div>
              </div>
            ))}
          </StaggerContainer>

          <Link
            href="/technology"
            id="innovation-cta-btn"
            className="btn-primary group"
          >
            Khám phá công nghệ
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        </AnimateOnScroll>
      </div>
    </section>
  );
}
