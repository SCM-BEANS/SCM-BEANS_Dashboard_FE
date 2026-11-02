import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import Image from "next/image";
import { HOME_SECTION_IDS } from "@/routes/path";
import { HOME_MESSAGES } from "@/text/home/home-messages";
import coffeeMachineImage from "@/assets/coffee-machine-float.png";
import { getCutaway, getFocusedPartIndex, getOverviewCenterProgress, getPartVisibility, getWholeVisibility } from "./digital-twin-story";

const DigitalTwinViewer = dynamic(() => import("./digital-twin-viewer"), { ssr: false });

export function DigitalTwinSection({ progress, scrollEnabled, active }: { progress: number; scrollEnabled: boolean; active: boolean }) {
  const [viewerRequested, setViewerRequested] = useState(false);
  const [viewerReady, setViewerReady] = useState(false);

  useEffect(() => {
    setViewerRequested(true);
  }, []);

  const cardOpacity = (index: number) => scrollEnabled ? getPartVisibility(progress, index) : 1;
  const activeIndex = scrollEnabled ? getFocusedPartIndex(progress) : -1;
  const introOpacity = scrollEnabled ? 1 - getCutaway(progress) : 1;
  const overviewCenterProgress = scrollEnabled ? getOverviewCenterProgress(progress) : 0;

  return (
    <section
      id={scrollEnabled ? undefined : HOME_SECTION_IDS.DIGITAL_TWIN}
      className="digital-twin-section"
      data-scroll-story={scrollEnabled ? "true" : "false"}
      data-focused-part={activeIndex}
      data-model-mode={activeIndex < 0 ? "overview" : "detail"}
      data-overview-visible={getWholeVisibility(progress) > 0}
      data-model-ready={viewerReady}
      aria-hidden={scrollEnabled && !active}
    >
      <div className="digital-twin-stage">
        <div className="digital-twin-grid">
          <div className="digital-twin-copy">
            <div className="digital-twin-heading" aria-hidden={introOpacity === 0} style={{ opacity: introOpacity }}>
              <span className="eyebrow">{HOME_MESSAGES.DIGITAL_TWIN.EYEBROW}</span>
              <h2>{HOME_MESSAGES.DIGITAL_TWIN.STORY_TITLE}</h2>
              <p className="digital-twin-intro">{HOME_MESSAGES.DIGITAL_TWIN.STORY_DESCRIPTION}</p>
            </div>
            <div className="digital-twin-part-cards" aria-live="off">
              {HOME_MESSAGES.DIGITAL_TWIN.PARTS.map((part, index) => {
                const opacity = cardOpacity(index);
                const typing = scrollEnabled && active && activeIndex === index;
                const articleStyle = { opacity };
                const partText = (text: string, delay: number) => (
                  <TypewriterText text={text} active={typing} delay={delay} />
                );
                return (
                  <article
                    key={part.TITLE}
                    className="digital-twin-part-card"
                    aria-hidden={scrollEnabled && (!typing || opacity === 0)}
                    style={articleStyle}
                  >
                    <span className="digital-twin-part-accent" aria-hidden="true" style={{ transform: `scaleY(${opacity})` }} />
                    <span className="digital-twin-part-number">CỤM 0{index + 1} / 0{HOME_MESSAGES.DIGITAL_TWIN.PARTS.length}</span>
                    <h3>{partText(part.TITLE, 0)}</h3>
                    <p>{partText(part.DESCRIPTION, 520)}</p>
                    <dl>
                      <div><dt>Vị trí</dt><dd>{partText(part.LOCATION, 1900)}</dd></div>
                      <div><dt>Vai trò</dt><dd>{partText(part.ROLE, 2350)}</dd></div>
                    </dl>
                  </article>
                );
              })}
            </div>
            <div className="digital-twin-story-progress" aria-hidden="true">
              <span>00</span>
              <div><span style={{ transform: `scaleX(${progress})` }} /></div>
              <span>{String(HOME_MESSAGES.DIGITAL_TWIN.PARTS.length).padStart(2, "0")}</span>
            </div>
            <p className="digital-twin-scroll-hint">{HOME_MESSAGES.DIGITAL_TWIN.SCROLL_HINT}</p>
          </div>

          <div
            className="digital-twin-panel"
            role="group"
            aria-label={HOME_MESSAGES.DIGITAL_TWIN.VIEWER_LABEL}
            style={{ transform: overviewCenterProgress > 0 ? `translate3d(${-34.3 * overviewCenterProgress}%, 0, 0)` : undefined }}
          >
            <div className="digital-twin-poster" style={{ opacity: viewerReady ? 0 : 1 }} aria-hidden="true">
              <Image src={coffeeMachineImage} alt="" width={760} height={760} sizes="(max-width: 1023px) 90vw, 58vw" />
            </div>
            {viewerRequested && (
              <DigitalTwinViewer
                progress={scrollEnabled ? progress : 0}
                rotationEnabled={scrollEnabled && active && activeIndex >= 0}
                onReady={() => setViewerReady(true)}
              />
            )}
          </div>
        </div>
      </div>
    </section>
  );
}


function TypewriterText({ text, active, delay }: { text: string; active: boolean; delay: number }) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    setCount(0);
    if (!active) return;
    let current = 0;
    let interval = 0;
    const start = window.setTimeout(() => {
      interval = window.setInterval(() => {
        current += 1;
        setCount(current);
        if (current >= text.length) window.clearInterval(interval);
      }, 18);
    }, delay);
    return () => {
      window.clearTimeout(start);
      window.clearInterval(interval);
    };
  }, [active, delay, text]);

  return (
    <span aria-label={text} className="digital-twin-typed-text" data-visible-characters={active ? count : text.length}>
      <span aria-hidden="true">{active ? text.slice(0, count) : text}</span>
      {active && count < text.length && <span className="digital-twin-typing-caret" aria-hidden="true" />}
    </span>
  );
}
