import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import dynamic from "next/dynamic";
import { ActionButton } from "@/components/button/action-button";
import { PATH_HOME } from "@/routes/path";
import { HOME_MESSAGES } from "@/text/home/home-messages";
import coffeeMachineImage from "@/assets/coffee-machine-float.png";

const HeroDigitalTwin = dynamic(() => import("./hero-digital-twin"), { ssr: false });
const IMAGE_CENTER_AT = 0.58;
const MODEL_ENTER_AT = 0.56;
const MODEL_FULL_AT = 0.68;
const HANDOFF_START_AT = 0.84;

export function HeroSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLDivElement>(null);
  const posterRef = useRef<HTMLDivElement>(null);
  const modelLayerRef = useRef<HTMLDivElement>(null);
  const modelReadyAtRef = useRef<number | null>(null);
  const requestUpdateRef = useRef<() => void>(() => {});
  const [showModelCanvas, setShowModelCanvas] = useState(false);

  const handleModelReady = useCallback(() => {
    if (modelReadyAtRef.current !== null) return;
    modelReadyAtRef.current = performance.now();
    requestUpdateRef.current();
  }, []);

  useEffect(() => {
    const section = sectionRef.current;
    const stage = stageRef.current;
    const content = contentRef.current;
    const image = imageRef.current;
    const poster = posterRef.current;
    const modelLayer = modelLayerRef.current;
    if (!section || !stage || !content || !image || !poster || !modelLayer) return;

    const smallScreen = window.matchMedia("(max-width: 900px)");
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let targetX = 0;
    let targetY = 0;
    let animationFrame = 0;
    const clamp = (value: number) => Math.min(1, Math.max(0, value));
    const smoothstep = (value: number) => value * value * (3 - 2 * value);
    const READY_FADE_MS = 360;

    const resetTransforms = () => {
      image.style.removeProperty("transform");
      content.style.removeProperty("opacity");
      content.style.removeProperty("transform");
      poster.style.removeProperty("opacity");
      modelLayer.style.removeProperty("opacity");
    };

    const measureTarget = () => {
      image.style.removeProperty("transform");
      const imageBounds = image.getBoundingClientRect();
      const headerHeight = document.querySelector(".topbar")?.getBoundingClientRect().height ?? 0;
      targetX = window.innerWidth / 2 - (imageBounds.left + imageBounds.width / 2);
      targetY = (window.innerHeight + headerHeight) / 2 - (imageBounds.top + imageBounds.height / 2);
    };

    const updatePosition = () => {
      animationFrame = 0;
      if (smallScreen.matches || reducedMotion.matches) {
        resetTransforms();
        return;
      }

      const sectionBounds = section.getBoundingClientRect();
      const sectionTop = window.scrollY + sectionBounds.top;
      const headerHeight = document.querySelector(".topbar")?.getBoundingClientRect().height ?? 0;
      const scrollRange = Math.max(1, section.offsetHeight - stage.offsetHeight);
      const progress = Math.min(
        1,
        Math.max(0, (window.scrollY - (sectionTop - headerHeight)) / scrollRange),
      );
      const positionProgress = smoothstep(clamp(progress / IMAGE_CENTER_AT));
      const modelEntrance = smoothstep(clamp((progress - MODEL_ENTER_AT) / (MODEL_FULL_AT - MODEL_ENTER_AT)));
      const handoff = 1 - smoothstep(clamp((progress - HANDOFF_START_AT) / (1 - HANDOFF_START_AT)));
      const readyTime = modelReadyAtRef.current;
      const readyProgress = readyTime === null ? 0 : clamp((performance.now() - readyTime) / READY_FADE_MS);
      const modelBlend = modelEntrance * smoothstep(readyProgress);

      image.style.transform = `translate3d(${targetX * positionProgress}px, ${targetY * positionProgress}px, 0) scale(${1 + positionProgress * 0.05})`;
      content.style.opacity = String(1 - positionProgress);
      content.style.transform = `translate3d(0, ${-28 * positionProgress}px, 0)`;
      poster.style.opacity = String((1 - modelBlend) * handoff);
      modelLayer.style.opacity = String(modelBlend * handoff);
      if (readyTime !== null && readyProgress < 1) scheduleUpdate();
    };

    const scheduleUpdate = () => {
      if (animationFrame) window.cancelAnimationFrame(animationFrame);
      animationFrame = window.requestAnimationFrame(updatePosition);
    };
    requestUpdateRef.current = scheduleUpdate;

    const refresh = () => {
      if (smallScreen.matches || reducedMotion.matches) {
        modelReadyAtRef.current = null;
        setShowModelCanvas(false);
        resetTransforms();
        return;
      }
      setShowModelCanvas(true);
      measureTarget();
      scheduleUpdate();
    };

    window.addEventListener("scroll", scheduleUpdate, { passive: true });
    window.addEventListener("resize", refresh);
    smallScreen.addEventListener("change", refresh);
    reducedMotion.addEventListener("change", refresh);
    refresh();

    return () => {
      window.removeEventListener("scroll", scheduleUpdate);
      window.removeEventListener("resize", refresh);
      smallScreen.removeEventListener("change", refresh);
      reducedMotion.removeEventListener("change", refresh);
      if (animationFrame) window.cancelAnimationFrame(animationFrame);
      requestUpdateRef.current = () => {};
      resetTransforms();
    };
  }, []);

  return (
    <section ref={sectionRef} className="hero hero-scroll-section">
      <div ref={stageRef} className="hero-stage">
        <div className="wrap hero-grid">
          <div ref={contentRef} className="hero-content">
            <h1>
              <span>{HOME_MESSAGES.HERO.TITLE_START}</span>
              {" "}
              <span>{HOME_MESSAGES.HERO.TITLE_ACCENT}</span>
            </h1>
            <p className="hero-copy">{HOME_MESSAGES.HERO.DESCRIPTION}</p>
            <div className="button-row">
              <ActionButton href={PATH_HOME.SECTIONS.SOLUTIONS} variant="primary">
                {HOME_MESSAGES.HERO.PRIMARY_ACTION}
              </ActionButton>
              <ActionButton href={PATH_HOME.SECTIONS.TECHNOLOGY} variant="secondary">
                {HOME_MESSAGES.HERO.SECONDARY_ACTION}
              </ActionButton>
            </div>
          </div>

          <div ref={imageRef} className="hero-product-image">
            <div ref={posterRef} className="hero-product-poster">
              <Image
                src={coffeeMachineImage}
                alt={HOME_MESSAGES.PRODUCT.IMAGE_ALT}
                width={760}
                height={760}
                priority
                sizes="(max-width: 700px) 92vw, (max-width: 1023px) 82vw, 52vw"
              />
            </div>
            <div ref={modelLayerRef} className="hero-model-layer" aria-hidden="true">
              {showModelCanvas && <HeroDigitalTwin onReady={handleModelReady} />}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
