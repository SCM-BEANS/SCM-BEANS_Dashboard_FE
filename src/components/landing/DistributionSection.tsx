"use client";

import { ArrowRight, Eye, ShieldCheck, Lightbulb } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { AnimateOnScroll, StaggerContainer } from "./AnimateOnScroll";
import { PATH_PUBLIC } from "@/routes/path";

const stats = [
  { value: "2020", label: "Năm thành lập" },
  { value: "500+", label: "Máy đã triển khai" },
  { value: "50+", label: "Doanh nghiệp đồng hành" },
  { value: "IoT", label: "Công nghệ kết nối" },
];

const companyValues = [
  {
    icon: <Eye className="w-5 h-5" />,
    title: "Minh bạch",
    desc: "Giá cả rõ ràng, hợp đồng đơn giản. Không phí ẩn, không điều khoản khó hiểu.",
  },
  {
    icon: <ShieldCheck className="w-5 h-5" />,
    title: "Đáng tin cậy",
    desc: "SLA 99.9% uptime, đội kỹ thuật phản hồi trong 15 phút. Chúng tôi cam kết và thực hiện đúng cam kết.",
  },
  {
    icon: <Lightbulb className="w-5 h-5" />,
    title: "Đổi mới liên tục",
    desc: "Cập nhật tính năng mới mỗi quý, lắng nghe phản hồi từ khách hàng để cải thiện liên tục.",
  },
];

