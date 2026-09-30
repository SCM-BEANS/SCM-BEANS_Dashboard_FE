"use client";

import { useRef, useState, type KeyboardEvent } from "react";
import { useI18nStore } from "@/store/useI18nStore";
import type { TranslationKey } from "@/lib/i18n/translations";
import { BodyModelViewer } from "./BodyModelViewer";
import { DigitalTwinViewer } from "./DigitalTwinViewer";
import { DigitalTwinClusterViewer } from "./DigitalTwinClusterViewer";

const DIGITAL_TWIN_TABS = [
  { id: "body", labelKey: "digital_twin_tab_body" },
  { id: "mechanism", labelKey: "digital_twin_tab_mechanism" },
  { id: "cluster-02", labelKey: "digital_twin_tab_mayxoay" },
  { id: "combined", labelKey: "digital_twin_tab_combined" },
] as const satisfies ReadonlyArray<{ id: string; labelKey: TranslationKey }>;
const COMBINED_MODEL_EXCLUDED_NODES = ["Mayphacafe1.STEP-1"] as const;

type DigitalTwinTab = (typeof DIGITAL_TWIN_TABS)[number]["id"];

export function DigitalTwinWorkspace() {
  const t = useI18nStore((state) => state.t);
  const language = useI18nStore((state) => state.language);
  const [activeTab, setActiveTab] = useState<DigitalTwinTab>("body");
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const selectTab = (tab: DigitalTwinTab) => {
    setActiveTab(tab);
    const tabIndex = DIGITAL_TWIN_TABS.findIndex((item) => item.id === tab);
    tabRefs.current[tabIndex]?.focus();
  };

  const handleTabKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const currentIndex = DIGITAL_TWIN_TABS.findIndex(
      (item) => item.id === activeTab,
    );
    let nextIndex: number | null = null;
    if (event.key === "ArrowRight") {
      nextIndex = (currentIndex + 1) % DIGITAL_TWIN_TABS.length;
    } else if (event.key === "ArrowLeft") {
      nextIndex =
        (currentIndex - 1 + DIGITAL_TWIN_TABS.length) % DIGITAL_TWIN_TABS.length;
    } else if (event.key === "Home") {
      nextIndex = 0;
    } else if (event.key === "End") {
      nextIndex = DIGITAL_TWIN_TABS.length - 1;
    }

    if (nextIndex !== null) {
      event.preventDefault();
      selectTab(DIGITAL_TWIN_TABS[nextIndex].id);
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
        {DIGITAL_TWIN_TABS.map((tab, index) => (
          <button
            key={tab.id}
            ref={(element) => {
              tabRefs.current[index] = element;
            }}
            id={`digital-twin-tab-${tab.id}`}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            aria-controls="digital-twin-tabpanel"
            tabIndex={activeTab === tab.id ? 0 : -1}
            onClick={() => setActiveTab(tab.id)}
            className={`min-h-11 border-b-2 px-4 text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-primary ${
              activeTab === tab.id
                ? "border-primary text-primary"
                : "border-transparent text-on-surface-variant hover:text-on-surface"
            }`}
          >
            {t(tab.labelKey)}
          </button>
        ))}
      </div>

      <div
        id="digital-twin-tabpanel"
        role="tabpanel"
        aria-labelledby={activeTabId}
        tabIndex={0}
        className="min-w-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
      >
        {activeTab === "body" ? (
          <BodyModelViewer />
        ) : activeTab === "mechanism" ? (
          <DigitalTwinViewer />
        ) : activeTab === "cluster-02" ? (
          <DigitalTwinClusterViewer />
        ) : (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-on-surface-variant">
              {t("digital_twin_combined_contents")}
            </p>
            <BodyModelViewer
              excludedNodeNames={COMBINED_MODEL_EXCLUDED_NODES}
              includeMayxoayNode
            />
          </div>
        )}
      </div>
    </section>
  );
}
