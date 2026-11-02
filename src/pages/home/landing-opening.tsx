import { useEffect, useRef, useState } from "react";
import { HOME_SECTION_IDS } from "@/routes/path";
import { HeroSection } from "./hero-section";
import { DigitalTwinSection } from "./digital-twin-section";
import { clamp, ease } from "./digital-twin-story";

// One screen of travel for the horizontal handoff, then seven for the story.
const HANDOFF_SHARE = 1 / 8;

export function LandingOpening() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const [enabled, setEnabled] = useState(false);
  const [travel, setTravel] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const section = sectionRef.current;
    const stage = stageRef.current;
    if (!section || !stage) return;
    const desktop = window.matchMedia("(min-width: 1024px)");
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0;
    const update = () => {
      frame = 0;
      const animate = desktop.matches && !reduced.matches;
      setEnabled(animate);
      const header = document.querySelector(".topbar")?.getBoundingClientRect().height ?? 0;
      const bounds = section.getBoundingClientRect();
      setVisible(bounds.top < window.innerHeight && bounds.bottom > header);
      setTravel(animate ? clamp((header - bounds.top) / Math.max(1, section.offsetHeight - stage.offsetHeight)) : 0);
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    const resize = new ResizeObserver(schedule);
    resize.observe(section);
    resize.observe(stage);
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    desktop.addEventListener("change", schedule);
    reduced.addEventListener("change", schedule);
    update();
    return () => {
      resize.disconnect();
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      desktop.removeEventListener("change", schedule);
      reduced.removeEventListener("change", schedule);
      cancelAnimationFrame(frame);
    };
  }, []);

  const horizontal = enabled ? ease(travel / HANDOFF_SHARE) : 0;
  const progress = enabled ? clamp((travel - HANDOFF_SHARE) / (1 - HANDOFF_SHARE)) : 0;
  return (
    <div ref={sectionRef} className="landing-opening" data-scroll-story={enabled} data-reading={enabled && progress >= 0.08 && progress < 1}>
      {/* This anchor sits at the vertical position where the horizontal handoff ends. */}
      {enabled && <span id={HOME_SECTION_IDS.DIGITAL_TWIN} className="landing-twin-anchor" aria-hidden="true" />}
      <div ref={stageRef} className="landing-opening-stage">
        <div className="landing-opening-track" style={{ transform: enabled ? `translate3d(${-horizontal * 100}%, 0, 0)` : undefined }}>
          <div className="landing-hero-page" aria-hidden={enabled && horizontal === 1} inert={enabled && horizontal === 1}>
            <HeroSection />
          </div>
          <DigitalTwinSection progress={progress} scrollEnabled={enabled} active={visible && (!enabled || horizontal > 0)} />
        </div>
      </div>
    </div>
  );
}
