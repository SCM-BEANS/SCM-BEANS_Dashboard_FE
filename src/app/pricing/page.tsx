import { LandingNav } from "@/components/landing/LandingNav";
import { LandingFooter } from "@/components/landing/CtaFooter";
import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";

export const metadata = {
  title: "Bảng giá | DEER COFFEE",
  description: "Gói thuê máy pha cà phê linh hoạt, minh bạch — phù hợp cho mọi quy mô doanh nghiệp.",
};

const plans = [
  {
    name: "Starter",
    tagline: "Phù hợp cho văn phòng & quán nhỏ",
    price: "1,500,000",
    period: "tháng / máy",
    highlight: false,
    features: [
      "1 máy DeerX-100",
      "Kết nối IoT cơ bản",
      "Dashboard theo dõi cơ bản",
      "Bảo trì định kỳ 3 tháng/lần",
      "Hỗ trợ kỹ thuật trong giờ hành chính",
      "Hợp đồng tối thiểu 12 tháng",
    ],
    cta: "Đăng ký ngay",
  },
  {
    name: "Business",
    tagline: "Lý tưởng cho chuỗi quán & F&B",
    price: "2,800,000",
    period: "tháng / máy",
    highlight: true,
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
  },
  {
    name: "Enterprise",
    tagline: "Cho chuỗi lớn & tập đoàn",
    price: "Liên hệ",
    period: "tùy chỉnh",
    highlight: false,
    features: [
      "Tất cả dòng máy DeerX",
      "Hạ tầng IoT riêng biệt",
      "Dashboard đa địa điểm",
      "Bảo trì theo nhu cầu (SLA tùy chỉnh)",
      "Đội kỹ thuật chuyên trách",
      "Đào tạo vận hành cho nhân viên",
      "Hợp đồng linh hoạt",
    ],
    cta: "Liên hệ tư vấn",
  },
];

const faqs = [
  { q: "Có cần đặt cọc khi thuê máy không?", a: "Có, chúng tôi yêu cầu đặt cọc tương đương 2 tháng phí thuê. Khoản này sẽ được hoàn trả đầy đủ khi kết thúc hợp đồng." },
  { q: "Chi phí vận chuyển và lắp đặt có tính phí không?", a: "Miễn phí vận chuyển và lắp đặt trong phạm vi nội thành các thành phố lớn (Hà Nội, TP.HCM, Đà Nẵng). Các khu vực khác có phụ phí." },
  { q: "Máy hỏng thì được hỗ trợ như thế nào?", a: "Đội kỹ thuật sẽ có mặt trong vòng 4 giờ. Nếu không sửa được tại chỗ, chúng tôi sẽ thay máy tạm trong vòng 24 giờ." },
  { q: "Có thể nâng cấp gói trong thời gian hợp đồng không?", a: "Có thể nâng cấp lên gói cao hơn bất kỳ lúc nào, chỉ thanh toán phần chênh lệch theo ngày." },
];

export default function PricingPage() {
  return (
    <>
      <LandingNav />
      <main className="pt-16">
        {/* Hero */}
        <section className="bg-[#f9f9f9] py-24 px-6 text-center">
          <div className="max-w-[800px] mx-auto">
            <span className="text-black/30 text-xs tracking-[0.3em] uppercase font-bold mb-4 block">Pricing</span>
            <h1 className="text-5xl md:text-6xl font-black uppercase tracking-tight text-black mb-5">
              Minh bạch, linh hoạt
            </h1>
            <p className="text-black/40 text-xl font-light">
              Không phí ẩn. Không cam kết dài hạn bắt buộc. Chỉ trả tiền cho những gì bạn thực sự dùng.
            </p>
          </div>
        </section>

        {/* Plans */}
        <section className="bg-white py-16 px-6">
          <div className="max-w-[1200px] mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
            {plans.map((plan, i) => (
              <div key={i} className={`rounded-2xl p-8 flex flex-col gap-6 ${plan.highlight ? "bg-black text-white ring-2 ring-black scale-[1.02] shadow-2xl" : "border border-black/10"}`}>
                <div>
                  <div className={`text-xs font-bold tracking-[0.2em] uppercase mb-2 ${plan.highlight ? "text-white/50" : "text-black/30"}`}>
                    {plan.tagline}
                  </div>
                  <div className="text-3xl font-black mb-1">{plan.name}</div>
                  <div className="flex items-baseline gap-2 mt-4">
                    <span className={`text-3xl font-black ${plan.highlight ? "text-white" : "text-black"}`}>
                      {plan.price !== "Liên hệ" ? `${plan.price}đ` : plan.price}
                    </span>
                    <span className={`text-sm font-light ${plan.highlight ? "text-white/50" : "text-black/30"}`}>/ {plan.period}</span>
                  </div>
                </div>

                <ul className="flex flex-col gap-3 flex-1">
                  {plan.features.map((f, fi) => (
                    <li key={fi} className={`flex items-start gap-3 text-sm ${plan.highlight ? "text-white/80" : "text-black/60"}`}>
                      <Check className={`w-4 h-4 mt-0.5 shrink-0 ${plan.highlight ? "text-white" : "text-black"}`} />
                      {f}
                    </li>
                  ))}
                </ul>

                <Link
                  href="/login"
                  id={`pricing-cta-${plan.name.toLowerCase()}`}
                  className={`text-center py-3.5 rounded-full font-black uppercase tracking-widest text-sm transition-all group flex items-center justify-center gap-2 ${
                    plan.highlight
                      ? "bg-white text-black hover:bg-white/90"
                      : "border border-black text-black hover:bg-black hover:text-white"
                  }`}
                >
                  {plan.cta} <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>
            ))}
          </div>
        </section>

        {/* FAQs */}
        <section className="bg-[#f9f9f9] py-24 px-6">
          <div className="max-w-[800px] mx-auto">
            <h2 className="text-4xl font-black uppercase tracking-tight text-black mb-16 text-center">Câu hỏi thường gặp</h2>
            <div className="flex flex-col gap-6">
              {faqs.map((faq, i) => (
                <div key={i} className="bg-white rounded-2xl p-8 border border-black/5">
                  <h3 className="font-black text-black mb-3">{faq.q}</h3>
                  <p className="text-black/50 font-light leading-relaxed">{faq.a}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
      <LandingFooter />
    </>
  );
}
