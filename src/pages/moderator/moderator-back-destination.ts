import { PATH_MODERATOR } from "@/routes/path";
import { MODERATOR_MESSAGES } from "@/text/moderator/moderator-messages";
import type { BackButtonDestination } from "@/components/navigation/back-button";

const sectionParents: Record<string, string> = {
  customers: PATH_MODERATOR.CUSTOMERS,
  contracts: PATH_MODERATOR.CONTRACTS,
  invoices: PATH_MODERATOR.INVOICES,
  machines: PATH_MODERATOR.MACHINES,
  iot: PATH_MODERATOR.IOT,
  menu: PATH_MODERATOR.MENU,
  "technical-requests": PATH_MODERATOR.TECHNICAL_REQUESTS,
  "machine-history": PATH_MODERATOR.MACHINE_HISTORY,
  buyback: PATH_MODERATOR.BUYBACK,
  notifications: PATH_MODERATOR.NOTIFICATIONS,
};

export function getModeratorBackDestination(path: string): BackButtonDestination | null {
  const pathname = path.split(/[?#]/, 1)[0].replace(/\/+$/, "") || "/";
  const prefix = `${PATH_MODERATOR.ROOT}/`;
  if (!pathname.startsWith(prefix)) return null;

  const [section, ...nestedPath] = pathname.slice(prefix.length).split("/");
  const fallbackHref = sectionParents[section];
  if (!fallbackHref || nestedPath.length === 0) return null;
  if (nestedPath.length === 1 && nestedPath[0] === "list") return null;

  return {
    label: MODERATOR_MESSAGES.ACTION_BAR.BACK_TO_SECTION,
    fallbackHref,
  };
}
