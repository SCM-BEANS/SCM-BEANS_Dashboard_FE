import { useEffect, useRef, useState, type FormEvent } from "react";
import axios from "axios";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BackButtonHeading } from "@/components/navigation/back-button-heading";
import type { BackButtonDestination } from "@/components/navigation/back-button";
import { billingApi } from "@/apis/billing.api";
import { InvoiceIdSchema } from "@/schema/billing.schema";
import { PATH_CUSTOMER } from "@/routes/path";
import { CUSTOMER_MESSAGES } from "@/text/customer/customer-messages";
import { createIdempotencyKey } from "@/lib/idempotency-key";
import { getApiErrorMessage, isUncertainApiMutation } from "@/lib/api-errors";
import { BILLING_MESSAGES } from "@/text/billing/billing-messages";
import { querySubject } from "@/components/features/repair-workflow/repair-workflow-query-identity";
import { DetailItem, formatDate, formatMoney, QueryFeedback, statusLabel } from "../shared/customer-screen-common";
import styles from "../customer-shell.module.css";

const messages = CUSTOMER_MESSAGES.READ_SCREENS;
const pageSize = 50;

function PageNavigation({
  page,
  hasNext,
  disabled,
  label,
  onChange,
}: {
  page: number;
  hasNext: boolean;
  disabled: boolean;
  label: string;
  onChange: (nextPage: number) => void;
}) {
  return (
    <nav className={styles.pagination} aria-label={label}>
      <button className={styles.secondaryButton} type="button" disabled={page === 0 || disabled} onClick={() => onChange(page - 1)}>
        Trước
      </button>
      <span>Trang {page + 1}</span>
      <button className={styles.secondaryButton} type="button" disabled={!hasNext || disabled} onClick={() => onChange(page + 1)}>
        Tiếp
      </button>
    </nav>
  );
}

function InvoiceQueryFeedback({
  loading,
  failed,
  empty,
  emptyText,
  onRetry,
}: {
  loading: boolean;
  failed: boolean;
  empty: boolean;
  emptyText: string;
  onRetry: () => unknown;
}) {
  return (
    <>
      <QueryFeedback loading={loading} failed={failed} empty={empty} emptyText={emptyText} />
      {failed ? (
        <button className={styles.secondaryButton} type="button" onClick={() => void onRetry()}>
          Thử lại
        </button>
      ) : null}
    </>
  );
}

function PaymentProofForm({ invoiceId }: { invoiceId: string }) {
  const queryClient = useQueryClient();
  const subject = querySubject("owner");
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
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["owner-invoice-proofs", subject, invoiceId] }),
        queryClient.invalidateQueries({ queryKey: ["owner-invoice", subject, invoiceId] }),
        queryClient.invalidateQueries({ queryKey: ["owner-invoices", subject] }),
      ]);
    },
    onError: async (error: unknown) => {
      const conflict = axios.isAxiosError(error) && error.response?.status === 409;
      if (conflict || isUncertainApiMutation(error)) {
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ["owner-invoice-proofs", subject, invoiceId] }),
          queryClient.invalidateQueries({ queryKey: ["owner-invoice", subject, invoiceId] }),
          queryClient.invalidateQueries({ queryKey: ["owner-invoices", subject] }),
        ]);
      }
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

  const prepareEdit = () => {
    idempotencyKeyRef.current = null;
    mutation.reset();
    setValidationError("");
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
            prepareEdit();
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
            prepareEdit();
            setFile(event.target.files?.[0] ?? null);
          }}
          ref={inputRef}
          required
          type="file"
        />
      </label>
      {validationError ? <p className={styles.errorNotice} role="alert">{validationError}</p> : null}
      {mutation.isError ? (
        <>
          <p className={styles.errorNotice} role="alert">
            {axios.isAxiosError(mutation.error)
              ? getApiErrorMessage(mutation.error, "mutation")
              : mutation.error instanceof Error ? mutation.error.message : CUSTOMER_MESSAGES.WORKFLOWS.PAYMENT_SUBMIT_ERROR}
          </p>
          {isUncertainApiMutation(mutation.error) || (axios.isAxiosError(mutation.error) && mutation.error.response?.status === 409)
            ? <p className={styles.dataFootnote} role="status">{BILLING_MESSAGES.PAYMENT_SUBMIT_RETRY_NOTE}</p>
            : null}
        </>
      ) : null}
      {mutation.isSuccess ? (
        <p className={styles.successNotice} role="status">
          {CUSTOMER_MESSAGES.WORKFLOWS.PAYMENT_SUBMIT_SUCCESS} — {BILLING_MESSAGES.PROOF_STATUSES[mutation.data.status]} ({mutation.data.id})
        </p>
      ) : null}
      <button className={styles.primaryButton} disabled={mutation.isPending} type="submit">
        {mutation.isPending ? CUSTOMER_MESSAGES.WORKFLOWS.ACTION_SENDING : CUSTOMER_MESSAGES.WORKFLOWS.ACTION_SEND_PROOF}
      </button>
    </form>
  );
}

