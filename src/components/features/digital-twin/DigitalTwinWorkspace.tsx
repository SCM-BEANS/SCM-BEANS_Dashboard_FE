"use client";

import { useRef, useState, type KeyboardEvent } from "react";
import { useI18nStore } from "@/store/useI18nStore";
import { BodyModelViewer } from "./BodyModelViewer";
import { DigitalTwinViewer } from "./DigitalTwinViewer";

type DigitalTwinTab = "body" | "mechanism";

export function DigitalTwinWorkspace() {
  const t = useI18nStore((state) => state.t);
  const language = useI18nStore((state) => state.language);
  const [activeTab, setActiveTab] = useState<DigitalTwinTab>("body");
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const selectTab = (tab: DigitalTwinTab) => {
    setActiveTab(tab);
    tabRefs.current[tab === "body" ? 0 : 1]?.focus();
  };

  const handleTabKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    let nextTab: DigitalTwinTab | null = null;
    if (event.key === "ArrowRight") {
      nextTab = activeTab === "body" ? "mechanism" : "body";
    } else if (event.key === "ArrowLeft") {
      nextTab = activeTab === "body" ? "mechanism" : "body";
    } else if (event.key === "Home") {
      nextTab = "body";
    } else if (event.key === "End") {
      nextTab = "mechanism";
    }

    if (nextTab) {
      event.preventDefault();
      selectTab(nextTab);
    }
  };

  const activeTabId = `digital-twin-tab-${activeTab}`;

  return (
    <section lang={language} className="flex min-h-full flex-col gap-5">
      <header className="border-b border-outline-variant pb-4">
        <h1
          id="digital-twin-title"
          className="text-2xl font-bold tracking-tight text-primary md:text-3xl"
        >
          {t("digital_twin")}
        </h1>
        <p className="mt-1 text-sm text-on-surface-variant">
          {t("digital_twin_subtitle")}
        </p>
      </header>

      <div
        role="tablist"
        aria-label={t("digital_twin")}
        onKeyDown={handleTabKeyDown}
        className="flex gap-1 border-b border-outline-variant"
      >
        <button
          ref={(element) => {
            tabRefs.current[0] = element;
          }}
          id="digital-twin-tab-body"
          type="button"
          role="tab"
          aria-selected={activeTab === "body"}
          aria-controls="digital-twin-tabpanel"
          tabIndex={activeTab === "body" ? 0 : -1}
          onClick={() => setActiveTab("body")}
          className={`min-h-11 border-b-2 px-4 text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-primary ${
            activeTab === "body"
              ? "border-primary text-primary"
              : "border-transparent text-on-surface-variant hover:text-on-surface"
          }`}
        >
          {t("digital_twin_tab_body")}
        </button>
        <button
          ref={(element) => {
            tabRefs.current[1] = element;
          }}
          id="digital-twin-tab-mechanism"
          type="button"
          role="tab"
          aria-selected={activeTab === "mechanism"}
          aria-controls="digital-twin-tabpanel"
          tabIndex={activeTab === "mechanism" ? 0 : -1}
          onClick={() => setActiveTab("mechanism")}
          className={`min-h-11 border-b-2 px-4 text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-primary ${
            activeTab === "mechanism"
              ? "border-primary text-primary"
              : "border-transparent text-on-surface-variant hover:text-on-surface"
          }`}
        >
          {t("digital_twin_tab_mechanism")}
        </button>
      </div>

      <div
        id="digital-twin-tabpanel"
        role="tabpanel"
        aria-labelledby={activeTabId}
        tabIndex={0}
        className="min-w-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
      >
        {activeTab === "body" ? <BodyModelViewer /> : <DigitalTwinViewer />}
      </div>
    </section>
  );
}
