import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { billingApi } from "@/apis/billing.api";
import { getApiErrorMessage } from "@/lib/api-errors";
import { type InvoiceLineItem, type ModeratorInvoice } from "@/schema/billing.schema";
import { DataTable } from "@/components/table/data-table";
import { MODERATOR_MESSAGES } from "@/text/moderator/moderator-messages";
import { ModeratorPageHeading } from "../moderator-page-heading";
import { moderatorStyles as styles } from "../moderator-shell";
import { amountText, billingPeriodText, invoiceStatusText, QueryFeedback } from "./invoice-shared";
import { PaymentProofList } from "./payment-proof-list";
import { InvoiceRefundPanel } from "@/components/features/billing/invoice-refund-panel";

const messages = MODERATOR_MESSAGES.READ_SCREENS;

function InvoiceDetails({ invoice }: { invoice: ModeratorInvoice }) {
  const period = invoice.period.trim() || invoice.billingPeriodStart?.slice(0, 7) || "";
  const periodMatch = /^(\d{4})-(\d{2})$/.exec(period);
  const periodLabel = periodMatch
    ? `Tháng ${periodMatch[2]}/${periodMatch[1]}`
    : billingPeriodText(invoice);

  return (
    <div className={styles.invoiceDetailOverview}>
      <section className={styles.invoiceOverviewMain} aria-labelledby="moderator-invoice-summary-title">
        <div className={styles.invoiceOverviewHeader}>
          <div className={styles.invoiceOverviewIdentity}>
            <span className={styles.invoiceOverviewLabel}>{messages.INVOICE_ID}</span>
            <h2 className={styles.invoiceOverviewTitle} id="moderator-invoice-summary-title">
              #{invoice.id.slice(0, 8)}
            </h2>
          </div>
          <span className={`${styles.invoiceStatusBadge} ${invoiceStatusClassName(invoice.status)}`}>
            {invoiceStatusText(invoice.status)}
          </span>
        </div>

        <div className={styles.invoiceOverviewAmount}>
          <span>{messages.INVOICE_AMOUNT}</span>
          <strong>{amountText(invoice.amount, invoice.currency)}</strong>
        </div>
      </section>

      <dl className={styles.invoiceHighlights}>
        <div className={styles.invoiceHighlight}>
          <dt>{messages.INVOICE_PERIOD}</dt>
          <dd>{periodLabel}</dd>
        </div>
        <div className={styles.invoiceHighlight}>
          <dt>{messages.INVOICE_DUE_DATE}</dt>
          <dd>{formatInvoiceDate(invoice.dueDate)}</dd>
        </div>
        <div className={styles.invoiceHighlight}>
          <dt>{messages.INVOICE_PAID_AT}</dt>
          <dd>{formatInvoiceDate(invoice.paidAt, true)}</dd>
        </div>
      </dl>

      <section className={styles.invoiceMetadataPanel} aria-labelledby="moderator-invoice-metadata-title">
        <h2 className={styles.invoiceMetadataHeading} id="moderator-invoice-metadata-title">Thông tin hóa đơn</h2>
        <dl className={styles.invoiceMetadataGrid}>
          <InvoiceMetadataField label={messages.INVOICE_ID} value={invoice.id} isCode />
          <InvoiceMetadataField label={messages.INVOICE_OWNER} value={invoice.ownerId ?? invoice.tenantId} isCode />
          <InvoiceMetadataField label={messages.INVOICE_CONTRACT} value={invoice.contractId ?? "Chưa liên kết"} isCode={Boolean(invoice.contractId)} />
          <InvoiceMetadataField label={messages.INVOICE_TYPE} value={invoice.type} />
        </dl>
      </section>
    </div>
  );
}

function invoiceStatusClassName(status: ModeratorInvoice["status"]): string {
  switch (status) {
    case "PAID": return styles.invoiceStatusPaid;
    case "OVERDUE": return styles.invoiceStatusOverdue;
    case "UNPAID": return styles.invoiceStatusUnpaid;
    case "PENDING": return styles.invoiceStatusPending;
    default: return styles.invoiceStatusNeutral;
  }
}

