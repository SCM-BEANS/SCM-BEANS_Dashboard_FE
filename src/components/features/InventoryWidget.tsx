"use client";

import { useIoTStore } from "@/store/useIoTStore";
import { useI18nStore } from "@/store/useI18nStore";
import { Droplet, Bean, Coffee } from "lucide-react";

export const InventoryWidget = () => {
  const { inventory } = useIoTStore();
  const { t } = useI18nStore();

  return (
    <section className="flex flex-col gap-6">
      <div className="text-xl font-bold uppercase border-b-2 border-outline pb-2 text-primary">{t("inventory_levels")}</div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-full">
        <div className="bento-border p-6 flex flex-col justify-between hover:border-primary transition-colors">
          <div className="flex justify-between items-start mb-4">
            <span className="font-mono text-sm uppercase text-on-surface-variant">{t("coffee_beans")}</span>
            <Bean className="w-6 h-6 text-primary" />
          </div>
          <div>
            <div className="text-5xl font-light">{inventory.coffeeBeans.amount}<span className="text-2xl font-medium ml-1">{inventory.coffeeBeans.unit}</span></div>
            <div className="w-full border-t-2 border-outline mt-4 pt-2 font-mono text-xs uppercase flex justify-between text-on-surface-variant">
              <span>{t("capacity")}: {inventory.coffeeBeans.capacity}{inventory.coffeeBeans.unit}</span>
              <span className="text-primary">{Math.round((inventory.coffeeBeans.amount / inventory.coffeeBeans.capacity) * 100)}%</span>
            </div>
          </div>
        </div>
        
        <div className="bento-border p-6 flex flex-col justify-between hover:border-secondary transition-colors">
          <div className="flex justify-between items-start mb-4">
            <span className="font-mono text-sm uppercase text-on-surface-variant">{t("water_volume")}</span>
            <Droplet className="w-6 h-6 text-secondary" />
          </div>
          <div>
            <div className="text-5xl font-light">{inventory.water.volume}<span className="text-2xl font-medium ml-1">{inventory.water.unit}</span></div>
            <div className="w-full border-t-2 border-outline mt-4 pt-2 font-mono text-xs uppercase flex justify-between text-on-surface-variant">
              <span>{inventory.water.isMainsConnected ? t('mains_connected') : t('tank_mode')}</span>
              <span className="text-tertiary">{t("optimal")}</span>
            </div>
          </div>
        </div>

        <div className="bento-border p-6 flex flex-col justify-between hover:border-primary transition-colors">
          <div className="flex justify-between items-start mb-4">
            <span className="font-mono text-sm uppercase text-on-surface-variant">{t("milk_inventory")}</span>
            <Coffee className="w-6 h-6 text-on-surface" />
          </div>
          <div>
            <div className="text-5xl font-light">{inventory.milk.volume}<span className="text-2xl font-medium ml-1">{inventory.milk.unit}</span></div>
            <div className="w-full border-t-2 border-outline mt-4 pt-2 font-mono text-xs uppercase flex justify-between text-on-surface-variant">
              <span>{inventory.milk.chamber}</span>
              <span>85%</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
