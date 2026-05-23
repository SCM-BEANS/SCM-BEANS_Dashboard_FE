"use client";

import { InventoryWidget } from "@/components/features/InventoryWidget";
import { useI18nStore } from "@/store/useI18nStore";

export default function InventoryPage() {
  const { t } = useI18nStore();
  
  return (
    <div className="flex flex-col max-w-7xl mx-auto gap-8 pb-16">
      <div className="flex flex-col border-b-2 border-outline pb-4">
        <h2 className="text-3xl font-bold uppercase tracking-tighter text-primary">{t("system_inventory")}</h2>
        <p className="font-mono text-sm uppercase text-on-surface-variant mt-2">{t("real_time_resource_tracking")}</p>
      </div>
      <InventoryWidget />
    </div>
  );
}
