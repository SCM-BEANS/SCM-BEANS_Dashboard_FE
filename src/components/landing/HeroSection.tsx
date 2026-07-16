"use client";

import { ArrowRight, CheckCircle2, BarChart3, Wifi, Zap } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useEffect, useRef } from "react";

const highlights = [
  "Tích hợp IoT cho từng máy",
  "Dashboard quản lý thời gian thực",
  "Bảo trì dự đoán bằng AI",
  "Hỗ trợ kỹ thuật 24/7",
];

const stats = [
  { value: "500+", label: "Máy đang vận hành" },
  { value: "50+", label: "Doanh nghiệp đối tác" },
  { value: "99.9%", label: "Uptime đảm bảo" },
];

function useEntranceAnimation(refs: React.RefObject<HTMLElement | null>[], delays: number[]) {
  useEffect(() => {
    refs.forEach((ref, i) => {
      const el = ref.current;
      if (!el) return;
      el.style.opacity = "0";
      el.style.transform = "translateY(24px)";
      el.style.transition = `opacity 0.7s cubic-bezier(0.16,1,0.3,1) ${delays[i]}ms, transform 0.7s cubic-bezier(0.16,1,0.3,1) ${delays[i]}ms`;
      requestAnimationFrame(() => setTimeout(() => {
        el.style.opacity = "1";
        el.style.transform = "none";
      }, 80));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

export function HeroSection() {
  const badgeRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const descRef = useRef<HTMLParagraphElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const ctaRef = useRef<HTMLDivElement>(null);
  const statsRef = useRef<HTMLDivElement>(null);
  const mockupRef = useRef<HTMLDivElement>(null);

  useEntranceAnimation(
    [badgeRef, titleRef, descRef, listRef, ctaRef, statsRef, mockupRef],
    [0, 80, 180, 280, 380, 500, 200]
  );

  return (
    <section className="w-full bg-white pt-[72px]" id="home">
      {/* Subtle grid bg */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.025]"
        style={{
          backgroundImage:
            "linear-gradient(#0671E0 1px,transparent 1px),linear-gradient(90deg,#0671E0 1px,transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />

      <div className="relative max-w-[1320px] mx-auto px-4 sm:px-6 py-16 sm:py-20 lg:py-28">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">

          {/* ── LEFT ── */}
          <div className="flex flex-col items-start">
            {/* Eyebrow */}
            <div
              ref={badgeRef}
              className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#0671E0]/8 rounded-full mb-5"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[#0671E0] animate-[pulse-dot_2s_ease-in-out_infinite]" />
              <span className="text-[#0671E0] text-xs font-semibold tracking-wider uppercase">
                Coffee Machine as a Service
              </span>
            </div>

            {/* H1 */}
            <h1
              ref={titleRef}
              className="text-[#18191F] font-semibold mb-5 leading-tight"
              style={{ fontSize: "clamp(32px, 5vw, 60px)", lineHeight: "1.15" }}
            >
              Thuê máy pha cà phê{" "}
              <span className="text-[#0671E0]">thông minh</span>{" "}
              cho doanh nghiệp
            </h1>

            {/* Description */}
            <p
              ref={descRef}
              className="text-[#89939E] mb-7 max-w-[480px]"
              style={{ fontSize: "clamp(15px, 2vw, 18px)", lineHeight: "1.7" }}
            >
              Giải pháp tích hợp IoT &amp; Cloud hàng đầu. Quản lý toàn bộ đội máy từ
              một nền tảng duy nhất — theo dõi thời gian thực, bảo trì dự đoán, vận hành không gián đoạn.
            </p>

            {/* Highlights */}
            <ul ref={listRef} className="flex flex-col gap-2 mb-8">
              {highlights.map((item, i) => (
                <li key={i} className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-[#0671E0] shrink-0" />
                  <span className="text-[#4D4D4D] text-sm font-medium">{item}</span>
                </li>
              ))}
            </ul>

            {/* CTA */}
            <div ref={ctaRef} className="flex flex-col sm:flex-row gap-3 w-full">
              <Link
                href="/solutions"
                id="hero-explore-btn"
                className="btn-primary group text-base px-7 py-3.5"
              >
                Khám phá giải pháp
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-200" />
              </Link>
              <Link
                href="/login"
                id="hero-login-btn"
                className="btn-secondary text-base px-7 py-3.5"
              >
                Đăng nhập Dashboard
              </Link>
            </div>


          </div>

          {/* ── RIGHT: Single Image Floating Composition ── */}
          <div ref={mockupRef} className="relative w-full aspect-square max-w-[540px] mx-auto mt-12 lg:mt-0 flex items-center justify-center pointer-events-none">
            {/* Glow blob background */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] aspect-square rounded-full bg-[#0671E0]/10 blur-[80px] -z-10" />

            {/* Base Layer: Main Image (herosection1) */}
            <div className="relative w-[100%] h-[100%] rounded-[32px] overflow-hidden shadow-[0px_24px_48px_rgba(171,190,209,0.4)] border-[8px] border-white z-10">
              <video
                src="/video/hero.mp4"
                autoPlay
                loop
                muted
                playsInline
                className="w-full h-full object-cover pointer-events-none"
              />
            </div>

            {/* Independent Floating Entity 1: Code / Analytics */}
            <div className="absolute top-[5%] right-[0%] bg-white rounded-2xl p-3 shadow-[0px_12px_24px_rgba(171,190,209,0.25)] flex items-center justify-center z-40 animate-[wave_5s_ease-in-out_infinite_0.2s]">
              <div className="w-12 h-12 rounded-xl bg-[#2E7D31]/10 flex items-center justify-center">
                <BarChart3 className="w-6 h-6 text-[#2E7D31]" />
              </div>
            </div>



            {/* Independent Floating Entity 3: Wifi/IoT Badge */}
            <div className="absolute top-[45%] right-[-5%] bg-[#0671E0] rounded-xl px-4 py-2.5 shadow-[0px_12px_24px_rgba(6,113,224,0.3)] flex items-center gap-2 z-50 animate-[landing-float_3s_ease-in-out_infinite_0.8s]">
              <Wifi className="w-4 h-4 text-white" />
              <span className="text-white text-xs font-bold tracking-wider">SYNCING...</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
