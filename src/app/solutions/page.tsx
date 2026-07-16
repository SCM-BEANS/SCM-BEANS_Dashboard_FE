"use client";

import { LandingNav } from "@/components/landing/LandingNav";
import { LandingFooter, CtaSection } from "@/components/landing/CtaFooter";
import { AnimateOnScroll } from "@/components/landing/AnimateOnScroll";
import {
  Wifi, BarChart2, Wrench, Shield, ArrowRight,
  CheckCircle2, Coffee, TrendingUp, Clock, Headphones
} from "lucide-react";
import Link from "next/link";

const solutions = [
  {
    icon: <Wifi className="w-10 h-10" />,
    number: "01",
    title: "Cho thuê máy pha cà phê",
    subtitle: "Rental Service",
    desc: "Không cần vốn đầu tư ban đầu. Chúng tôi cung cấp máy pha cà phê thương mại chất lượng cao với phí thuê hàng tháng hợp lý. Bao gồm lắp đặt, bảo trì và hỗ trợ kỹ thuật toàn phần.",
    features: ["Không vốn đầu tư ban đầu", "Đổi mới máy theo hợp đồng", "Bảo hành toàn bộ trong thời gian thuê", "Linh hoạt mở rộng theo nhu cầu"],
  },
  {
    icon: <BarChart2 className="w-10 h-10" />,
    number: "02",
    title: "Dashboard quản lý thông minh",
    subtitle: "Cloud Management",
    desc: "Theo dõi và quản lý toàn bộ đội máy của bạn từ một giao diện duy nhất. Dữ liệu cập nhật theo thời gian thực giúp bạn ra quyết định nhanh chóng và chính xác.",
    features: ["Báo cáo doanh thu theo ca/ngày/tháng", "Phân tích hiệu suất từng máy", "Cảnh báo sự cố tức thời", "Xuất báo cáo Excel/PDF"],
  },
  {
    icon: <Wrench className="w-10 h-10" />,
    number: "03",
    title: "Bảo trì dự đoán & Hỗ trợ kỹ thuật",
    subtitle: "Predictive Maintenance",
    desc: "Hệ thống AI phân tích dữ liệu vận hành để dự đoán hỏng hóc trước khi xảy ra. Đội kỹ thuật viên của chúng tôi sẵn sàng hỗ trợ 24/7.",
    features: ["Lịch bảo trì tự động", "Cảnh báo qua email & SMS", "Phản hồi sự cố trong 15 phút", "Đội kỹ thuật tại chỗ trong 4 giờ"],
  },
  {
    icon: <Shield className="w-10 h-10" />,
    number: "04",
    title: "Tích hợp IoT & Cloud",
    subtitle: "IoT Integration",
    desc: "Gắn kết từng chiếc máy pha cà phê vào hạ tầng IoT hiện đại. Thu thập dữ liệu vận hành theo thời gian thực, lưu trữ trên cloud bảo mật và phân tích tự động.",
    features: ["Cảm biến nhiệt độ, áp suất, lưu lượng", "Kết nối WiFi & 4G dự phòng", "Lưu trữ cloud 99.99% uptime", "API tích hợp với hệ thống POS"],
  },
];

const stats = [
  { icon: <Coffee className="w-5 h-5" />, value: "500+", label: "Máy đang vận hành" },
  { icon: <TrendingUp className="w-5 h-5" />, value: "50+", label: "Doanh nghiệp đối tác" },
  { icon: <Clock className="w-5 h-5" />, value: "<15 phút", label: "Thời gian phản hồi" },
  { icon: <Headphones className="w-5 h-5" />, value: "24/7", label: "Hỗ trợ kỹ thuật" },
];

