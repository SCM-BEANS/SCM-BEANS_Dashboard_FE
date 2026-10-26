import { useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { billingApi } from "@/apis/billing.api";
import { InvoiceIdSchema } from "@/schema/billing.schema";
import { PATH_CUSTOMER } from "@/routes/path";
import { CUSTOMER_MESSAGES } from "@/text/customer/customer-messages";
import { createIdempotencyKey } from "../shared/idempotency-key";
import { DetailItem, formatDate, formatMoney, QueryFeedback, statusLabel } from "../shared/customer-screen-common";
import styles from "../customer-shell.module.css";

const messages = CUSTOMER_MESSAGES.READ_SCREENS;

function PaymentProofForm({ invoiceId }: { invoiceId: string }) {
  const queryClient = useQueryClient();
  const [amount, setAmount] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [validationError, setValidationError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const idempotencyKeyRef = useRef<string | null>(null);
  const mutation = useMutation({
    mutationFn: (input: { amount: number; file: File; idempotencyKey: string }) =>
      billingApi.submitPaymentProof({ invoiceId, ...input }),
    onSuccess: async () => {
      setAmount("");
      setFile(null);
      setValidationError("");
      idempotencyKeyRef.current = null;
      if (inputRef.current) inputRef.current.value = "";
      await queryClient.invalidateQueries({ queryKey: ["owner-invoice-proofs", invoiceId] });
    },
  });

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const parsedAmount = Number(amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setValidationError(CUSTOMER_MESSAGES.WORKFLOWS.PAYMENT_AMOUNT_REQUIRED);
      return;
    }
    if (!file) {
      setValidationError(CUSTOMER_MESSAGES.WORKFLOWS.PAYMENT_FILE_REQUIRED);
      return;
    }
    setValidationError("");
    const idempotencyKey = idempotencyKeyRef.current ?? createIdempotencyKey();
    idempotencyKeyRef.current = idempotencyKey;
    mutation.mutate({ amount: parsedAmount, file, idempotencyKey });
  };

  return (
    <form className={styles.dataPanel} onSubmit={submit}>
      <h2>{CUSTOMER_MESSAGES.WORKFLOWS.INVOICE_PAYMENT_TITLE}</h2>
      <p>{CUSTOMER_MESSAGES.WORKFLOWS.INVOICE_PAYMENT_DESCRIPTION}</p>
      <label className={styles.formField}>
        <span>{CUSTOMER_MESSAGES.WORKFLOWS.FIELD_PAYMENT_AMOUNT}</span>
        <input
          min="0.01"
          onChange={(event) => {
            idempotencyKeyRef.current = null;
            setAmount(event.target.value);
          }}
          required
          step="0.01"
          type="number"
          value={amount}
        />
      </label>
      <label className={styles.formField}>
        <span>{CUSTOMER_MESSAGES.WORKFLOWS.FIELD_PAYMENT_PROOF}</span>
        <input
          accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
          onChange={(event) => {
            idempotencyKeyRef.current = null;
            setFile(event.target.files?.[0] ?? null);
          }}
          ref={inputRef}
          required
          type="file"
        />
      </label>
      {validationError ? <p className={styles.errorNotice} role="alert">{validationError}</p> : null}
      {mutation.isError ? <p className={styles.errorNotice} role="alert">{CUSTOMER_MESSAGES.WORKFLOWS.PAYMENT_SUBMIT_ERROR}</p> : null}
      {mutation.isSuccess ? <p className={styles.successNotice} role="status">{CUSTOMER_MESSAGES.WORKFLOWS.PAYMENT_SUBMIT_SUCCESS}</p> : null}
      <button className={styles.primaryButton} disabled={mutation.isPending} type="submit">
        {mutation.isPending ? CUSTOMER_MESSAGES.WORKFLOWS.ACTION_SENDING : CUSTOMER_MESSAGES.WORKFLOWS.ACTION_SEND_PROOF}
      </button>
    </form>
  );
}

export function InvoicesScreen({ sectionPath }: { sectionPath: string }) {
  const parts = sectionPath.split("/");
  const invoiceCandidate = parts.length === 2 ? parts[1] : "";
  const invoiceId = InvoiceIdSchema.safeParse(invoiceCandidate).success ? invoiceCandidate : null;
  const period = /^invoices\/\d{4}-\d{2}$/.test(sectionPath) ? parts[1] : null;
  const isList = sectionPath === "invoices" || sectionPath === "invoices/standard" || Boolean(period);
  const list = useQuery({
    queryKey: ["owner-invoices"],
    queryFn: ({ signal }) => billingApi.listInvoices(signal),
    enabled: isList,
  });
  const detail = useQuery({
    queryKey: ["owner-invoice", invoiceId],
    queryFn: ({ signal }) => billingApi.getInvoice(invoiceId!, signal),
    enabled: Boolean(invoiceId),
  });
  const lineItems = useQuery({
    queryKey: ["owner-invoice-lines", invoiceId],
    queryFn: ({ signal }) => billingApi.listInvoiceLineItems(invoiceId!, signal),
    enabled: Boolean(invoiceId),
  });
  const proofs = useQuery({
    queryKey: ["owner-invoice-proofs", invoiceId],
    queryFn: ({ signal }) => billingApi.listPaymentProofs(invoiceId!, signal),
    enabled: Boolean(invoiceId),
  });
  const visibleInvoices = list.data?.filter((invoice) => !period || invoice.period.startsWith(period)) ?? [];

  return (
    <section className={styles.pageContent} aria-labelledby="customer-screen-title">
      <header className={styles.pageHeading}>
        <h1 id="customer-screen-title">{invoiceId ? messages.INVOICE_DETAIL_TITLE : messages.INVOICES_TITLE}</h1>
        <p>{messages.INVOICES_DESCRIPTION}</p>
      </header>
      {invoiceId ? (
        <>
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
              <section className={styles.dataPanel} aria-labelledby="owner-invoice-lines">
                <h2 id="owner-invoice-lines">{messages.INVOICE_LINE_ITEMS}</h2>
                <QueryFeedback loading={lineItems.isPending} failed={lineItems.isError} empty={!lineItems.data?.length} emptyText={messages.NO_INVOICE_LINES} />
                {lineItems.data?.length ? (
                  <div className={styles.recordList}>
                    {lineItems.data.map((item, index) => (
                      <article className={styles.recordCard} key={item.id ?? "line-" + index}>
                        <div>
                          <h3>{item.description ?? item.serviceCode ?? messages.INVOICE_LINE}</h3>
                          <p>{messages.FIELD_QUANTITY}: {item.quantity ?? "—"} · {messages.FIELD_UNIT_PRICE}: {formatMoney(item.unitPrice, detail.data?.currency)}</p>
                        </div>
                        <strong>{formatMoney(item.amount, detail.data?.currency)}</strong>
                      </article>
                    ))}
                  </div>
                ) : null}
              </section>
              <section className={styles.dataPanel} aria-labelledby="owner-invoice-proofs">
                <h2 id="owner-invoice-proofs">{messages.PAYMENT_PROOFS}</h2>
                <QueryFeedback loading={proofs.isPending} failed={proofs.isError} empty={!proofs.data?.length} emptyText={messages.NO_PAYMENT_PROOFS} />
                {proofs.data?.length ? (
                  <ul className={styles.simpleList}>
                    {proofs.data.map((proof) => (
                      <li key={proof.id}>
                        {proof.originalFilename} · {statusLabel(proof.status)} · {formatDate(proof.submittedAt)}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </section>
              <PaymentProofForm invoiceId={invoiceId} />
            </>
          ) : null}
          <Link className={styles.secondaryLink} href={PATH_CUSTOMER.INVOICES}>{messages.BACK_TO_LIST}</Link>
        </>
      ) : (
        <>
          <QueryFeedback loading={list.isPending} failed={list.isError} empty={!visibleInvoices.length} emptyText={messages.NO_INVOICES} />
          {visibleInvoices.length ? (
            <div className={styles.recordList}>
              {visibleInvoices.map((invoice) => (
                <article className={styles.recordCard} key={invoice.id}>
                  <div>
                    <h2>{invoice.period}</h2>
                    <p>{messages.FIELD_STATUS}: {statusLabel(invoice.status)}</p>
                    <p>{messages.FIELD_DUE_DATE}: {formatDate(invoice.dueDate)}</p>
                  </div>
                  <strong>{formatMoney(invoice.amount, invoice.currency)}</strong>
                  <Link className={styles.secondaryLink} href={PATH_CUSTOMER.INVOICE_DETAIL(invoice.id)}>{messages.VIEW_DETAILS}</Link>
                </article>
              ))}
            </div>
          ) : null}
        </>
      )}
    </section>
  );
}
