import Head from "next/head";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { BrandLogo } from "@/components/brand/brand-logo";
import { ActionButton } from "@/components/button/action-button";
import { SectionHeading } from "@/components/heading/section-heading";
import { HOME_MESSAGES } from "@/text/home/home-messages";
import { TYPOGRAPHY_STYLES } from "@/text/typography";
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

const styles = [
  TYPOGRAPHY_STYLES,
  "*, *::before, *::after { box-sizing: border-box; }",
  "html { scroll-behavior: smooth; }",
  "body { margin: 0; background: #fdfbf7; color: #222; font-family: var(--font-family-body); }",
  "a { color: inherit; text-decoration: none; }",
  "button { font: inherit; }",
  ".landing { --wine: #721c24; --wine-dark: #52141a; --cream: #fdfbf7; --muted: #777; overflow: hidden; }",
  ".wrap { width: min(1320px, calc(100% - 48px)); margin: 0 auto; }",
  ".topbar { position: absolute; inset: 0 0 auto; z-index: 20; color: white; }",
  ".topbar-inner { min-height: 88px; display: flex; align-items: center; justify-content: space-between; gap: 32px; }",
  ".brand { display: inline-flex; align-items: center; gap: 12px; flex-shrink: 0; }",
  ".brand-mark { width: 48px; height: 48px; padding: 3px; border-radius: 12px; background: white; }",
  ".brand-name { display: grid; gap: 4px; line-height: 1; }",
  ".brand-name strong { font-size: var(--font-size-brand); letter-spacing: .12em; }",
  ".brand-name span { font-size: var(--font-size-brand-tagline); letter-spacing: .25em; opacity: .82; }",
  ".nav-links { display: flex; align-items: center; gap: clamp(18px, 3vw, 42px); font-size: var(--font-size-control); font-weight: 600; }",
  ".nav-links a { opacity: .86; transition: opacity .2s ease; }",
  ".nav-links a:hover { opacity: 1; }",
  ".nav-actions { display: flex; align-items: center; gap: 12px; }",
  ".nav-login { padding: 11px 18px; border: 1px solid rgba(255,255,255,.55); border-radius: 4px; font-size: var(--font-size-control); font-weight: 600; }",
  ".mobile-toggle { display: none; width: 42px; height: 42px; color: white; border: 1px solid rgba(255,255,255,.45); border-radius: 5px; background: transparent; align-items: center; justify-content: center; }",
  ".mobile-menu { display: none; }",
  ".hero { min-height: 720px; min-height: min(820px, 100svh); display: flex; align-items: center; position: relative; color: white; background: var(--wine-dark) url('" + landingHeroDesktopImage.src + "') center/cover no-repeat; }",
  ".hero::before { content: ''; position: absolute; inset: 0; background: linear-gradient(90deg, rgba(35,10,12,.86) 0%, rgba(51,13,16,.70) 42%, rgba(44,10,13,.18) 100%); }",
  ".hero-content { position: relative; z-index: 1; padding-top: 72px; max-width: 690px; }",
  ".eyebrow { display: flex; align-items: center; gap: 10px; color: #efc7bd; font-size: var(--font-size-label); font-weight: 700; letter-spacing: .24em; text-transform: uppercase; }",
  ".eyebrow::before { content: ''; width: 28px; height: 1px; background: currentColor; }",
  ".hero h1 { max-width: 680px; margin: 22px 0; font-family: var(--font-family-display); font-size: var(--font-size-hero-title); line-height: 1.04; letter-spacing: -.035em; font-weight: 500; }",
  ".hero h1 em { color: #e9c0b0; font-style: normal; }",
  ".hero-copy { max-width: 510px; color: rgba(255,255,255,.82); font-size: var(--font-size-body-large); line-height: 1.8; }",
  ".button-row { display: flex; flex-wrap: wrap; gap: 14px; margin-top: 32px; }",
  ".hero-note { display: flex; align-items: center; gap: 10px; margin-top: 56px; color: rgba(255,255,255,.7); font-size: var(--font-size-label); letter-spacing: .12em; text-transform: uppercase; }",
  ".section { padding: 104px 0; }",
  ".section-heading { max-width: 690px; margin-bottom: 46px; }",
  ".section-heading.center { margin-left: auto; margin-right: auto; text-align: center; }",
  ".section-heading.center .eyebrow { justify-content: center; }",
  ".section-heading h2 { margin: 14px 0; color: var(--wine); font-family: var(--font-family-display); font-size: var(--font-size-section-title); line-height: 1.12; font-weight: 500; letter-spacing: -.025em; }",
  ".section-heading p { margin: 0; color: var(--muted); font-size: var(--font-size-body); line-height: 1.8; }",
  ".product-section { background: linear-gradient(180deg, #fdfbf7, #f7f0e8); }",
  ".product-grid { display: grid; grid-template-columns: 1.05fr .95fr; gap: 72px; align-items: center; }",
  ".product-image { min-height: 490px; position: relative; display: grid; place-items: center; border: 1px solid rgba(114,28,36,.12); border-radius: 10px; background: radial-gradient(circle at 55% 45%, white, #f6ede5 72%); overflow: hidden; }",
  ".product-image::before, .product-image::after { content: ''; position: absolute; border: 1px solid rgba(114,28,36,.12); border-radius: 50%; width: 360px; height: 360px; }",
  ".product-image::after { width: 470px; height: 470px; }",
  ".product-image img { position: relative; z-index: 1; width: min(84%, 470px); height: auto; object-fit: contain; filter: drop-shadow(0 24px 28px rgba(48,24,20,.16)); }",
  ".product-label { position: absolute; z-index: 2; left: 24px; bottom: 24px; padding: 10px 14px; color: var(--wine); background: rgba(255,255,255,.9); border: 1px solid rgba(114,28,36,.12); border-radius: 4px; font-size: var(--font-size-label); font-weight: 700; letter-spacing: .12em; text-transform: uppercase; }",
  ".product-copy h3 { margin: 0 0 16px; font-family: var(--font-family-display); color: #2a2020; font-size: var(--font-size-product-title); line-height: 1.2; font-weight: 500; }",
  ".product-copy > p { margin: 0; color: var(--muted); line-height: 1.8; font-size: var(--font-size-body); }",
  ".benefit-list { display: grid; gap: 18px; margin: 30px 0; padding: 0; list-style: none; }",
  ".benefit-list li { display: flex; align-items: flex-start; gap: 12px; color: #454040; font-size: var(--font-size-body-small); line-height: 1.6; }",
  ".check-mark { width: 22px; height: 22px; display: grid; place-items: center; flex: 0 0 22px; color: var(--wine); background: #f2e5df; border-radius: 50%; }",
  ".technology-section { color: white; background: #211719; position: relative; }",
  ".technology-section::before { content: ''; position: absolute; inset: 0; opacity: .22; background-image: linear-gradient(rgba(255,255,255,.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.08) 1px, transparent 1px); background-size: 46px 46px; mask-image: linear-gradient(90deg, black, transparent 85%); }",
  ".technology-grid { position: relative; display: grid; grid-template-columns: .9fr 1.1fr; gap: 70px; align-items: center; }",
  ".technology-section .section-heading h2 { color: white; }",
  ".technology-section .section-heading p { color: rgba(255,255,255,.65); }",
  ".technology-image { padding: 12px; border: 1px solid rgba(255,255,255,.16); border-radius: 10px; background: rgba(255,255,255,.06); box-shadow: 0 30px 70px rgba(0,0,0,.28); }",
  ".technology-image img { display: block; width: 100%; height: auto; border-radius: 5px; }",
  ".tech-points { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-top: 32px; }",
  ".tech-point { display: flex; gap: 12px; align-items: flex-start; color: rgba(255,255,255,.8); font-size: var(--font-size-control); line-height: 1.55; }",
  ".tech-point svg { flex: 0 0 20px; color: #d6a393; }",
  ".distribution-section { background: white; }",
  ".distribution-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 52px; align-items: center; }",
  ".distribution-art { min-height: 420px; position: relative; border-radius: 10px; background: #f7f1eb; overflow: hidden; }",
  ".distribution-art img { position: absolute; width: 76%; height: 76%; object-fit: contain; right: 0; bottom: 0; filter: drop-shadow(0 20px 25px rgba(44,23,20,.15)); }",
  ".stat-card { position: absolute; z-index: 2; left: 24px; top: 24px; padding: 20px; max-width: 205px; border: 1px solid #eee2d9; border-radius: 8px; background: rgba(255,255,255,.93); box-shadow: 0 12px 32px rgba(50,30,20,.08); }",
  ".stat-card strong { display: block; color: var(--wine); font-family: var(--font-family-display); font-size: var(--font-size-metric); }",
  ".stat-card span { display: block; color: var(--muted); font-size: var(--font-size-label); line-height: 1.5; }",
  ".distribution-points { display: grid; gap: 22px; margin-top: 28px; }",
  ".distribution-point { display: flex; gap: 15px; align-items: flex-start; }",
  ".point-icon { width: 42px; height: 42px; display: grid; place-items: center; flex: 0 0 42px; border-radius: 8px; color: var(--wine); background: #f6e9e4; }",
  ".distribution-point h3 { margin: 0 0 5px; font-size: var(--font-size-body-small); color: #262020; }",
  ".distribution-point p { margin: 0; color: var(--muted); font-size: var(--font-size-control); line-height: 1.65; }",
  ".testimonial-section { background: #f8f1e9; }",
  ".testimonial-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; }",
  ".testimonial-card { padding: 26px; display: flex; flex-direction: column; min-height: 260px; border: 1px solid #eee2d9; border-radius: 8px; background: white; box-shadow: 0 8px 22px rgba(50,30,20,.035); }",
  ".stars { display: flex; gap: 3px; color: #b88343; }",
  ".testimonial-card blockquote { flex: 1; margin: 20px 0 24px; color: #4c4442; font-family: var(--font-family-display); font-size: var(--font-size-body-large); line-height: 1.65; }",
  ".person { display: flex; align-items: center; gap: 12px; padding-top: 17px; border-top: 1px solid #eee7e1; }",
  ".avatar { width: 40px; height: 40px; display: grid; place-items: center; border-radius: 50%; color: white; background: var(--wine); font-size: var(--font-size-small); font-weight: 700; }",
  ".person strong { display: block; font-size: var(--font-size-small); color: #282222; }",
  ".person span { display: block; margin-top: 4px; color: #888; font-size: var(--font-size-caption); }",
  ".news-section { background: #fdfbf7; }",
  ".news-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 22px; }",
  ".news-card { overflow: hidden; border: 1px solid #ece4dd; border-radius: 8px; background: white; transition: transform .25s ease, box-shadow .25s ease; }",
  ".news-card:hover { transform: translateY(-4px); box-shadow: 0 16px 32px rgba(60,30,20,.1); }",
  ".news-image { display: block; width: 100%; aspect-ratio: 16 / 10; object-fit: cover; background: #f2e9e1; }",
  ".news-body { padding: 22px; }",
  ".news-meta { display: flex; align-items: center; gap: 12px; color: #8a7c77; font-size: var(--font-size-caption); letter-spacing: .08em; text-transform: uppercase; }",
  ".news-body h3 { min-height: 54px; margin: 14px 0; color: #282222; font-size: var(--font-size-card-title); line-height: 1.5; }",
  ".contact-section { padding: 84px 0; background: linear-gradient(135deg, #721c24, #4c1117); color: white; }",
  ".contact-panel { padding: clamp(32px, 6vw, 72px); text-align: center; border: 1px solid rgba(255,255,255,.18); border-radius: 10px; background: radial-gradient(ellipse at top, rgba(255,255,255,.09), transparent 70%); }",
  ".contact-panel h2 { max-width: 740px; margin: 16px auto; font-family: var(--font-family-display); font-weight: 500; font-size: var(--font-size-cta-title); line-height: 1.15; }",
  ".contact-panel p { max-width: 580px; margin: 0 auto; color: rgba(255,255,255,.76); line-height: 1.8; font-size: var(--font-size-body-small); }",
  ".contact-panel .button-row { justify-content: center; }",
  ".footer { padding: 64px 0 24px; background: #fff; }",
  ".footer-grid { display: grid; grid-template-columns: 1.5fr 1fr 1fr 1.1fr; gap: 36px; padding-bottom: 48px; }",
  ".footer .brand { color: var(--wine); }",
  ".footer-description { max-width: 340px; color: #777; font-size: var(--font-size-small); line-height: 1.8; }",
  ".footer h3 { margin: 4px 0 18px; color: #292323; font-size: var(--font-size-small); letter-spacing: .1em; text-transform: uppercase; }",
  ".footer-links { display: grid; gap: 12px; color: #777; font-size: var(--font-size-small); }",
  ".footer-links a:hover { color: var(--wine); }",
  ".footer-bottom { display: flex; align-items: center; justify-content: space-between; gap: 20px; padding-top: 22px; border-top: 1px solid #eee7e1; color: #8c8582; font-size: var(--font-size-caption); }",
  "@media (max-width: 900px) { .nav-links { gap: 16px; } .product-grid, .technology-grid, .distribution-grid { gap: 36px; } .footer-grid { grid-template-columns: 1fr 1fr; } }",
  "@media (max-width: 700px) { .wrap { width: min(100% - 36px, 560px); } .topbar-inner { min-height: 72px; } .nav-links, .nav-login { display: none; } .mobile-toggle { display: inline-flex; } .mobile-menu { position: absolute; top: 72px; left: 18px; right: 18px; padding: 12px; display: grid; gap: 2px; border: 1px solid rgba(255,255,255,.2); border-radius: 8px; background: #351014; box-shadow: 0 16px 32px rgba(0,0,0,.25); } .mobile-menu a { padding: 12px; border-radius: 4px; font-size: var(--font-size-control); } .mobile-menu a:hover { background: rgba(255,255,255,.08); } .hero { min-height: 720px; background-image: url('" + landingHeroMobileImage.src + "'); background-position: center; } .hero::before { background: linear-gradient(90deg, rgba(35,10,12,.82), rgba(35,10,12,.48)); } .hero-content { padding: 90px 0 44px; } .hero-copy { font-size: var(--font-size-body-small); } .hero-note { margin-top: 42px; } .section { padding: 72px 0; } .product-grid, .technology-grid, .distribution-grid { grid-template-columns: 1fr; gap: 32px; } .product-image { min-height: 330px; order: 2; } .product-copy { order: 1; } .technology-grid .section-heading { order: 1; } .technology-image { order: 2; } .distribution-art { min-height: 330px; order: 2; } .distribution-grid .section-heading { order: 1; } .testimonial-grid, .news-grid { grid-template-columns: 1fr; } .testimonial-card { min-height: 0; } .footer-grid { grid-template-columns: 1fr 1fr; gap: 30px 20px; } .footer-grid > div:first-child { grid-column: 1 / -1; } .footer-bottom { align-items: flex-start; flex-direction: column; } }",
  "@media (max-width: 420px) { .button-row .button { width: 100%; } .tech-points { grid-template-columns: 1fr; } .footer-grid { grid-template-columns: 1fr; } .footer-grid > div:first-child { grid-column: auto; } }",
].join("\n");

