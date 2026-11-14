import { useRouter } from "next/router";
import { buildInvoiceStatusActions } from "@/components/action-bar/entity-page-actions";
import { PageActionsRenderer } from "@/components/action-bar/page-actions-renderer";
import Link from "next/link";
import Image from "next/image";
import axios from "axios";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { NotificationDialog } from "@/components/notification-dialog/notification-dialog";
import { DataTable } from "@/components/table/data-table";
import { ButtonBar, ProgressDownloadButton } from "@/components/button/button-bar";
import { profilesApi } from "@/apis/profiles.api";
import { useOwnerNames } from "@/hooks/use-owner-names";
import { TruncatedId } from "@/components/truncated-id/truncated-id";
import { billingApi } from "@/apis/billing.api";
import { getApiErrorMessage, isUncertainApiMutation } from "@/lib/api-errors";
import { ExportJobIdSchema, InvoiceIdSchema, type Invoice, type PaymentProof } from "@/schema/billing.schema";
import { PATH_ADMIN, PATH_MODERATOR, PATH_CUSTOMER } from "@/routes/path";
import { BILLING_MESSAGES as messages } from "@/text/billing/billing-messages";
import { querySubject } from "@/components/features/repair-workflow/repair-workflow-query-identity";
import styles from "./operator-invoices-screen.module.css";
import { InvoiceRefundPanel } from "./invoice-refund-panel";

type OperatorRole = "admin" | "moderator";
type InvoiceRole = OperatorRole | "owner";
const invoiceListPath = (role: InvoiceRole) => role === "owner" ? PATH_CUSTOMER.INVOICES : role === "admin" ? PATH_ADMIN.INVOICES : PATH_MODERATOR.INVOICES;
type InvoiceFilters = {
  ownerId: string;
  period: string;
  status: "" | "DRAFT" | "PENDING" | "UNPAID" | "PAID" | "OVERDUE" | "CANCELLED";
  type: "" | "SUPPLY" | "RENTAL" | "REPAIR";
};
type ReviewDraft = { proof: PaymentProof; approve: boolean; reason: string };
const PAGE_SIZE = 10;
const invoiceQueryKey = ["billing", "operator", "invoices"] as const;

function amountText(value: number | null | undefined, currency: string | null | undefined): string {
  if (value == null) return "—";
  const formatted = new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 20 }).format(value);
  return currency?.toUpperCase() === "VND" ? `${formatted} ₫` : `${formatted} ${currency ?? ""}`.trim();
}

function dateText(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" }) : value;
}

function dateTimeText(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toLocaleString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }) : value;
}

function invoiceStatus(status: string): string {
  return messages.INVOICE_STATUSES[status as keyof typeof messages.INVOICE_STATUSES] ?? status;
}

function BillingStatus({ status, label }: { status: string; label: string }) {
  return <span className={styles.status} data-status={status}><i aria-hidden="true" />{label}</span>;
}

