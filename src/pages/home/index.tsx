import Head from "next/head";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { BrandLogo } from "@/components/brand/brand-logo";
import { ActionButton } from "@/components/button/action-button";
import { SectionHeading } from "@/components/heading/section-heading";
import coffeeMonitoringImage from "@/assets/coffee-live-monitoring-20260928.png";
import investmentSavingsImage from "@/assets/investment-savings.png";
import landingHeroDesktopImage from "@/assets/landing-hero-desktop.jpg";
import landingHeroMobileImage from "@/assets/landing-hero-mobile.jpg";
import { HeroSection } from "./hero-section";
import { NewsCard } from "./news-card";
import { ProductSection } from "./product-section";
import { TestimonialCard } from "./testimonial-card";
import {
  Activity,
  ArrowRight,
  Cloud,
  Coffee,
  Cpu,
  Menu,
  ShieldCheck,
  UserRound,
  Wifi,
  X,
  Zap,
} from "lucide-react";

const navigation = [
  { label: "Giải pháp", href: "#solutions" },
  { label: "Sản phẩm", href: "#products" },
  { label: "Công nghệ", href: "#technology" },
  { label: "Khách hàng", href: "#customers" },
  { label: "Tin tức", href: "#news" },
];

const testimonials = [
  {
    initials: "NM",
    name: "Nguyễn Văn Minh",
    role: "CEO, Chuỗi Cà Phê Cao Cấp",
    quote:
      "DOLORES COFFEE đã giúp chúng tôi giảm đáng kể chi phí vận hành đội máy. Dashboard thời gian thực giúp tôi nắm bắt mọi thứ dù đang ở bất cứ đâu.",
  },
  {
    initials: "TL",
    name: "Trần Thị Lan",
    role: "Giám đốc Vận hành, Hệ thống F&B",
    quote:
      "Tính năng bảo trì dự đoán giúp đội ngũ chủ động hơn. Chúng tôi quản lý thiết bị và chất lượng dịch vụ tập trung, rõ ràng hơn mỗi ngày.",
  },
  {
    initials: "LN",
    name: "Lê Hoàng Nam",
    role: "Giám đốc Công nghệ, Khách sạn Quốc tế",
    quote:
      "Việc tích hợp IoT vào hệ thống diễn ra nhanh chóng. Đội hỗ trợ kỹ thuật phản hồi chuyên nghiệp và sát với nhu cầu vận hành.",
  },
];

const articles = [
  {
    category: "Sản phẩm",
    date: "12.10.2026",
    title: "Giải pháp IoT mới cho vận hành chuỗi cà phê",
    image:
      "https://images.unsplash.com/photo-1497935586351-b67a49e012bf?auto=format&fit=crop&q=80&w=900",
  },
  {
    category: "DOLORES COFFEE",
    date: "05.10.2026",
    title: "Mở rộng dịch vụ hỗ trợ kỹ thuật trên toàn quốc",
    image:
      "https://images.unsplash.com/photo-1556740714-a8395b3bf30f?auto=format&fit=crop&q=80&w=900",
  },
  {
    category: "Góc nhìn",
    date: "28.09.2026",
    title: "Tự động hóa quản lý thiết bị trong ngành F&B",
    image:
      "https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&q=80&w=900",
  },
];

