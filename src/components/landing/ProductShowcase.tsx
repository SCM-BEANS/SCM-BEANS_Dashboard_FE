"use client";

import Image from "next/image";
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";

const clamp = (value: number, min = 0, max = 1) => Math.min(max, Math.max(min, value));

function CloudConnectionCard({ mobile = false }: { mobile?: boolean }) {
  return (
    <article
      className={`${mobile
        ? "relative flex min-h-[600px] w-full flex-col items-center justify-center rounded-[28px] border border-[#0671E0]/35 bg-white/70 shadow-[0_24px_64px_rgba(6,113,224,0.12)]"
        : "product-story-feature absolute z-20 hidden items-center justify-center md:flex"
      } overflow-hidden text-center text-[#13233A]`}
      style={mobile ? {
        "--feature-title-size": "40px",
        "--feature-subtitle-size": "12px",
        "--copy-x": "50%",
        "--copy-y": "29%",
        "--copy-width": "92%",
        "--copy-reveal-opacity": 1,
        "--copy-reveal-y": "0px",
        "--machine-x": "55%",
        "--machine-y": "76%",
        "--machine-width": "76%",
        "--machine-height": "65%",
        "--machine-opacity": 1,
      } as CSSProperties : {
        left: "var(--feature-x, 0px)",
        top: "var(--feature-y, 0px)",
        width: "var(--feature-width, 100vw)",
        height: "var(--feature-height, 100svh)",
        borderRadius: "var(--feature-radius, 0px)",
        border: "var(--feature-border-width, 0px) solid rgba(6, 113, 224, .42)",
        boxShadow: "0 24px 72px rgba(6, 113, 224, var(--feature-shadow-opacity, 0))",
      }}
    >
      <div
        className="absolute inset-0"
        style={{
          background: "radial-gradient(ellipse 42% 62% at 78% 57%, rgba(6, 113, 224, .20) 0%, rgba(88, 167, 255, .13) 38%, transparent 76%), radial-gradient(ellipse 70% 75% at 50% 108%, rgba(123, 183, 255, .20) 0%, transparent 70%), radial-gradient(ellipse 55% 75% at 8% 4%, #ffffff 0%, rgba(255, 255, 255, .72) 42%, transparent 100%), linear-gradient(125deg, #F9FCFF 0%, #F0F7FF 48%, #E4F0FF 100%)",
        }}
      />
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: "radial-gradient(ellipse 34% 42% at 76% 54%, rgba(255,255,255,.82) 0%, rgba(255,255,255,.36) 45%, transparent 100%)",
        }}
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-70"
        style={{
          backgroundImage: "radial-gradient(circle, rgba(6,113,224,.22) 1px, transparent 1.5px), radial-gradient(circle, rgba(6,113,224,.13) 1px, transparent 1.5px)",
          backgroundSize: "28px 28px, 42px 42px",
          backgroundPosition: "7% 18%, 91% 72%",
          maskImage: "radial-gradient(ellipse at 82% 53%, #000 0%, transparent 60%)",
          WebkitMaskImage: "radial-gradient(ellipse at 82% 53%, #000 0%, transparent 60%)",
        }}
      />
      <svg className="pointer-events-none absolute inset-0 hidden h-full w-full md:block" viewBox="0 0 1440 900" preserveAspectRatio="none" aria-hidden="true">
        <path d="M710 120C860 40 1040 56 1150 146C1260 236 1292 374 1218 480" fill="none" stroke="#0671E0" strokeOpacity=".13" strokeWidth="1.5" />
        <path d="M675 92C850 0 1060 22 1188 128C1310 230 1340 390 1268 510" fill="none" stroke="#0671E0" strokeOpacity=".08" strokeWidth="1" />
        <path d="M570 780C750 690 980 700 1135 790C1218 838 1286 850 1384 826" fill="none" stroke="#0671E0" strokeOpacity=".10" strokeWidth="1.2" />
      </svg>
      <div
        className="pointer-events-none absolute left-[69%] top-[54%] aspect-square w-[68%] -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#0671E0]/[0.10]"
        aria-hidden="true"
      >
        <span className="absolute inset-[9%] rounded-full border border-white/70" />
        <span className="absolute inset-[19%] rounded-full border border-[#0671E0]/[0.08]" />
      </div>
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-[#0671E0]/25 to-transparent"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute z-[5]"
        style={{
          left: "var(--machine-x, 78%)",
          top: "var(--machine-y, 118%)",
          width: "var(--machine-width, 72%)",
          height: "var(--machine-height, 95%)",
          opacity: "var(--machine-opacity, 0)",
          transform: "translate(-50%, -50%)",
        }}
      >
        <Image
          src="/images/coffee-machine-float-20260928.png"
          alt="Máy pha cà phê DOLORES COFFEE"
          fill
          priority
          sizes="(max-width: 767px) 55vw, 45vw"
          className="object-contain object-center"
        />
      </div>
      <div
        className="absolute z-10 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center"
        style={{ left: "var(--copy-x, 50%)", top: "var(--copy-y, 50%)", width: "var(--copy-width, 88%)" }}
      >
        <div style={{ opacity: "var(--copy-reveal-opacity, 1)", transform: "translateY(var(--copy-reveal-y, 0px))" }}>
          <span className="inline-flex items-center gap-2.5 rounded-full border border-[#0671E0]/15 bg-white/65 px-4 py-2 text-[10px] font-bold uppercase tracking-[0.22em] text-[#0671E0] shadow-[0_8px_28px_rgba(6,113,224,0.08)] backdrop-blur-md sm:text-xs">
            <span className="relative flex h-2 w-2" aria-hidden="true">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#0671E0]/35" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-[#0671E0]" />
            </span>
            Cloud Connection
          </span>
          <h3
            className="mt-6 font-extrabold leading-[0.98] tracking-[-0.065em] text-[#13233A]"
            style={{ fontSize: "clamp(34px, var(--feature-title-size, 92px), 92px)" }}
          >
            Theo dõi <span className="font-medium italic text-[#0671E0]" style={{ fontFamily: "var(--font-playfair), Georgia, serif" }}>mọi lúc</span>
          </h3>
          <p
            className="mt-5 whitespace-nowrap font-normal leading-[1.65] tracking-[0.005em] text-[#52657D]"
            style={{ fontSize: "clamp(10px, var(--feature-subtitle-size, 24px), 24px)" }}
          >
            Thống kê hoạt động qua dashboard kết nối máy pha cà phê.
          </p>
          <span className="mt-7 block h-[3px] w-14 rounded-full bg-gradient-to-r from-[#0671E0] to-[#83BBFF]" aria-hidden="true" />
        </div>
      </div>
    </article>
  );
}

