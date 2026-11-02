import { useRouter } from "next/router";
import { AdminInvoiceExportJobScreen } from "../invoices-management-screens";

export default function AdminInvoiceExportJobPage() {
  const router = useRouter();
  const jobId = typeof router.query.jobId === "string" ? router.query.jobId : "";

  return <AdminInvoiceExportJobScreen jobId={jobId} routerReady={router.isReady} />;
}