const styles = [
  "*, *::before, *::after { box-sizing: border-box; }",
  "html { scroll-behavior: smooth; }",
  "body { margin: 0; background: #fdfbf7; color: #222; font-family: Arial, Helvetica, sans-serif; }",
  "a { color: inherit; text-decoration: none; }",
  "button { font: inherit; }",
  ".landing { --wine: #721c24; --wine-dark: #52141a; --cream: #fdfbf7; --muted: #777; overflow: hidden; }",
  ".wrap { width: min(1320px, calc(100% - 48px)); margin: 0 auto; }",
  ".topbar { position: absolute; inset: 0 0 auto; z-index: 20; color: white; }",
  ".topbar-inner { min-height: 88px; display: flex; align-items: center; justify-content: space-between; gap: 32px; }",
  ".brand { display: inline-flex; align-items: center; gap: 12px; flex-shrink: 0; }",
  ".brand-mark { width: 48px; height: 48px; padding: 3px; border-radius: 12px; background: white; }",
  ".brand-name { display: grid; gap: 4px; line-height: 1; }",
  ".brand-name strong { font-size: 15px; letter-spacing: .12em; }",
  ".brand-name span { font-size: 9px; letter-spacing: .25em; opacity: .82; }",
  ".nav-links { display: flex; align-items: center; gap: clamp(18px, 3vw, 42px); font-size: 13px; font-weight: 600; }",
  ".nav-links a { opacity: .86; transition: opacity .2s ease; }",
  ".nav-links a:hover { opacity: 1; }",
  ".nav-actions { display: flex; align-items: center; gap: 12px; }",
  ".nav-login { padding: 11px 18px; border: 1px solid rgba(255,255,255,.55); border-radius: 4px; font-size: 13px; font-weight: 600; }",
  ".mobile-toggle { display: none; width: 42px; height: 42px; color: white; border: 1px solid rgba(255,255,255,.45); border-radius: 5px; background: transparent; align-items: center; justify-content: center; }",
  ".mobile-menu { display: none; }",
  ".hero { min-height: 720px; min-height: min(820px, 100svh); display: flex; align-items: center; position: relative; color: white; background: var(--wine-dark) url('" + landingHeroDesktopImage.src + "') center/cover no-repeat; }",
  ".hero::before { content: ''; position: absolute; inset: 0; background: linear-gradient(90deg, rgba(35,10,12,.86) 0%, rgba(51,13,16,.70) 42%, rgba(44,10,13,.18) 100%); }",
  ".hero-content { position: relative; z-index: 1; padding-top: 72px; max-width: 690px; }",
  ".eyebrow { display: flex; align-items: center; gap: 10px; color: #efc7bd; font-size: 11px; font-weight: 700; letter-spacing: .24em; text-transform: uppercase; }",
  ".eyebrow::before { content: ''; width: 28px; height: 1px; background: currentColor; }",
  ".hero h1 { max-width: 680px; margin: 22px 0; font-family: Georgia, 'Times New Roman', serif; font-size: clamp(44px, 6.5vw, 78px); line-height: 1.04; letter-spacing: -.035em; font-weight: 500; }",
  ".hero h1 em { color: #e9c0b0; font-style: normal; }",
  ".hero-copy { max-width: 510px; color: rgba(255,255,255,.82); font-size: 16px; line-height: 1.8; }",
  ".button-row { display: flex; flex-wrap: wrap; gap: 14px; margin-top: 32px; }",
  ".hero-note { display: flex; align-items: center; gap: 10px; margin-top: 56px; color: rgba(255,255,255,.7); font-size: 11px; letter-spacing: .12em; text-transform: uppercase; }",
  ".section { padding: 104px 0; }",
  ".section-heading { max-width: 690px; margin-bottom: 46px; }",
  ".section-heading.center { margin-left: auto; margin-right: auto; text-align: center; }",
  ".section-heading.center .eyebrow { justify-content: center; }",
  ".section-heading h2 { margin: 14px 0; color: var(--wine); font-family: Georgia, 'Times New Roman', serif; font-size: clamp(34px, 4.5vw, 54px); line-height: 1.12; font-weight: 500; letter-spacing: -.025em; }",
  ".section-heading p { margin: 0; color: var(--muted); font-size: 15px; line-height: 1.8; }",
  ".product-section { background: linear-gradient(180deg, #fdfbf7, #f7f0e8); }",
  ".product-grid { display: grid; grid-template-columns: 1.05fr .95fr; gap: 72px; align-items: center; }",
  ".product-image { min-height: 490px; position: relative; display: grid; place-items: center; border: 1px solid rgba(114,28,36,.12); border-radius: 10px; background: radial-gradient(circle at 55% 45%, white, #f6ede5 72%); overflow: hidden; }",
  ".product-image::before, .product-image::after { content: ''; position: absolute; border: 1px solid rgba(114,28,36,.12); border-radius: 50%; width: 360px; height: 360px; }",
  ".product-image::after { width: 470px; height: 470px; }",
  ".product-image img { position: relative; z-index: 1; width: min(84%, 470px); height: auto; object-fit: contain; filter: drop-shadow(0 24px 28px rgba(48,24,20,.16)); }",
  ".product-label { position: absolute; z-index: 2; left: 24px; bottom: 24px; padding: 10px 14px; color: var(--wine); background: rgba(255,255,255,.9); border: 1px solid rgba(114,28,36,.12); border-radius: 4px; font-size: 11px; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; }",
  ".product-copy h3 { margin: 0 0 16px; font-family: Georgia, 'Times New Roman', serif; color: #2a2020; font-size: 34px; line-height: 1.2; font-weight: 500; }",
  ".product-copy > p { margin: 0; color: var(--muted); line-height: 1.8; font-size: 15px; }",
  ".benefit-list { display: grid; gap: 18px; margin: 30px 0; padding: 0; list-style: none; }",
  ".benefit-list li { display: flex; align-items: flex-start; gap: 12px; color: #454040; font-size: 14px; line-height: 1.6; }",
  ".check-mark { width: 22px; height: 22px; display: grid; place-items: center; flex: 0 0 22px; color: var(--wine); background: #f2e5df; border-radius: 50%; }",
  ".technology-section { color: white; background: #211719; position: relative; }",
  ".technology-section::before { content: ''; position: absolute; inset: 0; opacity: .22; background-image: linear-gradient(rgba(255,255,255,.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.08) 1px, transparent 1px); background-size: 46px 46px; mask-image: linear-gradient(90deg, black, transparent 85%); }",
  ".technology-grid { position: relative; display: grid; grid-template-columns: .9fr 1.1fr; gap: 70px; align-items: center; }",
  ".technology-section .section-heading h2 { color: white; }",
  ".technology-section .section-heading p { color: rgba(255,255,255,.65); }",
  ".technology-image { padding: 12px; border: 1px solid rgba(255,255,255,.16); border-radius: 10px; background: rgba(255,255,255,.06); box-shadow: 0 30px 70px rgba(0,0,0,.28); }",
  ".technology-image img { display: block; width: 100%; height: auto; border-radius: 5px; }",
  ".tech-points { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-top: 32px; }",
  ".tech-point { display: flex; gap: 12px; align-items: flex-start; color: rgba(255,255,255,.8); font-size: 13px; line-height: 1.55; }",
  ".tech-point svg { flex: 0 0 20px; color: #d6a393; }",
  ".distribution-section { background: white; }",
  ".distribution-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 52px; align-items: center; }",
  ".distribution-art { min-height: 420px; position: relative; border-radius: 10px; background: #f7f1eb; overflow: hidden; }",
  ".distribution-art img { position: absolute; width: 76%; height: 76%; object-fit: contain; right: 0; bottom: 0; filter: drop-shadow(0 20px 25px rgba(44,23,20,.15)); }",
  ".stat-card { position: absolute; z-index: 2; left: 24px; top: 24px; padding: 20px; max-width: 205px; border: 1px solid #eee2d9; border-radius: 8px; background: rgba(255,255,255,.93); box-shadow: 0 12px 32px rgba(50,30,20,.08); }",
  ".stat-card strong { display: block; color: var(--wine); font-family: Georgia, 'Times New Roman', serif; font-size: 32px; }",
  ".stat-card span { display: block; color: var(--muted); font-size: 11px; line-height: 1.5; }",
  ".distribution-points { display: grid; gap: 22px; margin-top: 28px; }",
  ".distribution-point { display: flex; gap: 15px; align-items: flex-start; }",
  ".point-icon { width: 42px; height: 42px; display: grid; place-items: center; flex: 0 0 42px; border-radius: 8px; color: var(--wine); background: #f6e9e4; }",
  ".distribution-point h3 { margin: 0 0 5px; font-size: 14px; color: #262020; }",
  ".distribution-point p { margin: 0; color: var(--muted); font-size: 13px; line-height: 1.65; }",
  ".testimonial-section { background: #f8f1e9; }",
  ".testimonial-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; }",
  ".testimonial-card { padding: 26px; display: flex; flex-direction: column; min-height: 260px; border: 1px solid #eee2d9; border-radius: 8px; background: white; box-shadow: 0 8px 22px rgba(50,30,20,.035); }",
  ".stars { display: flex; gap: 3px; color: #b88343; }",
  ".testimonial-card blockquote { flex: 1; margin: 20px 0 24px; color: #4c4442; font-family: Georgia, 'Times New Roman', serif; font-size: 16px; line-height: 1.65; }",
  ".person { display: flex; align-items: center; gap: 12px; padding-top: 17px; border-top: 1px solid #eee7e1; }",
  ".avatar { width: 40px; height: 40px; display: grid; place-items: center; border-radius: 50%; color: white; background: var(--wine); font-size: 12px; font-weight: 700; }",
  ".person strong { display: block; font-size: 12px; color: #282222; }",
  ".person span { display: block; margin-top: 4px; color: #888; font-size: 10px; }",
  ".news-section { background: #fdfbf7; }",
  ".news-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 22px; }",
  ".news-card { overflow: hidden; border: 1px solid #ece4dd; border-radius: 8px; background: white; transition: transform .25s ease, box-shadow .25s ease; }",
  ".news-card:hover { transform: translateY(-4px); box-shadow: 0 16px 32px rgba(60,30,20,.1); }",
  ".news-image { display: block; width: 100%; aspect-ratio: 16 / 10; object-fit: cover; background: #f2e9e1; }",
  ".news-body { padding: 22px; }",
  ".news-meta { display: flex; align-items: center; gap: 12px; color: #8a7c77; font-size: 10px; letter-spacing: .08em; text-transform: uppercase; }",
  ".news-body h3 { min-height: 54px; margin: 14px 0; color: #282222; font-size: 17px; line-height: 1.5; }",
  ".contact-section { padding: 84px 0; background: linear-gradient(135deg, #721c24, #4c1117); color: white; }",
  ".contact-panel { padding: clamp(32px, 6vw, 72px); text-align: center; border: 1px solid rgba(255,255,255,.18); border-radius: 10px; background: radial-gradient(ellipse at top, rgba(255,255,255,.09), transparent 70%); }",
  ".contact-panel h2 { max-width: 740px; margin: 16px auto; font-family: Georgia, 'Times New Roman', serif; font-weight: 500; font-size: clamp(34px, 5vw, 54px); line-height: 1.15; }",
  ".contact-panel p { max-width: 580px; margin: 0 auto; color: rgba(255,255,255,.76); line-height: 1.8; font-size: 14px; }",
  ".contact-panel .button-row { justify-content: center; }",
  ".footer { padding: 64px 0 24px; background: #fff; }",
  ".footer-grid { display: grid; grid-template-columns: 1.5fr 1fr 1fr 1.1fr; gap: 36px; padding-bottom: 48px; }",
  ".footer .brand { color: var(--wine); }",
  ".footer-description { max-width: 340px; color: #777; font-size: 12px; line-height: 1.8; }",
  ".footer h3 { margin: 4px 0 18px; color: #292323; font-size: 12px; letter-spacing: .1em; text-transform: uppercase; }",
  ".footer-links { display: grid; gap: 12px; color: #777; font-size: 12px; }",
  ".footer-links a:hover { color: var(--wine); }",
  ".footer-bottom { display: flex; align-items: center; justify-content: space-between; gap: 20px; padding-top: 22px; border-top: 1px solid #eee7e1; color: #8c8582; font-size: 10px; }",
  "@media (max-width: 900px) { .nav-links { gap: 16px; } .product-grid, .technology-grid, .distribution-grid { gap: 36px; } .footer-grid { grid-template-columns: 1fr 1fr; } }",
  "@media (max-width: 700px) { .wrap { width: min(100% - 36px, 560px); } .topbar-inner { min-height: 72px; } .nav-links, .nav-login { display: none; } .mobile-toggle { display: inline-flex; } .mobile-menu { position: absolute; top: 72px; left: 18px; right: 18px; padding: 12px; display: grid; gap: 2px; border: 1px solid rgba(255,255,255,.2); border-radius: 8px; background: #351014; box-shadow: 0 16px 32px rgba(0,0,0,.25); } .mobile-menu a { padding: 12px; border-radius: 4px; font-size: 13px; } .mobile-menu a:hover { background: rgba(255,255,255,.08); } .hero { min-height: 720px; background-image: url('" + landingHeroMobileImage.src + "'); background-position: center; } .hero::before { background: linear-gradient(90deg, rgba(35,10,12,.82), rgba(35,10,12,.48)); } .hero-content { padding: 90px 0 44px; } .hero-copy { font-size: 14px; } .hero-note { margin-top: 42px; } .section { padding: 72px 0; } .product-grid, .technology-grid, .distribution-grid { grid-template-columns: 1fr; gap: 32px; } .product-image { min-height: 330px; order: 2; } .product-copy { order: 1; } .technology-grid .section-heading { order: 1; } .technology-image { order: 2; } .distribution-art { min-height: 330px; order: 2; } .distribution-grid .section-heading { order: 1; } .testimonial-grid, .news-grid { grid-template-columns: 1fr; } .testimonial-card { min-height: 0; } .footer-grid { grid-template-columns: 1fr 1fr; gap: 30px 20px; } .footer-grid > div:first-child { grid-column: 1 / -1; } .footer-bottom { align-items: flex-start; flex-direction: column; } }",
  "@media (max-width: 420px) { .button-row .button { width: 100%; } .tech-points { grid-template-columns: 1fr; } .footer-grid { grid-template-columns: 1fr; } .footer-grid > div:first-child { grid-column: auto; } }",
].join("\n");

