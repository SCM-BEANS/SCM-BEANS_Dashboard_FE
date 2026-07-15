import { LandingNav } from "@/components/landing/LandingNav";
import { LandingFooter } from "@/components/landing/CtaFooter";
import { Wifi, BarChart2, Wrench, Shield, ArrowRight, CheckCircle2, Coffee, TrendingUp, Clock, Headphones } from "lucide-react";
import Link from "next/link";

export const metadata = {
  title: "Giải pháp | DEER COFFEE",
  description: "Giải pháp cho thuê máy pha cà phê tích hợp Cloud & IoT — quản lý đội máy thông minh từ một nền tảng duy nhất.",
};

const solutions = [
  {
    icon: <Wifi className="w-12 h-12" />,
    number: "01",
    title: "Cho thuê máy pha cà phê",
    subtitle: "Rental Service",
    desc: "Không cần vốn đầu tư ban đầu. Chúng tôi cung cấp máy pha cà phê thương mại chất lượng cao với phí thuê hàng tháng hợp lý. Bao gồm lắp đặt, bảo trì và hỗ trợ kỹ thuật toàn phần.",
    features: ["Không vốn đầu tư ban đầu", "Đổi mới máy theo hợp đồng", "Bảo hành toàn bộ trong thời gian thuê", "Linh hoạt mở rộng theo nhu cầu"],
    bg: "bg-[#f4f0eb]",
    accent: "bg-black text-white",
  },
  {
    icon: <BarChart2 className="w-12 h-12" />,
    number: "02",
    title: "Dashboard quản lý thông minh",
    subtitle: "Cloud Management",
    desc: "Theo dõi và quản lý toàn bộ đội máy của bạn từ một giao diện duy nhất. Dữ liệu cập nhật theo thời gian thực giúp bạn ra quyết định nhanh chóng và chính xác.",
    features: ["Báo cáo doanh thu theo ca/ngày/tháng", "Phân tích hiệu suất từng máy", "Cảnh báo sự cố tức thời", "Xuất báo cáo Excel/PDF"],
    bg: "bg-[#1A0E07]",
    accent: "bg-white text-black",
  },
  {
    icon: <Wrench className="w-12 h-12" />,
    number: "03",
    title: "Bảo trì dự đoán & Hỗ trợ kỹ thuật",
    subtitle: "Predictive Maintenance",
    desc: "Hệ thống AI phân tích dữ liệu vận hành để dự đoán hỏng hóc trước khi xảy ra. Đội kỹ thuật viên của chúng tôi sẵn sàng hỗ trợ 24/7.",
    features: ["Lịch bảo trì tự động", "Cảnh báo qua email & SMS", "Phản hồi sự cố trong 15 phút", "Đội kỹ thuật tại chỗ trong 4 giờ"],
    bg: "bg-[#f4f0eb]",
    accent: "bg-black text-white",
  },
  {
    icon: <Shield className="w-12 h-12" />,
    number: "04",
    title: "Tích hợp IoT & Cloud",
    subtitle: "IoT Integration",
    desc: "Gắn kết từng chiếc máy pha cà phê vào hạ tầng IoT hiện đại. Thu thập dữ liệu vận hành theo thời gian thực, lưu trữ trên cloud bảo mật và phân tích tự động.",
    features: ["Cảm biến nhiệt độ, áp suất, lưu lượng", "Kết nối WiFi & 4G dự phòng", "Lưu trữ cloud 99.99% uptime", "API tích hợp với hệ thống POS"],
    bg: "bg-[#1A0E07]",
    accent: "bg-white text-black",
  },
];

const stats = [
  { icon: <Coffee className="w-6 h-6" />, value: "500+", label: "Máy đang vận hành" },
  { icon: <TrendingUp className="w-6 h-6" />, value: "50+", label: "Doanh nghiệp đối tác" },
  { icon: <Clock className="w-6 h-6" />, value: "<15 phút", label: "Thời gian phản hồi" },
  { icon: <Headphones className="w-6 h-6" />, value: "24/7", label: "Hỗ trợ kỹ thuật" },
];

