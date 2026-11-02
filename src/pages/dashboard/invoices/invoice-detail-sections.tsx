import type { InvoiceLineItem, PaymentProof } from "@/schema/billing.schema";
import { DataTable } from "@/components/table/data-table";
import type { DataTableColumn } from "@/components/table/data-table";
import { CUSTOMER_MESSAGES } from "@/text/customer/customer-messages";
import { formatMoney, QueryFeedback } from "../shared/customer-screen-common";
import styles from "../customer-shell.module.css";

const messages = CUSTOMER_MESSAGES.READ_SCREENS;

export function InvoiceLineItems({
  items,
  currency,
  loading,
  failed,
}: {
  items: InvoiceLineItem[] | undefined;
  currency: string;
  loading: boolean;
  failed: boolean;
}) {
  return (
    <section className={styles.dataPanel} aria-labelledby="owner-invoice-lines">
      <h2 id="owner-invoice-lines">{messages.INVOICE_LINE_ITEMS}</h2>
      <QueryFeedback loading={loading} failed={failed} empty={!items?.length} emptyText={messages.NO_INVOICE_LINES} />
      {items?.length ? (
        <div className={styles.recordList}>
          {items.map((item, index) => (
            <article className={styles.recordCard} key={item.id ?? `line-${index}`}>
              <div>
                <h3>{item.description ?? item.serviceCode ?? messages.INVOICE_LINE}</h3>
                <p>{messages.FIELD_QUANTITY}: {item.quantity ?? "—"} · {messages.FIELD_UNIT_PRICE}: {formatMoney(item.unitPrice, currency)}</p>
              </div>
              <strong>{formatMoney(item.amount, currency)}</strong>
            </article>
          ))}
        </div>
      ) : null}
    </section>
  );
}

export function InvoicePaymentProofs({ proofs, currency, loading, failed }: {
  proofs: PaymentProof[] | undefined;
  currency: string;
  loading: boolean;
  failed: boolean;
}) {
  const columns: readonly DataTableColumn<PaymentProof>[] = [
    {
      key: "filename",
      header: messages.FIELD_PROOF_FILENAME,
      render: (proof) => <span className={styles.paymentProofFilename}>{proof.originalFilename}</span>,
    },
    {
      key: "status",
      header: messages.FIELD_STATUS,
      render: (proof) => (
        <span className={`${styles.paymentProofStatus} ${paymentProofStatusClassName(proof.status)}`}>
          {paymentProofStatusLabel(proof.status)}
        </span>
      ),
    },
    {
      key: "amount",
      header: messages.FIELD_DECLARED_AMOUNT,
      render: (proof) => proof.amount == null
        ? messages.PROOF_AMOUNT_UNAVAILABLE
        : formatMoney(proof.amount, proof.currency ?? currency),
    },
    {
      key: "submittedAt",
      header: messages.FIELD_SUBMITTED_AT,
      render: (proof) => <time dateTime={proof.submittedAt}>{formatDateTime(proof.submittedAt)}</time>,
    },
    {
      key: "content",
      header: messages.FIELD_PROOF_CONTENT,
      render: (proof) => proof.reviewedAt && proof.reviewReason?.trim()
        ? proof.reviewReason
        : proof.status === "SUBMITTED"
          ? messages.PROOF_AWAITING_REVIEW
          : messages.PROOF_NO_REVIEW_NOTE,
    },
  ];

  return (
    <section className={styles.dataPanel} aria-labelledby="owner-invoice-proofs">
      <h2 id="owner-invoice-proofs">{messages.PAYMENT_PROOFS}</h2>
      <QueryFeedback loading={loading} failed={failed} empty={!proofs?.length} emptyText={messages.NO_PAYMENT_PROOFS} />
      {proofs?.length ? (
        <DataTable
          className={styles.paymentProofTable}
          columns={columns}
          rowKey={(proof) => proof.id}
          rows={proofs}
          variant="moderator"
        />
      ) : null}
    </section>
  );
}

function paymentProofStatusLabel(status: PaymentProof["status"]) {
  switch (status) {
    case "APPROVED":
      return messages.PAYMENT_PROOF_STATUS_APPROVED;
    case "REJECTED":
      return messages.PAYMENT_PROOF_STATUS_REJECTED;
    case "SUBMITTED":
      return messages.PAYMENT_PROOF_STATUS_SUBMITTED;
  }
}

function paymentProofStatusClassName(status: PaymentProof["status"]) {
  switch (status) {
    case "APPROVED":
      return styles.paymentProofStatusAPPROVED;
    case "REJECTED":
      return styles.paymentProofStatusREJECTED;
    case "SUBMITTED":
      return styles.paymentProofStatusSUBMITTED;
  }
}

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}
