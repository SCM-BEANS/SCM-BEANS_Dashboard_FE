"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import Image from "next/image";
import { AnimateOnScroll } from "./AnimateOnScroll";

export function CtaSection() {
  return (
    <section className="bg-[#F5F7FA] py-24 px-6 relative overflow-hidden">
      {/* Decorative bg blobs */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#0671E0]/5 rounded-full blur-3xl translate-x-1/3 -translate-y-1/3 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-[#0671E0]/5 rounded-full blur-3xl -translate-x-1/3 translate-y-1/3 pointer-events-none" />

      <div className="relative z-10 max-w-[1320px] mx-auto text-center">
        <div className="bg-white rounded-3xl p-10 sm:p-16 lg:p-20 border border-[#ABBED1]/40 shadow-figma-16 overflow-hidden relative">
          {/* subtle grid inside card */}
          <div
            className="absolute inset-0 pointer-events-none opacity-[0.015]"
            style={{
              backgroundImage:
                "linear-gradient(#0671E0 1px,transparent 1px),linear-gradient(90deg,#0671E0 1px,transparent 1px)",
              backgroundSize: "24px 24px",
            }}
          />

          <AnimateOnScroll>
            <span className="text-xs font-semibold tracking-[0.25em] uppercase text-[#0671E0] mb-4 block relative z-10">
              Ready to Scale?
            </span>
          </AnimateOnScroll>
          <AnimateOnScroll delay={100}>
            <h2
              className="text-[#18191F] font-semibold mb-6 max-w-[720px] mx-auto relative z-10"
              style={{ fontSize: "clamp(32px, 5vw, 48px)", lineHeight: "1.2" }}
            >
              Chuyển đổi số hoạt động vận hành máy pha cà phê ngay hôm nay
            </h2>
          </AnimateOnScroll>
          <AnimateOnScroll delay={200}>
            <p className="text-[#89939E] max-w-[500px] mx-auto mb-10 text-lg relative z-10">
              Liên hệ với đội ngũ DEER COFFEE để nhận tư vấn miễn phí và bản demo
              dashboard quản lý thực tế.
            </p>
          </AnimateOnScroll>

          <AnimateOnScroll delay={300}>
            <div className="flex flex-col sm:flex-row justify-center gap-4 relative z-10">
              <Link href="/about#contact" className="btn-primary group px-8 py-4">
                Yêu cầu tư vấn <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link href="/login" className="btn-secondary px-8 py-4">
                Xem Demo Dashboard
              </Link>
            </div>
          </AnimateOnScroll>
        </div>
      </div>
    </section>
  );
}

export function LandingFooter() {
  return (
    <footer className="bg-white pt-20 pb-8 px-6 border-t border-[#F5F7FA]">
      <div className="max-w-[1320px] mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-12 lg:gap-8 mb-16">
          {/* Brand Col */}
          <div className="lg:col-span-4 flex flex-col gap-6">
            <Link
              href="/"
              className="flex items-center gap-2 group w-fit"
            >
              <div className="w-8 h-8 rounded-lg overflow-hidden shrink-0 shadow-sm">
                <Image
                  src="/images/logo.jpg"
                  alt="DEER COFFEE Logo"
                  width={32}
                  height={32}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex flex-col leading-none">
                <span className="font-bold text-sm tracking-[0.08em] text-[#18191F]">DEER</span>
                <span className="font-light text-[9px] text-[#89939E] tracking-[0.18em] uppercase -mt-0.5">COFFEE</span>
              </div>
            </Link>
            <p className="text-[#89939E] text-sm leading-relaxed max-w-[320px]">
              DEER COFFEE cung cấp giải pháp thuê máy pha cà phê thông minh tích hợp IoT &amp; Cloud. Đơn giản hóa vận hành cho mọi doanh nghiệp.
            </p>
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-full border border-[#ABBED1]/40 flex items-center justify-center text-[#89939E] hover:border-[#0671E0] hover:text-[#0671E0] transition-colors cursor-pointer">
                FB
              </div>
              <div className="w-10 h-10 rounded-full border border-[#ABBED1]/40 flex items-center justify-center text-[#89939E] hover:border-[#0671E0] hover:text-[#0671E0] transition-colors cursor-pointer">
                IN
              </div>
              <div className="w-10 h-10 rounded-full border border-[#ABBED1]/40 flex items-center justify-center text-[#89939E] hover:border-[#0671E0] hover:text-[#0671E0] transition-colors cursor-pointer">
                YT
              </div>
            </div>
          </div>

          {/* Links Col 1 */}
          <div className="lg:col-span-2 lg:col-start-6">
            <h4 className="text-[#18191F] font-semibold text-sm tracking-wider uppercase mb-5">Sản phẩm</h4>
            <ul className="flex flex-col gap-3">
              {["Máy Espresso", "Máy Tự Động", "Cloud Dashboard", "API Integration"].map((l, i) => (
                <li key={i}>
                  <Link href="/products" className="text-[#89939E] text-sm hover:text-[#0671E0] transition-colors">
                    {l}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Links Col 2 */}
          <div className="lg:col-span-2">
            <h4 className="text-[#18191F] font-semibold text-sm tracking-wider uppercase mb-5">Công ty</h4>
            <ul className="flex flex-col gap-3">
              {["Về chúng tôi", "Bảng giá", "Khách hàng", "Tuyển dụng"].map((l, i) => (
                <li key={i}>
                  <Link href={l === "Bảng giá" ? "/pricing" : "/about"} className="text-[#89939E] text-sm hover:text-[#0671E0] transition-colors">
                    {l}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Links Col 3 */}
          <div className="lg:col-span-3">
            <h4 className="text-[#18191F] font-semibold text-sm tracking-wider uppercase mb-5">Liên hệ</h4>
            <ul className="flex flex-col gap-3 text-sm text-[#89939E]">
              <li><span className="font-semibold text-[#4D4D4D] mr-2">A:</span> 123 Nguyễn Đình Chiểu, Q.3, TP.HCM</li>
              <li><span className="font-semibold text-[#4D4D4D] mr-2">E:</span> hello@deercoffee.vn</li>
              <li><span className="font-semibold text-[#4D4D4D] mr-2">P:</span> 1800 1234 (Miễn phí)</li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="pt-8 border-t border-[#F5F7FA] flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="text-[#89939E] text-xs">
            © {new Date().getFullYear()} DEER COFFEE. All rights reserved.
          </div>
          <div className="flex gap-6 text-[#89939E] text-xs">
            <Link href="#" className="hover:text-[#0671E0] transition-colors">Privacy Policy</Link>
            <Link href="#" className="hover:text-[#0671E0] transition-colors">Terms of Service</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
