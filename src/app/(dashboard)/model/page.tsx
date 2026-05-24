"use client";

import { useI18nStore } from "@/store/useI18nStore";
import Link from "next/link";
import { Layers, ArrowRight, Activity, Settings, Info, Box } from "lucide-react";
import { ModelViewer } from "@/components/3d/ModelViewer";

export default function ModelPreviewPage() {
  const { t } = useI18nStore();
  // NOTE: REPLACE THIS URL WITH YOUR ACTUAL 3D MODEL URL
  const targetUrl = "https://pub-1a678736307b419a883db5af948c2a35.r2.dev/assem_v4.glb";
  const defaultUrl = `/api/proxy-model?url=${encodeURIComponent(targetUrl)}`;

  return (
    <div className="flex flex-col gap-6 p-6 pb-24 md:p-8 h-full">
      <div className="flex justify-between items-end border-b-2 border-outline pb-4">
        <div>
          <h1 className="text-3xl font-bold font-mono tracking-tighter uppercase text-primary">
            {t("nav_model")}
          </h1>
          <p className="text-on-surface-variant font-mono text-sm uppercase mt-1">
            {t("model_preview")}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-200px)] min-h-[500px]">
        {/* 3D Model View (Clean) */}
        <div className="lg:col-span-2 border-2 border-outline bg-surface relative overflow-hidden group">
          <ModelViewer url={defaultUrl} show3DInfo={false} />
          {/* subtle gradient overlay so models don't bleed into UI if they are too close */}
          <div className="absolute inset-0 bg-gradient-to-t from-surface/20 to-transparent pointer-events-none" />
        </div>

        {/* 2D Information Panel */}
        <div className="border-2 border-outline bg-surface flex flex-col h-full">
          {/* Header */}
          <div className="p-6 border-b-2 border-outline bg-primary text-on-primary">
            <div className="flex items-center gap-3">
              <Layers className="w-8 h-8" />
              <div>
                <h2 className="font-mono font-bold uppercase tracking-wider text-xl">DEER_01</h2>
                <div className="font-mono text-xs uppercase opacity-80 mt-1">Espresso Machine V4</div>
              </div>
            </div>
          </div>

          {/* Details */}
          <div className="p-6 flex flex-col gap-6 flex-1 overflow-y-auto">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-primary shrink-0 mt-0.5" />
              <div>
                <div className="font-bold font-mono text-xs uppercase mb-1 text-on-surface-variant">Description</div>
                <div className="text-sm leading-relaxed">
                  High-performance commercial espresso brewing system. Features dual boiler architecture and precision volumetric controls.
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-surface-container p-4 border-2 border-outline flex flex-col gap-2">
                <Activity className="w-5 h-5 text-tertiary" />
                <div className="font-mono text-[10px] uppercase text-on-surface-variant">Status</div>
                <div className="font-bold font-mono text-base uppercase text-tertiary">Online</div>
              </div>
              <div className="bg-surface-container p-4 border-2 border-outline flex flex-col gap-2">
                <Settings className="w-5 h-5 text-primary" />
                <div className="font-mono text-[10px] uppercase text-on-surface-variant">Firmware</div>
                <div className="font-bold font-mono text-base uppercase text-primary">v4.0.2</div>
              </div>
            </div>

            <div className="bg-surface-container p-4 border-2 border-outline flex flex-col gap-2">
              <Box className="w-5 h-5 text-secondary" />
              <div className="font-mono text-[10px] uppercase text-on-surface-variant">Model File</div>
              <div className="font-bold font-mono text-xs uppercase text-secondary truncate" title="assem_v4.glb">
                assem_v4.glb
              </div>
            </div>
          </div>

          {/* Action Footer */}
          <div className="p-6 border-t-2 border-outline bg-surface-container mt-auto">
            <Link 
              href="/model/viewer"
              className="w-full flex items-center justify-center gap-2 font-mono text-sm uppercase bg-primary text-on-primary px-4 py-3 border-2 border-transparent hover:bg-background hover:text-primary hover:border-primary transition-all duration-300 font-bold shadow-[4px_4px_0px_0px_rgba(0,0,0,0.2)]"
            >
              <span>View Full 3D Interactive</span>
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