export function InvoicesScreen({ sectionPath, back }: { sectionPath: string; back?: BackButtonDestination | null }) {
  const parts = sectionPath.split("/");
  const invoiceCandidate = parts.length === 2 ? parts[1] : "";
  const invoiceId = InvoiceIdSchema.safeParse(invoiceCandidate).success ? invoiceCandidate : null;
  const period = /^invoices\/\d{4}-\d{2}$/.test(sectionPath) ? parts[1] : null;
  const isList = sectionPath === "invoices" || sectionPath === "invoices/standard" || Boolean(period);
  const [invoicePage, setInvoicePage] = useState(0);
  const [linePage, setLinePage] = useState(0);
  const [proofPage, setProofPage] = useState(0);
  const subject = querySubject("owner");
  useEffect(() => setInvoicePage(0), [period]);
  useEffect(() => {
    setLinePage(0);
    setProofPage(0);
  }, [invoiceId]);
  const list = useQuery({
    queryKey: ["owner-invoices", subject, period, invoicePage],
    queryFn: ({ signal }) => billingApi.listInvoicesPage({ period: period ?? undefined, page: invoicePage, size: pageSize }, signal),
    enabled: isList,
  });
  const detail = useQuery({
    queryKey: ["owner-invoice", subject, invoiceId],
    queryFn: ({ signal }) => billingApi.getInvoice(invoiceId!, signal),
    enabled: Boolean(invoiceId),
  });
  const lineItems = useQuery({
    queryKey: ["owner-invoice-lines", subject, invoiceId, linePage],
    queryFn: ({ signal }) => billingApi.listInvoiceLineItemsPage(invoiceId!, { page: linePage, size: pageSize }, signal),
    enabled: Boolean(invoiceId),
  });
  const proofs = useQuery({
    queryKey: ["owner-invoice-proofs", subject, invoiceId, proofPage],
    queryFn: ({ signal }) => billingApi.listPaymentProofsPage(invoiceId!, { page: proofPage, size: pageSize }, signal),
    enabled: Boolean(invoiceId),
  });
  const visibleInvoices = list.data?.items ?? [];

  return (
    <section className={styles.pageContent} aria-labelledby="customer-screen-title">
      <BackButtonHeading
        back={back ?? null}
        title={invoiceId ? messages.INVOICE_DETAIL_TITLE : messages.INVOICES_TITLE}
        titleId="customer-screen-title"
        description={messages.INVOICES_DESCRIPTION}
        className={styles.pageHeading}
      />
      {invoiceId ? (
        <>
          <InvoiceQueryFeedback loading={detail.isPending} failed={detail.isError} empty={!detail.data} emptyText={messages.NO_INVOICES} onRetry={() => detail.refetch()} />
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
                <InvoiceQueryFeedback loading={lineItems.isPending} failed={lineItems.isError} empty={!lineItems.data?.items.length} emptyText={messages.NO_INVOICE_LINES} onRetry={() => lineItems.refetch()} />
                {lineItems.data?.items.length ? (
                  <div className={styles.recordList}>
                    {lineItems.data.items.map((item, index) => (
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
                {lineItems.data ? <PageNavigation page={lineItems.data.page} hasNext={lineItems.data.hasNext} disabled={lineItems.isFetching} label={BILLING_MESSAGES.PAGINATE_LINE_ITEMS} onChange={setLinePage} /> : null}
              </section>
              <section className={styles.dataPanel} aria-labelledby="owner-invoice-proofs">
                <h2 id="owner-invoice-proofs">{messages.PAYMENT_PROOFS}</h2>
                <InvoiceQueryFeedback loading={proofs.isPending} failed={proofs.isError} empty={!proofs.data?.items.length} emptyText={messages.NO_PAYMENT_PROOFS} onRetry={() => proofs.refetch()} />
                {proofs.data?.items.length ? (
                  <ul className={styles.simpleList}>
                    {proofs.data.items.map((proof) => (
                      <li key={proof.id}>
                        <strong>{proof.originalFilename}</strong> · {BILLING_MESSAGES.PROOF_STATUSES[proof.status]} · {formatDate(proof.submittedAt)}
                        {proof.reviewedAt ? <p>{BILLING_MESSAGES.REVIEWED_AT}: {formatDate(proof.reviewedAt)}</p> : null}
                        {proof.reviewReason ? <p>{BILLING_MESSAGES.REVIEW_REASON}: {proof.reviewReason}</p> : null}
                      </li>
                    ))}
                  </ul>
                ) : null}
                {proofs.data ? <PageNavigation page={proofs.data.page} hasNext={proofs.data.hasNext} disabled={proofs.isFetching} label={BILLING_MESSAGES.PAGINATE_PAYMENT_PROOFS} onChange={setProofPage} /> : null}
              </section>
              {detail.data.type !== "RENTAL" ? (
                <section className={styles.dataPanel} role="note">
                  <h2>{CUSTOMER_MESSAGES.WORKFLOWS.INVOICE_PAYMENT_TITLE}</h2>
                  <p>{BILLING_MESSAGES.PAYMENT_PROOF_RENTAL_ONLY}</p>
                </section>
              ) : detail.data.status === "PAID" || detail.data.status === "CANCELLED" ? (
                <section className={styles.dataPanel} role="note">
                  <h2>{CUSTOMER_MESSAGES.WORKFLOWS.INVOICE_PAYMENT_TITLE}</h2>
                  <p>{BILLING_MESSAGES.PAYMENT_PROOF_INVOICE_CLOSED}</p>
                </section>
              ) : <PaymentProofForm invoiceId={invoiceId} />}
            </>
          ) : null}
        </>
      ) : (
        <>
          <InvoiceQueryFeedback loading={list.isPending} failed={list.isError} empty={!visibleInvoices.length} emptyText={messages.NO_INVOICES} onRetry={() => list.refetch()} />
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
          {list.data ? <PageNavigation page={list.data.page} hasNext={list.data.hasNext} disabled={list.isFetching} label={BILLING_MESSAGES.PAGINATE_INVOICES} onChange={setInvoicePage} /> : null}
        </>
      )}
    </section>
  );
}