function formatInvoiceDate(value: string | null | undefined, includeTime = false): string {
  if (!value) return "—";
  if (!includeTime && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split("-");
    return `${day}/${month}/${year}`;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("vi-VN", includeTime
    ? { dateStyle: "medium", timeStyle: "short" }
    : { day: "2-digit", month: "2-digit", year: "numeric" }).format(date);
}

function InvoiceMetadataField({ label, value, isCode = false }: {
  label: string;
  value: string | number | null | undefined;
  isCode?: boolean;
}) {
  return (
    <div className={styles.invoiceMetadataItem}>
      <dt>{label}</dt>
      <dd className={isCode ? styles.invoiceMetadataCode : undefined}>{value == null || value === "" ? "—" : value}</dd>
    </div>
  );
}

function InvoiceStatusActions({ invoice }: { invoice: ModeratorInvoice }) {
  const queryClient = useQueryClient();
  const isPastDue = Boolean(invoice.dueDate && Date.parse(invoice.dueDate) < Date.now());
  const targets: ModeratorInvoice["status"][] = invoice.status === "DRAFT"
    ? ["PENDING", "CANCELLED"]
    : invoice.status === "PENDING" || invoice.status === "UNPAID"
      ? [...(isPastDue ? ["OVERDUE" as const] : []), "CANCELLED"]
      : invoice.status === "OVERDUE" ? ["CANCELLED"] : [];
  const changeStatus = useMutation({
    mutationFn: (status: ModeratorInvoice["status"]) => billingApi.changeInvoiceStatus(invoice.id, { status }),
    onSuccess: async () => Promise.all([
      queryClient.invalidateQueries({ queryKey: ["dolores", "moderator", "billing", "invoice", invoice.id] }),
      queryClient.invalidateQueries({ queryKey: ["dolores", "moderator", "billing", "invoices"] }),
    ]),
  });

  if (targets.length === 0) return null;
  return (
    <section className={styles.pendingNotice} aria-labelledby="moderator-invoice-status-actions">
      <h2 id="moderator-invoice-status-actions" className={styles.sectionTitle}>{messages.INVOICE_STATUS_ACTION}</h2>
      <div className={styles.createActions}>
        {targets.map((status) => (
          <button
            key={status}
            className={styles.retryButton}
            type="button"
            disabled={changeStatus.isPending}
            onClick={() => {
              if (status === "CANCELLED" && !window.confirm("Bạn có chắc muốn hủy hóa đơn này?")) return;
              changeStatus.mutate(status);
            }}
          >
            {changeStatus.isPending && changeStatus.variables === status
              ? messages.INVOICE_STATUS_UPDATING
              : messages.INVOICE_STATUS_LABELS[status]}
          </button>
        ))}
      </div>
      {changeStatus.isError && <p role="alert">{getApiErrorMessage(changeStatus.error)}</p>}
      {changeStatus.isSuccess && <p role="status">{messages.INVOICE_STATUS_UPDATED}</p>}
    </section>
  );
}

function InvoiceLineItems({ items, invoice }: { items: InvoiceLineItem[]; invoice: ModeratorInvoice }) {
  return (
    <section className={styles.pendingNotice} aria-labelledby="moderator-invoice-line-items">
      <h2 id="moderator-invoice-line-items" className={styles.sectionTitle}>{messages.INVOICE_LINE_ITEMS}</h2>
      {items.length === 0 ? <p role="status">{messages.INVOICE_LINE_ITEMS_EMPTY}</p> : (
        <DataTable variant="moderator" headers={[
          messages.INVOICE_LINE_ITEM_DESCRIPTION,
          messages.INVOICE_LINE_ITEM_QUANTITY,
          messages.INVOICE_LINE_ITEM_UNIT_PRICE,
          messages.INVOICE_LINE_ITEM_AMOUNT,
        ]}>
          {items.map((item, index) => (
            <tr key={item.id ?? `${item.serviceCode ?? "line"}-${index}`}>
              <td>{item.description ?? item.serviceCode ?? "—"}</td>
              <td>{item.quantity ?? "—"}</td>
              <td>{item.unitPrice == null ? "—" : amountText(item.unitPrice, invoice.currency)}</td>
              <td>{item.amount == null ? "—" : amountText(item.amount, invoice.currency)}</td>
            </tr>
          ))}
        </DataTable>
      )}
    </section>
  );
}

export function ModeratorInvoiceDetailScreen({ invoiceId }: { invoiceId: string }) {
  const invoice = useQuery({
    queryKey: ["dolores", "moderator", "billing", "invoice", invoiceId],
    queryFn: ({ signal }) => billingApi.getModeratorInvoice(invoiceId, signal),
  });
  const proofs = useQuery({
    queryKey: ["dolores", "moderator", "billing", "invoice", invoiceId, "proofs"],
    queryFn: ({ signal }) => billingApi.listPaymentProofs(invoiceId, signal),
    enabled: Boolean(invoice.data),
  });
  const lineItems = useQuery({
    queryKey: ["dolores", "moderator", "billing", "invoice", invoiceId, "line-items"],
    queryFn: ({ signal }) => billingApi.listInvoiceLineItems(invoiceId, signal),
    enabled: Boolean(invoice.data),
    retry: false,
  });

  return (
    <div className={styles.pageContent}>
      <ModeratorPageHeading title={messages.INVOICES_TITLE} description={messages.INVOICES_DESCRIPTION} />
      <QueryFeedback query={invoice} loadingMessage={messages.LOADING_INVOICE} />
      {invoice.data && !invoice.isError && <>
        <InvoiceDetails invoice={invoice.data} />
        <InvoiceRefundPanel key={invoiceId} invoice={{ ...invoice.data, ownerId: invoice.data.ownerId ?? invoice.data.tenantId }} role="MODERATOR" />
        <InvoiceStatusActions invoice={invoice.data} />
        <QueryFeedback query={lineItems} loadingMessage={messages.LOADING_INVOICE_LINE_ITEMS} />
        {lineItems.data && !lineItems.isError && <InvoiceLineItems items={lineItems.data} invoice={invoice.data} />}
        <QueryFeedback query={proofs} loadingMessage={messages.LOADING_PAYMENT_PROOFS} />
        {proofs.data && !proofs.isError && <PaymentProofList proofs={proofs.data} invoiceId={invoice.data.id} currency={invoice.data.currency} />}
      </>}
    </div>
  );
}
