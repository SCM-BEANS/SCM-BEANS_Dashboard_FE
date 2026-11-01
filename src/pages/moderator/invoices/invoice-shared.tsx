import { getApiErrorMessage } from "@/lib/api-errors";
import { MODERATOR_MESSAGES } from "@/text/moderator/moderator-messages";
import { moderatorStyles as styles } from "../moderator-shell";
import type { ModeratorInvoice } from "@/schema/billing.schema";

const messages = MODERATOR_MESSAGES.READ_SCREENS;

export function amountText(value: number | null | undefined, currency: string): string {
  if (value == null) return "—";
  const formatted = new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 20 }).format(value);
  return currency.toUpperCase() === "VND" ? `${formatted} đ` : `${formatted} ${currency}`.trim();
}

export function billingPeriodText(invoice: ModeratorInvoice): string {
  const period = invoice.period.trim() || invoice.billingPeriodStart?.slice(0, 7) || "";
  const yearMonth = /^(\d{4})-(\d{2})$/.exec(period);
  if (yearMonth) return `${messages.BILLING_MONTH} ${yearMonth[2]}`;
  if (/^\d{1,2}$/.test(period)) return `${messages.BILLING_MONTH} ${period.padStart(2, "0")}`;
  return period || "—";
}

export function invoiceStatusText(status: ModeratorInvoice["status"]): string {
  return messages.INVOICE_STATUS_LABELS[status];
}

export function QueryFeedback({
  query,
  loadingMessage,
}: {
  query: { isPending: boolean; isError: boolean; error: unknown; refetch: () => unknown };
  loadingMessage: string;
}) {
  if (query.isPending) return <p className={styles.pendingNotice} role="status">{loadingMessage}</p>;
  if (!query.isError) return null;
  return (
    <div className={styles.pendingNotice} role="alert">
      <p>{getApiErrorMessage(query.error)}</p>
      <button className={styles.retryButton} type="button" onClick={() => void query.refetch()}>
        {messages.RETRY}
      </button>
    </div>
  );
}

export function DetailField({ label, value }: { label: string; value: string | number | null | undefined }) {
  return (
    <div className={styles.detailItem}>
      <dt>{label}</dt>
      <dd>{value == null || value === "" ? "—" : value}</dd>
    </div>
  );
}
