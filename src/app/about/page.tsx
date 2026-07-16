"use client";

import { LandingNav } from "@/components/landing/LandingNav";
import { LandingFooter } from "@/components/landing/CtaFooter";
import { AnimateOnScroll, StaggerContainer } from "@/components/landing/AnimateOnScroll";
import { ArrowRight, Mail, Phone, MapPin } from "lucide-react";
import Image from "next/image";

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
      <main className="pt-[72px]">
        {/* ── Hero ── */}
        <section className="bg-white border-b border-[#ABBED1]/30 py-16 sm:py-20 lg:py-24 px-4 sm:px-6">
          <div className="max-w-[1320px] mx-auto text-center">
            <AnimateOnScroll delay={0}>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#0671E0]/8 rounded-full mb-5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#0671E0]" />
                <span className="text-[#0671E0] text-xs font-semibold tracking-wider uppercase">About Us</span>
              </div>
            </AnimateOnScroll>
            <AnimateOnScroll delay={80}>
              <h1 className="text-[#18191F] font-semibold mb-4 leading-tight" style={{ fontSize: "clamp(32px, 5vw, 60px)" }}>
                Chúng tôi là <span className="text-[#0671E0]">DEER COFFEE</span>
              </h1>
            </AnimateOnScroll>
            <AnimateOnScroll delay={160}>
              <p className="text-[#89939E] max-w-[640px] mx-auto" style={{ fontSize: "clamp(15px, 2vw, 18px)", lineHeight: "1.7" }}>
                Chúng tôi tin rằng mọi doanh nghiệp, dù lớn hay nhỏ, đều xứng đáng được
                tiếp cận công nghệ máy pha cà phê tốt nhất mà không cần đầu tư vốn lớn ban đầu.
              </p>
            </AnimateOnScroll>
          </div>
        </section>

        {/* ── Mission ── */}
        <section className="bg-[#F5F7FA] py-16 sm:py-20 lg:py-24 px-4 sm:px-6">
          <div className="max-w-[1320px] mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <AnimateOnScroll direction="left">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-0.5 bg-[#0671E0]" />
                <span className="text-[#0671E0] tracking-[0.2em] uppercase text-xs font-semibold">Sứ mệnh</span>
              </div>
              <h2 className="text-[#18191F] font-semibold mb-5" style={{ fontSize: "clamp(24px, 3.5vw, 36px)", lineHeight: "44px" }}>
                Đơn giản hóa vận hành
              </h2>
              <p className="text-[#89939E] mb-5 text-sm sm:text-base leading-relaxed">
                DEER COFFEE được thành lập với mục tiêu đơn giản hóa việc vận hành máy pha cà phê cho các doanh nghiệp Việt Nam — từ quán cà phê nhỏ đến chuỗi khách sạn lớn.
              </p>
              <p className="text-[#89939E] mb-10 text-sm sm:text-base leading-relaxed">
                Chúng tôi kết hợp dịch vụ cho thuê máy linh hoạt với công nghệ IoT và Cloud để tạo ra một nền tảng quản lý thông minh, giúp doanh nghiệp tối ưu chi phí và nâng cao chất lượng dịch vụ.
              </p>
              <div className="grid grid-cols-3 gap-6 sm:gap-8 border-t border-[#ABBED1]/40 pt-8">
                {[
                  { v: "2020", l: "Thành lập" },
                  { v: "500+", l: "Máy triển khai" },
                  { v: "50+", l: "Khách hàng" }
                ].map((s, i) => (
                  <div key={i}>
                    <div className="text-2xl sm:text-3xl font-bold text-[#0671E0]">{s.v}</div>
                    <div className="text-[#89939E] text-[10px] sm:text-xs uppercase tracking-widest mt-1 font-semibold">{s.l}</div>
                  </div>
                ))}
              </div>
            </AnimateOnScroll>
            
            <StaggerContainer direction="right" staggerMs={120} className="flex flex-col gap-5">
              {values.map((v, i) => (
                <div key={i} className="bg-white border border-[#ABBED1]/40 rounded-2xl p-6 sm:p-8 hover:border-[#0671E0]/30 hover:shadow-[0px_4px_8px_rgba(171,190,209,0.4)] transition-all duration-300 relative overflow-hidden group">
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#0671E0]/20 group-hover:bg-[#0671E0] transition-colors" />
                  <h3 className="font-semibold text-[#18191F] text-lg mb-2 pl-2">{v.title}</h3>
                  <p className="text-[#89939E] text-sm leading-relaxed pl-2">{v.desc}</p>
                </div>
              ))}
            </StaggerContainer>
          </div>
        </section>

        {/* ── Team ── */}
        <section className="bg-white py-16 sm:py-20 lg:py-24 px-4 sm:px-6">
          <div className="max-w-[1320px] mx-auto">
            <AnimateOnScroll>
              <div className="text-center mb-12">
                <span className="text-xs font-semibold tracking-[0.25em] uppercase text-[#0671E0] mb-3 block">Đội ngũ lãnh đạo</span>
                <h2 className="text-[#18191F] font-semibold" style={{ fontSize: "clamp(24px, 3.5vw, 36px)", lineHeight: "44px" }}>
                  Những người đứng sau DEER COFFEE
                </h2>
              </div>
            </AnimateOnScroll>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {team.map((member, i) => (
                <AnimateOnScroll key={i} delay={i * 100} direction="up">
                  <div className="bg-[#F5F7FA] rounded-2xl p-7 border border-[#ABBED1]/40 hover:border-[#0671E0]/30 hover:shadow-[0px_8px_16px_rgba(171,190,209,0.4)] transition-all duration-300 group">
                    <div className="w-16 h-16 rounded-full bg-[#0671E0]/10 text-[#0671E0] flex items-center justify-center mb-5 shrink-0 group-hover:scale-110 transition-transform duration-300">
                       <span className="text-xl font-bold">{member.name.charAt(0)}</span>
                    </div>
                    <h3 className="font-bold text-[#18191F] text-lg mb-1">{member.name}</h3>
                    <div className="text-[#0671E0] text-[10px] uppercase tracking-widest font-bold mb-3">{member.role}</div>
                    <p className="text-[#89939E] text-sm leading-relaxed">{member.desc}</p>
                  </div>
                </AnimateOnScroll>
              ))}
            </div>
          </div>
        </section>

        {/* ── Contact ── */}
        <section className="bg-[#18191F] py-16 sm:py-20 lg:py-24 px-4 sm:px-6" id="contact">
          <div className="max-w-[1320px] mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16">
            <AnimateOnScroll direction="left">
              <h2 className="text-white font-semibold mb-5" style={{ fontSize: "clamp(28px, 4vw, 40px)", lineHeight: "1.2" }}>
                Liên hệ với chúng tôi
              </h2>
              <p className="text-white/60 font-light text-base sm:text-lg mb-10 max-w-[480px]">
                Bạn cần tư vấn về giải pháp thuê máy pha cà phê? Hãy để lại thông tin, đội ngũ của chúng tôi sẽ liên hệ lại trong vòng 24 giờ.
              </p>
              
              <div className="flex flex-col gap-6">
                {[
                  { icon: <Mail className="w-5 h-5" />, label: "Email", value: "hello@deercoffee.vn" },
                  { icon: <Phone className="w-5 h-5" />, label: "Hotline", value: "1800 1234 (Miễn phí)" },
                  { icon: <MapPin className="w-5 h-5" />, label: "Địa chỉ", value: "123 Nguyễn Đình Chiểu, Q.3, TP.HCM" },
                ].map((c, i) => (
                  <div key={i} className="flex gap-4 items-start group">
                    <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-white/50 group-hover:bg-[#0671E0] group-hover:text-white transition-colors duration-300">
                      {c.icon}
                    </div>
                    <div>
                      <div className="text-white/40 text-[10px] uppercase tracking-widest mb-1 font-semibold">{c.label}</div>
                      <div className="font-medium text-white">{c.value}</div>
                    </div>
                  </div>
                ))}
              </div>
            </AnimateOnScroll>

            <AnimateOnScroll direction="right">
              <form className="bg-white/5 border border-white/10 rounded-2xl p-6 sm:p-8 flex flex-col gap-4" id="contact-form">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <input type="text" placeholder="Họ và tên" id="contact-name" className="bg-white/5 border border-white/10 rounded-xl px-5 py-3.5 text-white placeholder-white/30 outline-none focus:border-[#0671E0] focus:ring-1 focus:ring-[#0671E0] transition-all text-sm" />
                  <input type="email" placeholder="Email" id="contact-email" className="bg-white/5 border border-white/10 rounded-xl px-5 py-3.5 text-white placeholder-white/30 outline-none focus:border-[#0671E0] focus:ring-1 focus:ring-[#0671E0] transition-all text-sm" />
                </div>
                <input type="text" placeholder="Công ty / Doanh nghiệp" id="contact-company" className="bg-white/5 border border-white/10 rounded-xl px-5 py-3.5 text-white placeholder-white/30 outline-none focus:border-[#0671E0] focus:ring-1 focus:ring-[#0671E0] transition-all text-sm" />
                <textarea rows={4} placeholder="Tin nhắn của bạn..." id="contact-message" className="bg-white/5 border border-white/10 rounded-xl px-5 py-3.5 text-white placeholder-white/30 outline-none focus:border-[#0671E0] focus:ring-1 focus:ring-[#0671E0] transition-all text-sm resize-none" />
                <button type="button" id="contact-submit-btn" className="btn-primary group w-full mt-2 justify-center py-4 text-base">
                  Gửi tin nhắn <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </button>
              </form>
            </AnimateOnScroll>
          </div>
        </section>
      </main>
      <LandingFooter />
    </>
  );
}
