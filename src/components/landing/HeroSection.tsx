"use client";

import { ArrowRight, ChevronDown } from "lucide-react";
import Link from "next/link";

export function HeroSection() {
  return (
    <section className="relative w-full h-screen flex items-center justify-center overflow-hidden bg-[#1A0E07]" id="home">
      {/* Background */}
      <div
        className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: "url('https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&q=90&w=2000')",
          filter: "brightness(0.35) saturate(0.8)"
        }}
      />

      {/* Gradient overlay */}
      <div className="absolute inset-0 z-[1] bg-gradient-to-b from-[#1A0E07]/30 via-transparent to-[#1A0E07]/70" />

      {/* Content */}
      <div className="relative z-10 text-center flex flex-col items-center px-4 w-full max-w-5xl mx-auto">
        {/* Eyebrow */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-8 h-px bg-white/60" />
          <span className="text-white/85 text-xs tracking-[0.3em] uppercase font-semibold">
            Coffee Machine as a Service
          </span>
          <div className="w-8 h-px bg-white/60" />
        </div>

        <h1 className="text-white text-5xl md:text-7xl font-black tracking-tight uppercase mb-6 drop-shadow-lg leading-tight flex flex-col gap-4">
          <span>Rent. Connect.</span>
          <span className="text-white/70">Brew Smarter.</span>
        </h1>

        <p className="text-white/90 text-lg md:text-xl tracking-wide mb-12 max-w-3xl leading-relaxed">
          Giải pháp thuê máy pha cà phê tích hợp IoT &amp; Cloud hàng đầu. Quản lý toàn bộ đội máy của bạn từ một nền tảng duy nhất — theo thời gian thực.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 items-center">
          <Link
            href="/solutions"
            id="hero-explore-btn"
            className="group inline-flex items-center gap-3 px-8 py-4 bg-white text-[#1A0E07] rounded-full font-bold uppercase tracking-widest text-sm hover:bg-white/90 transition-all duration-300"
          >
            Khám phá giải pháp
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-300" />
          </Link>
          <Link
            href="/login"
            id="hero-login-btn"
            className="inline-flex items-center gap-3 px-8 py-4 border border-white/60 text-white rounded-full font-bold uppercase tracking-widest text-sm hover:bg-white/10 transition-all duration-300"
          >
            Đăng nhập Dashboard
          </Link>
        </div>

        {/* Stats row */}
        <div className="flex gap-8 sm:gap-16 mt-16 pt-8 border-t border-white/20 text-center">
          <div>
            <div className="text-white text-3xl font-black">500+</div>
            <div className="text-white/75 text-xs tracking-widest uppercase mt-1">Máy đang hoạt động</div>
          </div>
          <div>
            <div className="text-white text-3xl font-black">99.9%</div>
            <div className="text-white/75 text-xs tracking-widest uppercase mt-1">Uptime SLA</div>
          </div>
          <div>
            <div className="text-white text-3xl font-black">50+</div>
            <div className="text-white/75 text-xs tracking-widest uppercase mt-1">Khách hàng doanh nghiệp</div>
          </div>
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center animate-bounce">
        <span className="text-white/70 text-[10px] tracking-widest uppercase mb-2">Scroll</span>
        <ChevronDown className="text-white/70 w-5 h-5" />
      </div>
    </section>
  );
}
