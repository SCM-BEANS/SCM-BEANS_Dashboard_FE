import { useQuery } from "@tanstack/react-query";

import Link from "next/link";

import { useState } from "react";

import { billingApi } from "@/apis/billing.api";

import { PATH_MODERATOR } from "@/routes/path";

import { InvoiceIdSchema, type ModeratorInvoice, type PaymentProof } from "@/schema/billing.schema";

import { getApiErrorMessage } from "@/lib/api-errors";

import { DataTable } from "@/components/table/data-table";

import { MODERATOR_MESSAGES } from "@/text/moderator/moderator-messages";

import { moderatorStyles as styles } from "../moderator-shell";

const messages = MODERATOR_MESSAGES.READ_SCREENS;

const numberFormat = new Intl.NumberFormat("vi-VN");

function amountText(value: number | null | undefined, currency: string): string {
  return value == null
    ? "—"
    : new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 20 }).format(value) + " " + currency;
}

function QueryFeedback({
  query,
  loadingMessage,
}: {
  query: {
    isPending: boolean;
    isError: boolean;
    error: unknown;
    refetch: () => unknown;
  };
  loadingMessage: string;
}) {
  if (query.isPending) {
    return <p className={styles.pendingNotice} role="status">{loadingMessage}</p>;
  }
  if (query.isError) {
    return (
      <div className={styles.pendingNotice} role="alert">
        <p>{getApiErrorMessage(query.error)}</p>
        <button className={styles.retryButton} type="button" onClick={() => void query.refetch()}>
          {messages.RETRY}
        </button>
      </div>
    );
  }
  return null;
}

function DetailField({ label, value }: { label: string; value: string | number | null | undefined }) {
  return (
    <div className={styles.detailItem}>
      <dt>{label}</dt>
      <dd>{value == null || value === "" ? "—" : value}</dd>
    </div>
  );
}

function InvoiceList({ invoices }: { invoices: ModeratorInvoice[] }) {
  if (invoices.length === 0) {
    return <p className={styles.pendingNotice} role="status">{messages.EMPTY_INVOICES}</p>;
  }
  return (
    <DataTable variant="moderator" headers={[messages.INVOICE_ID, messages.INVOICE_OWNER, messages.INVOICE_PERIOD, messages.INVOICE_AMOUNT, messages.INVOICE_STATUS]}>
      {invoices.map((invoice) => (
        <tr key={invoice.id}>
          <td><Link className={styles.tableLink} href={PATH_MODERATOR.INVOICE_DETAIL(invoice.id)}>{invoice.id}</Link></td>
          <td>{invoice.ownerId ?? invoice.tenantId ?? "—"}</td>
          <td>{invoice.period}</td>
          <td>{amountText(invoice.amount, invoice.currency)}</td>
          <td>{invoice.status}</td>
        </tr>
      ))}
    </DataTable>
  );
}

