"use client";

import { LandingNav } from "@/components/landing/LandingNav";
import { LandingFooter, CtaSection } from "@/components/landing/CtaFooter";
import { AnimateOnScroll } from "@/components/landing/AnimateOnScroll";
import Link from "next/link";
import { ArrowRight, Check, HelpCircle } from "lucide-react";
import { useState } from "react";

const plans = [
  {
    name: "Starter",
    tagline: "Phù hợp cho văn phòng & quán nhỏ",
    price: "1,500,000",
    period: "tháng / máy",
    featured: false,
    features: [
      "1 máy DeerX-100",
      "Kết nối IoT cơ bản",
      "Dashboard theo dõi cơ bản",
      "Bảo trì định kỳ 3 tháng/lần",
      "Hỗ trợ kỹ thuật trong giờ hành chính",
      "Hợp đồng tối thiểu 12 tháng",
    ],
    cta: "Đăng ký ngay",
    href: "/login",
  },
  {
    name: "Business",
    tagline: "Lý tưởng cho chuỗi quán & F&B",
    price: "2,800,000",
    period: "tháng / máy",
    featured: true,
    features: [
      "Máy DeerX-100 hoặc DeerX-Pro",
      "Full IoT Suite — tất cả cảm biến",
      "Dashboard nâng cao + báo cáo tự động",
      "Bảo trì định kỳ hàng tháng",
      "Hỗ trợ kỹ thuật 24/7",
      "API tích hợp POS",
      "Hợp đồng tối thiểu 6 tháng",
    ],
    cta: "Bắt đầu miễn phí 14 ngày",
    href: "/login",
  },
  {
    name: "Enterprise",
    tagline: "Cho chuỗi lớn & tập đoàn",
    price: "Liên hệ",
    period: "tùy chỉnh",
    featured: false,
    features: [
      "Tất cả dòng máy DeerX",
      "Hạ tầng IoT riêng biệt",
      "Dashboard đa địa điểm",
      "Bảo trì theo SLA tùy chỉnh",
      "Đội kỹ thuật chuyên trách",
      "Đào tạo vận hành cho nhân viên",
      "Hợp đồng linh hoạt",
    ],
    cta: "Liên hệ tư vấn",
    href: "/about#contact",
  },
];

const faqs = [
  { q: "Có cần đặt cọc khi thuê máy không?", a: "Có, chúng tôi yêu cầu đặt cọc tương đương 2 tháng phí thuê. Khoản này sẽ được hoàn trả đầy đủ khi kết thúc hợp đồng." },
  { q: "Chi phí vận chuyển và lắp đặt có tính phí không?", a: "Miễn phí vận chuyển và lắp đặt trong phạm vi nội thành các thành phố lớn (Hà Nội, TP.HCM, Đà Nẵng). Các khu vực khác có phụ phí." },
  { q: "Máy hỏng thì được hỗ trợ như thế nào?", a: "Đội kỹ thuật sẽ có mặt trong vòng 4 giờ. Nếu không sửa được tại chỗ, chúng tôi sẽ thay máy tạm trong vòng 24 giờ." },
  { q: "Có thể nâng cấp gói trong thời gian hợp đồng không?", a: "Có thể nâng cấp lên gói cao hơn bất kỳ lúc nào, chỉ thanh toán phần chênh lệch theo ngày." },
];

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`border rounded-xl overflow-hidden transition-all duration-200 ${open ? "border-[#0671E0]/30 shadow-[0px_4px_8px_rgba(6,113,224,0.08)]" : "border-[#ABBED1]/40"}`}>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-6 py-5 text-left group"
      >
        <span className="font-semibold text-[#18191F] text-sm sm:text-base pr-4">{q}</span>
        <HelpCircle className={`w-5 h-5 shrink-0 transition-all duration-200 ${open ? "text-[#0671E0] rotate-12" : "text-[#ABBED1]"}`} />
      </button>
      <div className={`px-6 overflow-hidden transition-all duration-300 ${open ? "pb-5 max-h-40" : "max-h-0"}`}>
        <p className="text-[#89939E] text-sm leading-relaxed">{a}</p>
      </div>
    </div>
  );
}

