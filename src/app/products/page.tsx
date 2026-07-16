"use client";

import { LandingNav } from "@/components/landing/LandingNav";
import { LandingFooter, CtaSection } from "@/components/landing/CtaFooter";
import { AnimateOnScroll } from "@/components/landing/AnimateOnScroll";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

const products = [
  {
    name: "DeerX-100",
    category: "Espresso Tự Động",
    tag: "Phổ biến nhất",
    desc: "Máy espresso tự động hoàn toàn phù hợp cho văn phòng và quán cà phê nhỏ. Tích hợp cảm biến IoT cơ bản, kết nối Cloud, quản lý từ xa.",
    specs: ["15 bar pump pressure", "1.8L water tank", "IoT Ready", "Wifi + 4G"],
    rentalFrom: "1,500,000",
    img: "https://images.unsplash.com/photo-1610632380989-680fe40816c6?auto=format&fit=crop&q=80&w=800",
    featured: false,
  },
  {
    name: "DeerX-Pro",
    category: "Dual Group Head",
    tag: "Dành cho chuỗi quán",
    desc: "Dòng máy đôi cho chuỗi quán cà phê hoặc khách sạn. Sản lượng cao, hai đầu brew độc lập, tích hợp IoT đầy đủ và màn hình cảm ứng.",
    specs: ["Dual group head", "3L boiler capacity", "Full IoT Suite", "Touchscreen UI"],
    rentalFrom: "3,500,000",
    img: "https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&q=80&w=800",
    featured: true,
  },
  {
    name: "DeerX-Enterprise",
    category: "Commercial Grade",
    tag: "Chuỗi lớn & Doanh nghiệp",
    desc: "Giải pháp doanh nghiệp cho hệ thống hàng trăm máy. Quản lý tập trung, API tích hợp POS, báo cáo thời gian thực trên toàn bộ chuỗi.",
    specs: ["Multi-site management", "POS Integration API", "Advanced Analytics", "Priority 24/7 Support"],
    rentalFrom: "Liên hệ",
    img: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&q=80&w=800",
    featured: false,
  },
];

const advantages = [
  { v: "100%", l: "IoT Ready" },
  { v: "24/7", l: "Remote Support" },
  { v: "< 4h", l: "On-site Response" },
  { v: "∞", l: "Software Updates" },
];

