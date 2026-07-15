"use client";

import { useIoTStore } from "@/store/useIoTStore";
import { useI18nStore } from "@/store/useI18nStore";
import { ProductionWidget } from "@/components/features/ProductionWidget";
import { ConfigWidget } from "@/components/features/ConfigWidget";
import { AnalyticsWidget } from "@/components/features/AnalyticsWidget";


export default function OverviewPage() {
  const { status } = useIoTStore();
  const { t } = useI18nStore();

  return (
    <div className="flex flex-col max-w-7xl mx-auto gap-8 pb-16">
      {/* Dashboard Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end border-b-2 border-outline pb-4">
        <div>
          <h2 className="text-4xl font-bold font-serif uppercase mb-2 tracking-tighter text-primary">{status.id}</h2>
          <div className="flex items-center gap-3 font-mono text-sm uppercase">
            <span className={`flex items-center gap-2 px-2 py-1 ${status.status === 'Online' ? 'bg-primary text-on-primary' : 'bg-error text-on-error'}`}>
              <div className="w-2 h-2 bg-current rounded-full animate-pulse"></div>
              {status.status === 'Online' ? t('online') : t('offline')} - {status.state === 'Brewing' ? t('brewing') : t('ready')}
            </span>
            <span className="text-on-surface-variant">{t('last_sync')}: {status.lastSync}</span>
          </div>
        </div>
        <div className="mt-4 md:mt-0 font-mono text-sm text-right uppercase text-on-surface-variant flex flex-col items-end gap-2">
          <div>
            <div>{t('uptime')}: {status.uptime}</div>
            <div>{t('firmware_version')}: {status.firmware}</div>
          </div>

        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        <div className="md:col-span-12">
          <AnalyticsWidget />
        </div>
        <div className="md:col-span-6">
          <ProductionWidget />
        </div>
        <div className="md:col-span-6">
          <ConfigWidget />
        </div>
      </div>
    </div>
  );
}
