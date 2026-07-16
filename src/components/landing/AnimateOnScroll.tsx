"use client";

import { useEffect, useRef, ReactNode } from "react";

interface AnimateOnScrollProps {
  children: ReactNode;
  className?: string;
  delay?: number; // ms
  direction?: "up" | "left" | "right" | "none";
  threshold?: number;
  once?: boolean;
}

/**
 * AnimateOnScroll — Wraps children and triggers a fade+translate animation
 * when the element enters the viewport via IntersectionObserver.
 *
 * Usage:
 *   <AnimateOnScroll delay={100}>
 *     <MyCard />
 *   </AnimateOnScroll>
 */
export function AnimateOnScroll({
  children,
  className = "",
  delay = 0,
  direction = "up",
  threshold = 0.12,
  once = false,
}: AnimateOnScrollProps) {
  const ref = useRef<HTMLDivElement>(null);

  const initialTransform = {
    up: "translateY(28px)",
    left: "translateX(-28px)",
    right: "translateX(28px)",
    none: "none",
  }[direction];

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Set initial hidden state
    el.style.opacity = "0";
    el.style.transform = initialTransform;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            el.style.transition = `opacity 0.65s cubic-bezier(0.16, 1, 0.3, 1) ${delay}ms, transform 0.65s cubic-bezier(0.16, 1, 0.3, 1) ${delay}ms`;
            el.style.opacity = "1";
            el.style.transform = "none";
            if (once) observer.unobserve(el);
          } else if (!once) {
            // Exit effect when scrolling out (faster, no delay so it's ready to re-enter)
            el.style.transition = `opacity 0.4s ease, transform 0.4s ease`;
            el.style.opacity = "0";
            el.style.transform = initialTransform;
          }
        });
      },
      { threshold }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [delay, initialTransform, threshold, once]);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}

/**
 * StaggerContainer — animates children with stagger delay
 */
interface StaggerContainerProps {
  children: ReactNode;
  className?: string;
  baseDelay?: number;
  staggerMs?: number;
  direction?: "up" | "left" | "right" | "none";
}

export function StaggerContainer({
  children,
  className = "",
  baseDelay = 0,
  staggerMs = 100,
  direction = "up",
}: StaggerContainerProps) {
  const childArray = Array.isArray(children) ? children : [children];

  return (
    <div className={className}>
      {childArray.map((child, i) => (
        <AnimateOnScroll
          key={i}
          delay={baseDelay + i * staggerMs}
          direction={direction}
        >
          {child}
        </AnimateOnScroll>
      ))}
    </div>
  );
}
