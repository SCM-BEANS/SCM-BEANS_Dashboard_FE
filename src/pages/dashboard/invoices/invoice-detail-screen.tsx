import { useQuery } from "@tanstack/react-query";
import { billingApi } from "@/apis/billing.api";
import { BackButtonHeading } from "@/components/navigation/back-button-heading";
import type { BackButtonDestination } from "@/components/navigation/back-button";
import { CUSTOMER_MESSAGES } from "@/text/customer/customer-messages";
import { DetailItem, formatDate, formatMoney, QueryFeedback, statusLabel } from "../shared/customer-screen-common";
import { InvoiceLineItems, InvoicePaymentProofs } from "./invoice-detail-sections";
import { PaymentProofForm } from "./payment-proof-form";
import styles from "../customer-shell.module.css";

const messages = CUSTOMER_MESSAGES.READ_SCREENS;
const workflowMessages = CUSTOMER_MESSAGES.WORKFLOWS;

export function InvoiceDetailScreen({ invoiceId, back }: { invoiceId: string; back?: BackButtonDestination | null }) {
  const detail = useQuery({
    queryKey: ["owner-invoice", invoiceId],
    queryFn: ({ signal }) => billingApi.getInvoice(invoiceId, signal),
  });
  const lineItems = useQuery({
    queryKey: ["owner-invoice-lines", invoiceId],
    queryFn: ({ signal }) => billingApi.listInvoiceLineItems(invoiceId, signal),
    enabled: Boolean(detail.data),
  });
  const proofs = useQuery({
    queryKey: ["owner-invoice-proofs", invoiceId],
    queryFn: ({ signal }) => billingApi.listPaymentProofs(invoiceId, signal),
    enabled: Boolean(detail.data),
  });

  return (
    <section className={styles.pageContent} aria-labelledby="customer-screen-title">
      <BackButtonHeading
        back={back ?? null}
        title={messages.INVOICE_DETAIL_TITLE}
        titleId="customer-screen-title"
        description={messages.INVOICES_DESCRIPTION}
        className={styles.pageHeading}
      />
      <QueryFeedback loading={detail.isPending} failed={detail.isError} empty={!detail.data} emptyText={messages.NO_INVOICES} />
      {detail.data ? (
        <>
          <dl className={styles.detailGrid}>
            <DetailItem label={messages.FIELD_INVOICE_ID} value={detail.data.id} />
            <DetailItem label={messages.FIELD_STATUS} value={statusLabel(detail.data.status)} />
            <DetailItem label={messages.FIELD_PERIOD} value={detail.data.period} />
            <DetailItem label={messages.FIELD_AMOUNT} value={formatMoney(detail.data.amount, detail.data.currency)} />
            <DetailItem label={messages.FIELD_DUE_DATE} value={formatDate(detail.data.dueDate)} />
            <DetailItem label={messages.FIELD_PAID_AT} value={formatDate(detail.data.paidAt)} />
          </dl>
          <InvoiceLineItems
            items={lineItems.data}
            currency={detail.data.currency}
            loading={lineItems.isPending}
            failed={lineItems.isError}
          />
          <InvoicePaymentProofs
            proofs={proofs.data}
            currency={detail.data.currency}
            loading={proofs.isPending}
            failed={proofs.isError}
          />
          {["PENDING", "UNPAID", "OVERDUE"].includes(detail.data.status.toUpperCase()) && (
            <PaymentProofForm
              invoiceId={invoiceId}
              title={proofs.data?.length ? workflowMessages.ACTION_SEND_ADDITIONAL_PROOF : workflowMessages.INVOICE_PAYMENT_TITLE}
              description={workflowMessages.INVOICE_PAYMENT_DESCRIPTION}
            />
          )}
        </>
      ) : null}
    </section>
  );
}
