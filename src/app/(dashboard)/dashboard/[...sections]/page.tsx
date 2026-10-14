import { CustomerSectionPage } from "@/components/dolores/CustomerDashboardScreens";
import { notFound } from "next/navigation";

const CUSTOMER_FIGMA_ROUTES = new Set([
  "contracts", "contracts/C-204", "contracts/C-205", "contracts/new", "contracts/expiry", "contracts/end-early", "contracts/end", "contracts/deposit-complete",
  "machines", "machines/S-018", "machines/S-022", "machines/C-031", "machines/substitute", "machines/history",
  "invoices", "invoices/payment", "invoices/shortfall", "invoices/refund", "invoices/2026-08", "invoices/2026-09", "invoices/reminder", "invoices/standard", "invoices/standard-payment",
  "menu", "menu/espresso", "menu/fresh-milk", "menu/add-dish", "menu/sent", "menu/applied",
  "support", "support/new", "support/menu", "support/YC-017", "support/YC-018", "support/YC-012", "buyback", "buyback/new", "buyback/documents", "buyback/documents/confirmed", "buyback/issue", "notifications",
]);

export default async function CustomerSectionRoute({
  params,
  searchParams,
}: {
  params: Promise<{ sections: string[] }>;
  searchParams: Promise<{ view?: string; state?: string }>;
}) {
  const [{ sections }, query] = await Promise.all([params, searchParams]);
  if (!CUSTOMER_FIGMA_ROUTES.has(sections.join("/"))) notFound();
  return <CustomerSectionPage sections={sections} view={query.view} state={query.state} />;
}
