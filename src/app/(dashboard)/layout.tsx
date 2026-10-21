import { DoloresDashboardLayout } from "@/app/_shell/dolores/DoloresDashboardLayout";
import type { ReactNode } from "react";

export default function DashboardLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <DoloresDashboardLayout>{children}</DoloresDashboardLayout>
  );
}
