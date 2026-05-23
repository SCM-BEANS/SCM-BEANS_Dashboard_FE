"use client";

import { ThermodynamicsWidget } from "@/components/features/ThermodynamicsWidget";

export default function ThermodynamicsPage() {
  return (
    <div className="flex flex-col max-w-7xl mx-auto gap-8 pb-16">
      <div className="flex flex-col border-b-2 border-outline pb-4">
        <h2 className="text-3xl font-bold uppercase tracking-tighter text-primary">Thermodynamics</h2>
        <p className="font-mono text-sm uppercase text-on-surface-variant mt-2">Live temperature and pressure readings</p>
      </div>
      <ThermodynamicsWidget />
    </div>
  );
}
