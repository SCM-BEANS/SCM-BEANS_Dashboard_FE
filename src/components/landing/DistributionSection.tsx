"use client";

import { ArrowRight, MapPin, Clock, Headphones } from "lucide-react";
import Link from "next/link";
import { AnimateOnScroll, StaggerContainer } from "./AnimateOnScroll";

const stats = [
  { value: "500+", label: "Máy đang thuê" },
  { value: "50+", label: "Doanh nghiệp đối tác" },
  { value: "10", label: "Tỉnh thành triển khai" },
  { value: "24/7", label: "Hỗ trợ kỹ thuật" },
];

const servicePoints = [
  {
    icon: <MapPin className="w-5 h-5" />,
    title: "Triển khai tại chỗ",
    desc: "Đội kỹ thuật lắp đặt và cấu hình máy tại địa điểm của bạn trong 24 giờ.",
  },
  {
    icon: <Clock className="w-5 h-5" />,
    title: "Bảo trì định kỳ",
    desc: "Lịch bảo trì tự động, nhắc nhở vệ sinh máy, thay linh kiện đúng hạn.",
  },
  {
    icon: <Headphones className="w-5 h-5" />,
    title: "Hỗ trợ 24/7",
    desc: "Hotline và chat trực tuyến, phản hồi trong vòng 15 phút cho mọi sự cố.",
  },
];

export function DistributionSection() {
  return (
    <section id="distribution" className="bg-white py-24 px-6">
      <div className="max-w-[1320px] mx-auto">

        {/* Stats row */}
        <AnimateOnScroll>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-0 border border-[#ABBED1]/40 rounded-2xl overflow-hidden mb-20 shadow-figma-2">
            {stats.map((s, i) => (
              <div
                key={i}
                className={`p-6 sm:p-10 text-center bg-white ${
                  i < stats.length - 1 ? "border-r border-[#ABBED1]/40" : ""
                }`}
              >
                <div
                  className="font-bold text-[#0671E0] mb-2"
                  style={{ fontSize: "clamp(28px, 4vw, 48px)" }}
                >
                  {s.value}
                </div>
                <div className="text-[11px] text-[#89939E] uppercase tracking-widest font-semibold">
                  {s.label}
                </div>
              </div>
            ))}
          </div>
        </AnimateOnScroll>

        {/* Content grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">

          {/* Left: Map visual */}
          <AnimateOnScroll direction="left" className="relative w-full rounded-2xl overflow-hidden aspect-[4/3] flex items-center justify-center bg-[#F5F7FA] border border-[#ABBED1]/30 shadow-figma-4 group">
            {/* Map bg */}
            <div
              className="absolute inset-0 opacity-30 bg-cover bg-center group-hover:scale-105 transition-transform duration-1000"
              style={{
                backgroundImage:
                  "url('https://images.unsplash.com/photo-1524661135-423995f22d0b?auto=format&fit=crop&q=80&w=1200')",
              }}
            />
            {/* Blue tint overlay */}
            <div className="absolute inset-0 bg-[#0671E0]/5" />

            <div className="relative z-10 w-full h-full p-8">
              <div className="text-[#89939E] text-xs tracking-widest uppercase mb-4 font-semibold">
                Service Coverage · Vietnam
              </div>
              <div className="relative w-full h-[260px]">
                {[
                  { top: "5%", left: "48%", label: "Hà Nội", size: "large", delay: 0 },
                  { top: "35%", left: "55%", label: "Đà Nẵng", size: "medium", delay: 200 },
                  { top: "60%", left: "40%", label: "TP.HCM", size: "large", delay: 100 },
                  { top: "70%", left: "50%", label: "Bình Dương", size: "medium", delay: 400 },
                  { top: "15%", left: "44%", label: "Hải Phòng", size: "medium", delay: 300 },
                  { top: "50%", left: "38%", label: "Nha Trang", size: "medium", delay: 500 },
                ].map((point, i) => (
                  <div
                    key={i}
                    className="absolute flex flex-col items-center animate-[fade-in-up_0.5s_ease-out_forwards]"
                    style={{ top: point.top, left: point.left, animationDelay: `${point.delay}ms`, opacity: 0 }}
                  >
                    <div className="relative">
                      <div
                        className={`rounded-full bg-[#0671E0] animate-ping absolute ${
                          point.size === "large" ? "w-4 h-4" : "w-3 h-3"
                        }`}
                        style={{ opacity: 0.4 }}
                      />
                      <div
                        className={`rounded-full bg-[#0671E0] relative z-10 ${
                          point.size === "large" ? "w-4 h-4" : "w-3 h-3"
                        }`}
                      />
                    </div>
                    <span className="text-[#263238] text-[11px] mt-1.5 whitespace-nowrap font-bold drop-shadow-sm">
                      {point.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </AnimateOnScroll>

          {/* Right: Content */}
          <AnimateOnScroll direction="right" className="flex flex-col gap-8">
            <div>
              {/* Eyebrow */}
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-0.5 bg-[#0671E0]" />
                <span className="text-[#0671E0] tracking-[0.2em] uppercase text-xs font-semibold">Coverage</span>
              </div>
              <h2
                className="text-[#18191F] font-semibold mb-5 leading-tight"
                style={{ fontSize: "clamp(28px, 4vw, 36px)", lineHeight: "44px" }}
              >
                Dịch vụ phủ rộng toàn quốc
              </h2>
              <p className="text-[#89939E]" style={{ fontSize: "18px", lineHeight: "28px" }}>
                Từ Hà Nội đến TP.HCM, đội ngũ kỹ thuật viên của DEER COFFEE sẵn sàng
                triển khai và hỗ trợ các doanh nghiệp vừa và lớn trong toàn bộ chuỗi dịch vụ máy pha cà phê.
              </p>
            </div>

            {/* Service cards */}
            <StaggerContainer staggerMs={100} className="flex flex-col gap-4">
              {servicePoints.map((sp, i) => (
                <div
                  key={i}
                  className="flex gap-4 p-5 bg-white rounded-xl border border-[#ABBED1]/40 hover:border-[#0671E0]/30 shadow-figma-2 hover:shadow-figma-4 transition-all duration-200 group"
                >
                  <div className="w-10 h-10 rounded-xl bg-[#0671E0]/8 flex items-center justify-center text-[#0671E0] shrink-0 group-hover:bg-[#0671E0] group-hover:text-white transition-all duration-200">
                    {sp.icon}
                  </div>
                  <div>
                    <div className="font-semibold text-[#18191F] mb-1.5 text-base">{sp.title}</div>
                    <div className="text-[#89939E] text-sm leading-relaxed">{sp.desc}</div>
                  </div>
                </div>
              ))}
            </StaggerContainer>

            <Link
              href="/about"
              id="distribution-cta-btn"
              className="btn-primary group w-fit mt-2"
            >
              Liên hệ triển khai
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </AnimateOnScroll>
        </div>
      </div>
    </section>
  );
}
