"use client";

import { Star } from "lucide-react";
import { AnimateOnScroll } from "./AnimateOnScroll";

const testimonials = [
  {
    name: "Nguyễn Văn Minh",
    role: "CEO, The Coffee House",
    avatar: "/testimonials/avatar-1.jpg",
    initials: "NM",
    color: "bg-[#0671E0]",
    quote:
      "DEER COFFEE đã giúp chúng tôi giảm 40% chi phí vận hành đội máy. Dashboard thời gian thực giúp tôi nắm bắt mọi thứ ngay cả khi đang ở nước ngoài.",
    rating: 5,
  },
  {
    name: "Trần Thị Lan",
    role: "Operations Manager, Highlands Coffee",
    avatar: "/testimonials/avatar-2.jpg",
    initials: "TL",
    color: "bg-[#2E7D31]",
    quote:
      "Tính năng bảo trì dự đoán của AI thật sự xuất sắc. Chúng tôi chưa bao giờ phải đối mặt với sự cố bất ngờ kể từ khi triển khai giải pháp của DEER COFFEE.",
    rating: 5,
  },
  {
    name: "Lê Hoàng Nam",
    role: "IT Director, Phúc Long",
    avatar: "/testimonials/avatar-3.jpg",
    initials: "LN",
    color: "bg-[#263238]",
    quote:
      "Việc tích hợp IoT vào hệ thống của chúng tôi diễn ra mượt mà và nhanh chóng. Đội hỗ trợ kỹ thuật phản hồi rất chuyên nghiệp — đúng cam kết 15 phút.",
    rating: 5,
  },
];

export function TestimonialsSection() {
  return (
    <section id="testimonials" className="bg-[#F5F7FA] py-24 px-6">
      <div className="max-w-[1320px] mx-auto">
        <AnimateOnScroll>
          <div className="text-center mb-14">
            <span className="text-xs font-semibold tracking-[0.25em] uppercase text-[#0671E0] mb-3 block">
              Testimonials
            </span>
            <h2
              className="text-[#18191F] font-semibold mb-4"
              style={{ fontSize: "clamp(28px, 4vw, 36px)", lineHeight: "44px" }}
            >
              Khách hàng nói gì về chúng tôi
            </h2>
            <p className="text-[#89939E] max-w-[480px] mx-auto" style={{ fontSize: "18px", lineHeight: "28px" }}>
              Hơn 50 doanh nghiệp đã tin tưởng DEER COFFEE để vận hành đội máy pha cà phê của họ.
            </p>
          </div>
        </AnimateOnScroll>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {testimonials.map((t, i) => (
            <AnimateOnScroll key={i} delay={i * 150}>
              <div className="bg-white rounded-2xl p-7 border border-[#ABBED1]/40 shadow-figma-4 hover:shadow-figma-8 hover:-translate-y-1 transition-all duration-300 flex flex-col gap-5 h-full">
                {/* Stars */}
                <div className="flex gap-1">
                  {Array.from({ length: t.rating }).map((_, si) => (
                    <Star key={si} className="w-4 h-4 fill-[#0671E0] text-[#0671E0]" />
                  ))}
                </div>

                {/* Quote */}
                <p className="text-[#4D4D4D] leading-relaxed flex-1" style={{ fontSize: "16px", lineHeight: "24px" }}>
                  &ldquo;{t.quote}&rdquo;
                </p>

                {/* Author */}
                <div className="flex items-center gap-3 pt-4 border-t border-[#F5F7FA]">
                  <div
                    className={`w-11 h-11 rounded-full ${t.color} flex items-center justify-center shrink-0`}
                    title={`Avatar for ${t.name} — replace with /public/testimonials/avatar-${i + 1}.jpg`}
                  >
                    <span className="text-white text-sm font-bold">{t.initials}</span>
                  </div>
                  <div>
                    <div className="text-[#18191F] font-semibold text-sm">{t.name}</div>
                    <div className="text-[#89939E] text-xs mt-0.5">{t.role}</div>
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
