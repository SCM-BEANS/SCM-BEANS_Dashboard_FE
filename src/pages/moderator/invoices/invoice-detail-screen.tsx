import { OperatorInvoicesScreen } from "@/components/features/billing/operator-invoices-screen";

export function ModeratorInvoiceDetailScreen({ invoiceId }: { invoiceId: string }) {
  return <OperatorInvoicesScreen role="moderator" invoiceId={invoiceId} />;
}
