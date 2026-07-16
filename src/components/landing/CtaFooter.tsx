"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

export function CtaSection() {
  return (
    <section className="bg-[#1A0E07] py-28 px-6">
      <div className="max-w-[900px] mx-auto text-center flex flex-col items-center">
        <span className="text-white/70 text-xs tracking-[0.3em] uppercase font-bold mb-6">
          Bắt đầu ngay hôm nay
        </span>
        <h2 className="text-3xl sm:text-4xl md:text-7xl font-black uppercase tracking-tight text-white mb-6 leading-tight flex flex-col gap-4">
          <span>Nâng tầm trải nghiệm</span>
          <span className="whitespace-nowrap">cà phê của doanh nghiệp bạn</span>
        </h2>
        <p className="text-white/80 text-lg mb-12 max-w-xl leading-relaxed">
          Hãy để DEER COFFEE lo toàn bộ — từ máy móc đến vận hành. Bạn chỉ cần tập trung vào việc phục vụ khách hàng.
        </p>
        <div className="flex flex-col sm:flex-row gap-4">
          <Link
            href="/login"
            id="cta-get-started-btn"
            className="group inline-flex items-center gap-3 px-8 py-4 bg-white text-[#1A0E07] rounded-full font-black uppercase tracking-widest text-sm hover:bg-white/90 transition-all"
          >
            Bắt đầu miễn phí <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
          <Link
            href="/about"
            id="cta-contact-btn"
            className="inline-flex items-center gap-3 px-8 py-4 border border-white/40 text-white rounded-full font-bold uppercase tracking-widest text-sm hover:bg-white/10 transition-all"
          >
            Liên hệ tư vấn
          </Link>
        </div>
      </div>
    </section>
  );
}

const footerLinks = [
  {
    title: "Giải pháp",
    links: [
      { label: "Cho thuê máy", href: "/solutions" },
      { label: "Tích hợp IoT", href: "/technology" },
      { label: "Dashboard quản lý", href: "/dashboard" },
      { label: "Bảo trì & Hỗ trợ", href: "/solutions" },
    ],
  },
  {
    title: "Sản phẩm",
    links: [
      { label: "Máy espresso thương mại", href: "/products" },
      { label: "Máy tự động hoàn toàn", href: "/products" },
      { label: "Phụ kiện & Vật tư", href: "/products" },
    ],
  },
  {
    title: "Công ty",
    links: [
      { label: "Về chúng tôi", href: "/about" },
      { label: "Đội ngũ", href: "/about" },
      { label: "Tuyển dụng", href: "/about" },
      { label: "Liên hệ", href: "/about" },
    ],
  },
  {
    title: "Pháp lý",
    links: [
      { label: "Chính sách bảo mật", href: "#" },
      { label: "Điều khoản sử dụng", href: "#" },
      { label: "Chính sách Cookie", href: "#" },
    ],
  },
];

function DeerLogoMini() {
  return (
    <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-9 h-9 text-white" aria-label="Deer Coffee Logo">
      <path d="M17 6 L17 18 M17 10 L13 6 M17 10 L20 7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M31 6 L31 18 M31 10 L35 6 M31 10 L28 7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      <ellipse cx="24" cy="22" rx="8" ry="9" fill="currentColor" />
      <circle cx="21" cy="20" r="1.2" fill="#1A0E07" />
      <circle cx="27" cy="20" r="1.2" fill="#1A0E07" />
      <ellipse cx="24" cy="26" rx="2" ry="1.2" fill="#1A0E07" opacity="0.7" />
      <path d="M18 30 Q24 35 30 30 L32 44 Q24 48 16 44 Z" fill="currentColor" opacity="0.8" />
    </svg>
  );
}

export function LandingFooter() {
  return (
    <footer id="footer" className="bg-[#1A0E07] text-white pt-24 pb-12 px-6">
      <div className="max-w-[1400px] mx-auto">
        <div className="flex flex-col lg:flex-row justify-between gap-16 mb-20">
          {/* Brand */}
          <div className="lg:w-1/4">
            <Link href="/" id="footer-logo" className="flex items-center gap-2.5 mb-6 group">
              <div className="flex flex-col leading-none">
                <span className="font-black text-5xl md:text-[70px] text-white tracking-[0.15em] uppercase group-hover:scale-105 transition-transform origin-left duration-300">DEER</span>
                <span className="font-light text-5xl md:text-[70px] text-white/65 tracking-[0.25em] uppercase -mt-0.5 group-hover:scale-105 transition-transform">COFFEE</span>
              </div>
            </Link>
            <p className="text-white/70 text-sm leading-relaxed max-w-xs mb-8">
              Giải pháp cho thuê và quản lý máy pha cà phê tích hợp Cloud &amp; IoT hàng đầu Việt Nam.
            </p>
            <div className="flex flex-col gap-1.5 text-white/65 text-sm">
              <span>📧 hello@deercoffee.vn</span>
              <span>📞 1800 1234 (Miễn phí)</span>
            </div>
          </div>

          {/* Links */}
          <div className="lg:w-3/4 grid grid-cols-2 md:grid-cols-4 gap-10">
            {footerLinks.map((col, idx) => (
              <div key={idx}>
                <h4 className="text-white font-bold uppercase tracking-widest text-xs mb-5">{col.title}</h4>
                <ul className="flex flex-col gap-3">
                  {col.links.map((link, lIdx) => (
                    <li key={lIdx}>
                      <Link
                        href={link.href}
                        id={`footer-link-${idx}-${lIdx}`}
                        className="text-white/65 hover:text-white transition-colors text-sm"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom bar */}
        <div className="flex flex-col md:flex-row justify-between items-center pt-8 border-t border-white/10 gap-4">
          <p className="text-white/55 text-sm">
            © 2026 DEER COFFEE Technology. Bảo lưu mọi quyền.
          </p>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-white/55 text-xs tracking-widest">ALL SYSTEMS OPERATIONAL</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
