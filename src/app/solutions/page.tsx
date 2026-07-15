import { LandingNav } from "@/components/landing/LandingNav";
import { LandingFooter } from "@/components/landing/CtaFooter";
import { Wifi, BarChart2, Wrench, Shield, ArrowRight } from "lucide-react";
import Link from "next/link";

export const metadata = {
  title: "Giải pháp | DEER COFFEE",
  description: "Giải pháp cho thuê máy pha cà phê tích hợp Cloud & IoT — quản lý đội máy thông minh từ một nền tảng duy nhất.",
};

const solutions = [
  {
    icon: <Wifi className="w-10 h-10" />,
    title: "Cho thuê máy pha cà phê",
    subtitle: "Rental Service",
    desc: "Không cần vốn đầu tư ban đầu. Chúng tôi cung cấp máy pha cà phê thương mại chất lượng cao với phí thuê hàng tháng hợp lý. Bao gồm lắp đặt, bảo trì và hỗ trợ kỹ thuật toàn phần.",
    features: ["Không vốn đầu tư ban đầu", "Đổi mới máy theo hợp đồng", "Bảo hành toàn bộ trong thời gian thuê", "Linh hoạt mở rộng theo nhu cầu"],
  },
  {
    icon: <BarChart2 className="w-10 h-10" />,
    title: "Dashboard quản lý thông minh",
    subtitle: "Cloud Management",
    desc: "Theo dõi và quản lý toàn bộ đội máy của bạn từ một giao diện duy nhất. Dữ liệu cập nhật theo thời gian thực giúp bạn ra quyết định nhanh chóng và chính xác.",
    features: ["Báo cáo doanh thu theo ca/ngày/tháng", "Phân tích hiệu suất từng máy", "Cảnh báo sự cố tức thời", "Xuất báo cáo Excel/PDF"],
  },
  {
    icon: <Wrench className="w-10 h-10" />,
    title: "Bảo trì dự đoán & Hỗ trợ kỹ thuật",
    subtitle: "Predictive Maintenance",
    desc: "Hệ thống AI phân tích dữ liệu vận hành để dự đoán hỏng hóc trước khi xảy ra. Đội kỹ thuật viên của chúng tôi sẵn sàng hỗ trợ 24/7.",
    features: ["Lịch bảo trì tự động", "Cảnh báo qua email & SMS", "Phản hồi sự cố trong 15 phút", "Đội kỹ thuật tại chỗ trong 4 giờ"],
  },
  {
    icon: <Shield className="w-10 h-10" />,
    title: "Tích hợp IoT & Cloud",
    subtitle: "IoT Integration",
    desc: "Gắn kết từng chiếc máy pha cà phê vào hạ tầng IoT hiện đại. Thu thập dữ liệu vận hành theo thời gian thực, lưu trữ trên cloud bảo mật và phân tích tự động.",
    features: ["Cảm biến nhiệt độ, áp suất, lưu lượng", "Kết nối WiFi & 4G dự phòng", "Lưu trữ cloud 99.99% uptime", "API tích hợp với hệ thống POS"],
  },
];

export default function SolutionsPage() {
  return (
    <>
      <LandingNav />
      <main className="pt-16">
        {/* Hero */}
        <section className="bg-black text-white py-32 px-6">
          <div className="max-w-[1400px] mx-auto">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-px bg-white/40"></div>
              <span className="text-white/40 text-xs tracking-[0.3em] uppercase font-bold">Solutions</span>
            </div>
            <h1 className="text-5xl md:text-7xl font-black uppercase tracking-tight text-white mb-6 max-w-3xl leading-tight">
              Giải pháp toàn diện cho doanh nghiệp
            </h1>
            <p className="text-white/50 text-xl font-light max-w-2xl leading-relaxed">
              DEER COFFEE cung cấp hệ sinh thái đầy đủ từ cho thuê máy, tích hợp IoT đến quản lý vận hành thông minh.
            </p>
          </div>
        </section>

        {/* Solutions */}
        <section className="bg-white py-28 px-6">
          <div className="max-w-[1400px] mx-auto flex flex-col gap-20">
            {solutions.map((s, i) => (
              <div key={i} className={`grid grid-cols-1 lg:grid-cols-2 gap-12 items-center ${i % 2 === 1 ? "lg:flex-row-reverse" : ""}`}>
                <div className={`${i % 2 === 1 ? "lg:order-2" : ""}`}>
                  <div className="text-black/30 text-xs tracking-[0.3em] uppercase font-bold mb-4">{s.subtitle}</div>
                  <h2 className="text-3xl md:text-4xl font-black text-black mb-5 leading-tight">{s.title}</h2>
                  <p className="text-black/50 text-base font-light leading-relaxed mb-8">{s.desc}</p>
                  <ul className="flex flex-col gap-3 mb-8">
                    {s.features.map((f, fi) => (
                      <li key={fi} className="flex items-center gap-3 text-black/70 text-sm font-medium">
                        <span className="w-5 h-5 rounded-full bg-black flex items-center justify-center shrink-0">
                          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7"/></svg>
                        </span>
                        {f}
                      </li>
                    ))}
                  </ul>
                  <Link href="/pricing" className="group inline-flex items-center gap-2 font-bold text-black border-b-2 border-black pb-1">
                    Xem bảng giá <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </Link>
                </div>
                <div className={`bg-[#f9f9f9] rounded-3xl p-12 flex items-center justify-center aspect-square ${i % 2 === 1 ? "lg:order-1" : ""}`}>
                  <div className="text-black/20">{s.icon}</div>
                  <div className="text-6xl text-black font-black opacity-5 absolute">{i + 1}</div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="bg-black py-24 px-6 text-center">
          <div className="max-w-[800px] mx-auto">
            <h2 className="text-4xl font-black text-white uppercase tracking-tight mb-6">Sẵn sàng bắt đầu?</h2>
            <p className="text-white/40 mb-10 font-light text-lg">Liên hệ ngay để nhận tư vấn miễn phí và demo trực tiếp hệ thống.</p>
            <Link href="/login" className="inline-flex items-center gap-3 bg-white text-black px-8 py-4 rounded-full font-black uppercase tracking-widest text-sm hover:bg-white/90 transition-all">
              Bắt đầu ngay <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </section>
      </main>
      <LandingFooter />
    </>
  );
}
