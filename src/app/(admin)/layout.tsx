import { DoloresShell } from "@/components/dolores/DoloresShell";
import type { ReactNode } from "react";

export default function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <DoloresShell role="admin">{children}</DoloresShell>
  );
}
