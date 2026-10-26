import { useEffect, useRef } from "react";
import styles from "./liquid-success-splash.module.css";

export const LOGIN_SPLASH_MAX_DURATION_MS = 1450;

type GsapModule = typeof import("gsap");

interface StartLiquidSuccessAnimationOptions {
  wave: SVGSVGElement | null;
  message: HTMLDivElement | null;
  onComplete: () => void;
  prefersReducedMotion?: () => boolean;
  loadGsap?: () => Promise<GsapModule>;
  setTimeout?: (callback: () => void, delay: number) => number;
  clearTimeout?: (timer: number) => void;
}

export function startLiquidSuccessAnimation({
  wave,
  message,
  onComplete,
  prefersReducedMotion = () => window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false,
  loadGsap = () => import("gsap"),
  setTimeout: schedule = (callback, delay) => window.setTimeout(callback, delay),
  clearTimeout: cancel = (timer) => window.clearTimeout(timer),
}: StartLiquidSuccessAnimationOptions): () => void {
  let active = true;
  let completed = false;
  let fallbackTimer: number | undefined;

  const finish = () => {
    if (!active || completed) return;
    completed = true;
    if (fallbackTimer !== undefined) cancel(fallbackTimer);
    onComplete();
  };

  try {
    if (prefersReducedMotion()) {
      finish();
      return () => { active = false; };
    }

    fallbackTimer = schedule(finish, LOGIN_SPLASH_MAX_DURATION_MS);
    void loadGsap().then(({ gsap }) => {
      if (!active || completed) return;
      if (!wave || !message) {
        finish();
        return;
      }

      try {
        const timeline = gsap.timeline({ onComplete: finish });
        timeline.set(wave, { yPercent: 105, visibility: "visible" });
        timeline.set(message, { opacity: 0, scale: 0.96 });
        timeline.to(wave, { yPercent: 0, duration: 0.38, ease: "power2.out" });
        timeline.to(message, { opacity: 1, scale: 1, duration: 0.18, ease: "power2.out" }, "-=0.08");
        timeline.to(message, { opacity: 1, duration: 0.3 });
        timeline.to(message, { opacity: 0, duration: 0.12, ease: "power1.in" });
        timeline.to(wave, { yPercent: -110, duration: 0.38, ease: "power2.in" });
      } catch {
        finish();
      }
    }).catch(finish);
  } catch {
    finish();
  }

  return () => {
    active = false;
    if (fallbackTimer !== undefined) cancel(fallbackTimer);
  };
}

interface LiquidSuccessSplashProps {
  onComplete: () => void;
}

export function LiquidSuccessSplash({ onComplete }: LiquidSuccessSplashProps) {
  const waveRef = useRef<SVGSVGElement>(null);
  const messageRef = useRef<HTMLDivElement>(null);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => startLiquidSuccessAnimation({
    wave: waveRef.current,
    message: messageRef.current,
    onComplete: () => onCompleteRef.current(),
  }), []);

  return (
    <div className={styles.overlay}>
      <svg
        ref={waveRef}
        className={styles.wave}
        viewBox="0 0 1440 1000"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <path
          d="M0 150 C170 90 280 165 460 125 C620 88 800 160 960 120 C1130 78 1290 160 1440 112 L1440 1000 L0 1000 Z"
          fill="#d94b55"
          opacity="0.48"
        />
        <path
          d="M0 190 C160 118 305 200 470 155 C655 105 785 185 970 145 C1145 100 1300 185 1440 138 L1440 1000 L0 1000 Z"
          fill="#b81724"
        />
      </svg>
      <div ref={messageRef} className={styles.message} role="status" aria-live="polite">
        <span className={styles.checkmark} aria-hidden="true">
          <svg viewBox="0 0 24 24" width="34" height="34" fill="none">
            <path d="m5 12.5 4.2 4.2L19 7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
        <p>Đăng nhập thành công</p>
      </div>
    </div>
  );
}
