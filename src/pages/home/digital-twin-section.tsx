import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { SectionHeading } from "@/components/heading/section-heading";
import { HOME_SECTION_IDS } from "@/routes/path";
import { HOME_MESSAGES } from "@/text/home/home-messages";

const DigitalTwinViewer = dynamic(() => import("./digital-twin-viewer"), {
  ssr: false,
  loading: () => (
    <div className="digital-twin-loader" role="status">
      <span className="digital-twin-spinner" aria-hidden="true" />
      <span>{HOME_MESSAGES.DIGITAL_TWIN.LOADING}</span>
    </div>
  ),
});

export function DigitalTwinSection() {
  const viewerRef = useRef<HTMLDivElement>(null);
  const [viewerRequested, setViewerRequested] = useState(false);

  useEffect(() => {
    const target = viewerRef.current;
    if (!target || viewerRequested) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        setViewerRequested(true);
        observer.disconnect();
      },
      { rootMargin: "240px 0px" },
    );

    observer.observe(target);
    return () => observer.disconnect();
  }, [viewerRequested]);

  return (
    <section id={HOME_SECTION_IDS.DIGITAL_TWIN} className="section digital-twin-section">
      <div className="wrap digital-twin-grid">
        <div className="digital-twin-copy">
          <SectionHeading
            eyebrow={HOME_MESSAGES.DIGITAL_TWIN.EYEBROW}
            title={HOME_MESSAGES.DIGITAL_TWIN.TITLE}
            description={HOME_MESSAGES.DIGITAL_TWIN.DESCRIPTION}
          />
        </div>

        <div
          ref={viewerRef}
          className="digital-twin-panel"
          role="group"
          aria-label={HOME_MESSAGES.DIGITAL_TWIN.VIEWER_LABEL}
        >
          {viewerRequested ? (
            <DigitalTwinViewer />
          ) : (
            <div className="digital-twin-loader" role="status">
              <span className="digital-twin-spinner" aria-hidden="true" />
              <span>{HOME_MESSAGES.DIGITAL_TWIN.LOADING}</span>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