function InvoiceDetails({ invoice }: { invoice: ModeratorInvoice }) {
  return (
    <>
      <dl className={styles.detailGrid}>
        <DetailField label={messages.INVOICE_ID} value={invoice.id} />
        <DetailField label={messages.INVOICE_OWNER} value={invoice.ownerId ?? invoice.tenantId} />
        <DetailField label={messages.INVOICE_CONTRACT} value={invoice.contractId} />
        <DetailField label={messages.INVOICE_TYPE} value={invoice.type} />
        <DetailField label={messages.INVOICE_PERIOD} value={invoice.period} />
        <DetailField label={messages.INVOICE_AMOUNT} value={amountText(invoice.amount, invoice.currency)} />
        <DetailField label={messages.INVOICE_STATUS} value={invoice.status} />
        <DetailField label={messages.INVOICE_DUE_DATE} value={invoice.dueDate} />
        <DetailField label={messages.INVOICE_PAID_AT} value={invoice.paidAt} />
      </dl>
      {invoice.lineItems != null && (
        <section className={styles.pendingNotice} aria-label={messages.INVOICE_LINE_ITEMS}>
          <h2 className={styles.sectionTitle}>{messages.INVOICE_LINE_ITEMS}</h2>
          <pre style={{ overflowX: "auto", whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>
            {typeof invoice.lineItems === "string"
              ? invoice.lineItems
              : JSON.stringify(invoice.lineItems, null, 2)}
          </pre>
        </section>
      )}
    </>
  );
}

function PaymentProofList({
  proofs,
  invoiceId,
}: {
  proofs: PaymentProof[];
  invoiceId: string;
}) {
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  async function download(proof: PaymentProof) {
    setDownloadingId(proof.id);
    setDownloadError(null);
    try {
      const blob = await billingApi.downloadPaymentProofContent(proof.id);
      const objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = objectUrl;
      anchor.download = proof.originalFilename || proof.id;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 0);
    } catch (error) {
      setDownloadError(getApiErrorMessage(error));
    } finally {
      setDownloadingId(null);
    }
  }

  return (
    <section className={styles.pendingNotice} aria-labelledby="moderator-payment-proofs">
      <h2 id="moderator-payment-proofs" className={styles.sectionTitle}>{messages.PAYMENT_PROOFS}</h2>
      {proofs.length === 0 ? (
        <p role="status">{messages.EMPTY_PAYMENT_PROOFS}</p>
      ) : (
        <DataTable variant="moderator" headers={[messages.PROOF_FILENAME, messages.PROOF_STATUS, messages.PROOF_SUBMITTED_AT, messages.PROOF_SIZE, messages.PROOF_ACTION]}>
          {proofs.map((proof) => (
            <tr key={proof.id}>
              <td>{proof.originalFilename}</td>
              <td>{proof.status}</td>
              <td>{proof.submittedAt ?? "—"}</td>
              <td>{proof.sizeBytes == null ? "—" : numberFormat.format(proof.sizeBytes) + " bytes"}</td>
              <td>
                <button
                  className={styles.retryButton}
                  type="button"
                  disabled={downloadingId === proof.id}
                  onClick={() => void download(proof)}
                >
                  {downloadingId === proof.id ? messages.DOWNLOADING_PROOF : messages.DOWNLOAD_PROOF}
                </button>
              </td>
            </tr>
          ))}
        </DataTable>
      )}
      {downloadError && <p role="alert">{downloadError}</p>}
      <p className={styles.formHint}>{messages.INVOICE_PROOF_SCOPE} {invoiceId}</p>
    </section>
  );
}

export function ModeratorInvoicesScreen({ sectionPath }: { sectionPath: string }) {
  const isList = sectionPath === "invoices" || sectionPath === "invoices/list";
  const requestedId = isList ? "" : sectionPath.slice("invoices/".length);
  const validId = InvoiceIdSchema.safeParse(requestedId).success ? requestedId : "";
  const invoices = useQuery({
    queryKey: ["dolores", "moderator", "billing", "invoices"],
    queryFn: ({ signal }) => billingApi.listModeratorInvoices(signal),
    enabled: isList,
  });
  const invoice = useQuery({
    queryKey: ["dolores", "moderator", "billing", "invoice", validId],
    queryFn: ({ signal }) => billingApi.getModeratorInvoice(validId, signal),
    enabled: Boolean(validId),
  });
  const proofs = useQuery({
    queryKey: ["dolores", "moderator", "billing", "invoice", validId, "proofs"],
    queryFn: ({ signal }) => billingApi.listPaymentProofs(validId, signal),
    enabled: Boolean(validId && invoice.data),
  });

  return (
    <div className={styles.pageContent}>
      <header className={styles.pageHeading}>
        <h1>{messages.INVOICES_TITLE}</h1>
        <p>{messages.INVOICES_DESCRIPTION}</p>
      </header>
      <p className={styles.partialNotice} role="note">{messages.INVOICE_ACCESS_NOTE}</p>
      {isList ? (
        <>
          <QueryFeedback query={invoices} loadingMessage={messages.LOADING_INVOICES} />
          {invoices.data && !invoices.isError && <InvoiceList invoices={invoices.data} />}
        </>
      ) : validId ? (
        <>
          <QueryFeedback query={invoice} loadingMessage={messages.LOADING_INVOICE} />
          {invoice.data && !invoice.isError && <InvoiceDetails invoice={invoice.data} />}
          {invoice.data && (
            <>
              <QueryFeedback query={proofs} loadingMessage={messages.LOADING_PAYMENT_PROOFS} />
              {proofs.data && !proofs.isError && (
                <PaymentProofList proofs={proofs.data} invoiceId={invoice.data.id} />
              )}
            </>
          )}
          <Link className={styles.tableLink} href={PATH_MODERATOR.INVOICES}>{messages.BACK_TO_INVOICES}</Link>
        </>
      ) : (
        <p className={styles.pendingNotice} role="status">{messages.INVALID_INVOICE_ID}</p>
      )}
    </div>
  );
}
