import { useRouter } from "next/router";
import type { BackButtonDestination } from "@/components/navigation/back-button";
import { InvoiceExportJobScreen, OperatorInvoicesScreen } from "@/components/features/billing/operator-invoices-screen";

export function InvoiceListScreen({ period }: { period: string | null; back?: BackButtonDestination | null }) {
  const router = useRouter();
  const exportId = typeof router.query.exportId === "string" ? router.query.exportId : null;
  if (exportId) return <InvoiceExportJobScreen key={exportId} jobId={exportId} routerReady={router.isReady} role="owner" />;
  return <OperatorInvoicesScreen key={period ?? "all"} role="owner" initialPeriod={period ?? ""} />;
}
