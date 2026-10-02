import { DoloresShell } from "@/components/dolores/DoloresShell";
import type { ReactNode } from "react";

export default function TechnicianLayout({ children }: { children: ReactNode }) {
  return <DoloresShell role="technician">{children}</DoloresShell>;
}
