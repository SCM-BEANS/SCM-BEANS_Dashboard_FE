"use client";

import { isCustomerDashboardPath } from "@/routes/navigation";
import { DoloresShell } from "@/components/dolores/DoloresShell";
import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

export function DoloresDashboardLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  if (isCustomerDashboardPath(pathname)) {
    return <DoloresShell role="customer">{children}</DoloresShell>;
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
