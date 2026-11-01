import { useRouter } from "next/router";
import { AdminInvoiceDetailScreen } from "./invoices-management-screens";

export default function AdminInvoiceDetailPage() {
  const router = useRouter();
  const invoiceId = typeof router.query.invoiceId === "string" ? router.query.invoiceId : "";

  return <AdminInvoiceDetailScreen invoiceId={invoiceId} routerReady={router.isReady} />;
}
