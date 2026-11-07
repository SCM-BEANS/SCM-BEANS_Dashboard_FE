import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/router";
import { useState, type FormEvent, type ReactNode } from "react";
import { billingApi } from "@/apis/billing.api";
import { PageActions } from "@/components/action-bar/page-actions";
import { BackButtonHeading } from "@/components/navigation/back-button-heading";
import { ButtonBar } from "@/components/button/button-bar";
import { StatusBadge } from "@/components/status-badge/status-badge";
import { DataTable } from "@/components/table/data-table";
import { TableFilters } from "@/components/table/table-filters";
import { getApiErrorMessage } from "@/lib/api-errors";
import { PATH_ADMIN } from "@/routes/path";
import {
  ExportJobIdSchema,
  InvoiceIdSchema,
  InvoiceListParamsSchema,
  type ContractBillingPreviewResponse,
  type Invoice,
  type InvoiceListParams,
  type InvoiceStatusChangeRequest,
  type InvoiceLineItem,
  type PaymentProof,
} from "@/schema/billing.schema";
import { AdminShell, adminStyles as styles } from "../admin-shell";
import pageStyles from "./invoices-screen.module.css";

const INVOICES_KEY = ["dolores", "admin", "billing", "invoices"] as const;
const INVOICE_PAGE_SIZE = 50;
const amountFormatter = new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 2 });

function amountText(value: number | null | undefined, currency: string | null | undefined): string {
  if (value == null) return "—";
  try {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: currency || "VND",
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return `${amountFormatter.format(value)} ${currency || ""}`.trim();
  }
}

function dateText(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value.length === 10 ? `${value}T00:00:00` : value);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium" }).format(date);
}

