import type { BackButtonDestination } from "@/components/navigation/back-button";
import { OperatorInvoicesScreen } from "@/components/features/billing/operator-invoices-screen";
import { PaymentProofForm } from "./payment-proof-form";

export function InvoiceDetailScreen({ invoiceId }: { invoiceId: string; back?: BackButtonDestination | null }) {
  return <OperatorInvoicesScreen role="owner" invoiceId={invoiceId} paymentForm={<PaymentProofForm key={invoiceId} invoiceId={invoiceId} />} />;
}
