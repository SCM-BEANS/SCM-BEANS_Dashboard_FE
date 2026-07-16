"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { ReactNode, useEffect, useRef } from "react";

interface PageHeroProps {
  eyebrow: string;
  title: ReactNode; // can include <span> for blue highlight
  subtitle?: string;
  ctaLabel?: string;
  ctaHref?: string;
  secondaryLabel?: string;
  secondaryHref?: string;
  /** Optional right-side visual slot */
  visual?: ReactNode;
  /** Light (default) or blue fill */
  variant?: "light" | "blue";
}

/**
 * PageHero — Reusable page-level hero section.
 * Follows Figma layout: max-w-[1320px], split layout if visual provided.
 */
export function PageHero({
  eyebrow,
  title,
  subtitle,
  ctaLabel,
  ctaHref = "/",
  secondaryLabel,
  secondaryHref = "/",
  visual,
  variant = "light",
}: PageHeroProps) {
  const textRef = useRef<HTMLDivElement>(null);
  const visualRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const els = [textRef.current, visualRef.current].filter(Boolean) as HTMLElement[];
    els.forEach((el, i) => {
      el.style.opacity = "0";
      el.style.transform = i === 0 ? "translateY(24px)" : "translateX(24px)";
      el.style.transition = `opacity 0.7s cubic-bezier(0.16,1,0.3,1) ${i * 150}ms, transform 0.7s cubic-bezier(0.16,1,0.3,1) ${i * 150}ms`;
      requestAnimationFrame(() => {
        setTimeout(() => {
          el.style.opacity = "1";
          el.style.transform = "none";
        }, 50);
      });
    });
  }, []);

  const isBlue = variant === "blue";

  return (
    <section
      className={`w-full pt-[72px] ${isBlue ? "bg-[#0671E0]" : "bg-white border-b border-[#ABBED1]/30"}`}
    >
      <div className="max-w-[1320px] mx-auto px-4 sm:px-6 py-16 sm:py-20 lg:py-28">
        <div
          className={`grid gap-12 lg:gap-16 items-center ${
            visual ? "grid-cols-1 lg:grid-cols-2" : "grid-cols-1 max-w-[800px]"
          }`}
        >
          {/* Text */}
          <div ref={textRef} className="flex flex-col items-start">
            {/* Eyebrow */}
            <div
              className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-5 ${
                isBlue
                  ? "bg-white/15 text-white"
                  : "bg-[#0671E0]/8 text-[#0671E0]"
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  isBlue ? "bg-white" : "bg-[#0671E0]"
                }`}
              />
              <span className="text-xs font-semibold tracking-wider uppercase">
                {eyebrow}
              </span>
            </div>

            {/* Title */}
            <h1
              className={`font-semibold mb-5 leading-tight ${
                isBlue ? "text-white" : "text-[#18191F]"
              }`}
              style={{ fontSize: "clamp(32px, 5vw, 60px)", lineHeight: "1.15" }}
            >
              {title}
            </h1>

            {/* Subtitle */}
            {subtitle && (
              <p
                className={`mb-8 max-w-[520px] ${
                  isBlue ? "text-white/80" : "text-[#89939E]"
                }`}
                style={{ fontSize: "clamp(16px, 2vw, 18px)", lineHeight: "28px" }}
              >
                {subtitle}
              </p>
            )}

            {/* CTA */}
            {(ctaLabel || secondaryLabel) && (
              <div className="flex flex-col sm:flex-row gap-3">
                {ctaLabel && (
                  <Link
                    href={ctaHref}
                    className={`group inline-flex items-center gap-2 px-6 py-3 font-semibold text-sm rounded-[4px] transition-all duration-200 ${
                      isBlue
                        ? "bg-white text-[#0671E0] hover:bg-white/90"
                        : "btn-primary"
                    }`}
                  >
                    {ctaLabel}
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </Link>
                )}
                {secondaryLabel && (
                  <Link
                    href={secondaryHref}
                    className={`inline-flex items-center gap-2 px-6 py-3 font-semibold text-sm rounded-[4px] transition-all duration-200 ${
                      isBlue
                        ? "border border-white/40 text-white hover:bg-white/10"
                        : "btn-secondary"
                    }`}
                  >
                    {secondaryLabel}
                  </Link>
                )}
              </div>
            )}
          </div>

          {/* Visual slot */}
          {visual && (
            <div ref={visualRef} className="w-full">
              {visual}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
