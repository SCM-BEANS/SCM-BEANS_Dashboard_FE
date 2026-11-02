import type { BackButtonDestination } from "@/components/navigation/back-button";
import { InvoiceIdSchema } from "@/schema/billing.schema";
import { InvoiceDetailScreen } from "./invoice-detail-screen";
import { InvoiceListScreen } from "./invoice-list-screen";

export function InvoicesScreen({ sectionPath, back }: { sectionPath: string; back?: BackButtonDestination | null }) {
  const parts = sectionPath.split("/");
  const invoiceCandidate = parts.length === 2 ? parts[1] : "";
  const invoiceId = InvoiceIdSchema.safeParse(invoiceCandidate).success ? invoiceCandidate : null;
  const period = /^invoices\/(\d{4}-\d{2})$/.exec(sectionPath)?.[1] ?? null;

  if (invoiceId) return <InvoiceDetailScreen invoiceId={invoiceId} back={back} />;
  return <InvoiceListScreen period={period} back={back} />;
}
