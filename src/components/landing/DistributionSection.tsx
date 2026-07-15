"use client";

import { ArrowRight, MapPin, Clock, Headphones } from "lucide-react";
import Link from "next/link";

const stats = [
  { value: "500+", label: "Máy đang thuê" },
  { value: "50+", label: "Doanh nghiệp đối tác" },
  { value: "10", label: "Tỉnh thành triển khai" },
  { value: "24/7", label: "Hỗ trợ kỹ thuật" },
];

const servicePoints = [
  { icon: <MapPin className="w-5 h-5" />, title: "Triển khai tại chỗ", desc: "Đội kỹ thuật lắp đặt và cấu hình máy tại địa điểm của bạn trong 24 giờ." },
  { icon: <Clock className="w-5 h-5" />, title: "Bảo trì định kỳ", desc: "Lịch bảo trì tự động, nhắc nhở vệ sinh máy, thay linh kiện đúng hạn." },
  { icon: <Headphones className="w-5 h-5" />, title: "Hỗ trợ 24/7", desc: "Hotline và chat trực tuyến, phản hồi trong vòng 15 phút cho mọi sự cố." },
];

export function DistributionSection() {
  return (
    <section id="distribution" className="bg-[#f4f0eb] py-32 px-6">
      <div className="max-w-[1400px] mx-auto">

        {/* Top stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-black/10 border border-black/10 rounded-2xl overflow-hidden mb-20">
          {stats.map((s, i) => (
            <div key={i} className="bg-white p-8 text-center">
              <div className="text-4xl md:text-5xl font-black text-black mb-2">{s.value}</div>
              <div className="text-xs text-black/70 uppercase tracking-widest font-semibold">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Content grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">

          {/* Left: Map — lighter overlay for better visibility */}
          <div className="relative w-full rounded-2xl overflow-hidden bg-[#3C2415] aspect-[4/3] flex items-center justify-center">
            {/* Map background image — higher opacity for visibility */}
            <div
              className="absolute inset-0 opacity-50 bg-cover bg-center"
              style={{ backgroundImage: "url('https://images.unsplash.com/photo-1524661135-423995f22d0b?auto=format&fit=crop&q=80&w=1200')" }}
            />
            {/* Lighter brown overlay instead of black */}
            <div className="absolute inset-0 bg-[#2C1810]/50" />

            <div className="relative z-10 w-full h-full p-8">
              <div className="text-white/80 text-xs tracking-widest uppercase mb-4 font-semibold">Service Coverage · Vietnam</div>
              <div className="relative w-full h-[250px]">
                {[
                  { top: "5%", left: "48%", label: "Hà Nội" },
                  { top: "35%", left: "55%", label: "Đà Nẵng" },
                  { top: "60%", left: "40%", label: "TP.HCM" },
                  { top: "70%", left: "50%", label: "Bình Dương" },
                  { top: "15%", left: "44%", label: "Hải Phòng" },
                  { top: "50%", left: "38%", label: "Nha Trang" },
                ].map((point, i) => (
                  <div key={i} className="absolute flex flex-col items-center" style={{ top: point.top, left: point.left }}>
                    <div className="relative">
                      <div className="w-3 h-3 rounded-full bg-amber-300 animate-ping absolute" />
                      <div className="w-3 h-3 rounded-full bg-amber-300 relative z-10" />
                    </div>
                    <span className="text-white text-[11px] mt-1.5 whitespace-nowrap font-bold drop-shadow-lg">{point.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right: Content */}
          <div className="flex flex-col gap-8">
            <div>
              <div className="w-10 h-1 bg-black/40 mb-6 rounded-full" />
              <h2 className="text-4xl md:text-5xl font-black uppercase tracking-tight text-black mb-5 leading-tight flex flex-col gap-3">
                <span>Dịch vụ phủ rộng</span>
                <span className="text-black/35">toàn quốc</span>
              </h2>
              <p className="text-black/80 text-lg font-light max-w-lg leading-relaxed">
                Từ Hà Nội đến TP.HCM, đội ngũ kỹ thuật viên của DEER COFFEE sẵn sàng triển khai và hỗ trợ các doanh nghiệp vừa và lớn trong toàn bộ chuỗi dịch vụ máy pha cà phê.
              </p>
            </div>

            <div className="flex flex-col gap-4">
              {servicePoints.map((sp, i) => (
                <div key={i} className="flex gap-4 p-5 bg-white rounded-xl border border-black/8 hover:border-black/20 transition-colors">
                  <div className="text-black/60 mt-0.5 shrink-0">{sp.icon}</div>
                  <div>
                    <div className="font-bold text-black mb-1.5 text-base">{sp.title}</div>
                    <div className="text-black/75 text-sm leading-relaxed">{sp.desc}</div>
                  </div>
                </div>
              ))}
            </div>

            <Link
              href="/about"
              id="distribution-cta-btn"
              className="group inline-flex items-center gap-3 border-b-2 border-black/40 pb-2 text-black uppercase tracking-widest font-bold text-sm w-fit hover:border-black hover:gap-4 transition-all duration-300"
            >
              Liên hệ triển khai <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