export default function ProductsPage() {
  return (
    <>
      <LandingNav />
      <main className="pt-[72px]">

        {/* ── Hero ── */}
        <section className="bg-[#F5F7FA] border-b border-[#ABBED1]/30 py-16 sm:py-20 lg:py-24 px-4 sm:px-6 text-center">
          <div className="max-w-[1320px] mx-auto">
            <AnimateOnScroll delay={0}>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#0671E0]/8 rounded-full mb-5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#0671E0]" />
                <span className="text-[#0671E0] text-xs font-semibold tracking-wider uppercase">Products</span>
              </div>
            </AnimateOnScroll>
            <AnimateOnScroll delay={80}>
              <h1 className="text-[#18191F] font-semibold mb-4" style={{ fontSize: "clamp(28px, 5vw, 52px)", lineHeight: "1.15" }}>
                Danh mục <span className="text-[#0671E0]">sản phẩm</span> cho thuê
              </h1>
            </AnimateOnScroll>
            <AnimateOnScroll delay={180}>
              <p className="text-[#89939E] max-w-[560px] mx-auto" style={{ fontSize: "clamp(15px, 2vw, 18px)", lineHeight: "1.7" }}>
                Máy pha cà phê thương mại chất lượng cao — sẵn sàng tích hợp IoT và kết nối Cloud.
              </p>
            </AnimateOnScroll>
          </div>
        </section>

        {/* ── Products Grid ── */}
        <section className="bg-white py-16 sm:py-20 lg:py-24 px-4 sm:px-6">
          <div className="max-w-[1320px] mx-auto grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
            {products.map((p, i) => (
              <AnimateOnScroll key={i} delay={i * 100} direction="up">
                <div className={`group flex flex-col rounded-2xl overflow-hidden border transition-all duration-300 hover:-translate-y-1 ${
                  p.featured
                    ? "border-[#0671E0]/40 shadow-[0px_8px_16px_rgba(6,113,224,0.15)]"
                    : "border-[#ABBED1]/40 shadow-[0px_4px_8px_rgba(171,190,209,0.4)] hover:shadow-[0px_16px_32px_rgba(171,190,209,0.3)]"
                }`}>
                  {/* Image */}
                  <div className="aspect-[4/3] bg-[#F5F7FA] relative overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={p.img}
                      alt={p.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 opacity-85"
                    />
                    {/* Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
                    {/* Tag */}
                    <div className="absolute top-4 left-4">
                      <span className={`text-[10px] font-bold px-3 py-1.5 rounded-full uppercase tracking-wider ${
                        p.featured ? "bg-[#0671E0] text-white" : "bg-white/90 text-[#263238]"
                      }`}>
                        {p.tag}
                      </span>
                    </div>
                    {p.featured && (
                      <div className="absolute top-4 right-4">
                        <span className="text-[10px] font-bold px-3 py-1.5 rounded-full bg-white/15 text-white backdrop-blur-sm border border-white/20">
                          ★ Best Value
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="p-6 sm:p-7 flex flex-col flex-1">
                    <div className="text-[#89939E] text-xs tracking-widest uppercase font-semibold mb-1.5">{p.category}</div>
                    <h2 className="text-[#18191F] font-bold mb-3" style={{ fontSize: "clamp(18px, 2.5vw, 22px)" }}>{p.name}</h2>
                    <p className="text-[#89939E] text-sm leading-relaxed mb-5 flex-1">{p.desc}</p>

                    {/* Spec pills */}
                    <div className="flex flex-wrap gap-2 mb-5">
                      {p.specs.map((spec, si) => (
                        <span key={si} className="text-[11px] bg-[#0671E0]/6 text-[#0671E0] px-2.5 py-1 rounded-full font-medium border border-[#0671E0]/15">
                          {spec}
                        </span>
                      ))}
                    </div>

                    {/* Price & CTA */}
                    <div className="flex items-center justify-between border-t border-[#F5F7FA] pt-5">
                      <div>
                        <div className="text-[#89939E] text-[10px] uppercase tracking-widest mb-1">Giá thuê từ</div>
                        <div className="font-bold text-[#18191F]" style={{ fontSize: "clamp(15px, 2vw, 18px)" }}>
                          {p.rentalFrom !== "Liên hệ" ? `${p.rentalFrom}đ/tháng` : "Liên hệ"}
                        </div>
                      </div>
                      <Link
                        href="/pricing"
                        className="btn-primary group/btn text-sm py-2.5 px-5"
                      >
                        Thuê ngay <ArrowRight className="w-3.5 h-3.5 group-hover/btn:translate-x-1 transition-transform" />
                      </Link>
                    </div>
                  </div>
                </div>
              </AnimateOnScroll>
            ))}
          </div>
        </section>

        {/* ── Advantages ── */}
        <section className="bg-[#F5F7FA] py-16 sm:py-20 px-4 sm:px-6">
          <div className="max-w-[1320px] mx-auto">
            <AnimateOnScroll>
              <div className="text-center mb-12">
                <span className="text-xs font-semibold tracking-[0.25em] uppercase text-[#0671E0] mb-3 block">Why DEER COFFEE</span>
                <h2 className="text-[#18191F] font-semibold" style={{ fontSize: "clamp(24px, 3.5vw, 36px)", lineHeight: "44px" }}>
                  Tại sao chọn máy DEER COFFEE?
                </h2>
              </div>
            </AnimateOnScroll>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-0 border border-[#ABBED1]/40 rounded-2xl overflow-hidden shadow-[0px_4px_8px_rgba(171,190,209,0.4)]">
              {advantages.map((item, i) => (
                <AnimateOnScroll key={i} delay={i * 80}>
                  <div className={`bg-white p-8 sm:p-10 text-center ${i < advantages.length - 1 ? "border-r border-[#ABBED1]/40" : ""} hover:bg-[#0671E0]/3 transition-colors`}>
                    <div className="font-bold text-[#0671E0] mb-2" style={{ fontSize: "clamp(24px, 3vw, 40px)" }}>{item.v}</div>
                    <div className="text-[#89939E] text-[10px] sm:text-xs uppercase tracking-widest font-semibold">{item.l}</div>
                  </div>
                </AnimateOnScroll>
              ))}
            </div>
          </div>
        </section>

        <CtaSection />
      </main>
      <LandingFooter />
    </>
  );
}
