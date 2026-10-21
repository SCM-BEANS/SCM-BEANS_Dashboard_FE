import type { ReactNode } from "react";
import { DoloresShell } from "@/app/_shell/dolores/DoloresShell";

export default function ModeratorLayout({ children }: { children: ReactNode }) {
  return <DoloresShell role="moderator">{children}</DoloresShell>;
}
