import { OperatorInvoicesScreen } from "@/components/features/billing/operator-invoices-screen";
import { AdminShell } from "../admin-shell";

export default function AdminInvoicesPage() {
  return (
    <AdminShell>
      <OperatorInvoicesScreen role="admin" />
    </AdminShell>
  );
}
