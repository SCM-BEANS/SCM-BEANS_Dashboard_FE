"use client";

import { ArrowRight, Calendar, User } from "lucide-react";
import Link from "next/link";
import { AnimateOnScroll } from "./AnimateOnScroll";

const articles = [
  {
    title: "DOLORES COFFEE công bố giải pháp IoT thế hệ mới",
    category: "Product Update",
    date: "12 Oct 2023",
    author: "Admin",
    excerpt:
      "Nền tảng quản lý máy pha cà phê thông minh nhất vừa được ra mắt, tích hợp cảm biến thế hệ thứ 2 giúp tăng độ chính xác 40%.",
    img: "https://images.unsplash.com/photo-1497935586351-b67a49e012bf?auto=format&fit=crop&q=80&w=600",
  },
  {
    title: "Mở rộng dịch vụ hỗ trợ kỹ thuật tại 5 tỉnh miền Trung",
    category: "Company News",
    date: "05 Oct 2023",
    author: "PR Team",
    excerpt:
      "Đáp ứng nhu cầu ngày càng tăng, DOLORES COFFEE chính thức mở trung tâm bảo hành tại Đà Nẵng, Nha Trang, Huế...",
    img: "https://images.unsplash.com/photo-1556740714-a8395b3bf30f?auto=format&fit=crop&q=80&w=600",
  },
  {
    title: "Xu hướng tự động hóa trong quản lý chuỗi F&B 2024",
    category: "Insights",
    date: "28 Sep 2023",
    author: "Research",
    excerpt:
      "Báo cáo mới nhất cho thấy các chuỗi F&B ứng dụng IoT giảm được 30% chi phí vận hành ẩn so với phương pháp truyền thống.",
    img: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&q=80&w=600",
  },
];

export function NewsSection() {
  return (
    <section id="news" className="relative bg-[#FDFBF7] py-24 px-6 overflow-hidden border-b border-[#E0E0E0]">
      {/* ── Ambient Wine Glow ── */}
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

      {/* ── Wine Grid ── */}
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
        <AnimateOnScroll>
          <div className="flex flex-col sm:flex-row justify-between items-end gap-6 mb-14 border-b border-[#E0E0E0] pb-8">
            <div className="max-w-[600px]">
              <span className="text-xs font-semibold tracking-[0.25em] uppercase text-[#721C24] mb-3 block">
                Resources
              </span>
              <h2
                className="text-[#721C24] font-serif font-semibold mb-4"
                style={{ fontSize: "clamp(28px, 4vw, 36px)", lineHeight: "44px" }}
              >
                Tin tức &amp; Cập nhật
              </h2>
              <p className="text-[#9E9E9E]" style={{ fontSize: "16px", lineHeight: "26px" }}>
                Khám phá tính năng mới, sự kiện công ty và các báo cáo ngành F&B từ đội ngũ DOLORES COFFEE.
              </p>
            </div>
            <Link
              href="/news"
              className="group flex items-center gap-2 text-sm font-semibold text-[#721C24] shrink-0 hover:opacity-80 transition-opacity"
            >
              Xem tất cả <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </AnimateOnScroll>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {articles.map((a, i) => (
            <AnimateOnScroll key={i} delay={i * 150}>
              <Link
                href="/news"
                className="group flex flex-col h-full bg-white rounded-2xl overflow-hidden border border-[#E0E0E0] shadow-figma-4 hover:shadow-figma-8 hover:-translate-y-1 transition-all duration-300"
              >
                {/* Image */}
                <div className="relative aspect-[16/10] overflow-hidden bg-[#FAF7F2]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={a.img}
                    alt={a.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 opacity-90"
                  />
                  <div className="absolute top-4 left-4">
                    <span className="bg-white/95 backdrop-blur-sm text-[#721C24] text-[10px] font-bold px-3 py-1.5 rounded-full uppercase tracking-wider shadow-sm border border-[#E0E0E0]/60">
                      {a.category}
                    </span>
                  </div>
                </div>

                {/* Content */}
                <div className="p-6 flex flex-col flex-1">
                  <div className="flex items-center gap-4 text-[11px] font-semibold text-[#9E9E9E] mb-3 tracking-wide">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5" /> {a.date}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5" /> {a.author}
                    </div>
                  </div>

                  <h3
                    className="text-[#18191F] font-bold mb-3 line-clamp-2 group-hover:text-[#721C24] transition-colors"
                    style={{ fontSize: "18px", lineHeight: "26px" }}
                  >
                    {a.title}
                  </h3>

                  <p className="text-[#9E9E9E] text-sm leading-relaxed mb-5 line-clamp-3 flex-1">
                    {a.excerpt}
                  </p>

                  <div className="text-sm font-semibold text-[#721C24] flex items-center gap-2 group-hover:gap-3 transition-all">
                    Đọc tiếp <ArrowRight className="w-4 h-4 text-[#721C24]" />
                  </div>
                </div>
              </Link>
            </AnimateOnScroll>
          ))}
        </div>
      </div>
    </section>
  );
}
