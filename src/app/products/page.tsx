import { LandingNav } from "@/components/landing/LandingNav";
import { LandingFooter } from "@/components/landing/CtaFooter";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

export const metadata = {
  title: "Sản phẩm | DEER COFFEE",
  description: "Danh mục máy pha cà phê thương mại cho thuê — từ máy espresso bán tự động đến máy hoàn toàn tự động tích hợp IoT.",
};

const products = [
  {
    name: "DeerX-100",
    category: "Espresso Tự Động",
    tag: "Phổ biến nhất",
    desc: "Máy espresso tự động hoàn toàn phù hợp cho văn phòng và quán cà phê nhỏ. Tích hợp cảm biến IoT cơ bản, kết nối Cloud, quản lý từ xa.",
    specs: ["15 bar pump pressure", "1.8L water tank", "IoT Ready", "Wifi + 4G"],
    rentalFrom: "1,500,000",
    img: "https://images.unsplash.com/photo-1610632380989-680fe40816c6?auto=format&fit=crop&q=80&w=800",
  },
  {
    name: "DeerX-Pro",
    category: "Dual Group Head",
    tag: "Dành cho chuỗi quán",
    desc: "Dòng máy đôi cho chuỗi quán cà phê hoặc khách sạn. Sản lượng cao, hai đầu brew độc lập, tích hợp IoT đầy đủ và màn hình cảm ứng.",
    specs: ["Dual group head", "3L boiler capacity", "Full IoT Suite", "Touchscreen UI"],
    rentalFrom: "3,500,000",
    img: "https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&q=80&w=800",
  },
  {
    name: "DeerX-Enterprise",
    category: "Commercial Grade",
    tag: "Chuỗi lớn & Doanh nghiệp",
    desc: "Giải pháp doanh nghiệp cho hệ thống hàng trăm máy. Quản lý tập trung, API tích hợp POS, báo cáo thời gian thực trên toàn bộ chuỗi.",
    specs: ["Multi-site management", "POS Integration API", "Advanced Analytics", "Priority 24/7 Support"],
    rentalFrom: "Liên hệ",
    img: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&q=80&w=800",
  },
];

export default function ProductsPage() {
  return (
    <>
      <LandingNav />
      <main className="pt-16">
        {/* Hero */}
        <section className="bg-[#f9f9f9] py-28 px-6">
          <div className="max-w-[1400px] mx-auto text-center">
            <span className="text-black/30 text-xs tracking-[0.3em] uppercase font-bold mb-4 block">Products</span>
            <h1 className="text-5xl md:text-6xl font-black uppercase tracking-tight text-black mb-5">
              Danh mục sản phẩm
            </h1>
            <p className="text-black/40 text-xl font-light max-w-xl mx-auto">
              Máy pha cà phê thương mại chất lượng cao — sẵn sàng tích hợp IoT và kết nối Cloud.
            </p>
          </div>
        </section>

        {/* Products */}
        <section className="bg-white py-24 px-6">
          <div className="max-w-[1400px] mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
            {products.map((p, i) => (
              <div key={i} className="group border border-black/10 rounded-2xl overflow-hidden hover:shadow-xl transition-all duration-500">
                <div className="aspect-[4/3] bg-[#f9f9f9] relative overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={p.img}
                    alt={p.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 opacity-80"
                  />
                  <div className="absolute top-4 left-4">
                    <span className="bg-black text-white text-[10px] font-bold px-3 py-1.5 rounded-full uppercase tracking-widest">
                      {p.tag}
                    </span>
                  </div>
                </div>
                <div className="p-8">
                  <div className="text-black/30 text-xs tracking-widest uppercase font-bold mb-2">{p.category}</div>
                  <h2 className="text-2xl font-black text-black mb-4">{p.name}</h2>
                  <p className="text-black/50 text-sm font-light leading-relaxed mb-6">{p.desc}</p>
                  <div className="flex flex-wrap gap-2 mb-6">
                    {p.specs.map((spec, si) => (
                      <span key={si} className="text-[11px] bg-[#f9f9f9] text-black/60 px-3 py-1 rounded-full font-medium border border-black/5">
                        {spec}
                      </span>
                    ))}
                  </div>
                  <div className="flex items-center justify-between border-t border-black/5 pt-6">
                    <div>
                      <div className="text-black/30 text-xs uppercase tracking-widest mb-1">Giá thuê từ</div>
                      <div className="text-xl font-black text-black">{p.rentalFrom !== "Liên hệ" ? `${p.rentalFrom}đ/tháng` : "Liên hệ"}</div>
                    </div>
                    <Link href="/pricing" className="group/btn flex items-center gap-2 bg-black text-white px-5 py-2.5 rounded-full text-sm font-bold hover:bg-black/80 transition-all">
                      Thuê ngay <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Why our machines */}
        <section className="bg-black py-24 px-6 text-white">
          <div className="max-w-[1400px] mx-auto text-center">
            <h2 className="text-4xl font-black uppercase tracking-tight mb-4">Tại sao chọn máy DEER COFFEE?</h2>
            <p className="text-white/40 font-light text-lg mb-16 max-w-xl mx-auto">
              Tất cả các máy đều được lắp sẵn cảm biến IoT và tích hợp với nền tảng quản lý Cloud của chúng tôi.
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-white/5">
              {[
                { v: "100%", l: "IoT Ready" },
                { v: "24/7", l: "Remote Support" },
                { v: "< 4h", l: "On-site Response" },
                { v: "∞", l: "Software Updates" },
              ].map((item, i) => (
                <div key={i} className="bg-black p-10 text-center hover:bg-white/5 transition-colors">
                  <div className="text-4xl font-black text-white mb-3">{item.v}</div>
                  <div className="text-white/30 text-xs uppercase tracking-widest">{item.l}</div>
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
