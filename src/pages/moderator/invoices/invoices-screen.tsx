import { InvoiceIdSchema } from "@/schema/billing.schema";
import { OperatorInvoicesScreen } from "@/components/features/billing/operator-invoices-screen";

export function ModeratorInvoicesScreen({ sectionPath }: { sectionPath: string }) {
  const isList = sectionPath === "invoices" || sectionPath === "invoices/list";
  const requestedId = isList ? "" : sectionPath.slice("invoices/".length);
  const invoiceId = InvoiceIdSchema.safeParse(requestedId).success ? requestedId : undefined;

  return (
    <OperatorInvoicesScreen
      role="moderator"
      invoiceId={invoiceId}
      invalidInvoiceId={!isList && !invoiceId}
    />
  );
}
