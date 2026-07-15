"use client";

import { ArrowRight, Wifi, BarChart2, Wrench, Shield } from "lucide-react";
import Link from "next/link";

const solutions = [
  {
    icon: <Wifi className="w-7 h-7" />,
    tag: "IoT Integration",
    title: "Kết nối máy pha cà phê lên Cloud",
    desc: "Tích hợp cảm biến IoT vào từng máy. Theo dõi nhiệt độ, áp suất, lượng nước và trạng thái máy theo thời gian thực từ bất kỳ đâu.",
    href: "/technology",
  },
  {
    icon: <BarChart2 className="w-7 h-7" />,
    tag: "Analytics",
    title: "Dashboard quản lý thông minh",
    desc: "Phân tích dữ liệu vận hành toàn đội máy. Báo cáo doanh thu theo ca, theo máy. Phát hiện bất thường trước khi xảy ra sự cố.",
    href: "/solutions",
  },
  {
    icon: <Wrench className="w-7 h-7" />,
    tag: "Maintenance",
    title: "Bảo trì dự đoán & hỗ trợ kỹ thuật",
    desc: "AI phân tích chu kỳ vệ sinh và bảo dưỡng, gửi cảnh báo tự động. Đội kỹ thuật của chúng tôi hỗ trợ 24/7.",
    href: "/solutions",
  },
  {
    icon: <Shield className="w-7 h-7" />,
    tag: "Rental Model",
    title: "Thuê máy linh hoạt — không đầu tư ban đầu",
    desc: "Không cần vốn mua máy. Trả phí thuê hàng tháng, bao gồm bảo trì, nâng cấp phần mềm và hỗ trợ kỹ thuật toàn phần.",
    href: "/pricing",
  },
];

export function ProductShowcase() {
  return (
    <section id="solutions" className="bg-lp-bg py-28 px-6">
      <div className="max-w-[1400px] mx-auto">
        <div className="text-center mb-16">
          <span className="text-xs font-bold tracking-[0.3em] uppercase text-black/40 mb-3 block">
            What We Offer
          </span>
          <h2 className="text-4xl md:text-5xl font-black uppercase tracking-tight text-black mb-4">
            Giải pháp toàn diện
          </h2>
          <p className="text-black/50 max-w-xl mx-auto text-base font-light">
            Từ cho thuê máy đến tích hợp Cloud & IoT — DEER COFFEE cung cấp hệ sinh thái quản lý cà phê đầy đủ nhất.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {solutions.map((s, idx) => (
            <Link
              key={idx}
              href={s.href}
              id={`solution-card-${idx}`}
              className="group bg-lp-card rounded-2xl p-8 flex flex-col gap-6 hover:scale-[1.02] hover:brightness-95 transition-all duration-300 shadow-sm hover:shadow-lg"
            >
              <div className="text-xs font-semibold tracking-widest uppercase px-3 py-1.5 rounded-full w-fit bg-black/10 text-black/70">
                {s.tag}
              </div>
              <div className="text-black/80">{s.icon}</div>
              <div>
                <h3 className="text-xl font-bold mb-3 leading-snug text-black">{s.title}</h3>
                <p className="text-sm font-light leading-relaxed text-black/60">
                  {s.desc}
                </p>
              </div>
              <div className="mt-auto flex items-center gap-2 text-sm font-semibold uppercase tracking-widest text-black/70">
                Xem thêm <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