function periodText(value: string) {
  return /^\d{4}-\d{2}$/.test(value) ? `${value.slice(5)}/${value.slice(0, 4)}` : value;
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
      <ButtonBar type="button" disabled={page === 0 || disabled} onClick={() => onChange(page - 1)}>
        {messages.PREVIOUS_PAGE}
      </ButtonBar>
      <span>{messages.PAGE} {page + 1}</span>
      <ButtonBar type="button" disabled={!hasNext || disabled} onClick={() => onChange(page + 1)}>
        {messages.NEXT_PAGE}
      </ButtonBar>
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
  initialPeriod,
  onApply,
  disabled,
}: {
  role: InvoiceRole;
  initialPeriod: string;
  onApply: (filters: InvoiceFilters) => void;
  disabled: boolean;
}) {
  const [draft, setDraft] = useState<InvoiceFilters>({ ownerId: "", period: initialPeriod, status: "", type: "" });
  const customers = useInfiniteQuery({
    queryKey: ["billing", "customer-options", querySubject(role)],
    initialPageParam: 0,
    queryFn: ({ pageParam, signal }) => profilesApi.list({ role: "OWNER", page: pageParam, size: 100 }, signal),
    getNextPageParam: (lastPage) => lastPage.page + 1 < lastPage.totalPages ? lastPage.page + 1 : undefined,
    retry: false,
    enabled: role !== "owner",
  });

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onApply(draft);
  }

    return (
      <form className={styles.listFilters} onSubmit={submit}>
        {role !== "owner" && <label>Khách hàng<select value={draft.ownerId} onChange={(event) => setDraft((current) => ({ ...current, ownerId: event.target.value }))}>
          <option value="">Tất cả khách hàng</option>
          {customers.data?.pages.flatMap((page) => page.items).map((profile) => <option key={profile.idaasUserId} value={profile.idaasUserId}>{profile.fullName || profile.email}</option>)}
        </select></label>}
        <label>Kỳ hóa đơn<input type="month" value={draft.period} onChange={(event) => setDraft((current) => ({ ...current, period: event.target.value }))} /></label>
        <label>Trạng thái<select value={draft.status} onChange={(event) => setDraft((current) => ({ ...current, status: event.target.value as InvoiceFilters["status"] }))}>
          <option value="">Tất cả trạng thái</option>{Object.entries(messages.INVOICE_STATUSES).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select></label>
        <label>Loại hóa đơn<select value={draft.type} onChange={(event) => setDraft((current) => ({ ...current, type: event.target.value as InvoiceFilters["type"] }))}>
            <option value="">Tất cả loại hóa đơn</option>{Object.entries(messages.INVOICE_TYPES).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select></label>
        <ButtonBar type="submit" disabled={disabled}>Tìm kiếm</ButtonBar>
        {role !== "owner" && customers.isPending && <p className={styles.filterFeedback} role="status">Đang tải khách hàng…</p>}
        {customers.hasNextPage && <div className={styles.filterFeedback}><ButtonBar type="button" disabled={customers.isFetchingNextPage} onClick={() => void customers.fetchNextPage()}>Tải thêm khách hàng</ButtonBar></div>}
        {customers.isError && <div className={styles.filterFeedback} role="alert">Không tải được khách hàng. <ButtonBar type="button" onClick={() => void customers.refetch()}>Thử lại</ButtonBar></div>}
      </form>
    );
}

function InvoiceStatusControls({ invoice, role }: { invoice: Invoice; role: OperatorRole }) {
  const client = useQueryClient();
  const update = useMutation({
    mutationFn: (status: "PENDING" | "OVERDUE" | "CANCELLED") => billingApi.changeInvoiceStatus(invoice.id, { status }),
    onSettled: () => client.invalidateQueries({ queryKey: [...invoiceQueryKey, querySubject(role)] }),
  });
  const actions = buildInvoiceStatusActions({ status: invoice.status, dueDate: invoice.dueDate, pending: update.isPending, pendingStatus: update.variables, onChange: (status) => update.mutate(status) });
  if (!actions.length && !update.isError) return null;
  return <div className={styles.statusControls}><h3>Xử lý hóa đơn</h3><PageActionsRenderer actions={actions} />{update.isError && <p role="alert" className={styles.errorText}>{getApiErrorMessage(update.error, "mutation")}</p>}</div>;
}

function InvoiceList({
  role,
  filters,
  onApplyFilters,
  invalidFilterMessage,
  showHeading,
}: {
  role: InvoiceRole;
  filters: InvoiceFilters;
  onApplyFilters: (filters: InvoiceFilters) => void;
  invalidFilterMessage: string;
  showHeading: boolean;
}) {
  const [page, setPage] = useState(0);
  const subject = querySubject(role);
  const query = useQuery({
    queryKey: [...invoiceQueryKey, subject, filters, page],
    queryFn: ({ signal }) => (role === "owner" ? billingApi.listInvoicesPage : billingApi.listOperatorInvoicesPage)({
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
  const ownerIds = rows.flatMap((invoice) => {
    if (role === "owner" || invoice.ownerName?.trim()) return [];
    const ownerId = invoice.ownerId ?? invoice.tenantId;
    return typeof ownerId === "string" && ownerId ? [ownerId] : [];
  });
  const ownerNames = useOwnerNames(ownerIds);
  const firstOwner = rows[0]?.ownerId ?? rows[0]?.tenantId;
  const ownerId = filters.ownerId || (firstOwner && rows.every((invoice) => (invoice.ownerId ?? invoice.tenantId) === firstOwner) ? firstOwner : undefined);
  const exportJob = useMutation({
    mutationFn: () => billingApi.createExport({ format: "CSV", ...(role !== "owner" ? { ownerId: typeof ownerId === "string" ? ownerId : undefined } : {}), invoiceIds: rows.map((invoice) => invoice.id) }),
    onSuccess: (job) => role === "owner" ? router.push(`${PATH_CUSTOMER.INVOICES}?exportId=${encodeURIComponent(job.id)}`) : router.push(role === "admin" ? PATH_ADMIN.BILLING_EXPORT_JOB(job.id) : `/moderator/invoices/exports/${encodeURIComponent(job.id)}`),
  });
  const exportReason = query.isFetching ? "Đang tải danh sách hóa đơn." : !rows.length ? "Chưa có hóa đơn để xuất." : role !== "owner" && !ownerId ? "Chọn một khách hàng để xuất các hóa đơn trong trang." : undefined;

  useEffect(() => setPage(0), [filters]);

  return (
    <>
      <header className={styles.panelHeading}>
        {showHeading ? <div className={styles.heading}><h1>Hóa đơn</h1><p>Tra cứu hóa đơn và theo dõi thanh toán.</p></div> : <span />}
        <ButtonBar variant="primary" disabled={Boolean(exportReason) || exportJob.isPending} title={exportReason} onClick={() => exportJob.mutate()}>{exportJob.isPending ? "Đang xuất…" : "Xuất danh sách"}</ButtonBar>
      </header>
    <section className={styles.panel} aria-labelledby="operator-invoice-list-title">
      <div className={styles.listTitle}><h2 id="operator-invoice-list-title">Danh sách hóa đơn</h2>{query.data && <span>{rows.length} hóa đơn trong trang</span>}</div>
      {exportReason && <p className={styles.hint}>{exportReason}</p>}
      {exportJob.isError && <p role="alert">{getApiErrorMessage(exportJob.error)}</p>}
      <InvoiceFilters role={role} initialPeriod={filters.period} onApply={onApplyFilters} disabled={query.isFetching} />
      {invalidFilterMessage ? <p className={`${styles.notice} ${styles.error}`} role="alert">{invalidFilterMessage}</p> : null}
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
          variant="accounts"
          rows={query.data.items}
          rowKey={(invoice) => invoice.id}
          columns={[
            { key: "invoice", header: "Hóa đơn", render: (invoice) => <div className={styles.invoiceIdentity}><strong title={invoice.id}>{invoice.id.slice(0, 8).toUpperCase()}</strong><small>{messages.INVOICE_TYPES[invoice.type as keyof typeof messages.INVOICE_TYPES] ?? invoice.type}</small></div> },
            ...(role !== "owner" ? [{ key: "owner", header: "Khách hàng", render: (invoice: Invoice) => {
              const ownerId = invoice.ownerId ?? invoice.tenantId;
              const apiName = invoice.ownerName;
              const profileName = typeof ownerId === "string" ? ownerNames.data?.[ownerId] : undefined;
              const customerName = typeof apiName === "string" && apiName.trim()
                ? apiName.trim()
                : profileName || "—";
              return customerName;
            } }] : []),
            { key: "period", header: messages.PERIOD, render: (invoice) => periodText(invoice.period) },
            { key: "amount", header: "Số tiền", align: "right", render: (invoice) => <span className={styles.money}>{amountText(invoice.amount, invoice.currency)}</span> },
            { key: "status", header: messages.STATUS, render: (invoice) => <BillingStatus status={invoice.status} label={invoiceStatus(invoice.status)} /> },
            { key: "action", header: "", render: (invoice) => <ButtonBar rollingLabel href={role === "owner" ? `${PATH_CUSTOMER.INVOICE_DETAIL(invoice.id)}${router.asPath?.split("?")[0].endsWith("/refund") ? "?tab=refund" : ""}` : role === "admin" ? PATH_ADMIN.INVOICE_DETAIL(invoice.id) : PATH_MODERATOR.INVOICE_DETAIL(invoice.id)}>Mở hồ sơ</ButtonBar> },
          ]}
        />
      )}
      {query.data && (
        <Pagination page={query.data.page} hasNext={query.data.hasNext} disabled={query.isFetching} label={messages.PAGINATE_INVOICES} onChange={setPage} />
      )}
    </section>
    </>
  );
}

function InvoiceDetail({ invoiceId, role, paymentForm }: { invoiceId: string; role: InvoiceRole; paymentForm?: ReactNode }) {
  const queryClient = useQueryClient();
  const scopedInvoiceQueryKey = [...invoiceQueryKey, querySubject(role)] as const;
  const [linePage, setLinePage] = useState(0);
  const [proofPage, setProofPage] = useState(0);
  const [reviewDraft, setReviewDraft] = useState<ReviewDraft | null>(null);
  const [downloadError, setDownloadError] = useState("");
  const [previewProof, setPreviewProof] = useState<PaymentProof | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const router = useRouter();
  const [section, setSection] = useState<"proofs" | "refund">((typeof router.query?.refundId === "string" || router.query?.tab === "refund") ? "refund" : "proofs");

  const invoice = useQuery({
    queryKey: role === "owner" ? ["owner-invoice", invoiceId, querySubject(role)] : [...scopedInvoiceQueryKey, "detail", invoiceId],
    queryFn: ({ signal }) => role === "owner" ? billingApi.getInvoice(invoiceId, signal) : billingApi.getModeratorInvoice(invoiceId, signal),
  });
  const ownerId = invoice.data?.ownerId ?? invoice.data?.tenantId;
  const ownerNames = useOwnerNames(role !== "owner" && typeof ownerId === "string" ? [ownerId] : []);
  useEffect(() => {
    if (typeof router.query?.refundId === "string" || router.query?.tab === "refund") setSection("refund");
  }, [router.query?.refundId, router.query?.tab]);
  const lineItems = useQuery({
    queryKey: [...scopedInvoiceQueryKey, invoiceId, "lines", linePage],
    queryFn: ({ signal }) => billingApi.listInvoiceLineItemsPage(invoiceId, { page: linePage, size: PAGE_SIZE }, signal),
    enabled: invoice.isSuccess,
    placeholderData: (previous) => previous,
  });
  const proofs = useQuery({
    queryKey: role === "owner" ? ["owner-invoice-proofs", invoiceId, querySubject(role), proofPage] : [...scopedInvoiceQueryKey, invoiceId, "proofs", proofPage],
    queryFn: ({ signal }) => billingApi.listPaymentProofsPage(invoiceId, { page: proofPage, size: PAGE_SIZE }, signal),
    enabled: invoice.isSuccess,
    placeholderData: (previous) => previous,
  });
  const previewType = previewProof?.contentType?.split(";")[0].trim().toLowerCase();
  const previewSupported = previewType === "image/jpeg" || previewType === "image/png" || previewType === "application/pdf";
  const preview = useQuery({
    queryKey: [...scopedInvoiceQueryKey, invoiceId, "proof-preview", previewProof?.id],
    queryFn: async ({ signal }) => {
      const blob = await billingApi.downloadPaymentProofContent(previewProof!.id, signal);
      const type = blob.type.split(";")[0].trim().toLowerCase();
      if (type && type !== previewType && type !== "application/octet-stream") throw new Error("Định dạng chứng từ trả về không khớp với hồ sơ.");
      return new Blob([blob], { type: previewType });
    },
    enabled: Boolean(previewProof && previewSupported),
    retry: false,
    gcTime: 0,
  });
  useEffect(() => {
    if (!preview.data || !previewProof) { setPreviewUrl(""); return; }
    const url = URL.createObjectURL(preview.data);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [preview.data, previewProof]);
  const review = useMutation({
    mutationFn: (input: { proofId: string; approve: boolean; reason: string }) => {
      if (role === "owner") throw new Error("Operator access required.");
      return billingApi.reviewPaymentProof(input);
    },
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

  if (invoice.isPending) return <p className={styles.notice} role="status">{messages.LOADING_INVOICE}</p>;
  if (invoice.isError) {
    return <InlineQueryState pending={false} error={invoice.error} loadingText={messages.LOADING_INVOICE} retry={invoice.refetch} />;
  }

  const record = invoice.data;
  return (
    <div className={styles.detailStack}>
      <div className={styles.panelHeading}>
        <div className={styles.heading}><h1>Hồ sơ hóa đơn</h1><p className={styles.detailSubtitle}>{record.id.slice(0, 8).toUpperCase()} · {record.ownerName || (typeof ownerId === "string" ? ownerNames.data?.[ownerId] : null) || "Khách hàng"} · Kỳ {periodText(record.period)}</p></div>
        <ButtonBar href={invoiceListPath(role)}>Về danh sách</ButtonBar>
      </div>
      <div className={styles.invoiceLayout}>
      <section className={`${styles.panel} ${styles.invoiceMain}`}>
        <h2>Thông tin hóa đơn</h2>
        <dl className={styles.detailGrid}>
          <div><dt>{messages.OWNER}</dt><dd>{record.ownerName || (typeof ownerId === "string" ? ownerNames.data?.[ownerId] : null) || "—"}</dd></div>
          <div><dt>{messages.CONTRACT}</dt><dd>{record.contractId ? <Link className={styles.textButton} href={role === "owner" ? `${PATH_CUSTOMER.CONTRACTS}/${encodeURIComponent(record.contractId)}` : role === "admin" ? `${PATH_ADMIN.CONTRACTS}?view=detail&id=${encodeURIComponent(record.contractId)}` : `${PATH_MODERATOR.CONTRACTS}/${encodeURIComponent(record.contractId)}`}><TruncatedId value={record.contractId} /></Link> : "—"}</dd></div>
          <div><dt>{messages.PERIOD}</dt><dd>{periodText(record.period)}</dd></div>
          <div><dt>{messages.TYPE}</dt><dd>{messages.INVOICE_TYPES[record.type as keyof typeof messages.INVOICE_TYPES] ?? record.type}</dd></div>
        </dl>
        <h2 id="operator-invoice-lines">Các khoản phí</h2>
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
            variant="accounts"
            style={{ minWidth: 400 }}
            rows={lineItems.data.items}
            rowKey={(item, index) => item.id ?? `${item.invoiceId}-${index}`}
            columns={[
              { key: "description", header: messages.SERVICE, render: (item) => item.description ?? item.serviceCode ?? "—" },
              { key: "quantity", header: messages.QUANTITY, render: (item) => item.quantity ?? "—" },
              { key: "unit", header: messages.UNIT_PRICE, align: "right", render: (item) => <span className={styles.money}>{amountText(item.unitPrice, record.currency)}</span> },
              { key: "amount", header: messages.LINE_AMOUNT, align: "right", render: (item) => <span className={styles.money}>{amountText(item.amount, record.currency)}</span> },
            ]}
          />
        ) : null}
        {lineItems.data && (linePage > 0 || lineItems.data.hasNext) && <Pagination page={lineItems.data.page} hasNext={lineItems.data.hasNext} disabled={lineItems.isFetching} label={messages.PAGINATE_LINE_ITEMS} onChange={setLinePage} />}
        <div className={styles.total}><span>Tổng tiền hóa đơn</span><strong>{amountText(record.amount, record.currency)}</strong></div>
      </section>
      <aside className={styles.panel} aria-label="Thanh toán">
        <h2>Thanh toán</h2><span className={styles.hint}>Tổng tiền hóa đơn</span><strong className={styles.amount}>{amountText(record.amount, record.currency)}</strong>
        <BillingStatus status={record.status} label={invoiceStatus(record.status)} />
        <dl className={styles.paymentFacts}><div><dt>Hạn thanh toán</dt><dd>{dateText(record.dueDate)}</dd></div><div><dt>Ngày thanh toán</dt><dd>{record.paidAt ? dateTimeText(record.paidAt) : "Chưa ghi nhận"}</dd></div></dl>
        {role === "moderator" && <InvoiceStatusControls invoice={record} role={role} />}
      </aside>
      </div>
      <nav className={styles.tabs} aria-label="Nội dung hồ sơ hóa đơn">
        <button type="button" aria-pressed={section === "proofs"} onClick={() => setSection("proofs")}>Chứng từ thanh toán</button>
        <button type="button" aria-pressed={section === "refund"} onClick={() => setSection("refund")}>Hoàn tiền</button>
      </nav>
      <div hidden={section !== "refund"}><InvoiceRefundPanel key={`${role}:${record.id}`} invoice={{ ...record, ownerId: record.ownerId ?? (typeof record.tenantId === "string" ? record.tenantId : undefined) }} role={role === "owner" ? "OWNER" : role === "admin" ? "ADMIN" : "MODERATOR"} /></div>
      {role === "owner" && <div hidden={section !== "proofs"}>{["PENDING", "UNPAID", "OVERDUE"].includes(record.status.toUpperCase()) ? paymentForm : null}</div>}
      <section hidden={section !== "proofs"} className={styles.panel} aria-labelledby="operator-payment-proofs">
        <h2 id="operator-payment-proofs">{messages.PAYMENT_PROOFS}</h2>
        {role !== "owner" && <p className={styles.hint}>{messages.REVIEW_HELP}</p>}
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
            variant="accounts"
            className={`${styles.proofTable} ${role !== "admin" ? styles.proofTableWithAmount : ""}`}
            rows={proofs.data.items}
            rowKey={(proof) => proof.id}
            columns={[
              { key: "file", header: messages.PROOF_FILENAME, render: (proof) => <div className={styles.invoiceIdentity}><span className={styles.proofFilename} title={proof.originalFilename}>{proof.originalFilename}</span><details><summary>Thông tin tệp</summary><p className={styles.breakText}>{proof.originalFilename}</p><p className={styles.breakText}>{messages.PAYMENT_ID}: {proof.paymentId}</p><p>{new Intl.NumberFormat("vi-VN").format(proof.sizeBytes)} bytes</p>{proof.reviewReason && <p>{messages.REVIEW_REASON}: {proof.reviewReason}</p>}</details></div> },
              { key: "status", header: messages.STATUS, render: (proof) => <BillingStatus status={proof.status} label={messages.PROOF_STATUSES[proof.status]} /> },
              { key: "submitted", header: messages.SUBMITTED_AT, render: (proof) => <time className={styles.proofDate} dateTime={proof.submittedAt}>{dateText(proof.submittedAt)}<small>{new Date(proof.submittedAt).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}</small></time> },
              ...(role !== "admin" ? [{ key: "proof-amount", header: "Số tiền trên chứng từ", align: "right" as const, render: (proof: PaymentProof) => <span className={styles.money}>{proof.amount == null ? "Chưa có dữ liệu" : amountText(proof.amount, proof.currency ?? record.currency)}</span> }] : []),
              {
                key: "actions",
                header: messages.PROOF_ACTIONS,
                render: (proof) => (
                  <div className={styles.proofActions}>
                    <ButtonBar type="button" onClick={() => setPreviewProof(proof)}>Xem chứng từ</ButtonBar>
                    <ProgressDownloadButton filename={proof.originalFilename} download={(signal, onProgress) => { setDownloadError(""); return billingApi.downloadPaymentProofContent(proof.id, signal, onProgress); }} onError={(error) => setDownloadError(getApiErrorMessage(error))}>Tải xuống</ProgressDownloadButton>
                    {role !== "owner" && proof.status === "SUBMITTED" ? (
                      <>
                        <ButtonBar type="button" disabled={review.isPending} onClick={() => setReviewDraft({ proof, approve: true, reason: "" })}>{messages.APPROVE_PROOF}</ButtonBar>
                        <ButtonBar variant="danger" type="button" disabled={review.isPending} onClick={() => setReviewDraft({ proof, approve: false, reason: "" })}>{messages.REJECT_PROOF}</ButtonBar>
                      </>
                    ) : null}
                  </div>
                ),
              },
            ]}
          />
        ) : null}
        {proofs.data && (proofPage > 0 || proofs.data.hasNext) && <Pagination page={proofs.data.page} hasNext={proofs.data.hasNext} disabled={proofs.isFetching} label={messages.PAGINATE_PAYMENT_PROOFS} onChange={setProofPage} />}
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

      {previewProof && <NotificationDialog variant="info" title="Chứng từ thanh toán" description={previewProof.originalFilename} primaryAction={{ label: "Đóng", onClick: () => setPreviewProof(null) }} onClose={() => setPreviewProof(null)}>
        {!previewSupported ? <p>Định dạng này chưa hỗ trợ xem trước. Hãy tải chứng từ để kiểm tra.</p> : <>
          <InlineQueryState pending={preview.isPending || (!previewUrl && !preview.isError)} error={preview.isError ? preview.error : null} loadingText="Đang tải chứng từ…" retry={preview.refetch} />
          {previewUrl && (previewType === "application/pdf" ? <object className={styles.proofPreview} type="application/pdf" data={previewUrl} aria-label={previewProof.originalFilename}><p>Trình duyệt không hỗ trợ xem PDF. Hãy tải chứng từ để kiểm tra.</p></object> : <Image unoptimized width={1200} height={900} className={styles.proofPreview} src={previewUrl} alt={previewProof.originalFilename} />)}
        </>}
        <ProgressDownloadButton filename={previewProof.originalFilename} download={(signal, onProgress) => { setDownloadError(""); return billingApi.downloadPaymentProofContent(previewProof.id, signal, onProgress); }} onError={(error) => setDownloadError(getApiErrorMessage(error))}>Tải xuống</ProgressDownloadButton>
        {downloadError && <p role="alert" className={styles.errorText}>{downloadError}</p>}
      </NotificationDialog>}
      {reviewDraft ? (
        <NotificationDialog
          variant="confirm"
          title={messages.REVIEW_TITLE}
          description={reviewDraft.approve ? messages.APPROVE_CONFIRMATION : messages.REJECT_CONFIRMATION}
          onClose={() => { if (!review.isPending) setReviewDraft(null); }}
          primaryAction={{
            label: messages.CONFIRM_REVIEW,
            holdToConfirm: !reviewDraft.approve,
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

export function InvoiceExportJobScreen({ jobId, routerReady, role }: { jobId: string; routerReady: boolean; role: InvoiceRole }) {
  const valid = ExportJobIdSchema.safeParse(jobId).success;
  const [downloadError, setDownloadError] = useState("");
  const job = useQuery({
    queryKey: ["billing", querySubject(role), "export-job", jobId],
    queryFn: ({ signal }) => billingApi.getExportJob(jobId, signal),
    enabled: routerReady && valid, retry: false,
    refetchInterval: (query) => ["QUEUED", "PROCESSING"].includes(query.state.data?.status ?? "") ? 3000 : false,
  });
  const backHref = invoiceListPath(role);
  const filename = `dolores-invoices.${job.data?.format === "PDF" ? "pdf" : "csv"}`;
  const statusLabels = { QUEUED: "Đang chờ", PROCESSING: "Đang xử lý", COMPLETED: "Đã sẵn sàng", FAILED: "Thất bại" };
  return <div className={styles.screen}>
    <header className={styles.panelHeading}><div className={styles.heading}><h1>Xuất danh sách hóa đơn</h1><p>Theo dõi yêu cầu xuất và tải tệp khi sẵn sàng.</p></div><ButtonBar href={backHref}>Về danh sách</ButtonBar></header>
    {!routerReady ? <p role="status">Đang tải…</p> : !valid ? <p className={`${styles.notice} ${styles.error}`} role="alert">Mã xuất dữ liệu không hợp lệ.</p> : <>
      <InlineQueryState pending={job.isPending} error={job.isError ? job.error : null} loadingText="Đang tải trạng thái xuất dữ liệu…" retry={job.refetch} />
      {job.data && !job.isError && <section className={`${styles.panel} ${styles.exportPanel}`}>
        <div className={styles.panelHeading}><h2>Tệp xuất hóa đơn</h2><BillingStatus status={job.data.status} label={statusLabels[job.data.status]} /></div>
        <p className={styles.exportFilename}>{filename}</p>
        <dl className={styles.exportFacts}><div><dt>Định dạng</dt><dd>{job.data.format ?? "—"}</dd></div><div><dt>Số hóa đơn</dt><dd>{job.data.invoiceCount ?? "—"}</dd></div><div><dt>Thời điểm tạo</dt><dd>{dateTimeText(job.data.createdAt)}</dd></div><div><dt>Hoàn tất lúc</dt><dd>{dateTimeText(job.data.completedAt)}</dd></div></dl>
        {job.data.status === "FAILED" && <p className={styles.errorText} role="alert">{job.data.message || job.data.errorCode || "Không thể tạo tệp xuất."}</p>}
        {downloadError && <p role="alert" className={styles.errorText}>{downloadError}</p>}
        <div className={styles.exportActions}><ButtonBar disabled={job.isFetching} onClick={() => void job.refetch()}>Làm mới</ButtonBar>
          {job.data.status === "COMPLETED" ? <ProgressDownloadButton filename={filename} download={(signal, onProgress) => { setDownloadError(""); return billingApi.downloadExportContent(jobId, signal, onProgress); }} onError={(error) => setDownloadError(getApiErrorMessage(error))}>Tải xuống</ProgressDownloadButton> : <ButtonBar disabled>Tệp chưa sẵn sàng</ButtonBar>}
        </div>
        {["QUEUED", "PROCESSING"].includes(job.data.status) && <p className={styles.hint} role="status">Đang xử lý. Trạng thái tự cập nhật mỗi 3 giây.</p>}
      </section>}
    </>}
  </div>;
}

export function OperatorInvoicesScreen({
  role,
  invoiceId,
  invalidInvoiceId = false,
  showHeading = true,
  initialPeriod = "",
  paymentForm,
}: {
  role: InvoiceRole;
  initialPeriod?: string;
  paymentForm?: ReactNode;
  invoiceId?: string;
  invalidInvoiceId?: boolean;
  showHeading?: boolean;
}) {
  const [filters, setFilters] = useState<InvoiceFilters>({ ownerId: "", period: initialPeriod, status: "", type: "" });
  const [invalidFilterMessage, setInvalidFilterMessage] = useState("");
  const validInvoiceId = invoiceId && InvoiceIdSchema.safeParse(invoiceId).success ? invoiceId : undefined;

  function applyInvoiceFilters(next: InvoiceFilters) {
    if (next.ownerId.trim() && !InvoiceIdSchema.safeParse(next.ownerId.trim()).success) {
      setInvalidFilterMessage("Mã khách hàng không hợp lệ. Hãy kiểm tra lại.");
      return;
    }
    setInvalidFilterMessage("");
    setFilters({ ...next, ownerId: next.ownerId.trim() });
  }

  return (
    <div className={styles.screen}>
      {showHeading && invalidInvoiceId ? (
        <header className={styles.heading}>
          <h1>{validInvoiceId ? "Hồ sơ hóa đơn" : "Hóa đơn"}</h1>
          {!validInvoiceId && <p>Tra cứu hóa đơn và theo dõi thanh toán.</p>}
        </header>
      ) : null}
      {validInvoiceId ? <InvoiceDetail key={`${querySubject(role)}:${validInvoiceId}`} invoiceId={validInvoiceId} role={role} paymentForm={paymentForm} /> :
        invalidInvoiceId ? <p className={styles.notice} role="alert">{messages.INVALID_INVOICE_ID}</p> : (
          <>
            <InvoiceList
              key={querySubject(role)}
              role={role}
              filters={filters}
              onApplyFilters={applyInvoiceFilters}
              invalidFilterMessage={invalidFilterMessage}
              showHeading={showHeading}
            />
          </>
        )}
    </div>
  );
}
