import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import type { ReactNode } from "react";

export default function DashboardLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <div className="flex min-h-screen overflow-hidden">
      <Sidebar />
      <div className="flex flex-col flex-1 relative w-full md:pl-64">
        <Header />
        <main className="flex-1 overflow-y-auto p-4 md:p-10 dashboard-bg">
          {children}
        </main>
      </div>
    </div>
  );
}
