"use client";

import { useIoTStore } from "@/store/useIoTStore";
import { useI18nStore } from "@/store/useI18nStore";

export const ProductionWidget = () => {
  const { production } = useIoTStore();
  const { t } = useI18nStore();

  return (
    <section className="flex flex-col gap-6 h-full">
      <div className="text-xl font-bold uppercase border-b-2 border-outline pb-2 text-primary">{t("production")}</div>
      <div className="bento-border p-6 flex flex-col justify-between h-full bg-primary text-on-primary">
        <div className="mb-6">
          <div className="font-mono text-sm uppercase text-primary-fixed-dim mb-1 font-semibold">{t("cups_brewed_today")}</div>
          <div className="text-5xl font-bold">{production.cupsToday}</div>
        </div>
        <div className="border-t border-primary-fixed-dim/30 pt-4">
          <div className="font-mono text-sm uppercase text-primary-fixed-dim mb-1 font-semibold">{t("lifetime_cups")}</div>
          <div className="text-3xl">{production.lifetimeCups.toLocaleString("en-US")}</div>
        </div>
      </div>
    </section>
  );
};
