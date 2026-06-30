"use client";

import { useI18nStore } from "@/store/useI18nStore";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import dynamic from "next/dynamic";
const ModelViewer = dynamic(
  () => import("@/components/3d/ModelViewer").then((mod) => mod.ModelViewer),
  { ssr: false }
);

export default function ModelViewerPage() {
  const { t } = useI18nStore();
  // NOTE: REPLACE THIS URL WITH YOUR ACTUAL 3D MODEL URL
  const targetUrl = "https://pub-1a678736307b419a883db5af948c2a35.r2.dev/assem_v4.glb";
  const defaultUrl = `/api/proxy-model?url=${encodeURIComponent(targetUrl)}`;

  return (
    <div className="fixed inset-0 z-[100] bg-background">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-20 p-4 md:p-6 flex justify-between items-start pointer-events-none">
        <Link
          href="/model"
          className="pointer-events-auto flex items-center gap-2 bg-surface border-2 border-outline px-4 py-2 hover:bg-primary hover:text-on-primary hover:border-primary transition-all duration-300 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)] group"
        >
          <ArrowLeft className="w-5 h-5 transition-transform group-hover:-translate-x-1" />
          <span className="font-mono font-bold uppercase text-sm">Back</span>
        </Link>
      </div>

      {/* Main 3D Canvas with embedded 3D Info UI */}
      <div className="absolute inset-0 z-0">
        <ModelViewer 
          url={defaultUrl} 
          machineName="DEER_01"
          status="Online"
          version="v4.0.2"
          show3DInfo={true}
        />
      </div>
    </div>
  );
}
