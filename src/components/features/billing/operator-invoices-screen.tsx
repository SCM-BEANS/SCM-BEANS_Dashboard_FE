import { useRouter } from "next/router";
import { PageActions } from "@/components/action-bar/page-actions";
import { buildInvoiceExportActions } from "@/components/action-bar/entity-page-actions";
import Link from "next/link";
import axios from "axios";
import { useEffect, useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { NotificationDialog } from "@/components/notification-dialog/notification-dialog";
import { DataTable } from "@/components/table/data-table";
import { TableFilters } from "@/components/table/table-filters";
import { StatusBadge } from "@/components/status-badge/status-badge";
import { TruncatedId } from "@/components/truncated-id/truncated-id";
import { billingApi } from "@/apis/billing.api";
import { getApiErrorMessage, isUncertainApiMutation } from "@/lib/api-errors";
import { InvoiceIdSchema, type ModeratorInvoice, type PaymentProof } from "@/schema/billing.schema";
import { PATH_ADMIN, PATH_MODERATOR } from "@/routes/path";
import { BILLING_MESSAGES as messages } from "@/text/billing/billing-messages";
import { querySubject } from "@/components/features/repair-workflow/repair-workflow-query-identity";
import styles from "./operator-invoices-screen.module.css";
import { InvoiceRefundPanel } from "./invoice-refund-panel";

type OperatorRole = "admin" | "moderator";
type InvoiceFilters = {
  ownerId: string;
  period: string;
  status: "" | "DRAFT" | "PENDING" | "UNPAID" | "PAID" | "OVERDUE" | "CANCELLED";
  type: "" | "SUPPLY" | "RENTAL" | "REPAIR";
};
type ReviewDraft = { proof: PaymentProof; approve: boolean; reason: string };
const PAGE_SIZE = 50;
const invoiceQueryKey = ["billing", "operator", "invoices"] as const;

function amountText(value: number | null | undefined, currency: string | null | undefined): string {
  if (value == null) return "—";
  const formatted = new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 2 }).format(value);
  return currency?.toUpperCase() === "VND" ? `${formatted} ₫` : `${formatted} ${currency ?? ""}`.trim();
}

function dateText(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toLocaleDateString("vi-VN") : value;
}

function dateTimeText(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toLocaleString("vi-VN") : value;
}

function invoiceStatus(status: string): string {
  return messages.INVOICE_STATUSES[status as keyof typeof messages.INVOICE_STATUSES] ?? status;
}

function Pagination({
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
  onChange: (page: number) => void;
}) {
  return (
    <nav className={styles.pagination} aria-label={label}>
      <button type="button" disabled={page === 0 || disabled} onClick={() => onChange(page - 1)}>
        {messages.PREVIOUS_PAGE}
      </button>
      <span>{messages.PAGE} {page + 1}</span>
      <button type="button" disabled={!hasNext || disabled} onClick={() => onChange(page + 1)}>
        {messages.NEXT_PAGE}
      </button>
    </nav>
  );
}

function InlineQueryState({
  pending,
  error,
  empty,
  loadingText,
  emptyText,
  retry,
}: {
  pending: boolean;
  error: unknown;
  empty?: boolean;
  loadingText: string;
  emptyText?: string;
  retry: () => unknown;
}) {
  if (pending) return <p className={styles.notice} role="status">{loadingText}</p>;
  if (error) {
    return (
      <div className={`${styles.notice} ${styles.error}`} role="alert">
        <p>{getApiErrorMessage(error) || messages.UNKNOWN_ERROR}</p>
        <button type="button" onClick={() => void retry()}>{messages.RETRY}</button>
      </div>
    );
  }
  if (empty) return <p className={styles.notice} role="status">{emptyText}</p>;
  return null;
}

