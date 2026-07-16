"use client";

import { ArrowRight, Wifi, BarChart2, Wrench, Shield } from "lucide-react";
import Link from "next/link";
import { AnimateOnScroll } from "./AnimateOnScroll";

const solutions = [
  {
    icon: <Wifi className="w-6 h-6" />,
    tag: "IoT Integration",
    title: "Kết nối máy pha cà phê lên Cloud",
    desc: "Tích hợp cảm biến IoT vào từng máy. Theo dõi nhiệt độ, áp suất, lượng nước và trạng thái máy theo thời gian thực từ bất kỳ đâu.",
    href: "/technology",
  },
  {
    icon: <BarChart2 className="w-6 h-6" />,
    tag: "Analytics",
    title: "Dashboard quản lý thông minh",
    desc: "Phân tích dữ liệu vận hành toàn đội máy. Báo cáo doanh thu theo ca, theo máy. Phát hiện bất thường trước khi xảy ra sự cố.",
    href: "/solutions",
  },
  {
    icon: <Wrench className="w-6 h-6" />,
    tag: "Maintenance",
    title: "Bảo trì dự đoán & hỗ trợ kỹ thuật",
    desc: "AI phân tích chu kỳ vệ sinh và bảo dưỡng, gửi cảnh báo tự động. Đội kỹ thuật của chúng tôi hỗ trợ 24/7.",
    href: "/solutions",
  },
  {
    icon: <Shield className="w-6 h-6" />,
    tag: "Rental Model",
    title: "Thuê máy linh hoạt — không đầu tư ban đầu",
    desc: "Không cần vốn mua máy. Trả phí thuê hàng tháng, bao gồm bảo trì, nâng cấp phần mềm và hỗ trợ kỹ thuật toàn phần.",
    href: "/pricing",
  },
];

export function ProductShowcase() {
  return (
    <section id="solutions" className="bg-white py-24 px-6">
      <div className="max-w-[1320px] mx-auto">
        <AnimateOnScroll>
          <div className="text-center mb-14">
            <span className="text-xs font-semibold tracking-[0.25em] uppercase text-[#0671E0] mb-3 block">
              What We Offer
            </span>
            <h2
              className="text-[#18191F] font-semibold mb-4"
              style={{ fontSize: "clamp(28px, 4vw, 36px)", lineHeight: "44px" }}
            >
              Giải pháp toàn diện cho doanh nghiệp
            </h2>
            <p className="text-[#89939E] max-w-[540px] mx-auto" style={{ fontSize: "18px", lineHeight: "28px" }}>
              Từ cho thuê máy đến tích hợp Cloud &amp; IoT — DEER COFFEE cung cấp hệ sinh thái
              quản lý cà phê đầy đủ nhất.
            </p>
          </div>
        </AnimateOnScroll>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {solutions.map((s, idx) => (
            <AnimateOnScroll key={idx} delay={idx * 100}>
              <Link
                href={s.href}
                id={`solution-card-${idx}`}
                className="group bg-white rounded-xl p-7 flex flex-col gap-5 border border-[#ABBED1]/40 hover:border-[#0671E0]/40 shadow-figma-2 hover:shadow-figma-8 transition-all duration-300 h-full"
              >
                <span className="text-[11px] font-semibold tracking-wider uppercase px-2.5 py-1 rounded-full w-fit bg-[#0671E0]/8 text-[#0671E0]">
                  {s.tag}
                </span>

                <div className="w-11 h-11 rounded-xl bg-[#0671E0]/8 flex items-center justify-center text-[#0671E0] group-hover:bg-[#0671E0] group-hover:text-white transition-all duration-300">
                  {s.icon}
                </div>

                <div className="flex-1">
                  <h3
                    className="text-[#18191F] font-semibold mb-2 leading-snug"
                    style={{ fontSize: "20px", lineHeight: "28px" }}
                  >
                    {s.title}
                  </h3>
                  <p className="text-sm leading-relaxed text-[#89939E]">
                    {s.desc}
                  </p>
                </div>

                <div className="flex items-center gap-2 text-sm font-semibold text-[#0671E0] group-hover:gap-3 transition-all duration-200 mt-2">
                  Xem thêm <ArrowRight className="w-4 h-4" />
                </div>
              </Link>
            </AnimateOnScroll>
          ))}
        </div>
      </div>
    </section>
  );
}
