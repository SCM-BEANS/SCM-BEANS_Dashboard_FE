"use client";

import { useState, useRef, useEffect } from "react";
import { CheckCircle2 } from "lucide-react";

export function HeroSection() {
  const [email, setEmail] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);
  const transitionRef = useRef<HTMLDivElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes("@")) return;

    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      setIsSubmitted(true);
    }, 600);
  };

  // Track scroll to slide out content when scrolling down, and slide back in when at the top
  const [isScrolledOut, setIsScrolledOut] = useState(false);

  useEffect(() => {
    let frame = 0;
    const handleScroll = () => {
      setIsScrolledOut(window.scrollY > 60);

      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const section = sectionRef.current;
        const transition = transitionRef.current;
        if (!section || !transition) return;

        const viewportHeight = window.innerHeight;
        const fadeHeight = Math.max(160, Math.min(320, viewportHeight * 0.24));
        const sectionBottom = section.getBoundingClientRect().bottom + window.scrollY;
        const fadeStart = sectionBottom - fadeHeight * 2;
        const progress = Math.max(0, Math.min(1, (window.scrollY - fadeStart) / fadeHeight));
        transition.style.opacity = String(progress);
      });
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleScroll, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleScroll);
    };
  }, []);

  const isVisible = !isScrolledOut;

  return (
    <section
      ref={sectionRef}
      id="home"
      className="relative w-full min-h-screen flex items-center overflow-hidden bg-black"
    >
      {/* Static end frames from each viewport's hero video. */}
      <div
        aria-hidden="true"
        className="absolute inset-0 hidden bg-cover bg-center lg:block"
        style={{ backgroundImage: 'url("/images/landing-hero-desktop.jpg")' }}
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-cover bg-center lg:hidden"
        style={{ backgroundImage: 'url("/images/landing-hero-mobile.jpg")' }}
      />

      <div
        ref={transitionRef}
        className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-[clamp(160px,24vh,320px)]"
        aria-hidden="true"
        style={{ opacity: 0 }}
      >
        <div
          className="absolute inset-0"
          style={{
            background: "linear-gradient(180deg, transparent 0%, rgba(114, 28, 36, .035) 34%, rgba(253, 251, 247, .75) 76%, #FDFBF7 100%)",
          }}
        />
      </div>

      {/* ── Main Content: Clean, Luxurious, Minimalist ── */}
      <div className="relative z-20 w-full max-w-[1520px] mx-auto px-6 sm:px-10 lg:px-12 xl:px-16 pt-[100px] pb-16 min-h-screen flex items-start md:items-center">
        <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">

          {/* Left Content Column: Slides in when video ends, slides out when scrolling down */}
          <div
            className={`w-full lg:col-span-8 xl:col-span-7 flex flex-col justify-center transition-all duration-700 ease-out ${isVisible
                ? "opacity-100 translate-x-0 translate-y-0 pointer-events-auto"
                : "opacity-0 -translate-y-12 md:translate-y-0 md:-translate-x-16 pointer-events-none"
              }`}
          >
            <div className="max-w-[720px]">

              {/* Refined Luxury Label with Warm Amber Accent */}
              <div className="inline-flex items-center gap-3 mb-6">
                <span className="w-8 h-[1.5px] bg-[#D4A373]" />
                <span className="text-xs sm:text-sm uppercase tracking-[0.3em] font-medium text-[#E8C59C] drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)]">
                  Dolores Coffee • Enterprise Solution
                </span>
              </div>

              {/* Grand Headline with Playfair Display Serif */}
              <h1 className="font-serif text-4xl sm:text-6xl lg:text-[66px] xl:text-[72px] font-semibold text-[#FAF7F2] tracking-[-0.01em] leading-[1.1] mb-6 drop-shadow-[0_4px_30px_rgba(0,0,0,0.95)]">
                Thuê máy pha cà phê{" "}
                <span className="italic font-normal bg-gradient-to-r from-[#F5D0A9] via-[#E8B884] to-[#F3D7B5] bg-clip-text text-transparent">
                  thông minh
                </span>
                <br />
                cho doanh nghiệp
              </h1>

              {/* Sophisticated Description */}
              <p className="text-[#E8E1D9] text-base sm:text-lg lg:text-[19px] leading-[1.8] font-light max-w-[580px] mb-10 drop-shadow-[0_2px_14px_rgba(0,0,0,0.95)]">
                Giải pháp tích hợp IoT &amp; Cloud hàng đầu. Quản lý toàn bộ đội máy từ
                một nền tảng duy nhất — theo dõi thời gian thực, bảo trì dự đoán, vận hành không gián đoạn.
              </p>

              {/* Email Form: Warm Crema Gold & Frosted Glass */}
              <div className="max-w-[500px]">
                {!isSubmitted ? (
                  <form
                    onSubmit={handleSubmit}
                    className="relative flex items-center p-1.5 rounded-full bg-black/50 backdrop-blur-2xl border border-white/25 hover:border-[#D4A373]/60 focus-within:border-[#E8B884] shadow-[0_16px_48px_rgba(0,0,0,0.6)] transition-all duration-300"
                  >
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Nhập email doanh nghiệp của bạn..."
                      required
                      className="w-full bg-transparent pl-5 pr-3 py-3 text-sm sm:text-base text-white placeholder-white/45 focus:outline-none tracking-wide font-light"
                    />
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="shrink-0 px-7 py-3.5 rounded-full bg-gradient-to-r from-[#E5B887] via-[#D4A373] to-[#C68D57] hover:brightness-110 active:scale-95 text-[#1A0E07] font-semibold text-sm tracking-wide transition-all duration-300 shadow-[0_4px_24px_rgba(212,163,115,0.45)] flex items-center justify-center min-w-[110px]"
                    >
                      {isSubmitting ? (
                        <span className="w-4 h-4 border-2 border-[#1A0E07]/40 border-t-[#1A0E07] rounded-full animate-spin" />
                      ) : (
                        <span>Xác nhận</span>
                      )}
                    </button>
                  </form>
                ) : (
                  <div className="inline-flex items-center gap-3 px-6 py-4 rounded-full bg-black/60 backdrop-blur-2xl border border-[#D4A373]/50 text-[#FAF7F2] shadow-xl">
                    <CheckCircle2 className="w-5 h-5 text-[#E8B884] shrink-0" />
                    <span className="text-sm font-light text-white/95">
                      Cảm ơn bạn. Đội ngũ chuyên gia của chúng tôi sẽ liên hệ trong 15 phút.
                    </span>
                  </div>
                )}
              </div>

            </div>
          </div>

          {/* Right Spacer (Leaves the espresso video visually open) */}
          <div className="hidden lg:block lg:col-span-4 xl:col-span-5" />

        </div>
      </div>
    </section>
  );
}