function dateTimeText(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function compactDateText(value: string | null | undefined): string {
  if (!value) return "—";
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : dateText(value);
}

function shortId(value: string): string {
  return `${value.slice(0, 8)}…`;
}

function statusText(status: string): string {
  const labels: Record<string, string> = {
    DRAFT: "Bản nháp",
    PENDING: "Chờ xử lý",
    UNPAID: "Chưa thanh toán",
    PAID: "Đã thanh toán",
    OVERDUE: "Quá hạn",
    CANCELLED: "Đã hủy",
  };
  return labels[status] ?? status;
}

function typeText(type: string): string {
  if (type === "RENTAL") return "Thuê máy";
  if (type === "REPAIR") return "Sửa chữa";
  if (type === "SUPPLY") return "Vật tư";
  return type;
}

function proofStatusText(status: PaymentProof["status"]): string {
  if (status === "APPROVED") return "Đã đối soát";
  if (status === "REJECTED") return "Từ chối";
  return "Chờ đối soát";
}

function downloadBlob(blob: Blob, filename: string) {
  const safeFilename = filename.replace(/[\\/:*?"<>|\u0000-\u001f]/g, "_").slice(0, 180) || "billing-export";
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = safeFilename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
}

type InvoiceFilters = Pick<InvoiceListParams, "ownerId" | "status" | "type" | "period">;

export function AdminInvoiceListScreen() {
  const router = useRouter();
  const [page, setPage] = useState(0);
  const [searchDraft, setSearchDraft] = useState("");
  const [statusDraft, setStatusDraft] = useState("");
  const [typeDraft, setTypeDraft] = useState("");
  const [filters, setFilters] = useState<InvoiceFilters>({});
  const [filterError, setFilterError] = useState("");

  const invoices = useQuery({
    queryKey: [...INVOICES_KEY, filters, page, INVOICE_PAGE_SIZE],
    queryFn: ({ signal }) => billingApi.listInvoicesPage({ ...filters, page, size: INVOICE_PAGE_SIZE }, signal),
  });
  const createPdfExport = useMutation({
    mutationFn: ({ invoiceId, ownerId }: { invoiceId: string; ownerId: string }) => billingApi.createExport({
      format: "PDF",
      invoiceIds: [invoiceId],
      ownerId,
    }),
    onSuccess: (job) => router.push(PATH_ADMIN.BILLING_EXPORT_JOB(job.id)),
  });

  const applyFilters = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const searchValue = searchDraft.trim();
    const isPeriod = /^\d{4}-(0[1-9]|1[0-2])$/.test(searchValue);
    const candidate = {
      ...(searchValue ? isPeriod ? { period: searchValue } : { ownerId: searchValue } : {}),
      ...(statusDraft ? { status: statusDraft } : {}),
      ...(typeDraft ? { type: typeDraft } : {}),
      page: 0,
      size: INVOICE_PAGE_SIZE,
    };
    const parsed = InvoiceListParamsSchema.safeParse(candidate);
    if (!parsed.success) {
      setFilterError("Kiểm tra lại Owner ID hoặc kỳ hóa đơn (yyyy-MM).");
      return;
    }
    setFilterError("");
    setPage(0);
    setFilters({
      ...(parsed.data.ownerId ? { ownerId: parsed.data.ownerId } : {}),
      ...(parsed.data.status ? { status: parsed.data.status } : {}),
      ...(parsed.data.type ? { type: parsed.data.type } : {}),
      ...(parsed.data.period ? { period: parsed.data.period } : {}),
    });
  };

  return (
    <AdminShell>
      <div className={styles.pageContent}>
        <header className={styles.pageHeading}>
          <h1>Hóa đơn & đối soát</h1>
        </header>

        <section className={pageStyles.billingPanel} aria-labelledby="admin-invoice-list-title">
          <h2 id="admin-invoice-list-title">Danh sách hóa đơn</h2>

          <div className={pageStyles.filterControls}>
            <TableFilters
              search={{
                ariaLabel: "Tìm hóa đơn theo Owner ID hoặc kỳ",
                maxLength: 36,
                placeholder: "Tìm Owner ID hoặc kỳ hóa đơn (yyyy-MM)",
                value: searchDraft,
                onChange: setSearchDraft,
              }}
              selects={[
                {
                  id: "invoice-type-filter",
                  ariaLabel: "Lọc theo loại hóa đơn",
                  value: typeDraft,
                  options: [
                    { value: "", label: "Tất cả loại hóa đơn" },
                    { value: "RENTAL", label: "Thuê máy" },
                    { value: "REPAIR", label: "Sửa chữa" },
                    { value: "SUPPLY", label: "Vật tư" },
                  ],
                  onChange: setTypeDraft,
                },
                {
                  id: "invoice-status-filter",
                  ariaLabel: "Lọc theo trạng thái hóa đơn",
                  value: statusDraft,
                  options: [
                    { value: "", label: "Tất cả trạng thái" },
                    { value: "DRAFT", label: "Bản nháp" },
                    { value: "PENDING", label: "Chờ xử lý" },
                    { value: "UNPAID", label: "Chưa thanh toán" },
                    { value: "PAID", label: "Đã thanh toán" },
                    { value: "OVERDUE", label: "Quá hạn" },
                    { value: "CANCELLED", label: "Đã hủy" },
                  ],
                  onChange: setStatusDraft,
                },
              ]}
              submitLabel="Tìm kiếm"
              onSubmit={applyFilters}
            />
            {filterError && <p className={[pageStyles.inlineNotice, pageStyles.errorNotice].join(" ")} role="alert">{filterError}</p>}
          </div>

          {invoices.isPending && <p role="status">Đang tải danh sách hóa đơn…</p>}
          {invoices.isError && <div className={[pageStyles.inlineNotice, pageStyles.errorNotice].join(" ")} role="alert">
            <p>{getApiErrorMessage(invoices.error)}</p>
            <ButtonBar type="button" onClick={() => void invoices.refetch()}>Thử lại</ButtonBar>
          </div>}
          {createPdfExport.isError && <p className={[pageStyles.inlineNotice, pageStyles.errorNotice].join(" ")} role="alert">{getApiErrorMessage(createPdfExport.error, "mutation")}</p>}
          <div className={pageStyles.actionGroup}>
            <ButtonBar type="button" disabled={invoices.isFetching || createPdfExport.isPending} onClick={() => void invoices.refetch()}>
              {invoices.isFetching ? "Đang tải…" : "Làm mới"}
            </ButtonBar>
          </div>

          {invoices.data && (
            <>
              {invoices.data.items.length === 0 ? <p className={styles.emptyText}>Không có hóa đơn phù hợp với bộ lọc.</p> : (
                <DataTable
                  headerVariant="admin"
                  className={pageStyles.invoiceTable}
                  rows={invoices.data.items}
                  rowKey={(invoice) => invoice.id}
                  columns={[
                    { key: "invoice", header: "Hóa đơn", render: (invoice) => <div className={pageStyles.invoiceIdentity}><strong title={invoice.id}>{shortId(invoice.id)}</strong><span>Kỳ {invoice.period || "—"}</span></div> },
                    { key: "owner", header: "Owner", render: (invoice) => <span className={pageStyles.identifier} title={invoice.ownerId ?? undefined}>{shortId(invoice.ownerId ?? "")}</span> },
                    { key: "type", header: "Loại", render: (invoice) => typeText(invoice.type) },
                    { key: "amount", header: "Số tiền", align: "right", render: (invoice) => <span className={pageStyles.noWrap}>{amountText(invoice.amount, invoice.currency)}</span> },
                    { key: "due", header: "Hạn thanh toán", render: (invoice) => <span className={pageStyles.noWrap}>{compactDateText(invoice.dueDate)}</span> },
                    { key: "status", header: "Trạng thái", render: (invoice) => <StatusBadge status={invoice.status}>{statusText(invoice.status)}</StatusBadge> },
                    { key: "actions", header: "Thao tác", render: (invoice) => <div className={pageStyles.invoiceRowActions}>
                      <ButtonBar href={PATH_ADMIN.INVOICE_DETAIL(invoice.id)}>Chi tiết</ButtonBar>
                      <ButtonBar type="button" disabled={createPdfExport.isPending || !invoice.ownerId} onClick={() => { if (invoice.ownerId) createPdfExport.mutate({ invoiceId: invoice.id, ownerId: invoice.ownerId }); }}>
                        {createPdfExport.isPending && createPdfExport.variables?.invoiceId === invoice.id ? "Đang tạo…" : "Tạo PDF"}
                      </ButtonBar>
                    </div> },
                  ]}
                />
              )}
              <div className={pageStyles.pagination}>
                <ButtonBar type="button" disabled={page === 0 || invoices.isFetching} onClick={() => setPage((current) => Math.max(0, current - 1))}>Trang trước</ButtonBar>
                <span>Trang {invoices.data.page + 1}</span>
                <ButtonBar type="button" disabled={!invoices.data.hasNext || invoices.isFetching} onClick={() => setPage((current) => current + 1)}>Trang sau</ButtonBar>
              </div>
            </>
          )}
        </section>
      </div>
    </AdminShell>
  );
}

function InvoiceDetailField({ label, children }: { label: string; children: ReactNode }) {
  return <div className={pageStyles.detailField}><dt>{label}</dt><dd>{children || "—"}</dd></div>;
}

function InvoiceStatusActions({ invoice }: { invoice: Invoice }) {
  const queryClient = useQueryClient();
  const isPastDue = Boolean(invoice.dueDate && Date.parse(invoice.dueDate) < Date.now());
  const targets: InvoiceStatusChangeRequest["status"][] = invoice.status === "DRAFT"
    ? ["PENDING", "CANCELLED"]
    : invoice.status === "PENDING" || invoice.status === "UNPAID"
      ? [...(isPastDue ? ["OVERDUE" as const] : []), "CANCELLED"]
      : invoice.status === "OVERDUE"
        ? ["CANCELLED"]
        : [];
  const changeStatus = useMutation({
    mutationFn: (status: InvoiceStatusChangeRequest["status"]) => billingApi.changeInvoiceStatus(invoice.id, { status }),
    onSuccess: async () => Promise.all([
      queryClient.invalidateQueries({ queryKey: [...INVOICES_KEY, "detail", invoice.id] }),
      queryClient.invalidateQueries({ queryKey: INVOICES_KEY }),
    ]),
  });

  if (targets.length === 0) return null;
  const actions = targets.map((status) => ({
    id: `invoice-status-${status.toLowerCase()}`,
    label: status === "PENDING" ? "Gửi hóa đơn" : status === "OVERDUE" ? "Đánh dấu quá hạn" : "Hủy hóa đơn",
    variant: status === "CANCELLED" ? "danger" as const : "primary" as const,
    priority: status === "CANCELLED" ? 0 : 50,
    pending: changeStatus.isPending && changeStatus.variables === status,
    pendingLabel: "Đang cập nhật…",
    onClick: () => changeStatus.mutate(status),
    confirm: status === "CANCELLED" ? {
      title: "Hủy hóa đơn?",
      description: "Hóa đơn sẽ được đánh dấu đã hủy.",
      confirmLabel: "Hủy hóa đơn",
    } : undefined,
  }));
  return (
    <>
      <PageActions actions={actions} />
      <section className={pageStyles.billingPanel} aria-labelledby="admin-invoice-status-title">
        <h2 id="admin-invoice-status-title">Cập nhật trạng thái hóa đơn</h2>
        <p className={pageStyles.hint}>Chỉ các chuyển trạng thái hợp lệ mới được cung cấp. Việc duyệt chứng từ thanh toán được thực hiện ở mục riêng bên dưới.</p>
        {changeStatus.isError && <p className={[pageStyles.inlineNotice, pageStyles.errorNotice].join(" ")} role="alert">{getApiErrorMessage(changeStatus.error, "mutation")}</p>}
        {changeStatus.isSuccess && <p className={[pageStyles.inlineNotice, pageStyles.successNotice].join(" ")} role="status">Đã cập nhật trạng thái hóa đơn.</p>}
      </section>
    </>
  );
}

function PaymentProofReviewList({ proofs, invoiceId }: { proofs: PaymentProof[]; invoiceId: string }) {
  const queryClient = useQueryClient();
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [reviewSelection, setReviewSelection] = useState<{ proofId: string; approve: boolean } | null>(null);
  const [reason, setReason] = useState("");
  const [downloadError, setDownloadError] = useState("");
  const review = useMutation({
    mutationFn: (input: { proofId: string; approve: boolean; reason: string }) => billingApi.reviewPaymentProof(input),
    onSuccess: async () => {
      setReviewSelection(null);
      setReason("");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: [...INVOICES_KEY, "detail", invoiceId, "proofs"] }),
        queryClient.invalidateQueries({ queryKey: [...INVOICES_KEY, "detail", invoiceId] }),
        queryClient.invalidateQueries({ queryKey: INVOICES_KEY }),
      ]);
    },
  });

  const download = async (proof: PaymentProof) => {
    setDownloadingId(proof.id);
    setDownloadError("");
    try {
      downloadBlob(await billingApi.downloadPaymentProofContent(proof.id), proof.originalFilename || proof.id);
    } catch (error) {
      setDownloadError(getApiErrorMessage(error));
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <section className={pageStyles.billingPanel} aria-labelledby="admin-payment-proofs-title">
      <h2 id="admin-payment-proofs-title">Chứng từ thanh toán & đối soát</h2>
      <p className={pageStyles.hint}>Mở hoặc tải chứng từ để kiểm tra. Khi duyệt hoặc từ chối, hãy ghi lý do để lưu lại kết quả đối soát.</p>
      {proofs.length === 0 ? <p className={styles.emptyText}>Hóa đơn chưa có chứng từ thanh toán.</p> : (
        <DataTable
          headerVariant="admin"
          className={styles.reportInvoiceTable}
          rows={proofs}
          rowKey={(proof) => proof.id}
          columns={[
            { key: "file", header: "Tệp chứng từ", render: (proof) => <><strong>{proof.originalFilename}</strong><p className={pageStyles.rowHint}>{proof.contentType} · {amountFormatter.format(proof.sizeBytes)} bytes</p></> },
            { key: "status", header: "Trạng thái", render: (proof) => <StatusBadge status={proof.status}>{proofStatusText(proof.status)}</StatusBadge> },
            { key: "submitted", header: "Đã gửi lúc", render: (proof) => dateTimeText(proof.submittedAt) },
            { key: "reviewed", header: "Đã xử lý lúc", render: (proof) => dateTimeText(proof.reviewedAt) },
            {
              key: "actions",
              header: "Thao tác",
              render: (proof) => <div className={pageStyles.proofActions}>
                <ButtonBar type="button" disabled={downloadingId === proof.id} onClick={() => void download(proof)}>{downloadingId === proof.id ? "Đang tải…" : "Tải chứng từ"}</ButtonBar>
                {proof.status === "SUBMITTED" && <div>
                  <div className={pageStyles.actionGroup}>
                    <ButtonBar type="button" disabled={review.isPending} onClick={() => { setReviewSelection({ proofId: proof.id, approve: true }); setReason(""); }}>Duyệt</ButtonBar>
                    <ButtonBar type="button" disabled={review.isPending} onClick={() => { setReviewSelection({ proofId: proof.id, approve: false }); setReason(""); }}>Từ chối</ButtonBar>
                  </div>
                  {reviewSelection?.proofId === proof.id && <div className={pageStyles.reviewForm}>
                    <label htmlFor={`proof-review-reason-${proof.id}`}>{reviewSelection.approve ? "Lý do duyệt" : "Lý do từ chối"}</label>
                    <textarea id={`proof-review-reason-${proof.id}`} value={reason} maxLength={1000} required disabled={review.isPending} onChange={(event) => setReason(event.target.value)} />
                    <div className={pageStyles.reviewActions}>
                      <ButtonBar type="button" disabled={!reason.trim() || review.isPending} onClick={() => review.mutate({ proofId: proof.id, approve: reviewSelection.approve, reason: reason.trim() })}>{review.isPending ? "Đang lưu…" : "Xác nhận đối soát"}</ButtonBar>
                      <ButtonBar type="button" disabled={review.isPending} onClick={() => { setReviewSelection(null); setReason(""); }}>Hủy</ButtonBar>
                    </div>
                  </div>}
                </div>}
              </div>,
            },
          ]}
        />
      )}
      {downloadError && <p className={[pageStyles.inlineNotice, pageStyles.errorNotice].join(" ")} role="alert">{downloadError}</p>}
      {review.isError && <p className={[pageStyles.inlineNotice, pageStyles.errorNotice].join(" ")} role="alert">{getApiErrorMessage(review.error, "mutation")}</p>}
      {review.isSuccess && <p className={[pageStyles.inlineNotice, pageStyles.successNotice].join(" ")} role="status">Đã gửi quyết định đối soát.</p>}
    </section>
  );
}