function StoryHeading() {
  return (
    <div className="text-center" aria-hidden="true">
      <span className="inline-flex items-center gap-2 rounded-full border border-[#0671E0]/15 bg-white/80 px-3.5 py-1.5 text-[9px] font-bold uppercase tracking-[0.24em] text-[#0671E0] shadow-[0_8px_24px_rgba(6,113,224,.08)] backdrop-blur-sm sm:text-[10px]">
        <span className="h-1.5 w-1.5 rounded-full bg-[#0671E0] shadow-[0_0_10px_rgba(6,113,224,.5)]" />
        Giải pháp cho quán cà phê
      </span>
      <span className="mt-2 block whitespace-nowrap text-[23px] font-extrabold leading-tight tracking-[-0.05em] text-[#13233A] sm:text-[27px] lg:text-[32px]">
        Tối ưu đầu tư,
        <span className="ml-2 bg-gradient-to-r from-[#0671E0] via-[#2588F0] to-[#69AEFF] bg-clip-text font-semibold italic text-transparent">
          làm chủ vận hành.
        </span>
      </span>
      <span className="mx-auto mt-2.5 block h-[3px] w-12 rounded-full bg-gradient-to-r from-[#0671E0] to-[#83BBFF] shadow-[0_0_14px_rgba(6,113,224,.24)]" />
    </div>
  );
}