export default function SolutionsPage() {
  return (
    <>
      <LandingNav />
      <main className="pt-[72px]">

        {/* ── Hero ── */}
        <section className="bg-[#F5F7FA] border-b border-[#ABBED1]/30 py-16 sm:py-20 lg:py-28 px-4 sm:px-6">
          <div className="max-w-[1320px] mx-auto">
            <AnimateOnScroll delay={0}>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#0671E0]/8 rounded-full mb-5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#0671E0]" />
                <span className="text-[#0671E0] text-xs font-semibold tracking-wider uppercase">Solutions</span>
              </div>
            </AnimateOnScroll>
            <AnimateOnScroll delay={80}>
              <h1
                className="text-[#18191F] font-semibold mb-5 max-w-[800px] leading-tight"
                style={{ fontSize: "clamp(32px, 5vw, 60px)", lineHeight: "1.15" }}
              >
                Giải pháp toàn diện{" "}
                <span className="text-[#0671E0]">cho doanh nghiệp</span>
              </h1>
            </AnimateOnScroll>
            <AnimateOnScroll delay={180}>
              <p
                className="text-[#89939E] max-w-[600px] mb-10"
                style={{ fontSize: "clamp(15px, 2vw, 18px)", lineHeight: "1.7" }}
              >
                DEER COFFEE cung cấp hệ sinh thái đầy đủ từ cho thuê máy, tích hợp IoT đến
                quản lý vận hành thông minh — tất cả trong một nền tảng duy nhất.
              </p>
            </AnimateOnScroll>

            {/* Stats */}
            <AnimateOnScroll delay={280}>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-0 border border-[#ABBED1]/40 rounded-2xl overflow-hidden shadow-[0px_4px_8px_rgba(171,190,209,0.4)]">
                {stats.map((s, i) => (
                  <div
                    key={i}
                    className={`bg-white p-5 sm:p-8 flex flex-col items-center text-center gap-2 ${
                      i < stats.length - 1 ? "border-r border-[#ABBED1]/40" : ""
                    }`}
                  >
                    <div className="text-[#0671E0]/50">{s.icon}</div>
                    <div
                      className="font-bold text-[#0671E0]"
                      style={{ fontSize: "clamp(22px, 3vw, 36px)" }}
                    >
                      {s.value}
                    </div>
                    <div className="text-[#89939E] text-[10px] sm:text-xs uppercase tracking-widest font-semibold">{s.label}</div>
                  </div>
                ))}
              </div>
            </AnimateOnScroll>
          </div>
        </section>

        {/* ── Solutions List ── */}
        {solutions.map((s, i) => (
          <section
            key={i}
            className={`py-20 sm:py-24 lg:py-28 px-4 sm:px-6 ${i % 2 === 0 ? "bg-white" : "bg-[#F5F7FA]"}`}
          >
            <div className="max-w-[1320px] mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">

              {/* Text side */}
              <AnimateOnScroll delay={0} direction={i % 2 === 0 ? "left" : "right"} className={i % 2 === 1 ? "lg:order-2" : ""}>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider mb-5 bg-[#0671E0]/8 text-[#0671E0]">
                  {s.subtitle}
                </span>
                <div className="text-[80px] sm:text-[100px] font-black leading-none text-[#0671E0]/5 -mb-4 select-none">{s.number}</div>
                <h2
                  className="text-[#18191F] font-semibold mb-4 leading-tight"
                  style={{ fontSize: "clamp(24px, 3.5vw, 36px)", lineHeight: "1.25" }}
                >
                  {s.title}
                </h2>
                <p className="text-[#89939E] leading-relaxed mb-7" style={{ fontSize: "clamp(14px, 1.8vw, 16px)", lineHeight: "1.7" }}>
                  {s.desc}
                </p>
                <ul className="flex flex-col gap-2.5 mb-8">
                  {s.features.map((f, fi) => (
                    <li key={fi} className="flex items-center gap-3 text-sm font-medium text-[#4D4D4D]">
                      <CheckCircle2 className="w-4 h-4 shrink-0 text-[#0671E0]" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/pricing"
                  className="btn-primary group w-fit"
                >
                  Xem bảng giá <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Link>
              </AnimateOnScroll>

              {/* Visual side */}
              <AnimateOnScroll delay={150} direction={i % 2 === 0 ? "right" : "left"} className={`${i % 2 === 1 ? "lg:order-1" : ""} flex items-center justify-center`}>
                <div className="w-full aspect-square max-w-[420px] rounded-2xl flex flex-col items-center justify-center gap-6 relative overflow-hidden bg-[#0671E0]/5 border border-[#0671E0]/10 shadow-[0px_8px_16px_rgba(171,190,209,0.4)] group hover:shadow-[0px_16px_32px_rgba(6,113,224,0.12)] transition-all duration-500">
                  {/* Watermark number */}
                  <div className="absolute text-[160px] sm:text-[200px] font-black leading-none select-none pointer-events-none text-[#0671E0]/5">
                    {s.number}
                  </div>
                  {/* Icon */}
                  <div className="relative z-10 p-6 sm:p-8 rounded-2xl bg-[#0671E0]/8 text-[#0671E0] group-hover:bg-[#0671E0] group-hover:text-white transition-all duration-300">
                    {s.icon}
                  </div>
                  {/* Feature pills */}
                  <div className="relative z-10 flex flex-col gap-2 w-full max-w-[260px] sm:max-w-[300px] px-4">
                    {s.features.slice(0, 3).map((f, fi) => (
                      <div key={fi} className="flex items-center gap-2 px-3 sm:px-4 py-2 rounded-xl text-xs font-semibold bg-white border border-[#ABBED1]/30 text-[#4D4D4D] shadow-[0px_2px_4px_rgba(171,190,209,0.4)]">
                        <span className="w-1.5 h-1.5 rounded-full shrink-0 bg-[#0671E0]" />
                        {f}
                      </div>
                    ))}
                  </div>
                </div>
              </AnimateOnScroll>
            </div>
          </section>
        ))}

        {/* ── CTA ── */}
        <CtaSection />
      </main>
      <LandingFooter />
    </>
  );
}