function ContractPreviewPanel({ contractId }: { contractId: string }) {
  const [expanded, setExpanded] = useState(false);
  const preview = useQuery({
    queryKey: ["dolores", "admin", "billing", "contract-preview", contractId],
    queryFn: ({ signal }) => billingApi.getContractPreview(contractId, signal),
    enabled: expanded,
    staleTime: 0,
    gcTime: 0,
    retry: false,
  });
  const data: ContractBillingPreviewResponse | undefined = preview.data;
  return (
    <section className={pageStyles.billingPanel} aria-labelledby="admin-contract-preview-title">
      <h2 id="admin-contract-preview-title">Dự tính chi phí hợp đồng</h2>
      <p className={pageStyles.hint}>Đây là số liệu xem trước tại thời điểm gọi, không tạo hóa đơn và không phải số tiền cần thanh toán.</p>
      <ButtonBar type="button" disabled={preview.isFetching} onClick={() => {
        setExpanded(true);
        if (preview.data) void preview.refetch();
      }}>{preview.isFetching ? "Đang tính…" : "Tải bản xem trước"}</ButtonBar>
      {expanded && preview.isPending && <p role="status">Đang tải bản xem trước chi phí…</p>}
      {expanded && preview.isError && <div className={[pageStyles.inlineNotice, pageStyles.errorNotice].join(" ")} role="alert"><p>{getApiErrorMessage(preview.error)}</p><ButtonBar type="button" onClick={() => void preview.refetch()}>Thử lại</ButtonBar></div>}
      {data && <div className={pageStyles.previewBlock}>
        <p className={pageStyles.hint}>Kỳ {data.period ?? "—"} · {dateText(data.fromDate)} – {dateText(data.throughDate)} · cập nhật {dateTimeText(data.asOf)}</p>
        {data.eligible === false && data.eligibilityReasons?.length ? <div className={pageStyles.inlineNotice}>{data.eligibilityReasons.join("; ")}</div> : null}
        {data.warnings?.length ? <div className={pageStyles.inlineNotice}>{data.warnings.join("; ")}</div> : null}
        {data.totalsByCurrency?.length ? <div className={pageStyles.previewTotals}>{data.totalsByCurrency.map((total, index) => <div className={pageStyles.previewTotal} key={`${total.currency ?? "currency"}-${index}`}>
          <span>Tổng xem trước · {total.currency ?? "—"}</span><strong>{amountText(total.previewTotal, total.currency)}</strong>
          <span>Phí hợp đồng {amountText(total.contractAmount, total.currency)} · Phí sửa chữa {amountText(total.repairAmount, total.currency)}</span>
        </div>)}</div> : <p className={styles.emptyText}>API chưa trả tổng chi phí cho bản xem trước này.</p>}
        {data.contractCharges?.length ? <DataTable headerVariant="admin" rows={data.contractCharges} rowKey={(item, index) => `${item.serviceCode ?? "charge"}-${index}`} columns={[
          { key: "description", header: "Khoản phí", render: (item) => item.description || item.serviceCode || "—" },
          { key: "quantity", header: "Số lượng", align: "center", render: (item) => item.quantity == null ? "—" : amountFormatter.format(item.quantity) },
          { key: "unit-price", header: "Đơn giá", align: "right", render: (item) => amountText(item.unitPrice, item.currency) },
          { key: "amount", header: "Thành tiền", align: "right", render: (item) => amountText(item.amount, item.currency) },
        ]} /> : null}
        {data.repairCharges?.length ? <DataTable headerVariant="admin" rows={data.repairCharges} rowKey={(item, index) => item.repairCostReviewId ?? `${item.serviceCode ?? "repair"}-${index}`} columns={[
          { key: "description", header: "Chi phí sửa chữa", render: (item) => item.description || item.serviceCode || "—" },
          { key: "responsibility", header: "Bên chịu phí", render: (item) => item.responsibleParty ?? "Chưa xác định" },
          { key: "review", header: "Tình trạng xét duyệt", render: (item) => item.reviewStatus ?? "—" },
          { key: "amount", header: "Số tiền", align: "right", render: (item) => amountText(item.amount, item.currency) },
          { key: "included", header: "Trong dự tính", align: "center", render: (item) => item.includedInPreview ? "Có" : "Không" },
        ]} /> : null}
      </div>}
    </section>
  );
}