function InvoiceFilters({
  role,
  onApply,
  disabled,
}: {
  role: OperatorRole;
  onApply: (filters: InvoiceFilters) => void;
  disabled: boolean;
}) {
  const [draft, setDraft] = useState<InvoiceFilters>({ ownerId: "", period: "", status: "", type: "" });
  const [searchDraft, setSearchDraft] = useState("");

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onApply(draft);
  }

  function clear() {
    const empty: InvoiceFilters = { ownerId: "", period: "", status: "", type: "" };
    setDraft(empty);
    setSearchDraft("");
    onApply(empty);
  }

  if (role === "admin") {
    return (
      <TableFilters
        search={{
          ariaLabel: "Tìm hóa đơn theo Owner ID hoặc kỳ hóa đơn",
          maxLength: 36,
          placeholder: "Tìm Owner ID hoặc kỳ hóa đơn (yyyy-MM)",
          value: searchDraft,
          onChange: setSearchDraft,
        }}
        selects={[
          {
            id: "operator-invoice-type-filter",
            ariaLabel: messages.TYPE_FILTER,
            value: draft.type,
            options: [
              { value: "", label: messages.ALL_TYPES },
              ...Object.entries(messages.INVOICE_TYPES).map(([value, label]) => ({ value, label })),
            ],
            onChange: (value) => setDraft((current) => ({ ...current, type: value as InvoiceFilters["type"] })),
          },
          {
            id: "operator-invoice-status-filter",
            ariaLabel: messages.STATUS_FILTER,
            value: draft.status,
            options: [
              { value: "", label: messages.ALL_STATUSES },
              ...Object.entries(messages.INVOICE_STATUSES).map(([value, label]) => ({ value, label })),
            ],
            onChange: (value) => setDraft((current) => ({ ...current, status: value as InvoiceFilters["status"] })),
          },
        ]}
        submitLabel="Tìm kiếm"
        onSubmit={(event) => {
          event.preventDefault();
          const value = searchDraft.trim();
          const isPeriod = /^\d{4}-(0[1-9]|1[0-2])$/.test(value);
          onApply({
            ...draft,
            ownerId: value && !isPeriod ? value : "",
            period: isPeriod ? value : "",
          });
        }}
        disabled={disabled}
        reset={{ label: messages.CLEAR_FILTERS, onClick: clear }}
      />
    );
  }

  return (
    <form className={styles.filters} onSubmit={submit}>
      <label>
        <span>{messages.OWNER_FILTER}</span>
        <input
          autoComplete="off"
          value={draft.ownerId}
          onChange={(event) => setDraft((current) => ({ ...current, ownerId: event.target.value }))}
        />
      </label>
      <label>
        <span>{messages.PERIOD_FILTER}</span>
        <input
          type="month"
          value={draft.period}
          onChange={(event) => setDraft((current) => ({ ...current, period: event.target.value }))}
        />
      </label>
      <label>
        <span>{messages.TYPE_FILTER}</span>
        <select value={draft.type} onChange={(event) => setDraft((current) => ({ ...current, type: event.target.value as InvoiceFilters["type"] }))}>
          <option value="">{messages.ALL_TYPES}</option>
          <option value="RENTAL">{messages.INVOICE_TYPES.RENTAL}</option>
          <option value="SUPPLY">{messages.INVOICE_TYPES.SUPPLY}</option>
          <option value="REPAIR">{messages.INVOICE_TYPES.REPAIR}</option>
        </select>
      </label>
      <label>
        <span>{messages.STATUS_FILTER}</span>
        <select value={draft.status} onChange={(event) => setDraft((current) => ({ ...current, status: event.target.value as InvoiceFilters["status"] }))}>
          <option value="">{messages.ALL_STATUSES}</option>
          {Object.entries(messages.INVOICE_STATUSES).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
      </label>
      <div className={styles.filterActions}>
        <button className={styles.primaryButton} type="submit" disabled={disabled}>{messages.APPLY_FILTERS}</button>
        <button className={styles.secondaryButton} type="button" disabled={disabled} onClick={clear}>{messages.CLEAR_FILTERS}</button>
      </div>
    </form>
  );
}

