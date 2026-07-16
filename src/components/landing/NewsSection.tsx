"use client";

import { ArrowRight, Calendar, User } from "lucide-react";
import Link from "next/link";
import { AnimateOnScroll } from "./AnimateOnScroll";

const articles = [
  {
    title: "DEER COFFEE công bố giải pháp IoT thế hệ mới",
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
      "Đáp ứng nhu cầu ngày càng tăng, DEER COFFEE chính thức mở trung tâm bảo hành tại Đà Nẵng, Nha Trang, Huế...",
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
    <section id="news" className="bg-white py-24 px-6">
      <div className="max-w-[1320px] mx-auto">
        <AnimateOnScroll>
          <div className="flex flex-col sm:flex-row justify-between items-end gap-6 mb-14 border-b border-[#F5F7FA] pb-8">
            <div className="max-w-[600px]">
              <span className="text-xs font-semibold tracking-[0.25em] uppercase text-[#0671E0] mb-3 block">
                Resources
              </span>
              <h2
                className="text-[#18191F] font-semibold mb-4"
                style={{ fontSize: "clamp(28px, 4vw, 36px)", lineHeight: "44px" }}
              >
                Tin tức &amp; Cập nhật
              </h2>
              <p className="text-[#89939E]" style={{ fontSize: "16px", lineHeight: "26px" }}>
                Khám phá tính năng mới, sự kiện công ty và các báo cáo ngành F&B từ đội ngũ DEER COFFEE.
              </p>
            </div>
            <Link
              href="/news"
              className="group flex items-center gap-2 text-sm font-semibold text-[#0671E0] shrink-0 hover:opacity-80 transition-opacity"
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
                className="group flex flex-col h-full bg-white rounded-2xl overflow-hidden border border-[#ABBED1]/40 shadow-figma-4 hover:shadow-figma-8 hover:-translate-y-1 transition-all duration-300"
              >
                {/* Image */}
                <div className="relative aspect-[16/10] overflow-hidden bg-[#F5F7FA]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={a.img}
                    alt={a.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 opacity-90"
                  />
                  <div className="absolute top-4 left-4">
                    <span className="bg-white/90 backdrop-blur-sm text-[#0671E0] text-[10px] font-bold px-3 py-1.5 rounded-full uppercase tracking-wider shadow-sm">
                      {a.category}
                    </span>
                  </div>
                </div>

                {/* Content */}
                <div className="p-6 flex flex-col flex-1">
                  <div className="flex items-center gap-4 text-[11px] font-semibold text-[#89939E] mb-3 tracking-wide">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5" /> {a.date}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5" /> {a.author}
                    </div>
                  </div>

                  <h3
                    className="text-[#18191F] font-bold mb-3 line-clamp-2 group-hover:text-[#0671E0] transition-colors"
                    style={{ fontSize: "18px", lineHeight: "26px" }}
                  >
                    {a.title}
                  </h3>

                  <p className="text-[#89939E] text-sm leading-relaxed mb-5 line-clamp-3 flex-1">
                    {a.excerpt}
                  </p>

                  <div className="text-sm font-semibold text-[#18191F] flex items-center gap-2 group-hover:gap-3 transition-all">
                    Đọc tiếp <ArrowRight className="w-4 h-4 text-[#0671E0]" />
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