export default function HomePage() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <>
      <Head>
        <title>{HOME_MESSAGES.PAGE.TITLE}</title>
        <meta
          name="description"
          content={HOME_MESSAGES.PAGE.DESCRIPTION}
        />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <div className="landing">
        <header className="topbar">
          <div className="wrap topbar-inner">
            <BrandLogo
              priority
              ariaLabel={HOME_MESSAGES.BRAND.ARIA_LABEL}
              brandName={HOME_MESSAGES.BRAND.NAME}
              brandTagline={HOME_MESSAGES.BRAND.TAGLINE}
            />

            <nav className="nav-links" aria-label={HOME_MESSAGES.NAVIGATION.DESKTOP_ARIA_LABEL}>
              {HOME_MESSAGES.NAVIGATION.ITEMS.map((item) => (
                <Link key={item.HREF} href={item.HREF}>
                  {item.LABEL}
                </Link>
              ))}
            </nav>

            <div className="nav-actions">
              <Link href={HOME_MESSAGES.NAVIGATION.LOGIN_HREF} className="nav-login">
                {HOME_MESSAGES.NAVIGATION.LOGIN}
              </Link>
              <button
                type="button"
                className="mobile-toggle"
                aria-label={menuOpen ? HOME_MESSAGES.NAVIGATION.CLOSE_MENU : HOME_MESSAGES.NAVIGATION.OPEN_MENU}
                aria-expanded={menuOpen}
                onClick={() => setMenuOpen((open) => !open)}
              >
                {menuOpen ? <X size={19} /> : <Menu size={19} />}
              </button>
            </div>

            {menuOpen && (
              <nav className="mobile-menu" aria-label={HOME_MESSAGES.NAVIGATION.MOBILE_ARIA_LABEL}>
                {HOME_MESSAGES.NAVIGATION.ITEMS.map((item) => (
                  <Link
                    key={item.HREF}
                    href={item.HREF}
                    onClick={() => setMenuOpen(false)}
                  >
                    {item.LABEL}
                  </Link>
                ))}
                <Link href={HOME_MESSAGES.NAVIGATION.LOGIN_HREF} onClick={() => setMenuOpen(false)}>
                  {HOME_MESSAGES.NAVIGATION.LOGIN}
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
                eyebrow={HOME_MESSAGES.TECHNOLOGY.EYEBROW}
                title={HOME_MESSAGES.TECHNOLOGY.TITLE}
                description={HOME_MESSAGES.TECHNOLOGY.DESCRIPTION}
              >
                <div className="tech-points">
                  <div className="tech-point"><Activity size={19} /><span>{HOME_MESSAGES.TECHNOLOGY.POINTS[0]}</span></div>
                  <div className="tech-point"><Cloud size={19} /><span>{HOME_MESSAGES.TECHNOLOGY.POINTS[1]}</span></div>
                  <div className="tech-point"><Cpu size={19} /><span>{HOME_MESSAGES.TECHNOLOGY.POINTS[2]}</span></div>
                  <div className="tech-point"><Wifi size={19} /><span>{HOME_MESSAGES.TECHNOLOGY.POINTS[3]}</span></div>
                </div>
              </SectionHeading>
              <div className="technology-image">
                <Image
                  src={coffeeMonitoringImage}
                  alt={HOME_MESSAGES.TECHNOLOGY.IMAGE_ALT}
                  width={1200}
                  height={900}
                />
              </div>
            </div>
          </section>

          <section id="about" className="section distribution-section">
            <div className="wrap distribution-grid">
              <SectionHeading
                eyebrow={HOME_MESSAGES.DISTRIBUTION.EYEBROW}
                title={HOME_MESSAGES.DISTRIBUTION.TITLE}
                description={HOME_MESSAGES.DISTRIBUTION.DESCRIPTION}
              >
                <div className="distribution-points">
                  <div className="distribution-point">
                    <span className="point-icon"><Coffee size={20} /></span>
                    <div><h3>{HOME_MESSAGES.DISTRIBUTION.POINTS[0].TITLE}</h3><p>{HOME_MESSAGES.DISTRIBUTION.POINTS[0].DESCRIPTION}</p></div>
                  </div>
                  <div className="distribution-point">
                    <span className="point-icon"><ShieldCheck size={20} /></span>
                    <div><h3>{HOME_MESSAGES.DISTRIBUTION.POINTS[1].TITLE}</h3><p>{HOME_MESSAGES.DISTRIBUTION.POINTS[1].DESCRIPTION}</p></div>
                  </div>
                  <div className="distribution-point">
                    <span className="point-icon"><Zap size={20} /></span>
                    <div><h3>{HOME_MESSAGES.DISTRIBUTION.POINTS[2].TITLE}</h3><p>{HOME_MESSAGES.DISTRIBUTION.POINTS[2].DESCRIPTION}</p></div>
                  </div>
                </div>
              </SectionHeading>
              <div className="distribution-art">
                <div className="stat-card"><strong>{HOME_MESSAGES.DISTRIBUTION.STAT_VALUE}</strong><span>{HOME_MESSAGES.DISTRIBUTION.STAT_DESCRIPTION}</span></div>
                <Image
                  src={investmentSavingsImage}
                  alt={HOME_MESSAGES.DISTRIBUTION.IMAGE_ALT}
                  width={900}
                  height={700}
                />
              </div>
            </div>
          </section>

          <section id="customers" className="section testimonial-section">
            <div className="wrap">
              <SectionHeading
                eyebrow={HOME_MESSAGES.CUSTOMERS.EYEBROW}
                title={HOME_MESSAGES.CUSTOMERS.TITLE}
                description={HOME_MESSAGES.CUSTOMERS.DESCRIPTION}
                align="center"
              />
              <div className="testimonial-grid">
                {HOME_MESSAGES.CUSTOMERS.TESTIMONIALS.map((item) => (
                  <TestimonialCard
                    key={item.INITIALS}
                    initials={item.INITIALS}
                    name={item.NAME}
                    role={item.ROLE}
                    quote={item.QUOTE}
                  />
                ))}
              </div>
            </div>
          </section>

          <section id="news" className="section news-section">
            <div className="wrap">
              <SectionHeading
                eyebrow={HOME_MESSAGES.NEWS.EYEBROW}
                title={HOME_MESSAGES.NEWS.TITLE}
                description={HOME_MESSAGES.NEWS.DESCRIPTION}
              />
              <div className="news-grid">
                {HOME_MESSAGES.NEWS.ARTICLES.map((article) => (
                  <NewsCard
                    key={article.TITLE}
                    category={article.CATEGORY}
                    date={article.DATE}
                    title={article.TITLE}
                    image={article.IMAGE}
                  />
                ))}
              </div>
            </div>
          </section>

          <section id="contact" className="contact-section">
            <div className="wrap">
              <div className="contact-panel">
                <div className="eyebrow">{HOME_MESSAGES.CONTACT.EYEBROW}</div>
                <h2>{HOME_MESSAGES.CONTACT.TITLE}</h2>
                <p>{HOME_MESSAGES.CONTACT.DESCRIPTION}</p>
                <div className="button-row">
                  <ActionButton href={`mailto:${HOME_MESSAGES.CONTACT.EMAIL}`} variant="light" icon={<ArrowRight size={15} />}>
                    {HOME_MESSAGES.CONTACT.CONSULT_ACTION}
                  </ActionButton>
                  <ActionButton href={HOME_MESSAGES.NAVIGATION.LOGIN_HREF} variant="outline">
                    {HOME_MESSAGES.CONTACT.DASHBOARD_ACTION}
                  </ActionButton>
                </div>
              </div>
            </div>
          </section>
        </main>

        <footer className="footer">
          <div className="wrap">
            <div className="footer-grid">
              <div>
                <BrandLogo
                  ariaLabel={HOME_MESSAGES.BRAND.ARIA_LABEL}
                  brandName={HOME_MESSAGES.BRAND.NAME}
                  brandTagline={HOME_MESSAGES.BRAND.TAGLINE}
                />
                <p className="footer-description">{HOME_MESSAGES.FOOTER.DESCRIPTION}</p>
              </div>
              <div>
                <h3>{HOME_MESSAGES.FOOTER.PRODUCT_TITLE}</h3>
                <div className="footer-links">
                  {HOME_MESSAGES.FOOTER.PRODUCT_LINKS.map((item) => (
                    <Link key={item.HREF} href={item.HREF}>{item.LABEL}</Link>
                  ))}
                </div>
              </div>
              <div>
                <h3>{HOME_MESSAGES.FOOTER.DISCOVERY_TITLE}</h3>
                <div className="footer-links">
                  {HOME_MESSAGES.FOOTER.DISCOVERY_LINKS.map((item) => (
                    <Link key={item.HREF} href={item.HREF}>{item.LABEL}</Link>
                  ))}
                </div>
              </div>
              <div>
                <h3>{HOME_MESSAGES.FOOTER.CONTACT_TITLE}</h3>
                <div className="footer-links">
                  <a href={`mailto:${HOME_MESSAGES.CONTACT.EMAIL}`}>{HOME_MESSAGES.CONTACT.EMAIL}</a>
                  <a href={HOME_MESSAGES.FOOTER.PHONE_HREF}>{HOME_MESSAGES.FOOTER.PHONE}</a>
                  <span>{HOME_MESSAGES.FOOTER.ADDRESS}</span>
                </div>
              </div>
            </div>
            <div className="footer-bottom">
              <span>© {new Date().getFullYear()} {HOME_MESSAGES.FOOTER.COPYRIGHT}</span>
              <span><UserRound size={12} style={{ verticalAlign: "middle" }} /> {HOME_MESSAGES.FOOTER.AUDIENCE}</span>
            </div>
          </div>
        </footer>
      </div>

      <style>{styles}</style>
    </>
  );
}
