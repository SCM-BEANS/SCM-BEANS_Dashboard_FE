"use client";

import { LandingNav } from "@/components/landing/LandingNav";
import { LandingFooter, CtaSection } from "@/components/landing/CtaFooter";
import { AnimateOnScroll } from "@/components/landing/AnimateOnScroll";
import Link from "next/link";
import { ArrowRight, Cpu, Cloud, Activity, Zap, Lock, Code } from "lucide-react";

const techStack = [
  { icon: <Cpu className="w-6 h-6" />, title: "Edge Computing", desc: "Xử lý và phân tích dữ liệu ngay tại máy, không cần phụ thuộc vào kết nối internet liên tục. Đảm bảo máy hoạt động ổn định dù mạng yếu." },
  { icon: <Cloud className="w-6 h-6" />, title: "Cloud Infrastructure", desc: "Hạ tầng cloud đa vùng với SLA 99.99% uptime. Dữ liệu được mã hóa và lưu trữ an toàn tuân thủ tiêu chuẩn ISO 27001." },
  { icon: <Activity className="w-6 h-6" />, title: "Real-time Streaming", desc: "Dữ liệu từ cảm biến được truyền lên cloud mỗi giây. Dashboard hiển thị trạng thái tất cả các máy theo thời gian thực." },
  { icon: <Zap className="w-6 h-6" />, title: "AI Predictive Engine", desc: "Mô hình machine learning được huấn luyện trên hàng triệu lần brew để dự đoán hỏng hóc và tối ưu lịch bảo trì." },
  { icon: <Lock className="w-6 h-6" />, title: "Security First", desc: "Bảo mật đầu cuối với mã hóa TLS 1.3, xác thực 2 yếu tố và kiểm soát phân quyền theo từng máy và từng người dùng." },
  { icon: <Code className="w-6 h-6" />, title: "Open API Integration", desc: "REST API đầy đủ cho phép tích hợp với hệ thống POS, ERP, CRM của doanh nghiệp. Hỗ trợ Webhook và WebSocket real-time." },
];

const sensors = [
  { name: "Cảm biến nhiệt độ", range: "0–120°C ±0.1°C", update: "1s" },
  { name: "Cảm biến áp suất", range: "0–20 bar ±0.05 bar", update: "1s" },
  { name: "Đo lưu lượng nước", range: "0–5 L/min", update: "100ms" },
  { name: "Đếm số lần brew", range: "0–99,999", update: "Realtime" },
  { name: "Cảm biến mức nước", range: "0–100%", update: "5s" },
  { name: "Trạng thái hoạt động", range: "ON/OFF/ERROR", update: "Realtime" },
];

const archLines = [
  { text: "[ Coffee Machine ]", isMain: true },
  { text: "↓  IoT Sensors", isMain: false },
  { text: "[ Edge Gateway ]", isMain: true },
  { text: "↓  MQTT / TLS 1.3", isMain: false },
  { text: "[ Cloud Broker ]", isMain: true },
  { text: "↓  Stream Processing", isMain: false },
  { text: "[ Time-Series DB ]", isMain: true },
  { text: "↓  REST API / WS", isMain: false },
  { text: "[ Dashboard / Apps ]", isMain: true },
];