export default function HomePage() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <>
      <Head>
        <title>DOLORES COFFEE | Giải pháp cà phê thông minh</title>
        <meta
          name="description"
          content="Giải pháp thuê máy pha cà phê thông minh tích hợp IoT và Cloud cho doanh nghiệp."
        />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <div className="landing">
        <header className="topbar">
          <div className="wrap topbar-inner">
            <BrandLogo priority />

            <nav className="nav-links" aria-label="Điều hướng chính">
              {navigation.map((item) => (
                <Link key={item.href} href={item.href}>
                  {item.label}
                </Link>
              ))}
            </nav>

            <div className="nav-actions">
              <Link href="/login" className="nav-login">
                Đăng nhập
              </Link>
              <button
                type="button"
                className="mobile-toggle"
                aria-label={menuOpen ? "Đóng menu" : "Mở menu"}
                aria-expanded={menuOpen}
                onClick={() => setMenuOpen((open) => !open)}
              >
                {menuOpen ? <X size={19} /> : <Menu size={19} />}
              </button>
            </div>

            {menuOpen && (
              <nav className="mobile-menu" aria-label="Điều hướng trên điện thoại">
                {navigation.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMenuOpen(false)}
                  >
                    {item.label}
                  </Link>
                ))}
                <Link href="/login" onClick={() => setMenuOpen(false)}>
                  Đăng nhập
                </Link>
              </nav>
            )}
          </div>
        </header>

        <main id="top">
          <HeroSection />
          <ProductSection />

          <section id="technology" className="section technology-section">
            <div className="wrap technology-grid">
              <SectionHeading
                eyebrow="Công nghệ kết nối"
                title="Kiểm soát toàn bộ hoạt động, từ một màn hình"
                description="Nền tảng IoT và Cloud chuyển dữ liệu thiết bị thành thông tin rõ ràng để đội ngũ của bạn ra quyết định nhanh hơn."
              >
                <div className="tech-points">
                  <div className="tech-point"><Activity size={19} /><span>Thông tin vận hành cập nhật liên tục.</span></div>
                  <div className="tech-point"><Cloud size={19} /><span>Dữ liệu tập trung, truy cập linh hoạt.</span></div>
                  <div className="tech-point"><Cpu size={19} /><span>Cảnh báo để xử lý sớm các bất thường.</span></div>
                  <div className="tech-point"><Wifi size={19} /><span>Kết nối thiết bị an toàn, ổn định.</span></div>
                </div>
              </SectionHeading>
              <div className="technology-image">
                <Image
                  src={coffeeMonitoringImage}
                  alt="Giao diện giám sát máy pha cà phê theo thời gian thực"
                  width={1200}
                  height={900}
                />
              </div>
            </div>
          </section>

          <section id="about" className="section distribution-section">
            <div className="wrap distribution-grid">
              <SectionHeading
                eyebrow="Đồng hành phát triển"
                title="Mở rộng kinh doanh với một đối tác đáng tin cậy"
                description="Chúng tôi đồng hành từ lựa chọn thiết bị, lắp đặt đến hỗ trợ vận hành, giúp bạn tập trung vào trải nghiệm khách hàng."
              >
                <div className="distribution-points">
                  <div className="distribution-point">
                    <span className="point-icon"><Coffee size={20} /></span>
                    <div><h3>Thiết bị chuyên nghiệp</h3><p>Giải pháp được lựa chọn theo nhu cầu và mô hình của từng điểm bán.</p></div>
                  </div>
                  <div className="distribution-point">
                    <span className="point-icon"><ShieldCheck size={20} /></span>
                    <div><h3>Dịch vụ chủ động</h3><p>Hỗ trợ kỹ thuật và kế hoạch bảo trì giúp hoạt động liền mạch hơn.</p></div>
                  </div>
                  <div className="distribution-point">
                    <span className="point-icon"><Zap size={20} /></span>
                    <div><h3>Tối ưu hiệu quả</h3><p>Dữ liệu hỗ trợ kiểm soát chi phí và nâng cao hiệu suất thiết bị.</p></div>
                  </div>
                </div>
              </SectionHeading>
              <div className="distribution-art">
                <div className="stat-card"><strong>360°</strong><span>Hỗ trợ xuyên suốt vòng đời thiết bị</span></div>
                <Image
                  src={investmentSavingsImage}
                  alt="Minh họa tối ưu đầu tư thiết bị"
                  width={900}
                  height={700}
                />
              </div>
            </div>
          </section>

          <section id="customers" className="section testimonial-section">
            <div className="wrap">
              <SectionHeading
                eyebrow="Khách hàng nói gì"
                title="Được tin tưởng bởi những người làm nghề"
                description="Những câu chuyện vận hành tốt hơn cùng DOLORES COFFEE."
                align="center"
              />
              <div className="testimonial-grid">
                {testimonials.map((item) => (
                  <TestimonialCard key={item.initials} {...item} />
                ))}
              </div>
            </div>
          </section>

          <section id="news" className="section news-section">
            <div className="wrap">
              <SectionHeading
                eyebrow="Tin tức & cập nhật"
                title="Góc nhìn mới về ngành cà phê"
                description="Cập nhật sản phẩm, hoạt động và xu hướng vận hành dành cho doanh nghiệp F&B."
              />
              <div className="news-grid">
                {articles.map((article) => (
                  <NewsCard key={article.title} {...article} />
                ))}
              </div>
            </div>
          </section>

          <section id="contact" className="contact-section">
            <div className="wrap">
              <div className="contact-panel">
                <div className="eyebrow">Bắt đầu cùng DOLORES COFFEE</div>
                <h2>Sẵn sàng nâng cấp hoạt động kinh doanh cà phê?</h2>
                <p>
                  Kết nối với đội ngũ của chúng tôi để tìm giải pháp phù hợp và nhận tư
                  vấn cho mô hình kinh doanh của bạn.
                </p>
                <div className="button-row">
                  <ActionButton href="mailto:hello@dolorescoffee.vn" variant="light" icon={<ArrowRight size={15} />}>
                    Liên hệ tư vấn
                  </ActionButton>
                  <ActionButton href="/login" variant="outline">Xem Dashboard</ActionButton>
                </div>
              </div>
            </div>
          </section>
        </main>

        <footer className="footer">
          <div className="wrap">
            <div className="footer-grid">
              <div>
                <BrandLogo />
                <p className="footer-description">
                  Giải pháp máy pha cà phê thông minh tích hợp IoT và Cloud, giúp đơn
                  giản hóa vận hành cho mọi doanh nghiệp.
                </p>
              </div>
              <div><h3>Sản phẩm</h3><div className="footer-links"><Link href="#products">Máy pha cà phê</Link><Link href="#technology">Cloud Dashboard</Link><Link href="#solutions">Giải pháp IoT</Link></div></div>
              <div><h3>Khám phá</h3><div className="footer-links"><Link href="#about">Về chúng tôi</Link><Link href="#customers">Khách hàng</Link><Link href="#news">Tin tức</Link></div></div>
              <div><h3>Liên hệ</h3><div className="footer-links"><a href="mailto:hello@dolorescoffee.vn">hello@dolorescoffee.vn</a><a href="tel:18001234">1800 1234</a><span>TP. Hồ Chí Minh, Việt Nam</span></div></div>
            </div>
            <div className="footer-bottom">
              <span>© {new Date().getFullYear()} DOLORES COFFEE. Bảo lưu mọi quyền.</span>
              <span><UserRound size={12} style={{ verticalAlign: "middle" }} /> Dành cho doanh nghiệp F&B</span>
            </div>
          </div>
        </footer>
      </div>

      <style>{styles}</style>
    </>
  );
}
