import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { HOME_SECTION_IDS } from "@/routes/path";
import { HOME_MESSAGES } from "@/text/home/home-messages";
import coffeeMachineImage from "@/assets/coffee-machine-float.png";
import { DIGITAL_TWIN_PART_SPAN, DIGITAL_TWIN_PART_START, getPartEntrance, getPartVisibility, getWholeVisibility } from "./digital-twin-story";

const DigitalTwinViewer = dynamic(() => import("./digital-twin-viewer"), { ssr: false });
const clamp = (value: number) => Math.min(1, Math.max(0, value));

export function DigitalTwinSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const [viewerRequested, setViewerRequested] = useState(false);
  const [viewerReady, setViewerReady] = useState(false);
  const [scrollEnabled, setScrollEnabled] = useState(false);
  const [progress, setProgress] = useState(0);
  const [entryProgress, setEntryProgress] = useState(0);

  useEffect(() => {
    const section = sectionRef.current;
    const stage = stageRef.current;
    if (!section || !stage) return;

    const smallScreen = window.matchMedia("(max-width: 1023px)");
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0;
    const update = () => {
      frame = 0;
      const enabled = !smallScreen.matches && !reducedMotion.matches;
      setScrollEnabled(enabled);
      if (!enabled) {
        setProgress(0);
        setEntryProgress(1);
        return;
      }

      const headerHeight = document.querySelector(".topbar")?.getBoundingClientRect().height ?? 0;
      const sectionTop = section.getBoundingClientRect().top;
      const travel = Math.max(1, section.offsetHeight - stage.offsetHeight);
      const handoffDistance = window.innerHeight * 0.2;
      setEntryProgress(clamp((headerHeight + handoffDistance - sectionTop) / handoffDistance));
      const value = (headerHeight - sectionTop) / travel;
      setProgress(clamp(value));
    };
    const schedule = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(update);
    };

    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    smallScreen.addEventListener("change", schedule);
    reducedMotion.addEventListener("change", schedule);
    update();
    return () => {
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      smallScreen.removeEventListener("change", schedule);
      reducedMotion.removeEventListener("change", schedule);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section || viewerRequested) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      setViewerRequested(true);
      observer.disconnect();
    }, { rootMargin: "300px 0px" });
    observer.observe(section);
    return () => observer.disconnect();
  }, [viewerRequested]);

  const activeIndex = progress < DIGITAL_TWIN_PART_START
    ? -1
    : Math.min(HOME_MESSAGES.DIGITAL_TWIN.PARTS.length - 1, Math.floor((progress - DIGITAL_TWIN_PART_START) / DIGITAL_TWIN_PART_SPAN));
  const reveal = scrollEnabled ? entryProgress : 1;
  const cardOpacity = (index: number) => scrollEnabled ? getPartVisibility(progress, index) : 1;

  return (
    <section
      ref={sectionRef}
      id={HOME_SECTION_IDS.DIGITAL_TWIN}
      className="digital-twin-section"
      data-scroll-story={scrollEnabled ? "true" : "false"}
    >
      <div ref={stageRef} className="digital-twin-stage">
        <div className="digital-twin-grid">
          <div className="digital-twin-copy" style={{ opacity: reveal }}>
            <div className="digital-twin-heading">
              <span className="eyebrow">{HOME_MESSAGES.DIGITAL_TWIN.EYEBROW}</span>
              <h2>{HOME_MESSAGES.DIGITAL_TWIN.STORY_TITLE}</h2>
              <p
                className="digital-twin-intro"
                style={{ opacity: scrollEnabled ? getWholeVisibility(progress) : 1 }}
              >
                {HOME_MESSAGES.DIGITAL_TWIN.STORY_DESCRIPTION}
              </p>
            </div>
            <div className="digital-twin-part-cards" aria-live="off">
              {HOME_MESSAGES.DIGITAL_TWIN.PARTS.map((part, index) => {
                const opacity = cardOpacity(index);
                const entrance = scrollEnabled ? getPartEntrance(progress, index) : 1;
                const revealStyle = (delay: number, distance = 10) => {
                  const amount = clamp((entrance - delay) / (1 - delay));
                  return {
                    opacity: amount,
                    transform: scrollEnabled ? `translate3d(0, ${(1 - amount) * distance}px, 0)` : undefined,
                  };
                };
                return (
                  <article
                    key={part.TITLE}
                    className="digital-twin-part-card"
                    aria-hidden={scrollEnabled && activeIndex !== index}
                    style={{ opacity, transform: scrollEnabled ? `translate3d(0, ${(1 - opacity) * 14}px, 0)` : undefined }}
                  >
                    <span className="digital-twin-part-accent" aria-hidden="true" style={{ transform: `scaleY(${entrance})` }} />
                    <span className="digital-twin-part-number" style={revealStyle(0.04, 8)}>CỤM 0{index + 1} / 0{HOME_MESSAGES.DIGITAL_TWIN.PARTS.length}</span>
                    <h3 style={revealStyle(0.16, 12)}>{part.TITLE}</h3>
                    <p style={revealStyle(0.32, 12)}>{part.DESCRIPTION}</p>
                    <dl style={revealStyle(0.48, 10)}>
                      <div><dt>Vị trí</dt><dd>{part.LOCATION}</dd></div>
                      <div><dt>Vai trò</dt><dd>{part.ROLE}</dd></div>
                    </dl>
                  </article>
                );
              })}
            </div>
            <div className="digital-twin-story-progress" aria-hidden="true">
              <span>00</span>
              <div><span style={{ transform: `scaleX(${progress})` }} /></div>
              <span>04</span>
            </div>
            <p className="digital-twin-scroll-hint">{HOME_MESSAGES.DIGITAL_TWIN.SCROLL_HINT}</p>
          </div>

          <div
            className="digital-twin-panel"
            role="group"
            aria-label={HOME_MESSAGES.DIGITAL_TWIN.VIEWER_LABEL}
            style={{ opacity: reveal, transform: `translate3d(0, ${(1 - reveal) * 20}px, 0) scale(${0.98 + reveal * 0.02})` }}
          >
            <div className="digital-twin-poster" style={{ opacity: viewerReady ? 0 : 1 }} aria-hidden="true">
              <Image src={coffeeMachineImage} alt="" width={760} height={760} sizes="(max-width: 1023px) 90vw, 58vw" />
            </div>
            {viewerRequested && (
              <DigitalTwinViewer progress={scrollEnabled ? progress : 0} onReady={() => setViewerReady(true)} />
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