export default function SolutionsPage() {
  return (
    <>
      <LandingNav />
      <main className="pt-16">

        {/* ── Hero ── */}
        <section className="bg-[#1A0E07] text-white py-36 px-6 relative overflow-hidden">
          {/* Background texture */}
          <div
            className="absolute inset-0 opacity-10 bg-cover bg-center"
            style={{ backgroundImage: "url('https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&q=80&w=2000')" }}
          />
          <div className="absolute inset-0 bg-gradient-to-br from-[#1A0E07] via-[#1A0E07]/95 to-[#2C1810]/80" />

          <div className="relative z-10 max-w-[1400px] mx-auto">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-10 h-px bg-white/50" />
              <span className="text-white/60 text-xs tracking-[0.3em] uppercase font-bold">Solutions</span>
            </div>
            <h1 className="text-5xl md:text-7xl font-black uppercase tracking-tight text-white mb-8 max-w-4xl leading-tight flex flex-col gap-4">
              <span>Giải pháp toàn diện</span>
              <span className="text-white/50">cho doanh nghiệp</span>
            </h1>
            <p className="text-white/75 text-xl font-light max-w-2xl leading-relaxed mb-14">
              DEER COFFEE cung cấp hệ sinh thái đầy đủ từ cho thuê máy, tích hợp IoT đến quản lý vận hành thông minh — tất cả trong một nền tảng duy nhất.
            </p>

            {/* Stats bar */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-white/10 border border-white/10 rounded-2xl overflow-hidden">
              {stats.map((s, i) => (
                <div key={i} className="bg-white/5 p-6 flex flex-col items-center text-center gap-2">
                  <div className="text-white/50">{s.icon}</div>
                  <div className="text-white text-3xl font-black">{s.value}</div>
                  <div className="text-white/60 text-xs uppercase tracking-widest font-semibold">{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Solutions List ── */}
        {solutions.map((s, i) => (
          <section key={i} className={`${s.bg} py-28 px-6`}>
            <div className="max-w-[1400px] mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">

              {/* Text side */}
              <div className={i % 2 === 1 ? "lg:order-2" : ""}>
                <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest mb-6 ${i % 2 === 1 ? "bg-white/10 text-white/70" : "bg-black/10 text-black/60"}`}>
                  {s.subtitle}
                </div>
                <div className={`text-7xl font-black mb-4 leading-none ${i % 2 === 1 ? "text-white/10" : "text-black/8"}`}>{s.number}</div>
                <h2 className={`text-3xl md:text-4xl font-black mb-5 leading-tight ${i % 2 === 1 ? "text-white" : "text-black"}`}>
                  {s.title}
                </h2>
                <p className={`text-base leading-relaxed mb-8 ${i % 2 === 1 ? "text-white/85" : "text-black/80"}`}>
                  {s.desc}
                </p>
                <ul className="flex flex-col gap-3 mb-10">
                  {s.features.map((f, fi) => (
                    <li key={fi} className={`flex items-center gap-3 text-sm font-medium ${i % 2 === 1 ? "text-white/90" : "text-black/85"}`}>
                      <CheckCircle2 className={`w-5 h-5 shrink-0 ${i % 2 === 1 ? "text-white/50" : "text-black/40"}`} />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/pricing"
                  className={`group inline-flex items-center gap-2 font-bold text-sm uppercase tracking-widest border-b-2 pb-1 transition-all duration-300 ${i % 2 === 1 ? "text-white border-white/40 hover:border-white" : "text-black border-black/40 hover:border-black"}`}
                >
                  Xem bảng giá <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>

              {/* Visual side */}
              <div className={`relative flex items-center justify-center ${i % 2 === 1 ? "lg:order-1" : ""}`}>
                <div className={`w-full aspect-square max-w-[480px] rounded-3xl flex flex-col items-center justify-center gap-8 relative overflow-hidden ${i % 2 === 1 ? "bg-white/5 border border-white/10" : "bg-black/5 border border-black/10"}`}>
                  {/* Large number watermark */}
                  <div className={`absolute text-[200px] font-black leading-none select-none pointer-events-none ${i % 2 === 1 ? "text-white/5" : "text-black/5"}`}>{s.number}</div>
                  {/* Icon */}
                  <div className={`relative z-10 p-8 rounded-full ${i % 2 === 1 ? "bg-white/10 text-white" : "bg-black/10 text-black"}`}>
                    {s.icon}
                  </div>
                  {/* Feature pills */}
                  <div className="relative z-10 flex flex-col gap-2 w-full max-w-[280px]">
                    {s.features.slice(0, 3).map((f, fi) => (
                      <div key={fi} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold ${i % 2 === 1 ? "bg-white/15 text-white/90" : "bg-black/10 text-black/80"}`}>
                        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${i % 2 === 1 ? "bg-white/50" : "bg-black/40"}`} />
                        {f}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </section>
        ))}

        {/* ── CTA ── */}
        <section className="bg-[#1A0E07] py-28 px-6 text-center">
          <div className="max-w-[800px] mx-auto">
            <span className="text-white/50 text-xs tracking-[0.3em] uppercase font-bold block mb-6">Bắt đầu ngay hôm nay</span>
            <h2 className="text-4xl md:text-5xl font-black text-white uppercase tracking-tight mb-6 leading-tight">
              Sẵn sàng bắt đầu?
            </h2>
            <p className="text-white/80 mb-12 text-lg leading-relaxed max-w-lg mx-auto">
              Liên hệ ngay để nhận tư vấn miễn phí và demo trực tiếp hệ thống. Đội ngũ của chúng tôi sẵn sàng hỗ trợ bạn 24/7.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/login"
                className="group inline-flex items-center justify-center gap-3 bg-white text-black px-8 py-4 rounded-full font-black uppercase tracking-widest text-sm hover:bg-white/90 transition-all"
              >
                Bắt đầu ngay <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link
                href="/about"
                className="inline-flex items-center justify-center gap-3 border border-white/30 text-white px-8 py-4 rounded-full font-bold uppercase tracking-widest text-sm hover:bg-white/10 transition-all"
              >
                Liên hệ tư vấn
              </Link>
            </div>
          </div>
        </section>
      </main>
      <LandingFooter />
    </>
  );
}
