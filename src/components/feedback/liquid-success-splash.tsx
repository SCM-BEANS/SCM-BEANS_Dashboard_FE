import { useEffect, useRef } from "react";
import styles from "./liquid-success-splash.module.css";

export const LOGIN_SPLASH_MAX_DURATION_MS = 1450;
const LOGIN_SPLASH_TIMELINE_DURATION_MS = 1220;

// Identical commands keep the edge continuous without remapping SVG points.
export const LOGIN_SPLASH_START_PATH = "M 0 -5 H 100 V -5 C 92 -5 96 -5 83 -5 C 70 -5 77 -5 64 -5 C 51 -5 58 -5 44 -5 C 30 -5 35 -5 22 -5 C 9 -5 8 -5 0 -5 Z";
export const LOGIN_SPLASH_DRIP_PATH = "M 0 -5 H 100 V 14 C 92 14 96 55 83 55 C 70 55 77 26 64 26 C 51 26 58 76 44 76 C 30 76 35 38 22 38 C 9 38 8 20 0 20 Z";
export const LOGIN_SPLASH_FULL_PATH = "M 0 -5 H 100 V 105 C 92 105 96 105 83 105 C 70 105 77 105 64 105 C 51 105 58 105 44 105 C 30 105 35 105 22 105 C 9 105 8 105 0 105 Z";

type GsapModule = typeof import("gsap");

interface LiquidAnimationModules {
  gsap: GsapModule["gsap"];
}

interface StartLiquidSuccessAnimationOptions {
  curtain: SVGSVGElement | null;
  path: SVGPathElement | null;
  message: HTMLDivElement | null;
  onComplete: () => void;
  prefersReducedMotion?: () => boolean;
  loadGsap?: () => Promise<LiquidAnimationModules>;
  setTimeout?: (callback: () => void, delay: number) => number;
  clearTimeout?: (timer: number) => void;
  now?: () => number;
}

let animationModules: Promise<LiquidAnimationModules> | undefined;

function loadLiquidAnimationModules(): Promise<LiquidAnimationModules> {
  animationModules ??= import("gsap").then(({ gsap }) => ({ gsap })).catch((error) => {
    animationModules = undefined;
    throw error;
  });
  return animationModules;
}

export function prepareLiquidSuccessAnimation(): Promise<void> {
  return loadLiquidAnimationModules().then(() => undefined, () => undefined);
}

export function startLiquidSuccessAnimation({
  curtain,
  path,
  message,
  onComplete,
  prefersReducedMotion = () => window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false,
  loadGsap = loadLiquidAnimationModules,
  setTimeout: schedule = (callback, delay) => window.setTimeout(callback, delay),
  clearTimeout: cancel = (timer) => window.clearTimeout(timer),
  now = () => performance.now(),
}: StartLiquidSuccessAnimationOptions): () => void {
  let active = true;
  let completed = false;
  let fallbackTimer: number | undefined;
  let timeline: ReturnType<GsapModule["gsap"]["timeline"]> | undefined;

  const finish = () => {
    if (!active || completed) return;
    completed = true;
    if (fallbackTimer !== undefined) cancel(fallbackTimer);
    timeline?.kill();
    onComplete();
  };

  try {
    if (prefersReducedMotion()) {
      finish();
      return () => { active = false; };
    }

    const startedAt = now();
    fallbackTimer = schedule(finish, LOGIN_SPLASH_MAX_DURATION_MS);
    void loadGsap().then(({ gsap }) => {
      if (!active || completed) return;
      if (now() - startedAt > LOGIN_SPLASH_MAX_DURATION_MS - LOGIN_SPLASH_TIMELINE_DURATION_MS) {
        finish();
        return;
      }
      if (!curtain || !path || !message) {
        finish();
        return;
      }

      try {
        timeline = gsap.timeline({ onComplete: finish });
        timeline.addLabel("pour", 0);
        timeline.set(curtain, { opacity: 1, visibility: "visible" });
        timeline.set(path, { attr: { d: LOGIN_SPLASH_START_PATH } });
        timeline.set(message, { opacity: 0, scale: 0.96 });

        timeline.to(path, {
          attr: { d: LOGIN_SPLASH_DRIP_PATH },
          duration: 0.42,
          ease: "power2.in",
        }, "pour");
        timeline.to(path, {
          attr: { d: LOGIN_SPLASH_FULL_PATH },
          duration: 0.28,
          ease: "power3.out",
        }, "pour+=0.42");
        timeline.to(message, {
          opacity: 1,
          scale: 1,
          duration: 0.16,
          ease: "power2.out",
        }, "pour+=0.68");
        timeline.addLabel("exit", "pour+=1.08");
        timeline.to(message, { opacity: 0, duration: 0.14, ease: "power1.in" }, "exit");
        timeline.to(curtain, { opacity: 0, duration: 0.14, ease: "power2.in" }, "exit");
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
    timeline?.kill();
  };
}

interface LiquidSuccessSplashProps {
  onComplete: () => void;
  message?: string;
}

export function LiquidSuccessSplash({
  onComplete,
  message = "Đăng nhập thành công",
}: LiquidSuccessSplashProps) {
  const curtainRef = useRef<SVGSVGElement>(null);
  const curtainPathRef = useRef<SVGPathElement>(null);
  const messageRef = useRef<HTMLDivElement>(null);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => startLiquidSuccessAnimation({
    curtain: curtainRef.current,
    path: curtainPathRef.current,
    message: messageRef.current,
    onComplete: () => onCompleteRef.current(),
  }), []);

  return (
    <div className={styles.overlay}>
      <svg
        className={styles.curtain}
        ref={curtainRef}
        data-liquid-curtain="true"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <path
          ref={curtainPathRef}
          data-liquid-curtain-path="true"
          d={LOGIN_SPLASH_START_PATH}
          fill="#b81724"
        />
      </svg>
      <div ref={messageRef} className={styles.message} role="status" aria-live="polite">
        <span className={styles.checkmark} aria-hidden="true">
          <svg viewBox="0 0 24 24" width="34" height="34" fill="none">
            <path d="m5 12.5 4.2 4.2L19 7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
        <p>{message}</p>
      </div>
    </div>
  );
}
