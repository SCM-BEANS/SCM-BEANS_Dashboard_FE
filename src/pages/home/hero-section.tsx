import { useEffect, useRef } from "react";
import Image from "next/image";
import { ActionButton } from "@/components/button/action-button";
import { PATH_HOME } from "@/routes/path";
import { HOME_MESSAGES } from "@/text/home/home-messages";
import coffeeMachineImage from "@/assets/coffee-machine-float.png";

export function HeroSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const section = sectionRef.current;
    const stage = stageRef.current;
    const content = contentRef.current;
    const image = imageRef.current;
    if (!section || !stage || !content || !image) return;

    const smallScreen = window.matchMedia("(max-width: 900px)");
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let targetX = 0;
    let targetY = 0;
    let animationFrame = 0;

    const resetTransforms = () => {
      image.style.removeProperty("transform");
      content.style.removeProperty("opacity");
      content.style.removeProperty("transform");
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

      image.style.transform = `translate3d(${targetX * progress}px, ${targetY * progress}px, 0) scale(${1 + progress * 0.05})`;
      content.style.opacity = String(Math.max(0, 1 - progress * 1.2));
      content.style.transform = `translate3d(0, ${-28 * progress}px, 0)`;
    };

    const scheduleUpdate = () => {
      if (animationFrame) window.cancelAnimationFrame(animationFrame);
      animationFrame = window.requestAnimationFrame(updatePosition);
    };

    const refresh = () => {
      if (smallScreen.matches || reducedMotion.matches) {
        resetTransforms();
        return;
      }
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
            <Image
              src={coffeeMachineImage}
              alt={HOME_MESSAGES.PRODUCT.IMAGE_ALT}
              width={760}
              height={760}
              priority
              sizes="(max-width: 700px) 92vw, (max-width: 1023px) 82vw, 52vw"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
