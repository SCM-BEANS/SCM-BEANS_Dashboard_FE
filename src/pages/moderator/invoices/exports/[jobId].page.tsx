import { useRouter } from "next/router";
import { InvoiceExportJobScreen } from "@/components/features/billing/operator-invoices-screen";
import { ModeratorShell } from "../../moderator-shell";

export default function ModeratorExportJobPage() {
  const router = useRouter();
  const jobId = typeof router.query.jobId === "string" ? router.query.jobId : "";
  return <ModeratorShell pageTitle="Hóa đơn"><InvoiceExportJobScreen role="moderator" jobId={jobId} routerReady={router.isReady} /></ModeratorShell>;
}
