import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { billingApi } from "@/apis/billing.api";
import { BackButtonHeading } from "@/components/navigation/back-button-heading";
import type { BackButtonDestination } from "@/components/navigation/back-button";
import type { Invoice } from "@/schema/billing.schema";
import { CUSTOMER_MESSAGES } from "@/text/customer/customer-messages";
import { formatDate, formatMoney, QueryFeedback, statusLabel } from "../shared/customer-screen-common";
import { PaymentProofForm } from "./payment-proof-form";
import styles from "../customer-shell.module.css";

const messages = CUSTOMER_MESSAGES.READ_SCREENS;

function canSubmitProof(invoice: Invoice) {
  return ["PENDING", "UNPAID", "OVERDUE"].includes(invoice.status.toUpperCase());
}

function invoiceOptionLabel(invoice: Invoice) {
  return `${invoice.period} · ${formatMoney(invoice.amount, invoice.currency)} · ${statusLabel(invoice.status)}`;
}

export function PaymentProofSubmissionScreen({
  title,
  description,
  proofTitle,
  back,
}: {
  title: string;
  description: string;
  proofTitle: string;
  back?: BackButtonDestination | null;
}) {
  const invoices = useQuery({
    queryKey: ["owner-invoices"],
    queryFn: ({ signal }) => billingApi.listInvoices(signal),
  });
  const [selectedInvoiceId, setSelectedInvoiceId] = useState("");
  const eligibleInvoices = invoices.data?.filter(canSubmitProof) ?? [];
  const selectedInvoice = eligibleInvoices.find((invoice) => invoice.id === selectedInvoiceId);

  return (
    <section className={styles.pageContent} aria-labelledby="customer-screen-title">
      <BackButtonHeading
        back={back ?? null}
        title={title}
        titleId="customer-screen-title"
        description={description}
        className={styles.pageHeading}
      />
      <QueryFeedback
        loading={invoices.isPending}
        failed={invoices.isError}
        empty={!eligibleInvoices.length}
        emptyText="Hiện không có hóa đơn cần gửi chứng từ thanh toán."
      />
      {eligibleInvoices.length > 0 && (
        <section className={styles.dataPanel}>
          <label className={styles.formField} htmlFor="payment-proof-invoice">
            <span>{messages.FIELD_INVOICE_ID}</span>
            <select
              id="payment-proof-invoice"
              onChange={(event) => setSelectedInvoiceId(event.target.value)}
              value={selectedInvoiceId}
            >
              <option value="">Chọn hóa đơn cần gửi chứng từ</option>
              {eligibleInvoices.map((invoice) => (
                <option key={invoice.id} value={invoice.id}>{invoiceOptionLabel(invoice)}</option>
              ))}
            </select>
          </label>
          {selectedInvoice && (
            <>
              <article className={styles.recordCard}>
                <div>
                  <h2>{selectedInvoice.period}</h2>
                  <p>{messages.FIELD_DUE_DATE}: {formatDate(selectedInvoice.dueDate)}</p>
                  <p>{messages.FIELD_STATUS}: {statusLabel(selectedInvoice.status)}</p>
                </div>
                <strong>{formatMoney(selectedInvoice.amount, selectedInvoice.currency)}</strong>
              </article>
              <PaymentProofForm
                invoiceId={selectedInvoice.id}
                title={proofTitle}
                description={CUSTOMER_MESSAGES.WORKFLOWS.INVOICE_PAYMENT_DESCRIPTION}
              />
            </>
          )}
        </section>
      )}
    </section>
  );
}
