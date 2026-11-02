import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { billingApi } from "@/apis/billing.api";
import { profilesApi } from "@/apis/profiles.api";
import { DataTable } from "@/components/table/data-table";
import type { ModeratorInvoice, PaymentProof } from "@/schema/billing.schema";
import { PATH_MODERATOR } from "@/routes/path";
import { MODERATOR_MESSAGES } from "@/text/moderator/moderator-messages";
import { ModeratorPageHeading } from "../moderator-page-heading";
import { moderatorStyles as styles } from "../moderator-shell";
import { billingPeriodText, invoiceStatusText, amountText, QueryFeedback } from "./invoice-shared";

const messages = MODERATOR_MESSAGES.READ_SCREENS;

type InvoiceListRow = {
  invoice: ModeratorInvoice;
  customerName: string;
  proofSummary: ProofSummary;
};

type ProofSummary = {
  status: "available" | "empty" | "unavailable";
  approved: number;
  submitted: number;
  rejected: number;
};

function summarizeProofs(proofs: PaymentProof[] | null): ProofSummary {
  if (proofs === null) return { status: "unavailable", approved: 0, submitted: 0, rejected: 0 };
  if (proofs.length === 0) return { status: "empty", approved: 0, submitted: 0, rejected: 0 };

  return proofs.reduce<ProofSummary>((summary, proof) => {
    if (proof.status === "APPROVED") summary.approved += 1;
    else if (proof.status === "REJECTED") summary.rejected += 1;
    else summary.submitted += 1;
    return summary;
  }, { status: "available", approved: 0, submitted: 0, rejected: 0 });
}

function periodLabel(invoice: ModeratorInvoice): string {
  const period = invoice.period.trim() || invoice.billingPeriodStart?.slice(0, 7) || "";
  const match = /^(\d{4})-(\d{2})$/.exec(period);
  return match ? `Tháng ${match[2]}/${match[1]}` : billingPeriodText(invoice);
}

function dateLabel(value: string | null | undefined): string {
  if (!value) return "—";
  const datePart = value.slice(0, 10);
  const date = new Date(`${datePart}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" }).format(date);
}

function proofStatusLabel(summary: ProofSummary): string {
  if (summary.status === "unavailable") return messages.INVOICE_PROOF_UNAVAILABLE;
  if (summary.status === "empty") return messages.INVOICE_NO_PAYMENT_PROOF;
  return "";
}

function InvoiceProofSummary({ summary }: { summary: ProofSummary }) {
  if (summary.status !== "available") {
    return <span className={styles.invoiceProofEmpty}>{proofStatusLabel(summary)}</span>;
  }

  return (
    <div className={styles.invoiceProofSummary} aria-label="Tình trạng chứng từ thanh toán">
      {summary.approved > 0 && <span>Đã duyệt <strong>{summary.approved}</strong></span>}
      {summary.submitted > 0 && <span>Chờ đối soát <strong>{summary.submitted}</strong></span>}
      {summary.rejected > 0 && <span className={styles.invoiceProofRejected}>Bị từ chối <strong>{summary.rejected}</strong></span>}
    </div>
  );
}

function invoiceStatusClass(status: ModeratorInvoice["status"]): string {
  switch (status) {
    case "PAID": return styles.invoiceStatusPaid;
    case "OVERDUE": return styles.invoiceStatusOverdue;
    case "UNPAID": return styles.invoiceStatusUnpaid;
    case "PENDING": return styles.invoiceStatusPending;
    default: return styles.invoiceStatusNeutral;
  }
}

async function loadInvoiceRows(signal: AbortSignal): Promise<InvoiceListRow[]> {
  const invoices = await billingApi.listModeratorInvoices(signal);
  const ownerIds = [...new Set(invoices.flatMap((invoice) => {
    const ownerId = invoice.ownerId ?? invoice.tenantId;
    return ownerId ? [ownerId] : [];
  }))];

  const [profiles, proofLookups] = await Promise.all([
    Promise.all(ownerIds.map(async (ownerId) => {
      try {
        const profile = await profilesApi.getById(ownerId, signal);
        return [ownerId, profile.fullName || profile.email] as const;
      } catch (error) {
        if (signal.aborted) throw error;
        return [ownerId, ""] as const;
      }
    })),
    Promise.all(invoices.map(async (invoice) => {
      try {
        return await billingApi.listPaymentProofs(invoice.id, signal);
      } catch (error) {
        if (signal.aborted) throw error;
        return null;
      }
    })),
  ]);

  const customerNames = new Map(profiles);
  return invoices.map((invoice, index) => {
    const ownerId = invoice.ownerId ?? invoice.tenantId;
    const proofs = proofLookups[index];
    const proofSummary = summarizeProofs(proofs);

    return {
      invoice,
      customerName: (ownerId && customerNames.get(ownerId)) || (ownerId ? `Chủ sở hữu ${ownerId.slice(0, 8)}` : "Chưa xác định"),
      proofSummary,
    };
  });
}

function InvoiceList({ rows }: { rows: InvoiceListRow[] }) {
  if (rows.length === 0) return <p className={styles.pendingNotice} role="status">{messages.EMPTY_INVOICES}</p>;
  return (
    <DataTable variant="moderator" className={styles.invoiceListTable} minWidth={900} headers={[
      messages.INVOICE_CUSTOMER,
      messages.INVOICE_PERIOD,
      messages.INVOICE_AMOUNT,
      messages.INVOICE_EVIDENCE_RECONCILIATION,
      messages.INVOICE_STATUS,
    ]}>
      {rows.map(({ invoice, customerName, proofSummary }) => (
        <tr key={invoice.id}>
          <td>
            <div className={styles.invoiceCustomerCell}>
              <Link className={styles.tableLink} href={PATH_MODERATOR.INVOICE_DETAIL(invoice.id)}>{customerName}</Link>
              <span>Mã hóa đơn · {invoice.id.slice(0, 8)}</span>
            </div>
          </td>
          <td>
            <div className={styles.invoicePeriodCell}>
              <strong>{periodLabel(invoice)}</strong>
              <span>Hạn thanh toán · {dateLabel(invoice.dueDate)}</span>
            </div>
          </td>
          <td className={styles.invoiceAmountCell}>{amountText(invoice.amount, invoice.currency)}</td>
          <td><InvoiceProofSummary summary={proofSummary} /></td>
          <td><span className={`${styles.invoiceStatusBadge} ${invoiceStatusClass(invoice.status)}`}>{invoiceStatusText(invoice.status)}</span></td>
        </tr>
      ))}
    </DataTable>
  );
}

export function ModeratorInvoiceListScreen() {
  const invoices = useQuery({
    queryKey: ["dolores", "moderator", "billing", "invoices"],
    queryFn: ({ signal }) => loadInvoiceRows(signal),
  });

  return (
    <div className={styles.pageContent}>
      <ModeratorPageHeading title={messages.INVOICES_TITLE} description="Theo dõi kỳ thanh toán, chứng từ và trạng thái từng hóa đơn." />
      <QueryFeedback query={invoices} loadingMessage={messages.LOADING_INVOICES} />
      {invoices.data && !invoices.isError && <InvoiceList rows={invoices.data} />}
    </div>
  );
}