export default function PricingPage() {
  return (
    <>
      <LandingNav />
      <main className="pt-[72px]">

        {/* ── Hero ── */}
        <section className="bg-[#F5F7FA] border-b border-[#ABBED1]/30 py-16 sm:py-20 lg:py-24 px-4 sm:px-6 text-center">
          <div className="max-w-[700px] mx-auto">
            <AnimateOnScroll delay={0}>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#0671E0]/8 rounded-full mb-5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#0671E0]" />
                <span className="text-[#0671E0] text-xs font-semibold tracking-wider uppercase">Pricing</span>
              </div>
            </AnimateOnScroll>
            <AnimateOnScroll delay={80}>
              <h1 className="text-[#18191F] font-semibold mb-4" style={{ fontSize: "clamp(28px, 5vw, 52px)", lineHeight: "1.15" }}>
                Minh bạch, <span className="text-[#0671E0]">linh hoạt</span>
              </h1>
            </AnimateOnScroll>
            <AnimateOnScroll delay={160}>
              <p className="text-[#89939E]" style={{ fontSize: "clamp(15px, 2vw, 18px)", lineHeight: "1.7" }}>
                Không phí ẩn. Không cam kết dài hạn bắt buộc.<br className="hidden sm:block" />
                Chỉ trả tiền cho những gì bạn thực sự dùng.
              </p>
            </AnimateOnScroll>
          </div>
        </section>

        {/* ── Pricing Cards ── */}
        <section className="bg-white py-16 sm:py-20 lg:py-24 px-4 sm:px-6">
          <div className="max-w-[1100px] mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
            {plans.map((plan, i) => (
              <AnimateOnScroll key={i} delay={i * 100}>
                <div className={`relative flex flex-col rounded-2xl p-7 sm:p-8 border transition-all duration-300 hover:-translate-y-1 ${
                  plan.featured
                    ? "bg-[#0671E0] border-[#0671E0] shadow-[0px_16px_32px_rgba(6,113,224,0.3)]"
                    : "bg-white border-[#ABBED1]/40 shadow-[0px_4px_8px_rgba(171,190,209,0.4)] hover:shadow-[0px_16px_32px_rgba(171,190,209,0.3)] hover:border-[#0671E0]/30"
                }`}>
                  {plan.featured && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <span className="bg-white text-[#0671E0] text-[10px] font-bold px-4 py-1 rounded-full shadow-[0px_4px_8px_rgba(6,113,224,0.2)] tracking-wider uppercase">
                        ★ Most Popular
                      </span>
                    </div>
                  )}

                  <div className="mb-6">
                    <div className={`text-xs font-semibold tracking-wider mb-2 ${plan.featured ? "text-white/70" : "text-[#89939E]"}`}>
                      {plan.tagline}
                    </div>
                    <div className={`font-bold mb-4 ${plan.featured ? "text-white" : "text-[#18191F]"}`} style={{ fontSize: "clamp(20px, 3vw, 26px)" }}>
                      {plan.name}
                    </div>
                    <div className="flex items-baseline gap-1.5">
                      <span className={`font-bold ${plan.featured ? "text-white" : "text-[#18191F]"}`} style={{ fontSize: "clamp(22px, 3vw, 30px)" }}>
                        {plan.price !== "Liên hệ" ? `${plan.price}đ` : plan.price}
                      </span>
                      <span className={`text-sm ${plan.featured ? "text-white/70" : "text-[#89939E]"}`}>/ {plan.period}</span>
                    </div>
                  </div>

                  <ul className="flex flex-col gap-3 flex-1 mb-8">
                    {plan.features.map((f, fi) => (
                      <li key={fi} className={`flex items-start gap-2.5 text-sm font-medium ${plan.featured ? "text-white/90" : "text-[#4D4D4D]"}`}>
                        <Check className={`w-4 h-4 mt-0.5 shrink-0 ${plan.featured ? "text-white" : "text-[#0671E0]"}`} />
                        {f}
                      </li>
                    ))}
                  </ul>

                  <Link
                    href={plan.href}
                    id={`pricing-cta-${plan.name.toLowerCase()}`}
                    className={`group/btn text-center py-3 rounded-[4px] font-semibold text-sm transition-all duration-200 flex items-center justify-center gap-2 ${
                      plan.featured
                        ? "bg-white text-[#0671E0] hover:bg-white/90"
                        : "btn-primary"
                    }`}
                  >
                    {plan.cta}
                    <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                  </Link>
                </div>
              </AnimateOnScroll>
            ))}
          </div>
        </section>

        {/* ── FAQ ── */}
        <section className="bg-[#F5F7FA] py-16 sm:py-20 lg:py-24 px-4 sm:px-6">
          <div className="max-w-[720px] mx-auto">
            <AnimateOnScroll>
              <div className="text-center mb-12">
                <span className="text-xs font-semibold tracking-[0.25em] uppercase text-[#0671E0] mb-3 block">FAQ</span>
                <h2 className="text-[#18191F] font-semibold" style={{ fontSize: "clamp(24px, 3.5vw, 36px)", lineHeight: "44px" }}>
                  Câu hỏi thường gặp
                </h2>
              </div>
            </AnimateOnScroll>
            <div className="flex flex-col gap-4">
              {faqs.map((faq, i) => (
                <AnimateOnScroll key={i} delay={i * 80}>
                  <FaqItem q={faq.q} a={faq.a} />
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