export default function TechnologyPage() {
  return (
    <>
      <LandingNav />
      <main className="pt-[72px]">

        {/* ── Hero ── */}
        <section className="bg-white border-b border-[#E0E0E0] py-16 sm:py-20 lg:py-28 px-4 sm:px-6">
          <div className="max-w-[1320px] mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            <div>
              <AnimateOnScroll delay={0}>
                <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#721C24]/10 rounded-full mb-5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#721C24]" />
                  <span className="text-[#721C24] text-xs font-semibold tracking-wider uppercase">Technology</span>
                </div>
              </AnimateOnScroll>
              <AnimateOnScroll delay={80}>
                <h1 className="text-[#721C24] font-semibold mb-5 leading-tight" style={{ fontSize: "clamp(28px, 4.5vw, 52px)", lineHeight: "1.15" }}>
                  IoT &amp; Cloud cho{" "}
                  <span className="text-[#721C24]">máy pha cà phê</span>
                </h1>
              </AnimateOnScroll>
              <AnimateOnScroll delay={180}>
                <p className="text-[#9E9E9E] mb-8 max-w-[480px]" style={{ fontSize: "clamp(15px, 2vw, 18px)", lineHeight: "1.7" }}>
                  Chúng tôi gắn kết từng chiếc máy pha cà phê với hạ tầng IoT hiện đại,
                  biến mỗi chiếc máy thành một nguồn dữ liệu thông minh.
                </p>
              </AnimateOnScroll>
              <AnimateOnScroll delay={280}>
                <Link href="/solutions" className="btn-primary group">
                  Xem giải pháp <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Link>
              </AnimateOnScroll>
            </div>

            {/* Architecture diagram */}
            <AnimateOnScroll delay={150} direction="right">
              <div className="bg-[#FAF7F2] border border-[#E0E0E0] rounded-2xl p-6 sm:p-8 font-mono shadow-[0px_8px_16px_rgba(114,28,36,0.06)]">
                <div className="flex items-center gap-2 mb-5">
                  <span className="w-2 h-2 rounded-full bg-[#721C24] animate-[pulse-dot_2s_ease-in-out_infinite]" />
                  <div className="text-[#9E9E9E] tracking-widest uppercase text-[10px] font-semibold">System Architecture</div>
                </div>
                <div className="flex flex-col gap-1.5">
                  {archLines.map((line, i) => (
                    <div
                      key={i}
                      className={`text-xs sm:text-sm transition-colors ${
                        line.isMain
                          ? "text-[#721C24] font-semibold bg-white border border-[#E0E0E0] px-4 py-2 rounded-lg shadow-sm"
                          : "text-[#721C24] pl-4 opacity-75 text-[10px] sm:text-xs"
                      }`}
                    >
                      {line.text}
                    </div>
                  ))}
                </div>
              </div>
            </AnimateOnScroll>
          </div>
        </section>

        {/* ── Tech Stack ── */}
        <section className="bg-[#FAF7F2] py-16 sm:py-20 lg:py-24 px-4 sm:px-6">
          <div className="max-w-[1320px] mx-auto">
            <AnimateOnScroll>
              <div className="text-center mb-12">
                <span className="text-xs font-semibold tracking-[0.25em] uppercase text-[#721C24] mb-3 block">Tech Stack</span>
                <h2 className="text-[#721C24] font-semibold" style={{ fontSize: "clamp(24px, 3.5vw, 36px)", lineHeight: "44px" }}>
                  Hạ tầng công nghệ
                </h2>
              </div>
            </AnimateOnScroll>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {techStack.map((t, i) => (
                <AnimateOnScroll key={i} delay={i * 80}>
                  <div className="group bg-white border border-[#E0E0E0] rounded-xl p-6 hover:border-[#721C24]/40 shadow-sm hover:shadow-[0px_8px_16px_rgba(114,28,36,0.08)] transition-all duration-300">
                    <div className="w-11 h-11 rounded-xl bg-[#721C24]/10 flex items-center justify-center text-[#721C24] mb-5 group-hover:bg-[#721C24] group-hover:text-white transition-all duration-300">
                      {t.icon}
                    </div>
                    <h3 className="font-semibold text-black/87 mb-3" style={{ fontSize: "clamp(15px, 2vw, 18px)" }}>{t.title}</h3>
                    <p className="text-[#9E9E9E] text-sm leading-relaxed">{t.desc}</p>
                  </div>
                </AnimateOnScroll>
              ))}
            </div>
          </div>
        </section>

        {/* ── Sensor Table ── */}
        <section className="bg-white py-16 sm:py-20 lg:py-24 px-4 sm:px-6">
          <div className="max-w-[1320px] mx-auto">
            <AnimateOnScroll>
              <div className="text-center mb-12">
                <span className="text-xs font-semibold tracking-[0.25em] uppercase text-[#721C24] mb-3 block">Sensors</span>
                <h2 className="text-[#721C24] font-semibold" style={{ fontSize: "clamp(24px, 3.5vw, 36px)", lineHeight: "44px" }}>
                  Cảm biến tích hợp
                </h2>
              </div>
            </AnimateOnScroll>
            <AnimateOnScroll delay={100}>
              <div className="overflow-x-auto rounded-2xl border border-[#E0E0E0] shadow-sm">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="bg-[#FAF7F2] border-b border-[#E0E0E0]">
                      <th className="text-left py-4 px-5 sm:px-6 font-semibold text-xs uppercase tracking-widest text-[#9E9E9E]">Cảm biến</th>
                      <th className="text-left py-4 px-5 sm:px-6 font-semibold text-xs uppercase tracking-widest text-[#9E9E9E]">Dải đo</th>
                      <th className="text-left py-4 px-5 sm:px-6 font-semibold text-xs uppercase tracking-widest text-[#9E9E9E]">Tần suất cập nhật</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sensors.map((s, i) => (
                      <tr key={i} className="border-b border-[#FAF7F2] hover:bg-[#721C24]/5 transition-colors">
                        <td className="py-4 px-5 sm:px-6 font-semibold text-black/87">{s.name}</td>
                        <td className="py-4 px-5 sm:px-6 font-mono text-[#9E9E9E] text-xs">{s.range}</td>
                        <td className="py-4 px-5 sm:px-6">
                          <span className="bg-[#721C24]/10 text-[#721C24] text-[10px] px-3 py-1 rounded-full font-semibold">{s.update}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </AnimateOnScroll>
          </div>
        </section>

        <CtaSection />
      </main>
      <LandingFooter />
    </>
  );
}
