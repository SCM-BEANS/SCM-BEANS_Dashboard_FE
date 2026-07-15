import { LandingNav } from "@/components/landing/LandingNav";
import { LandingFooter } from "@/components/landing/CtaFooter";
import Link from "next/link";
import { ArrowRight, Mail, Phone, MapPin } from "lucide-react";

export const metadata = {
  title: "Về chúng tôi | DEER COFFEE",
  description: "DEER COFFEE — Công ty cung cấp giải pháp cho thuê và quản lý máy pha cà phê tích hợp Cloud & IoT tại Việt Nam.",
};

const team = [
  { name: "Nguyễn Văn A", role: "Founder & CEO", desc: "10+ năm kinh nghiệm trong ngành F&B và công nghệ." },
  { name: "Trần Thị B", role: "CTO", desc: "Chuyên gia IoT và hệ thống nhúng, cựu kỹ sư tại Bosch." },
  { name: "Lê Văn C", role: "Head of Operations", desc: "Quản lý chuỗi cung ứng và vận hành dịch vụ trên toàn quốc." },
  { name: "Phạm Thị D", role: "Head of Sales", desc: "Phát triển thị trường B2B và đối tác chiến lược." },
];

const values = [
  { title: "Minh bạch", desc: "Giá cả rõ ràng, hợp đồng đơn giản. Không phí ẩn, không điều khoản khó hiểu." },
  { title: "Đáng tin cậy", desc: "SLA 99.9% uptime, đội kỹ thuật phản hồi trong 15 phút. Chúng tôi cam kết và thực hiện đúng cam kết." },
  { title: "Đổi mới liên tục", desc: "Cập nhật tính năng mới mỗi quý, lắng nghe phản hồi từ khách hàng để cải thiện liên tục." },
];