function InvoiceList({
  role,
  filters,
  onApplyFilters,
  invalidFilterMessage,
}: {
  role: OperatorRole;
  filters: InvoiceFilters;
  onApplyFilters: (filters: InvoiceFilters) => void;
  invalidFilterMessage: string;
}) {
  const [page, setPage] = useState(0);
  const subject = querySubject(role);
  const query = useQuery({
    queryKey: [...invoiceQueryKey, subject, filters, page],
    queryFn: ({ signal }) => billingApi.listOperatorInvoicesPage({
      ...(filters.ownerId ? { ownerId: filters.ownerId.trim() } : {}),
      ...(filters.period ? { period: filters.period } : {}),
      ...(filters.status ? { status: filters.status } : {}),
      ...(filters.type ? { type: filters.type } : {}),
      page,
      size: PAGE_SIZE,
    }, signal),
    placeholderData: (previous) => previous,
  });

  const router = useRouter();
  const rows = query.data?.items ?? [];
  const firstOwner = rows[0]?.ownerId ?? rows[0]?.tenantId;
  const ownerId = filters.ownerId || (firstOwner && rows.every((invoice) => (invoice.ownerId ?? invoice.tenantId) === firstOwner) ? firstOwner : undefined);
  const exportJob = useMutation({
    mutationFn: () => billingApi.createExport({ format: "CSV", ownerId: ownerId!, invoiceIds: rows.map((invoice) => invoice.id) }),
    onSuccess: (job) => router.push(role === "admin" ? PATH_ADMIN.BILLING_EXPORT_JOB(job.id) : `/moderator/invoices/exports/${encodeURIComponent(job.id)}`),
  });

  useEffect(() => setPage(0), [filters]);

  return (
    <section className={styles.panel} aria-labelledby="operator-invoice-list-title">
      <PageActions actions={buildInvoiceExportActions({ count: rows.length, ownerRequired: true, ownerId, loading: query.isFetching, pending: exportJob.isPending, onExport: () => exportJob.mutate() })} />
      {exportJob.isError && <p role="alert">{getApiErrorMessage(exportJob.error)}</p>}
      <h2 id="operator-invoice-list-title">Danh sách hóa đơn</h2>
      {role === "admin" ? <InvoiceFilters role={role} onApply={onApplyFilters} disabled={query.isFetching} /> : null}
      {role === "admin" && invalidFilterMessage ? <p className={`${styles.notice} ${styles.error}`} role="alert">{invalidFilterMessage}</p> : null}
      <InlineQueryState
        pending={query.isPending}
        error={query.isError ? query.error : null}
        empty={Boolean(query.data && query.data.items.length === 0)}
        loadingText={messages.LOADING_INVOICES}
        emptyText={messages.EMPTY_INVOICES}
        retry={query.refetch}
      />
      {query.data && query.data.items.length > 0 && (
        <DataTable
          variant={role === "moderator" ? "moderator" : "standard"}
          rows={query.data.items}
          rowKey={(invoice) => invoice.id}
          columns={[
            { key: "owner", header: messages.OWNER, render: (invoice) => (
              <Link
                className={styles.textButton}
                href={role === "admin" ? PATH_ADMIN.INVOICE_DETAIL(invoice.id) : PATH_MODERATOR.INVOICE_DETAIL(invoice.id)}
              >
                <TruncatedId value={invoice.ownerId ?? invoice.tenantId} />
              </Link>
            ) },
            { key: "contract", header: messages.CONTRACT, render: (invoice) => <TruncatedId value={invoice.contractId} /> },
            { key: "period", header: messages.PERIOD, render: (invoice) => invoice.period },
            { key: "type", header: messages.TYPE, render: (invoice) => messages.INVOICE_TYPES[invoice.type as keyof typeof messages.INVOICE_TYPES] ?? invoice.type },
            { key: "amount", header: messages.AMOUNT, render: (invoice) => amountText(invoice.amount, invoice.currency) },
            { key: "status", header: messages.STATUS, render: (invoice) => <StatusBadge status={invoice.status}>{invoiceStatus(invoice.status)}</StatusBadge> },
          ]}
        />
      )}
      {query.data && (
        <Pagination page={query.data.page} hasNext={query.data.hasNext} disabled={query.isFetching} label={messages.PAGINATE_INVOICES} onChange={setPage} />
      )}
    </section>
  );
}

function downloadBlob(blob: Blob, fileName: string) {
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 0);
}