export function AdminInvoiceDetailScreen({ invoiceId, routerReady }: { invoiceId: string; routerReady: boolean }) {
  const validInvoiceId = InvoiceIdSchema.safeParse(invoiceId).success;
  const invoice = useQuery({
    queryKey: [...INVOICES_KEY, "detail", invoiceId],
    queryFn: ({ signal }) => billingApi.getInvoice(invoiceId, signal),
    enabled: routerReady && validInvoiceId,
    retry: false,
  });
  const lineItems = useQuery({
    queryKey: [...INVOICES_KEY, "detail", invoiceId, "line-items"],
    queryFn: ({ signal }) => billingApi.listInvoiceLineItems(invoiceId, signal),
    enabled: routerReady && validInvoiceId && invoice.isSuccess,
    retry: false,
  });
  const proofs = useQuery({
    queryKey: [...INVOICES_KEY, "detail", invoiceId, "proofs"],
    queryFn: ({ signal }) => billingApi.listPaymentProofs(invoiceId, signal),
    enabled: routerReady && validInvoiceId && invoice.isSuccess,
    retry: false,
  });
  const item = invoice.data;

  return (
    <AdminShell>
      <div className={styles.pageContent}>
        <BackButtonHeading className={styles.pageHeading} title="Chi tiết hóa đơn" titleId="admin-invoice-detail-title" description="Thông tin, dòng phí và chứng từ thanh toán của hóa đơn." back={{ label: "Về danh sách hóa đơn", fallbackHref: PATH_ADMIN.INVOICES }} />
        {!routerReady ? <section className={pageStyles.billingPanel} role="status">Đang tải…</section>
          : !validInvoiceId ? <div className={[pageStyles.inlineNotice, pageStyles.errorNotice].join(" ")} role="alert">Mã hóa đơn không hợp lệ.<div><ButtonBar href={PATH_ADMIN.INVOICES}>Về danh sách</ButtonBar></div></div>
            : invoice.isPending ? <section className={pageStyles.billingPanel} role="status">Đang tải hóa đơn…</section>
              : invoice.isError ? <div className={[pageStyles.inlineNotice, pageStyles.errorNotice].join(" ")} role="alert"><p>{getApiErrorMessage(invoice.error)}</p><ButtonBar type="button" onClick={() => void invoice.refetch()}>Thử lại</ButtonBar></div>
                : item ? <>
                  <section className={pageStyles.billingPanel} aria-labelledby="admin-invoice-info-title">
                    <h2 id="admin-invoice-info-title">Thông tin hóa đơn</h2>
                    <dl className={pageStyles.detailGrid}>
                      <InvoiceDetailField label="Mã hóa đơn">{item.id}</InvoiceDetailField>
                      <InvoiceDetailField label="Owner ID">{item.ownerId}</InvoiceDetailField>
                      <InvoiceDetailField label="Hợp đồng">{item.contractId ?? "—"}</InvoiceDetailField>
                      <InvoiceDetailField label="Loại hóa đơn">{typeText(item.type)}</InvoiceDetailField>
                      <InvoiceDetailField label="Kỳ hóa đơn">{item.period}</InvoiceDetailField>
                      <InvoiceDetailField label="Số tiền">{amountText(item.amount, item.currency)}</InvoiceDetailField>
                      <InvoiceDetailField label="Trạng thái"><StatusBadge status={item.status}>{statusText(item.status)}</StatusBadge></InvoiceDetailField>
                      <InvoiceDetailField label="Hạn thanh toán">{dateText(item.dueDate)}</InvoiceDetailField>
                      <InvoiceDetailField label="Bắt đầu kỳ">{dateText(item.billingPeriodStart)}</InvoiceDetailField>
                      <InvoiceDetailField label="Kết thúc kỳ">{dateText(item.billingPeriodEnd)}</InvoiceDetailField>
                      <InvoiceDetailField label="Ngày tạo">{dateTimeText(item.createdAt)}</InvoiceDetailField>
                      <InvoiceDetailField label="Ngày thanh toán">{dateTimeText(item.paidAt)}</InvoiceDetailField>
                    </dl>
                  </section>

                  <section className={pageStyles.billingPanel} aria-labelledby="admin-invoice-lines-title">
                    <h2 id="admin-invoice-lines-title">Dòng hóa đơn</h2>
                    {lineItems.isPending && <p role="status">Đang tải dòng hóa đơn…</p>}
                    {lineItems.isError && <div className={[pageStyles.inlineNotice, pageStyles.errorNotice].join(" ")} role="alert"><p>{getApiErrorMessage(lineItems.error)}</p><ButtonBar type="button" onClick={() => void lineItems.refetch()}>Thử tải lại</ButtonBar></div>}
                    {lineItems.data?.length === 0 && <p className={styles.emptyText}>Hóa đơn chưa có dòng chi tiết.</p>}
                    {lineItems.data && lineItems.data.length > 0 && <InvoiceLineItemsTable items={lineItems.data} invoice={item} />}
                  </section>

                  {proofs.isPending && <section className={pageStyles.billingPanel} role="status">Đang tải chứng từ thanh toán…</section>}
                  {proofs.isError && <div className={[pageStyles.inlineNotice, pageStyles.errorNotice].join(" ")} role="alert"><p>{getApiErrorMessage(proofs.error)}</p><ButtonBar type="button" onClick={() => void proofs.refetch()}>Thử tải chứng từ lại</ButtonBar></div>}
                  {proofs.data && <PaymentProofReviewList proofs={proofs.data} invoiceId={item.id} />}
                  <InvoiceStatusActions invoice={item} />
                  {item.contractId && <ContractPreviewPanel contractId={item.contractId} />}
                </> : null}
      </div>
    </AdminShell>
  );
}