function CardArtwork({ imageSrc, imageAlt }: { imageSrc?: string; imageAlt?: string }) {
  return (
    <div
      className="group/art relative min-h-0 flex-1 overflow-hidden rounded-xl border border-[#0671E0]/20"
      style={{
        background: "radial-gradient(ellipse at 78% 24%, rgba(6,113,224,.12) 0%, transparent 44%), linear-gradient(145deg, #F4F9FF 0%, #EAF3FF 100%)",
      }}
      aria-hidden={imageSrc ? undefined : true}
    >
      <span className="pointer-events-none absolute -right-10 -top-12 h-40 w-40 rounded-full border border-[#0671E0]/10" />
      <span className="pointer-events-none absolute -right-5 -top-7 h-28 w-28 rounded-full border border-white/80" />
      <span className="pointer-events-none absolute bottom-4 left-4 h-2 w-2 rounded-full bg-[#0671E0]/30 shadow-[12px_-7px_0_rgba(6,113,224,.16),24px_1px_0_rgba(6,113,224,.12)]" />
      {imageSrc && (
        <Image
          src={imageSrc}
          alt={imageAlt ?? ""}
          fill
          sizes="(max-width: 767px) 90vw, 34vw"
          className="object-cover transition-transform duration-700 group-hover/art:scale-[1.025]"
        />
      )}
    </div>
  );
}

function ImagePlaceholderCard({
  title,
  index,
  imageSrc,
  imageAlt,
}: {
  title: string;
  index: 0 | 1;
  imageSrc?: string;
  imageAlt?: string;
}) {
  return (
    <article
      className="product-story-support absolute z-10 flex flex-col overflow-hidden rounded-2xl border border-[#0671E0]/40 bg-white p-3 shadow-[0_16px_40px_rgba(6,113,224,.10)] md:p-4"
      style={{
        left: "var(--support-x, 0px)",
        top: index === 0 ? "var(--support-top-y, 0px)" : "var(--support-bottom-y, 0px)",
        width: "var(--support-width, 0px)",
        height: "var(--support-height, 0px)",
        opacity: "var(--supporting-opacity, 0)",
        transform: "translateY(var(--supporting-shift, 30px))",
      }}
    >
      <span className="pointer-events-none absolute -right-12 -top-14 h-40 w-40 rounded-full bg-[#0671E0]/[0.06] blur-2xl" />
      <CardArtwork imageSrc={imageSrc} imageAlt={imageAlt} />
      <h3 className="relative px-2 pb-1 pt-3 text-sm font-semibold text-[#18191F]">{title}</h3>
    </article>
  );
}

function MobileImagePlaceholderCard({ title, imageSrc, imageAlt }: { title: string; imageSrc?: string; imageAlt?: string }) {
  return (
    <article className="relative isolate flex min-h-[240px] flex-col overflow-hidden rounded-2xl border border-[#0671E0]/40 bg-white p-3 shadow-[0_16px_40px_rgba(6,113,224,.10)]">
      <span className="pointer-events-none absolute -right-12 -top-14 h-40 w-40 rounded-full bg-[#0671E0]/[0.06] blur-2xl" />
      <CardArtwork imageSrc={imageSrc} imageAlt={imageAlt} />
      <h3 className="relative px-2 pb-1 pt-3 text-sm font-semibold text-[#18191F]">{title}</h3>
    </article>
  );
}

