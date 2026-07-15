import { LandingNav } from "@/components/landing/LandingNav";
import { LandingFooter } from "@/components/landing/CtaFooter";
import Link from "next/link";
import { ArrowRight, Cpu, Cloud, Activity, Zap, Lock, Code } from "lucide-react";

export const metadata = {
  title: "Công nghệ IoT & Cloud | DEER COFFEE",
  description: "Hạ tầng IoT và Cloud của DEER COFFEE — kết nối mỗi chiếc máy pha cà phê vào một hệ sinh thái dữ liệu thông minh.",
};

const techStack = [
  { icon: <Cpu className="w-7 h-7" />, title: "Edge Computing", desc: "Xử lý và phân tích dữ liệu ngay tại máy, không cần phụ thuộc vào kết nối internet liên tục. Đảm bảo máy hoạt động ổn định dù mạng yếu." },
  { icon: <Cloud className="w-7 h-7" />, title: "Cloud Infrastructure", desc: "Hạ tầng cloud đa vùng với SLA 99.99% uptime. Dữ liệu được mã hóa và lưu trữ an toàn tuân thủ tiêu chuẩn ISO 27001." },
  { icon: <Activity className="w-7 h-7" />, title: "Real-time Streaming", desc: "Dữ liệu từ cảm biến được truyền lên cloud mỗi giây. Dashboard hiển thị trạng thái tất cả các máy theo thời gian thực." },
  { icon: <Zap className="w-7 h-7" />, title: "AI Predictive Engine", desc: "Mô hình machine learning được huấn luyện trên hàng triệu lần brew để dự đoán hỏng hóc và tối ưu lịch bảo trì." },
  { icon: <Lock className="w-7 h-7" />, title: "Security First", desc: "Bảo mật đầu cuối với mã hóa TLS 1.3, xác thực 2 yếu tố và kiểm soát phân quyền theo từng máy và từng người dùng." },
  { icon: <Code className="w-7 h-7" />, title: "Open API Integration", desc: "REST API đầy đủ cho phép tích hợp với hệ thống POS, ERP, CRM của doanh nghiệp. Hỗ trợ Webhook và WebSocket real-time." },
];

const sensors = [
  { name: "Cảm biến nhiệt độ", range: "0–120°C ±0.1°C", update: "1s" },
  { name: "Cảm biến áp suất", range: "0–20 bar ±0.05 bar", update: "1s" },
  { name: "Đo lưu lượng nước", range: "0–5 L/min", update: "100ms" },
  { name: "Đếm số lần brew", range: "0–99,999", update: "Realtime" },
  { name: "Cảm biến mức nước", range: "0–100%", update: "5s" },
  { name: "Trạng thái hoạt động", range: "ON/OFF/ERROR", update: "Realtime" },
];

export default function TechnologyPage() {
  return (
    <>
      <LandingNav />
      <main className="pt-16">
        {/* Hero */}
        <section className="bg-black text-white py-28 px-6">
          <div className="max-w-[1400px] mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div>
              <span className="text-white/30 text-xs tracking-[0.3em] uppercase font-bold mb-6 block">Technology</span>
              <h1 className="text-5xl md:text-6xl font-black uppercase tracking-tight text-white mb-6 leading-tight">
                IoT & Cloud<br />cho máy pha cà phê
              </h1>
              <p className="text-white/50 text-xl font-light leading-relaxed mb-10">
                Chúng tôi gắn kết từng chiếc máy pha cà phê với hạ tầng IoT hiện đại, biến mỗi chiếc máy thành một nguồn dữ liệu thông minh.
              </p>
              <Link href="/solutions" className="group inline-flex items-center gap-3 bg-white text-black px-8 py-4 rounded-full font-black uppercase tracking-widest text-sm hover:bg-white/90 transition-all">
                Xem giải pháp <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>

            {/* Architecture diagram */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-8 font-mono text-xs text-white/60">
              <div className="mb-4 text-white/30 tracking-widest uppercase text-[10px]">System Architecture</div>
              <div className="flex flex-col gap-2">
                {[
                  "[ Coffee Machine ]",
                  "    ↓ IoT Sensors",
                  "[ Edge Gateway ]",
                  "    ↓ MQTT / TLS",
                  "[ Cloud Broker ]",
                  "    ↓ Stream Processing",
                  "[ Time-Series DB ]",
                  "    ↓ REST API",
                  "[ Dashboard / Apps ]",
                ].map((line, i) => (
                  <div key={i} className={line.startsWith("    ") ? "text-white/30" : "text-white/70"}>
                    {line}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Tech Stack */}
        <section className="bg-white py-24 px-6">
          <div className="max-w-[1400px] mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-black uppercase tracking-tight text-black mb-4">Hạ tầng công nghệ</h2>
              <p className="text-black/40 font-light text-lg max-w-xl mx-auto">Được xây dựng trên các công nghệ cloud-native hiện đại nhất.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {techStack.map((t, i) => (
                <div key={i} className="border border-black/10 rounded-2xl p-8 hover:border-black/30 hover:shadow-lg transition-all duration-300">
                  <div className="text-black/30 mb-5">{t.icon}</div>
                  <h3 className="text-lg font-black text-black mb-3">{t.title}</h3>
                  <p className="text-black/50 text-sm font-light leading-relaxed">{t.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Sensor table */}
        <section className="bg-[#f9f9f9] py-24 px-6">
          <div className="max-w-[1400px] mx-auto">
            <h2 className="text-4xl font-black uppercase tracking-tight text-black mb-12 text-center">Cảm biến tích hợp</h2>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b-2 border-black">
                    <th className="text-left py-4 px-6 font-black uppercase tracking-widest text-xs text-black/40">Cảm biến</th>
                    <th className="text-left py-4 px-6 font-black uppercase tracking-widest text-xs text-black/40">Dải đo</th>
                    <th className="text-left py-4 px-6 font-black uppercase tracking-widest text-xs text-black/40">Tần suất cập nhật</th>
                  </tr>
                </thead>
                <tbody>
                  {sensors.map((s, i) => (
                    <tr key={i} className="border-b border-black/5 hover:bg-black/5 transition-colors">
                      <td className="py-5 px-6 font-semibold text-black">{s.name}</td>
                      <td className="py-5 px-6 font-mono text-black/50 text-xs">{s.range}</td>
                      <td className="py-5 px-6">
                        <span className="bg-black text-white text-[10px] px-3 py-1 rounded-full font-bold">{s.update}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </main>
      <LandingFooter />
    </>
  );
}
