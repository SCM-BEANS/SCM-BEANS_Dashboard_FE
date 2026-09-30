"use client";

import { Star } from "lucide-react";
import { AnimateOnScroll } from "./AnimateOnScroll";

const testimonials = [
  {
    name: "Nguyễn Văn Minh",
    role: "CEO, Chuỗi Cà Phê Cao Cấp",
    avatar: "/testimonials/avatar-1.jpg",
    initials: "NM",
    color: "bg-[#721C24]",
    quote:
      "DOLORES COFFEE đã giúp chúng tôi giảm 40% chi phí vận hành đội máy. Dashboard thời gian thực giúp tôi nắm bắt mọi thứ ngay cả khi đang ở nước ngoài.",
    rating: 5,
  },
  {
    name: "Trần Thị Lan",
    role: "Giám đốc Vận hành, Hệ thống Nhà hàng F&B",
    avatar: "/testimonials/avatar-2.jpg",
    initials: "TL",
    color: "bg-[#8C2B34]",
    quote:
      "Tính năng bảo trì dự đoán của AI thật sự xuất sắc. Chúng tôi chưa bao giờ phải đối mặt với sự cố bất ngờ kể từ khi triển khai giải pháp của DOLORES COFFEE.",
    rating: 5,
  },
  {
    name: "Lê Hoàng Nam",
    role: "Giám đốc Công nghệ, Khách sạn Quốc tế",
    avatar: "/testimonials/avatar-3.jpg",
    initials: "LN",
    color: "bg-[#5A141A]",
    quote:
      "Việc tích hợp IoT vào hệ thống của chúng tôi diễn ra mượt mà và nhanh chóng. Đội hỗ trợ kỹ thuật phản hồi rất chuyên nghiệp — đúng cam kết 15 phút.",
    rating: 5,
  },
];

export function TestimonialsSection() {
  return (
    <section id="testimonials" className="relative bg-[#FDFBF7] py-24 px-6 overflow-hidden border-b border-[#E0E0E0]">
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
          <div className="text-center mb-14">
            <span className="text-xs font-semibold tracking-[0.25em] uppercase text-[#721C24] mb-3 block">
              Testimonials
            </span>
            <h2
              className="text-[#721C24] font-serif font-semibold mb-4"
              style={{ fontSize: "clamp(28px, 4vw, 36px)", lineHeight: "44px" }}
            >
              Khách hàng nói gì về chúng tôi
            </h2>
            <p className="text-[#9E9E9E] max-w-[480px] mx-auto" style={{ fontSize: "18px", lineHeight: "28px" }}>
              Hơn 50 doanh nghiệp đã tin tưởng DOLORES COFFEE để vận hành đội máy pha cà phê của họ.
            </p>
          </div>
        </AnimateOnScroll>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {testimonials.map((t, i) => (
            <AnimateOnScroll key={i} delay={i * 150}>
              <div className="bg-white rounded-2xl p-7 border border-[#E0E0E0] shadow-figma-4 hover:shadow-figma-8 hover:-translate-y-1 transition-all duration-300 flex flex-col gap-5 h-full">
                {/* Stars */}
                <div className="flex gap-1">
                  {Array.from({ length: t.rating }).map((_, si) => (
                    <Star key={si} className="w-4 h-4 fill-[#721C24] text-[#721C24]" />
                  ))}
                </div>

                {/* Quote */}
                <p className="text-[rgba(0,0,0,0.87)] leading-relaxed flex-1" style={{ fontSize: "16px", lineHeight: "24px" }}>
                  &ldquo;{t.quote}&rdquo;
                </p>

                {/* Author */}
                <div className="flex items-center gap-3 pt-4 border-t border-[#E0E0E0]/60">
                  <div
                    className={`w-11 h-11 rounded-full ${t.color} flex items-center justify-center shrink-0 shadow-sm`}
                    title={`Avatar for ${t.name}`}
                  >
                    <span className="text-white text-sm font-bold">{t.initials}</span>
                  </div>
                  <div>
                    <div className="text-[rgba(0,0,0,0.87)] font-semibold text-sm">{t.name}</div>
                    <div className="text-[#9E9E9E] text-xs mt-0.5">{t.role}</div>
                  </div>
                </div>
              </div>
            </AnimateOnScroll>
          ))}
        </div>
      </div>
    </section>
  );
}