function RevealOnScroll({ children, delay = 0 }: { children: ReactNode; delay?: number }) {
  const elementRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setIsVisible(true);
      return;
    }
    if (!("IntersectionObserver" in window)) {
      setIsVisible(true);
      return;
    }

    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setIsVisible(true);
        observer.disconnect();
      }
    }, { threshold: 0.12 });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={elementRef}
      className={`transition-all duration-700 ease-out ${isVisible ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

export function ProductShowcase() {
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    let frame = 0;
    const update = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const section = sectionRef.current;
        if (!section) return;

        const compactLayout = window.matchMedia("(max-width: 767px)").matches;
        const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        const scrollable = section.offsetHeight - window.innerHeight;
        const sectionTop = section.getBoundingClientRect().top;
        const progress = compactLayout || reducedMotion
          ? 1
          : scrollable > 0
            ? clamp(-sectionTop / scrollable)
            : 1;

        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        const copyReveal = compactLayout || reducedMotion
          ? 1
          : clamp((viewportHeight - sectionTop) / (viewportHeight * 0.22));
        const contentWidth = Math.min(viewportWidth - 64, 1320);
        const contentLeft = Math.max(24, (viewportWidth - contentWidth) / 2);
        const gap = 20;
        const columnWidth = (contentWidth - gap * 11) / 12;
        const featureWidth = columnWidth * 8 + gap * 7;
        const featureHeight = Math.min(viewportHeight * 0.54, 460);
        const supportWidth = columnWidth * 4 + gap * 3;
        const supportHeight = (featureHeight - gap) / 2;
        const featureY = Math.max(104, (viewportHeight - featureHeight) / 2 + 22);
        const supportX = contentLeft + featureWidth + gap;
        const supportTopY = featureY;

        const supportOpacity = clamp((progress - 0.28) / 0.55);
        const mix = (from: number, to: number) => from + (to - from) * progress;
        const compactCopyWidth = viewportWidth < 900 ? 66 : 54;
        const compactCopyX = viewportWidth < 900 ? 35 : 29;
        const compactSubtitleSize = Math.max(10, Math.min(14, featureWidth * 0.016));
        const machineOpacity = clamp((progress - 0.05) / 0.42);
        const storyHeadingOpacity = clamp((progress - 0.24) / 0.35);

        // The opening frame fills the viewport; scrolling resolves it into the K3-inspired mosaic.
        section.style.setProperty("--feature-x", `${mix(0, contentLeft)}px`);
        section.style.setProperty("--feature-y", `${mix(0, featureY)}px`);
        section.style.setProperty("--feature-width", `${mix(viewportWidth, featureWidth)}px`);
        section.style.setProperty("--feature-height", `${mix(viewportHeight, featureHeight)}px`);
        section.style.setProperty("--feature-radius", `${progress * 22}px`);
        section.style.setProperty("--feature-border-width", `${progress}px`);
        section.style.setProperty("--feature-shadow-opacity", `${progress * 0.14}`);
        section.style.setProperty("--feature-title-size", `${mix(92, 40)}px`);
        section.style.setProperty("--feature-subtitle-size", `${mix(24, compactSubtitleSize)}px`);
        section.style.setProperty("--copy-reveal-opacity", `${copyReveal}`);
        section.style.setProperty("--copy-reveal-y", `${(1 - copyReveal) * 24}px`);
        section.style.setProperty("--copy-x", `${mix(50, compactCopyX)}%`);
        section.style.setProperty("--copy-width", `${mix(88, compactCopyWidth)}%`);
        section.style.setProperty("--machine-x", `${mix(78, 75)}%`);
        section.style.setProperty("--machine-y", `${mix(118, 56)}%`);
        section.style.setProperty("--machine-width", `${mix(72, 55)}%`);
        section.style.setProperty("--machine-height", `${mix(95, 82)}%`);
        section.style.setProperty("--machine-opacity", `${machineOpacity}`);
        section.style.setProperty("--story-heading-opacity", `${storyHeadingOpacity}`);
        section.style.setProperty("--story-heading-rise", `${(1 - storyHeadingOpacity) * 12}px`);
        section.style.setProperty("--story-heading-y", `${(88 + featureY) / 2}px`);
        section.style.setProperty("--support-x", `${supportX}px`);
        section.style.setProperty("--support-top-y", `${supportTopY}px`);
        section.style.setProperty("--support-bottom-y", `${supportTopY + supportHeight + gap + 14}px`);
        section.style.setProperty("--support-width", `${supportWidth}px`);
        section.style.setProperty("--support-height", `${supportHeight}px`);
        section.style.setProperty("--supporting-opacity", `${supportOpacity}`);
        section.style.setProperty("--supporting-shift", `${(1 - supportOpacity) * 30}px`);
      });
    };

    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  return (
    <section
      ref={sectionRef}
      id="solutions"
      aria-labelledby="product-showcase-title"
      className="relative min-h-screen overflow-clip border-b border-[#ABBED1]/20 bg-[#F5F7FA] md:h-[240svh] md:min-h-0"
      style={{
        backgroundImage: "radial-gradient(circle, rgba(6,113,224,.14) 1px, transparent 1.5px), radial-gradient(circle at 9% 22%, rgba(6,113,224,.08), transparent 24%), radial-gradient(circle at 91% 78%, rgba(6,113,224,.08), transparent 26%)",
        backgroundSize: "34px 34px, 100% 100%, 100% 100%",
        "--feature-x": "0px",
        "--feature-y": "0px",
        "--feature-width": "100vw",
        "--feature-height": "100svh",
        "--feature-radius": "0px",
        "--feature-border-width": "0px",
        "--feature-shadow-opacity": 0,
        "--feature-title-size": "92px",
        "--feature-subtitle-size": "24px",
        "--copy-reveal-opacity": 0,
        "--copy-reveal-y": "24px",
        "--copy-x": "50%",
        "--copy-width": "88%",
        "--machine-x": "78%",
        "--machine-y": "118%",
        "--machine-width": "72%",
        "--machine-height": "95%",
        "--machine-opacity": 0,
        "--story-heading-opacity": 0,
        "--story-heading-rise": "12px",
        "--story-heading-y": "165px",
        "--support-x": "0px",
        "--support-top-y": "0px",
        "--support-bottom-y": "0px",
        "--support-width": "0px",
        "--support-height": "0px",
        "--supporting-opacity": 0,
        "--supporting-shift": "30px",
      } as CSSProperties}
    >
      <h2 id="product-showcase-title" className="sr-only">Tối ưu đầu tư, làm chủ vận hành.</h2>

      <div className="relative z-10 mx-auto flex max-w-[680px] flex-col gap-5 px-5 pb-14 pt-10 md:hidden">
        <div className="px-3 pb-1 pt-2"><StoryHeading /></div>
        <RevealOnScroll>
          <CloudConnectionCard mobile />
        </RevealOnScroll>
        <RevealOnScroll delay={90}>
          <MobileImagePlaceholderCard
            title="Tiết kiệm chi phí đầu tư"
            imageSrc="/images/investment-savings.png"
            imageAlt="Không gian quán cà phê với máy pha DOLORES COFFEE"
          />
        </RevealOnScroll>
        <RevealOnScroll delay={170}>
          <MobileImagePlaceholderCard
            title="Theo dõi trực tiếp"
            imageSrc="/images/coffee-live-monitoring-20260928.jpg"
            imageAlt="Chủ quán theo dõi hoạt động kinh doanh cà phê trên điện thoại"
          />
        </RevealOnScroll>
      </div>

      <div className="relative hidden h-svh min-h-[640px] overflow-hidden md:sticky md:top-0 md:block">
        <div
          className="pointer-events-none absolute left-1/2 z-30 hidden -translate-x-1/2 -translate-y-1/2 md:block"
          style={{ top: "var(--story-heading-y, 165px)", opacity: "var(--story-heading-opacity, 0)", transform: "translate(-50%, calc(-50% + var(--story-heading-rise, 12px)))" }}
        >
          <StoryHeading />
        </div>
        <CloudConnectionCard />
        <ImagePlaceholderCard
          title="Tiết kiệm chi phí đầu tư"
          imageSrc="/images/investment-savings.png"
          imageAlt="Không gian quán cà phê với máy pha DOLORES COFFEE"
          index={0}
        />
        <ImagePlaceholderCard
          title="Theo dõi trực tiếp"
          imageSrc="/images/coffee-live-monitoring-20260928.jpg"
          imageAlt="Chủ quán theo dõi hoạt động kinh doanh cà phê trên điện thoại"
          index={1}
        />
      </div>
    </section>
  );
}