function InvoiceDetail({ invoiceId, role }: { invoiceId: string; role: OperatorRole }) {
  const queryClient = useQueryClient();
  const scopedInvoiceQueryKey = [...invoiceQueryKey, querySubject(role)] as const;
  const [linePage, setLinePage] = useState(0);
  const [proofPage, setProofPage] = useState(0);
  const [reviewDraft, setReviewDraft] = useState<ReviewDraft | null>(null);
  const [downloadError, setDownloadError] = useState("");
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const invoice = useQuery({
    queryKey: [...scopedInvoiceQueryKey, "detail", invoiceId],
    queryFn: ({ signal }) => billingApi.getModeratorInvoice(invoiceId, signal),
  });
  const lineItems = useQuery({
    queryKey: [...scopedInvoiceQueryKey, invoiceId, "lines", linePage],
    queryFn: ({ signal }) => billingApi.listInvoiceLineItemsPage(invoiceId, { page: linePage, size: PAGE_SIZE }, signal),
    enabled: invoice.isSuccess,
    placeholderData: (previous) => previous,
  });
  const proofs = useQuery({
    queryKey: [...scopedInvoiceQueryKey, invoiceId, "proofs", proofPage],
    queryFn: ({ signal }) => billingApi.listPaymentProofsPage(invoiceId, { page: proofPage, size: PAGE_SIZE }, signal),
    enabled: invoice.isSuccess,
    placeholderData: (previous) => previous,
  });
  const review = useMutation({
    mutationFn: (input: { proofId: string; approve: boolean; reason: string }) => billingApi.reviewPaymentProof(input),
    onSuccess: async () => {
      setReviewDraft(null);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: scopedInvoiceQueryKey }),
        queryClient.invalidateQueries({ queryKey: [...scopedInvoiceQueryKey, invoiceId, "proofs"] }),
      ]);
    },
    onError: async (error: unknown) => {
      const needsRefresh = isUncertainApiMutation(error) || (axios.isAxiosError(error) && error.response?.status === 409);
      if (needsRefresh) {
        setReviewDraft(null);
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: scopedInvoiceQueryKey }),
          queryClient.invalidateQueries({ queryKey: [...scopedInvoiceQueryKey, invoiceId, "proofs"] }),
        ]);
      }
    },
  });

  async function download(proof: PaymentProof) {
    setDownloadingId(proof.id);
    setDownloadError("");
    try {
      downloadBlob(await billingApi.downloadPaymentProofContent(proof.id), proof.originalFilename || proof.id);
    } catch (error) {
      setDownloadError(getApiErrorMessage(error));
    } finally {
      setDownloadingId(null);
    }
  }

  if (invoice.isPending) return <p className={styles.notice} role="status">{messages.LOADING_INVOICE}</p>;
  if (invoice.isError) {
    return <InlineQueryState pending={false} error={invoice.error} loadingText={messages.LOADING_INVOICE} retry={invoice.refetch} />;
  }

  const record = invoice.data;
  return (
    <div className={styles.detailStack}>
      <Link className={styles.backLink} href={role === "admin" ? PATH_ADMIN.INVOICES : PATH_MODERATOR.INVOICES}>
        {messages.BACK_TO_LIST}
      </Link>
      <section className={styles.panel}>
        <dl className={styles.detailGrid}>
          <div><dt>{messages.INVOICE_ID}</dt><dd><TruncatedId value={record.id} /></dd></div>
          <div><dt>{messages.OWNER}</dt><dd><TruncatedId value={record.ownerId ?? record.tenantId} /></dd></div>
          <div><dt>{messages.CONTRACT}</dt><dd><TruncatedId value={record.contractId} /></dd></div>
          <div><dt>{messages.PERIOD}</dt><dd>{record.period}</dd></div>
          <div><dt>{messages.TYPE}</dt><dd>{messages.INVOICE_TYPES[record.type as keyof typeof messages.INVOICE_TYPES] ?? record.type}</dd></div>
          <div><dt>{messages.AMOUNT}</dt><dd>{amountText(record.amount, record.currency)}</dd></div>
          <div><dt>{messages.STATUS}</dt><dd><StatusBadge status={record.status}>{invoiceStatus(record.status)}</StatusBadge></dd></div>
          <div><dt>{messages.DUE_DATE}</dt><dd>{dateText(record.dueDate)}</dd></div>
          <div><dt>{messages.PAID_AT}</dt><dd>{dateTimeText(record.paidAt)}</dd></div>
        </dl>
      </section>

      <InvoiceRefundPanel key={`${role}:${record.id}`} invoice={{ ...record, ownerId: record.ownerId ?? record.tenantId }} role={role === "admin" ? "ADMIN" : "MODERATOR"} />
      <section className={styles.panel} aria-labelledby="operator-invoice-lines">
        <h2 id="operator-invoice-lines">{messages.LINE_ITEMS}</h2>
        <InlineQueryState
          pending={lineItems.isPending}
          error={lineItems.isError ? lineItems.error : null}
          empty={Boolean(lineItems.data && lineItems.data.items.length === 0)}
          loadingText={messages.LOADING_LINES}
          emptyText={messages.EMPTY_LINE_ITEMS}
          retry={lineItems.refetch}
        />
        {lineItems.data?.items.length ? (
          <DataTable
            variant={role === "moderator" ? "moderator" : "standard"}
            rows={lineItems.data.items}
            rowKey={(item, index) => item.id ?? `${item.invoiceId}-${index}`}
            columns={[
              { key: "description", header: messages.SERVICE, render: (item) => item.description ?? item.serviceCode ?? "—" },
              { key: "quantity", header: messages.QUANTITY, render: (item) => item.quantity ?? "—" },
              { key: "unit", header: messages.UNIT_PRICE, render: (item) => amountText(item.unitPrice, record.currency) },
              { key: "amount", header: messages.LINE_AMOUNT, render: (item) => amountText(item.amount, record.currency) },
            ]}
          />
        ) : null}
        {lineItems.data && <Pagination page={lineItems.data.page} hasNext={lineItems.data.hasNext} disabled={lineItems.isFetching} label={messages.PAGINATE_LINE_ITEMS} onChange={setLinePage} />}
      </section>

      <section className={styles.panel} aria-labelledby="operator-payment-proofs">
        <h2 id="operator-payment-proofs">{messages.PAYMENT_PROOFS}</h2>
        <p className={styles.hint}>{messages.REVIEW_HELP}</p>
        <InlineQueryState
          pending={proofs.isPending}
          error={proofs.isError ? proofs.error : null}
          empty={Boolean(proofs.data && proofs.data.items.length === 0)}
          loadingText={messages.LOADING_PROOFS}
          emptyText={messages.EMPTY_PAYMENT_PROOFS}
          retry={proofs.refetch}
        />
        {proofs.data?.items.length ? (
          <DataTable
            variant={role === "moderator" ? "moderator" : "standard"}
            rows={proofs.data.items}
            rowKey={(proof) => proof.id}
            columns={[
              { key: "file", header: messages.PROOF_FILENAME, render: (proof) => <span className={styles.breakText}>{proof.originalFilename}</span> },
              { key: "status", header: messages.STATUS, render: (proof) => <StatusBadge status={proof.status}>{messages.PROOF_STATUSES[proof.status]}</StatusBadge> },
              { key: "submitted", header: messages.SUBMITTED_AT, render: (proof) => dateTimeText(proof.submittedAt) },
              { key: "payment", header: messages.PAYMENT_ID, render: (proof) => <span className={styles.breakText}>{proof.paymentId}</span> },
              { key: "size", header: messages.PROOF_SIZE, render: (proof) => `${new Intl.NumberFormat("vi-VN").format(proof.sizeBytes)} bytes` },
              { key: "reason", header: messages.REVIEW_REASON, render: (proof) => proof.reviewReason || "—" },
              {
                key: "actions",
                header: messages.PROOF_ACTIONS,
                render: (proof) => (
                  <div className={styles.rowActions}>
                    <button className={styles.secondaryButton} type="button" disabled={downloadingId === proof.id} onClick={() => void download(proof)}>
                      {downloadingId === proof.id ? messages.DOWNLOADING_PROOF : messages.DOWNLOAD_PROOF}
                    </button>
                    {proof.status === "SUBMITTED" ? (
                      <>
                        <button className={styles.approveButton} type="button" disabled={review.isPending} onClick={() => setReviewDraft({ proof, approve: true, reason: "" })}>{messages.APPROVE_PROOF}</button>
                        <button className={styles.rejectButton} type="button" disabled={review.isPending} onClick={() => setReviewDraft({ proof, approve: false, reason: "" })}>{messages.REJECT_PROOF}</button>
                      </>
                    ) : null}
                  </div>
                ),
              },
            ]}
          />
        ) : null}
        {proofs.data && <Pagination page={proofs.data.page} hasNext={proofs.data.hasNext} disabled={proofs.isFetching} label={messages.PAGINATE_PAYMENT_PROOFS} onChange={setProofPage} />}
        {downloadError ? <p className={styles.errorText} role="alert">{downloadError}</p> : null}
        {review.isError ? (
          <>
            <p className={styles.errorText} role="alert">{getApiErrorMessage(review.error, "mutation") || messages.REVIEW_ERROR}</p>
            {isUncertainApiMutation(review.error) || (axios.isAxiosError(review.error) && review.error.response?.status === 409)
              ? <p className={styles.hint} role="status">{messages.REVIEW_RETRY_NOTE}</p>
              : null}
          </>
        ) : null}
        {review.isSuccess ? <p className={styles.successText} role="status">{messages.REVIEW_SUCCESS} · {messages.PROOF_STATUSES[review.data.status]}</p> : null}
      </section>

      {reviewDraft ? (
        <NotificationDialog
          variant="confirm"
          title={messages.REVIEW_TITLE}
          description={reviewDraft.approve ? messages.APPROVE_CONFIRMATION : messages.REJECT_CONFIRMATION}
          onClose={() => { if (!review.isPending) setReviewDraft(null); }}
          primaryAction={{
            label: messages.CONFIRM_REVIEW,
            pendingLabel: "Đang gửi quyết định…",
            pending: review.isPending,
            disabled: !reviewDraft.reason.trim(),
            onClick: () => review.mutate({ proofId: reviewDraft.proof.id, approve: reviewDraft.approve, reason: reviewDraft.reason }),
          }}
          secondaryAction={{ label: messages.CANCEL, disabled: review.isPending, onClick: () => setReviewDraft(null) }}
        >
          <label className={styles.reasonField}>
            <span>{messages.REVIEW_REASON_FIELD}</span>
            <textarea
              autoFocus
              disabled={review.isPending}
              required
              value={reviewDraft.reason}
              onChange={(event) => setReviewDraft((current) => current ? { ...current, reason: event.target.value } : current)}
            />
          </label>
          {!reviewDraft.reason.trim() ? <p className={styles.hint}>{messages.REVIEW_REASON_REQUIRED}</p> : null}
          {review.isError ? <p className={styles.errorText} role="alert">{getApiErrorMessage(review.error, "mutation") || messages.REVIEW_ERROR}</p> : null}
        </NotificationDialog>
      ) : null}
    </div>
  );
}