function InvoiceLineItemsTable({ items, invoice }: { items: InvoiceLineItem[]; invoice: Invoice }) {
  return <DataTable headerVariant="admin" rows={items} rowKey={(item, index) => item.id ?? `${item.invoiceId}-${index}`} className={styles.reportInvoiceLineItemsTable} columns={[
    { key: "description", header: "Nội dung", render: (item) => item.description || item.serviceCode || "—" },
    { key: "machine", header: "Máy ID", render: (item) => item.machineId ?? "—" },
    { key: "quantity", header: "Số lượng", align: "center", render: (item) => item.quantity == null ? "—" : amountFormatter.format(item.quantity) },
    { key: "unit-price", header: "Đơn giá", align: "right", render: (item) => amountText(item.unitPrice, invoice.currency) },
    { key: "amount", header: "Thành tiền", align: "right", render: (item) => amountText(item.amount, invoice.currency) },
    { key: "period", header: "Thời gian áp dụng", render: (item) => [dateText(item.effectiveStart), dateText(item.effectiveEnd)].filter((value) => value !== "—").join(" – ") || "—" },
  ]} />;
}

export function AdminInvoiceExportJobScreen({ jobId, routerReady }: { jobId: string; routerReady: boolean }) {
  const validJobId = ExportJobIdSchema.safeParse(jobId).success;
  const job = useQuery({
    queryKey: ["dolores", "admin", "billing", "export-job", jobId],
    queryFn: ({ signal }) => billingApi.getExportJob(jobId, signal),
    enabled: routerReady && validJobId,
    retry: false,
    refetchInterval: (query) => query.state.data?.status === "QUEUED" || query.state.data?.status === "PROCESSING" ? 3000 : false,
  });
  const download = useMutation({
    mutationFn: () => billingApi.downloadExportContent(jobId),
    onSuccess: (blob) => downloadBlob(blob, `dolores-invoices-${job.data?.format?.toLowerCase() ?? "export"}.${job.data?.format === "PDF" ? "pdf" : "csv"}`),
  });

  return (
    <AdminShell>
      <div className={styles.pageContent}>
        <BackButtonHeading className={styles.pageHeading} title="Tải dữ liệu hóa đơn" titleId="admin-invoice-export-title" description="Theo dõi tiến trình xuất file và tải xuống khi xử lý hoàn tất." back={{ label: "Về danh sách hóa đơn", fallbackHref: PATH_ADMIN.INVOICES }} />
        {!routerReady ? <section className={pageStyles.billingPanel} role="status">Đang tải…</section>
          : !validJobId ? <div className={[pageStyles.inlineNotice, pageStyles.errorNotice].join(" ")} role="alert">Mã xuất dữ liệu không hợp lệ.<div><ButtonBar href={PATH_ADMIN.INVOICES}>Về danh sách</ButtonBar></div></div>
            : job.isPending ? <section className={pageStyles.billingPanel} role="status">Đang tải trạng thái xuất file…</section>
              : job.isError ? <div className={[pageStyles.inlineNotice, pageStyles.errorNotice].join(" ")} role="alert"><p>{getApiErrorMessage(job.error)}</p><ButtonBar type="button" onClick={() => void job.refetch()}>Thử lại</ButtonBar></div>
                : job.data ? <section className={pageStyles.billingPanel} aria-labelledby="admin-export-job-status">
                  <h2 id="admin-export-job-status">Trạng thái yêu cầu</h2>
                  <dl className={pageStyles.detailGrid}>
                    <InvoiceDetailField label="Mã yêu cầu">{job.data.id}</InvoiceDetailField>
                    <InvoiceDetailField label="Định dạng">{job.data.format ?? "—"}</InvoiceDetailField>
                    <InvoiceDetailField label="Trạng thái"><StatusBadge status={job.data.status}>{job.data.status === "QUEUED" ? "Đang chờ" : job.data.status === "PROCESSING" ? "Đang xử lý" : job.data.status === "COMPLETED" ? "Hoàn tất" : "Thất bại"}</StatusBadge></InvoiceDetailField>
                    <InvoiceDetailField label="Số hóa đơn">{job.data.invoiceCount ?? "—"}</InvoiceDetailField>
                    <InvoiceDetailField label="Tạo lúc">{dateTimeText(job.data.createdAt)}</InvoiceDetailField>
                    <InvoiceDetailField label="Hoàn tất lúc">{dateTimeText(job.data.completedAt)}</InvoiceDetailField>
                  </dl>
                  {job.data.status === "FAILED" && <p className={[pageStyles.inlineNotice, pageStyles.errorNotice].join(" ")} role="alert">{job.data.message || job.data.errorCode || "Không thể tạo file xuất."}</p>}
                  {download.isError && <p className={[pageStyles.inlineNotice, pageStyles.errorNotice].join(" ")} role="alert">{getApiErrorMessage(download.error)}</p>}
                  <PageActions actions={[
                    {
                      id: "invoice-export-download",
                      label: "Tải file hóa đơn",
                      variant: "primary",
                      priority: 50,
                      disabled: job.data.status !== "COMPLETED" || download.isPending,
                      disabledReason: job.data.status !== "COMPLETED" ? "File chưa sẵn sàng" : download.isPending ? "Đang tải file hóa đơn." : undefined,
                      pending: download.isPending,
                      pendingLabel: "Đang tải file…",
                      onClick: () => download.mutate(),
                    },
                    {
                      id: "invoice-export-refresh-status",
                      label: job.isFetching ? "Đang cập nhật…" : "Cập nhật trạng thái",
                      variant: "secondary",
                      priority: 0,
                      disabled: job.isFetching,
                      disabledReason: job.isFetching ? "Đang cập nhật trạng thái xuất file." : undefined,
                      pending: job.isFetching,
                      pendingLabel: "Đang cập nhật…",
                      onClick: () => void job.refetch(),
                    },
                  ]} />
                  {(job.data.status === "QUEUED" || job.data.status === "PROCESSING") && <p className={pageStyles.rowHint} role="status">Trang tự kiểm tra tiến trình mỗi 3 giây.</p>}
                </section> : null}
      </div>
    </AdminShell>
  );
}