export function DistributionSection() {
  return (
    <section id="distribution" className="relative bg-[#FDFBF7] py-24 px-6 overflow-hidden border-b border-[#E0E0E0]">
      {/* ── Ambient Wine Glow: Ánh đỏ rượu tỏa sáng mờ dần từ 2 bên vào trong ── */}
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `
            radial-gradient(ellipse 35% 80% at 0% 50%, rgba(114, 28, 36, 0.12) 0%, rgba(114, 28, 36, 0.02) 55%, transparent 100%),
            radial-gradient(ellipse 35% 80% at 100% 50%, rgba(114, 28, 36, 0.12) 0%, rgba(114, 28, 36, 0.02) 55%, transparent 100%),
            linear-gradient(to right, rgba(114, 28, 36, 0.08) 0%, rgba(114, 28, 36, 0.03) 16%, rgba(114, 28, 36, 0.01) 32%, transparent 45%, transparent 55%, rgba(114, 28, 36, 0.01) 68%, rgba(114, 28, 36, 0.03) 84%, rgba(114, 28, 36, 0.08) 100%)
          `
        }}
      />

      {/* ── Wine Grid: Bold at outer edges, fading softly in the center ── */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(to right, #721C24 1px, transparent 1px),
            linear-gradient(to bottom, #721C24 1px, transparent 1px)
          `,
          backgroundSize: "48px 48px",
          maskImage: "linear-gradient(to right, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.1) 18%, rgba(0,0,0,0.015) 35%, rgba(0,0,0,0.015) 65%, rgba(0,0,0,0.1) 82%, rgba(0,0,0,0.3) 100%)",
          WebkitMaskImage: "linear-gradient(to right, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.1) 18%, rgba(0,0,0,0.015) 35%, rgba(0,0,0,0.015) 65%, rgba(0,0,0,0.1) 82%, rgba(0,0,0,0.3) 100%)",
        }}
      />

      <div className="relative z-10 max-w-[1320px] mx-auto">

        {/* Stats row */}
        <AnimateOnScroll>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-0 border border-[#E0E0E0] rounded-2xl overflow-hidden mb-20 shadow-figma-2 bg-white">
            {stats.map((s, i) => (
              <div
                key={i}
                className={`p-6 sm:p-10 text-center bg-white ${
                  i < stats.length - 1 ? "border-r border-[#E0E0E0]" : ""
                }`}
              >
                <div
                  className="font-bold text-[#721C24] mb-2"
                  style={{ fontSize: "clamp(28px, 4vw, 48px)" }}
                >
                  {s.value}
                </div>
                <div className="text-[11px] text-[#9E9E9E] uppercase tracking-widest font-semibold">
                  {s.label}
                </div>
              </div>
            ))}
          </div>
        </AnimateOnScroll>

        {/* Content grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">

          {/* Left: Company visual */}
          <AnimateOnScroll
            direction="left"
            className="relative w-full rounded-2xl overflow-hidden aspect-[4/3] flex items-center justify-center bg-white border border-[#E0E0E0] shadow-figma-4"
          >
            <div
              aria-hidden="true"
              className="absolute inset-0"
              style={{
                background:
                  "radial-gradient(ellipse at 70% 35%, rgba(212,163,115,.2), transparent 58%), linear-gradient(135deg, #FFFFFF 0%, #FDFBF7 52%, #FAF7F2 100%)",
              }}
            />
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 opacity-40"
              style={{
                backgroundImage: "radial-gradient(circle, rgba(114,28,36,.14) 1px, transparent 1.5px)",
                backgroundSize: "28px 28px",
              }}
            />
            <div className="relative z-10 flex h-full w-full flex-col items-center justify-center p-6 sm:p-8">
              <div className="absolute left-6 top-6 text-[#9E9E9E] text-xs tracking-widest uppercase font-semibold">
                DOLORES COFFEE · OUR STORY
              </div>
              <div className="relative h-full min-h-[240px] w-full max-w-[560px]">
                <Image
                  src="/images/coffee-machine-float.png"
                  alt="Máy pha cà phê DOLORES COFFEE"
                  fill
                  priority
                  sizes="(max-width: 1023px) 100vw, 50vw"
                  className="object-contain p-6 drop-shadow-[0_24px_40px_rgba(114,28,36,0.18)]"
                />
              </div>
            </div>
          </AnimateOnScroll>

          {/* Right: Content */}
          <AnimateOnScroll direction="right" className="flex flex-col gap-8">
            <div>
              {/* Eyebrow */}
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-0.5 bg-[#721C24]" />
                <span className="text-[#721C24] tracking-[0.2em] uppercase text-xs font-semibold">About Us</span>
              </div>
              <h2
                className="text-[#721C24] font-serif font-semibold mb-5 leading-tight"
                style={{ fontSize: "clamp(28px, 4vw, 36px)", lineHeight: "44px" }}
              >
                Chúng tôi là DOLORES COFFEE
              </h2>
              <p className="text-[#9E9E9E]" style={{ fontSize: "18px", lineHeight: "28px" }}>
                Chúng tôi tin rằng mọi doanh nghiệp, dù lớn hay nhỏ, đều xứng đáng được tiếp cận công nghệ máy pha cà phê tốt nhất mà không cần đầu tư vốn lớn ban đầu.
              </p>
            </div>

            {/* Company values */}
            <StaggerContainer staggerMs={100} className="flex flex-col gap-4">
              {companyValues.map((sp, i) => (
                <div
                  key={i}
                  className="flex gap-4 p-5 bg-white rounded-xl border border-[#E0E0E0] hover:border-[#721C24]/40 shadow-figma-2 hover:shadow-figma-4 transition-all duration-200 group"
                >
                  <div className="w-10 h-10 rounded-xl bg-[#721C24]/8 flex items-center justify-center text-[#721C24] shrink-0 group-hover:bg-[#721C24] group-hover:text-white transition-all duration-200">
                    {sp.icon}
                  </div>
                  <div>
                    <div className="font-semibold text-[rgba(0,0,0,0.87)] mb-1.5 text-base">{sp.title}</div>
                    <div className="text-[#9E9E9E] text-sm leading-relaxed">{sp.desc}</div>
                  </div>
                </div>
              ))}
            </StaggerContainer>

            <Link
              href={PATH_PUBLIC.about}
              id="distribution-cta-btn"
              className="btn-primary group w-fit mt-2"
            >
              Tìm hiểu thêm
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </AnimateOnScroll>
        </div>
      </div>
    </section>
  );
}
