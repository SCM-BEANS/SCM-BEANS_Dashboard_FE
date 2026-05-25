"use client";

import { InventoryWidget } from "@/components/features/InventoryWidget";

export default function InventoryPage() {
  return (
    <div className="flex flex-col max-w-7xl mx-auto gap-8 pb-16">
      <div className="flex flex-col border-b-2 border-outline pb-4">
        <h2 className="text-3xl font-bold uppercase tracking-tighter text-primary">System Inventory</h2>
        <p className="font-mono text-sm uppercase text-on-surface-variant mt-2">Real-time resource tracking</p>
      </div>
      <InventoryWidget />
    </div>
  );
}