export function OperatorInvoicesScreen({
  role,
  invoiceId,
  invalidInvoiceId = false,
  showHeading = true,
}: {
  role: OperatorRole;
  invoiceId?: string;
  invalidInvoiceId?: boolean;
  showHeading?: boolean;
}) {
  const [filters, setFilters] = useState<InvoiceFilters>({ ownerId: "", period: "", status: "", type: "" });
  const [invalidFilterMessage, setInvalidFilterMessage] = useState("");
  const validInvoiceId = invoiceId && InvoiceIdSchema.safeParse(invoiceId).success ? invoiceId : undefined;

  function applyInvoiceFilters(next: InvoiceFilters) {
    if (next.ownerId.trim() && !InvoiceIdSchema.safeParse(next.ownerId.trim()).success) {
      setInvalidFilterMessage("Owner ID phải là UUID hợp lệ.");
      return;
    }
    setInvalidFilterMessage("");
    setFilters({ ...next, ownerId: next.ownerId.trim() });
  }

  return (
    <div className={styles.screen}>
      {showHeading ? (
        <header className={styles.heading}>
          <h1>{validInvoiceId ? messages.DETAIL_TITLE : messages.TITLE}</h1>
          <p>{messages.DESCRIPTION}</p>
        </header>
      ) : null}
      {validInvoiceId ? <InvoiceDetail key={validInvoiceId} invoiceId={validInvoiceId} role={role} /> :
        invalidInvoiceId ? <p className={styles.notice} role="alert">{messages.INVALID_INVOICE_ID}</p> : (
          <>
            {role === "moderator" ? <>
              <InvoiceFilters role={role} disabled={false} onApply={applyInvoiceFilters} />
              {invalidFilterMessage ? <p className={`${styles.notice} ${styles.error}`} role="alert">{invalidFilterMessage}</p> : null}
            </> : null}
            <InvoiceList
              role={role}
              filters={filters}
              onApplyFilters={applyInvoiceFilters}
              invalidFilterMessage={invalidFilterMessage}
            />
          </>
        )}
    </div>
  );
}
