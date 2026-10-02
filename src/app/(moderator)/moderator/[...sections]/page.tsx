import { notFound } from "next/navigation";
import { ModeratorSectionPage } from "@/components/dolores/ModeratorDashboardScreens";

const PATHS = new Set([
  "contracts", "contracts/list", "contracts/new", "contracts/first-invoice", "contracts/handover/standard", "contracts/handover/smart", "contracts/expiry", "contracts/retrieval", "contracts/settlement", "contracts/early-termination", "contracts/compensation", "contracts/deposit-refund", "contracts/refund-good", "contracts/violations",
  "customers", "customers/list", "customers/new",
  "invoices", "invoices/list", "invoices/reconcile", "invoices/shortfall", "invoices/excess", "invoices/late-cups", "invoices/late-cups-final", "invoices/overdue", "invoices/history", "invoices/payg",
  "machines", "machines/list", "machines/stock", "machines/customer", "machines/loans", "machines/repair-history", "machines/substitute", "machines/substitute/return",
  "iot", "iot/customer", "iot/machines", "menu", "menu/items", "menu/ingredients", "menu/add", "menu/add/missing", "menu/send", "menu/sent", "menu/espresso", "menu/espresso/60", "menu/espresso/20g",
  "technical-requests", "technical-requests/list", "technical-requests/new", "technical-requests/YC-017", "technical-requests/new/install-standard", "technical-requests/new/install-smart", "technical-requests/new/repair", "technical-requests/new/retrieval", "technical-requests/new/buyback", "technical-requests/new/collection",
  "machine-history", "machine-history/S-018", "buyback", "buyback/list", "buyback/documents", "buyback/refurbishment", "notifications", "notifications/alerts",
]);

function isSupported(path: string) {
  return PATHS.has(path)
    || /^contracts\/C-\d{3}$/.test(path)
    || /^customers\/[a-z0-9-]+$/.test(path)
    || /^machines\/[A-Z0-9-]+$/.test(path)
    || /^technical-requests\/YC-\d{3}$/.test(path)
    || /^machine-history\/[A-Z0-9-]+$/.test(path)
    || /^buyback\/MB-[A-Z0-9-]+$/.test(path);
}

export default async function ModeratorSectionRoute({ params }: { params: Promise<{ sections: string[] }> }) {
  const { sections } = await params;
  const path = sections.join("/");
  if (!isSupported(path)) notFound();
  return <ModeratorSectionPage sections={sections} />;
}
