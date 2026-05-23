"use client";

import { useIoTStore } from "@/store/useIoTStore";

export const ProductionWidget = () => {
  const { production } = useIoTStore();

  return (
    <section className="flex flex-col gap-6 h-full">
      <div className="text-xl font-bold uppercase border-b-2 border-outline pb-2 text-primary">Production</div>
      <div className="bento-border p-6 flex flex-col justify-between h-full bg-primary text-on-primary">
        <div className="mb-6">
          <div className="font-mono text-sm uppercase text-primary-fixed-dim mb-1 font-semibold">Cups Brewed (Today)</div>
          <div className="text-5xl font-bold">{production.cupsToday}</div>
        </div>
        <div className="border-t border-primary-fixed-dim/30 pt-4">
          <div className="font-mono text-sm uppercase text-primary-fixed-dim mb-1 font-semibold">Lifetime Cups</div>
          <div className="text-3xl">{production.lifetimeCups.toLocaleString("en-US")}</div>
        </div>
      </div>
    </section>
  );
};