export default function AboutPage() {
  return (
    <>
      <LandingNav />
      <main className="pt-16">
        {/* Hero */}
        <section className="bg-black text-white py-28 px-6">
          <div className="max-w-[1400px] mx-auto">
            <span className="text-white/30 text-xs tracking-[0.3em] uppercase font-bold mb-6 block">About Us</span>
            <h1 className="text-5xl md:text-7xl font-black uppercase tracking-tight text-white mb-8 max-w-3xl leading-tight">
              Chúng tôi là<br />DEER COFFEE
            </h1>
            <p className="text-white/50 text-xl font-light max-w-2xl leading-relaxed">
              Chúng tôi tin rằng mọi doanh nghiệp, dù lớn hay nhỏ, đều xứng đáng được tiếp cận công nghệ máy pha cà phê tốt nhất mà không cần đầu tư vốn lớn ban đầu.
            </p>
          </div>
        </section>

        {/* Mission */}
        <section className="bg-white py-24 px-6">
          <div className="max-w-[1400px] mx-auto grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
            <div>
              <div className="w-10 h-1 bg-black mb-8"></div>
              <h2 className="text-4xl font-black uppercase tracking-tight text-black mb-6">Sứ mệnh của chúng tôi</h2>
              <p className="text-black/50 text-lg font-light leading-relaxed mb-6">
                DEER COFFEE được thành lập với mục tiêu đơn giản hóa việc vận hành máy pha cà phê cho các doanh nghiệp Việt Nam — từ quán cà phê nhỏ đến chuỗi khách sạn lớn.
              </p>
              <p className="text-black/50 text-lg font-light leading-relaxed mb-10">
                Chúng tôi kết hợp dịch vụ cho thuê máy linh hoạt với công nghệ IoT và Cloud để tạo ra một nền tảng quản lý thông minh, giúp doanh nghiệp tối ưu chi phí và nâng cao chất lượng dịch vụ.
              </p>
              <div className="grid grid-cols-3 gap-8 border-t border-black/10 pt-8">
                {[{ v: "2020", l: "Thành lập" }, { v: "500+", l: "Máy triển khai" }, { v: "50+", l: "Khách hàng" }].map((s, i) => (
                  <div key={i}>
                    <div className="text-3xl font-black text-black">{s.v}</div>
                    <div className="text-black/30 text-xs uppercase tracking-widest mt-1">{s.l}</div>
                  </div>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-1 gap-6">
              {values.map((v, i) => (
                <div key={i} className="border border-black/10 rounded-2xl p-8 hover:border-black/30 transition-colors">
                  <h3 className="font-black text-black text-lg mb-3">{v.title}</h3>
                  <p className="text-black/50 text-sm font-light leading-relaxed">{v.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Team */}
        <section className="bg-[#f9f9f9] py-24 px-6">
          <div className="max-w-[1400px] mx-auto">
            <h2 className="text-4xl font-black uppercase tracking-tight text-black mb-16 text-center">Đội ngũ lãnh đạo</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {team.map((member, i) => (
                <div key={i} className="bg-white rounded-2xl p-8 border border-black/5 hover:border-black/20 hover:shadow-lg transition-all">
                  <div className="w-16 h-16 rounded-full bg-black flex items-center justify-center mb-6">
                    <span className="text-white text-xl font-black">{member.name.charAt(0)}</span>
                  </div>
                  <h3 className="font-black text-black text-lg mb-1">{member.name}</h3>
                  <div className="text-black/30 text-xs uppercase tracking-widest font-bold mb-4">{member.role}</div>
                  <p className="text-black/50 text-sm font-light leading-relaxed">{member.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Contact */}
        <section className="bg-black py-24 px-6" id="contact">
          <div className="max-w-[1400px] mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16">
            <div>
              <h2 className="text-4xl font-black uppercase tracking-tight text-white mb-6">Liên hệ với chúng tôi</h2>
              <p className="text-white/40 font-light text-lg mb-10">Chúng tôi luôn sẵn sàng lắng nghe và hỗ trợ bạn.</p>
              <div className="flex flex-col gap-5">
                {[
                  { icon: <Mail className="w-5 h-5" />, label: "Email", value: "hello@deercoffee.vn" },
                  { icon: <Phone className="w-5 h-5" />, label: "Hotline", value: "1800 1234 (Miễn phí)" },
                  { icon: <MapPin className="w-5 h-5" />, label: "Địa chỉ", value: "123 Nguyễn Đình Chiểu, Q.3, TP.HCM" },
                ].map((c, i) => (
                  <div key={i} className="flex gap-4 items-start text-white">
                    <div className="text-white/40 mt-0.5">{c.icon}</div>
                    <div>
                      <div className="text-white/30 text-xs uppercase tracking-widest mb-1">{c.label}</div>
                      <div className="font-medium">{c.value}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <form className="flex flex-col gap-5" id="contact-form">
              <div className="grid grid-cols-2 gap-4">
                <input type="text" placeholder="Họ và tên" id="contact-name" className="bg-white/5 border border-white/10 rounded-xl px-5 py-3.5 text-white placeholder-white/30 outline-none focus:border-white/30 transition-colors text-sm" />
                <input type="email" placeholder="Email" id="contact-email" className="bg-white/5 border border-white/10 rounded-xl px-5 py-3.5 text-white placeholder-white/30 outline-none focus:border-white/30 transition-colors text-sm" />
              </div>
              <input type="text" placeholder="Công ty / Doanh nghiệp" id="contact-company" className="bg-white/5 border border-white/10 rounded-xl px-5 py-3.5 text-white placeholder-white/30 outline-none focus:border-white/30 transition-colors text-sm" />
              <textarea rows={5} placeholder="Tin nhắn của bạn..." id="contact-message" className="bg-white/5 border border-white/10 rounded-xl px-5 py-3.5 text-white placeholder-white/30 outline-none focus:border-white/30 transition-colors text-sm resize-none" />
              <button type="submit" id="contact-submit-btn" className="group flex items-center justify-center gap-3 bg-white text-black py-4 rounded-full font-black uppercase tracking-widest text-sm hover:bg-white/90 transition-all">
                Gửi tin nhắn <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
            </form>
          </div>
        </section>
      </main>
      <LandingFooter />
    </>
  );
}
