import { useRouter } from "next/router";
import { OperatorInvoicesScreen } from "@/components/features/billing/operator-invoices-screen";
import { InvoiceIdSchema } from "@/schema/billing.schema";
import { AdminShell } from "../admin-shell";

export default function AdminInvoiceDetailPage() {
  const router = useRouter();
  const candidate = typeof router.query.invoiceId === "string" ? router.query.invoiceId : "";
  const hasValidInvoiceId = InvoiceIdSchema.safeParse(candidate).success;

  return (
    <AdminShell>
      {router.isReady ? <OperatorInvoicesScreen role="admin" invoiceId={candidate} invalidInvoiceId={!hasValidInvoiceId} /> : null}
    </AdminShell>
  );
}
