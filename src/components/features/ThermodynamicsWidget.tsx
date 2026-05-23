"use client";

import { useIoTStore } from "@/store/useIoTStore";
import { useI18nStore } from "@/store/useI18nStore";

export const ThermodynamicsWidget = () => {
  const { thermodynamics } = useIoTStore();
  const { t } = useI18nStore();

  return (
    <section className="flex flex-col gap-4">
      <div className="text-xl font-bold uppercase border-b-2 border-outline pb-2 text-primary">{t("thermodynamics")}</div>
      <div className="grid grid-cols-2 md:grid-cols-6 gap-0 bento-border">
        <div className="p-4 border-r border-b md:border-b-0 border-outline hover:bg-surface-container transition-colors">
          <div className="font-mono text-xs uppercase text-on-surface-variant mb-2">{t("boiler_1_temp")}</div>
          <div className="text-3xl font-semibold text-primary">{thermodynamics.boiler1Temp}°C</div>
        </div>
        <div className="p-4 border-r border-b md:border-b-0 border-outline hover:bg-surface-container transition-colors">
          <div className="font-mono text-xs uppercase text-on-surface-variant mb-2">{t("boiler_2_temp")}</div>
          <div className="text-3xl font-semibold text-primary">{thermodynamics.boiler2Temp}°C</div>
        </div>
        <div className="p-4 border-r border-b md:border-b-0 border-outline hover:bg-surface-container transition-colors">
          <div className="font-mono text-xs uppercase text-on-surface-variant mb-2">{t("output_temp")}</div>
          <div className="text-3xl font-semibold text-primary">{thermodynamics.outputTemp}°C</div>
        </div>
        <div className="p-4 border-r border-b md:border-b-0 border-outline hover:bg-surface-container transition-colors">
          <div className="font-mono text-xs uppercase text-on-surface-variant mb-2">{t("brew_pressure")}</div>
          <div className="text-3xl font-semibold text-primary">{thermodynamics.brewPressure}<span className="text-xl ml-1">Bar</span></div>
        </div>
        <div className="p-4 border-r border-outline hover:bg-surface-container transition-colors">
          <div className="font-mono text-xs uppercase text-on-surface-variant mb-2">{t("milk_ch_1")}</div>
          <div className="text-3xl font-semibold text-secondary">{thermodynamics.milkCh1Temp}°C</div>
        </div>
        <div className="p-4 hover:bg-surface-container transition-colors">
          <div className="font-mono text-xs uppercase text-on-surface-variant mb-2">{t("milk_ch_2")}</div>
          <div className="text-3xl font-semibold text-secondary">{thermodynamics.milkCh2Temp}°C</div>
        </div>
      </div>
    </section>
  );
};
