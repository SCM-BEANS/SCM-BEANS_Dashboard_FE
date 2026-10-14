"use client";

import { DoloresShell, type DoloresRole } from "@/components/dolores/DoloresShell";
import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

const FIGMA_CUSTOMER_PATH = /^\/dashboard(?:$|\/(?:contracts|machines|menu|invoices|support|buyback|notifications)(?:\/|$))/;

export function DoloresDashboardLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  if (FIGMA_CUSTOMER_PATH.test(pathname)) {
    return <DoloresShell role={"customer" as DoloresRole}>{children}</DoloresShell>;
  }

  return (
    <div className="flex min-h-screen overflow-hidden">
      <Sidebar />
      <div className="relative flex w-full flex-1 flex-col md:pl-64">
        <Header />
        <main className="dashboard-bg flex-1 overflow-y-auto p-4 md:p-10">{children}</main>
      </div>
    </div>
  );
}
