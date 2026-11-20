import { EVIDENCE_ACCEPT, evidenceFileError } from "@/lib/evidence-multipart";
import { TextLinkButton } from "@/components/button/text-link-button";
import { useRef, useState } from "react";
import { PageActions } from "@/components/action-bar/page-actions";
import { ButtonBar } from "@/components/button/button-bar";
import { DataTable } from "@/components/table/data-table";
import { Panel } from "@/components/panel/panel";
import { Pagination } from "@/components/pagination/pagination";
import { TableFilters } from "@/components/table/table-filters";
import { NotificationDialog } from "@/components/notification-dialog/notification-dialog";
import { EvidenceList } from "@/components/evidence/evidence-list";
import { businessToday, calendarPresets, getDefaultOperationalRange, makePresetRange, type CalendarPreset } from "./operational-overview";
import { DashboardDateRangeSchema } from "@/schema/dashboard.schema";
import { OfflineViolationReviewDecisionRequestSchema, type OfflineViolationReview, type OfflineViolationReviewDecisionRequest } from "@/schema/offline-violation-reviews.schema";
import styles from "./machines.module.css";
import { REPAIR_WORKFLOW_MESSAGES as M } from "@/text/repair-workflow/repair-workflow-messages";

const labels = { OBSERVING: "Đang theo dõi", REVIEW_REQUIRED: "Cần rà soát", REVIEWED: "Đã rà soát", CLEARED: "Đã kết thúc theo dõi" };
const formatTime = (value: string | null) => value ? `${value.slice(11, 19)} ${value.slice(0, 10).split("-").reverse().join("/")}` : "—";
const formatDate = (value: string) => value ? value.split("-").reverse().join("/") : "…";
type Page = { items: OfflineViolationReview[]; page: number; size: number; hasNext: boolean };

export function OfflineReviewPanel({ page, detail, selectedId, status, machineId, machineLabels, canDecide, loading, detailLoading, error, detailError, onFilterChange, onPageChange, onSelect, showDateFilter = false, onDecide }: {
  selectedId?: string;
  page?: Page; detail?: OfflineViolationReview; status: string; machineId?: string; machineLabels?: Record<string, string>; canDecide: boolean;
  loading?: boolean; detailLoading?: boolean; error?: string; detailError?: string;
  onFilterChange: (status: string) => void; onPageChange: (page: number) => void;
  onSelect: (id: string | undefined) => void; showDateFilter?: boolean;
  onDecide?: (id: string, body: OfflineViolationReviewDecisionRequest, files: File[]) => Promise<void>;
}) {
  const [dateDraft, setDateDraft] = useState(getDefaultOperationalRange);
  const [dateFilter, setDateFilter] = useState(getDefaultOperationalRange);
  const [dateError, setDateError] = useState("");
  const filteredItems = page?.items.filter((item) => {
    const detectedDate = item.detectedAt.slice(0, 10);
    return (!dateFilter.fromDate || detectedDate >= dateFilter.fromDate)
      && (!dateFilter.toDate || detectedDate <= dateFilter.toDate);
  });
  return <>
    {showDateFilter && !selectedId ? <div className={styles.compactPeriod}>
      <details className={styles.periodPicker}>
        <summary>{dateFilter.fromDate || dateFilter.toDate ? `${formatDate(dateFilter.fromDate)} – ${formatDate(dateFilter.toDate)}` : "Ngày phát hiện · trang hiện tại"}</summary>
        <form className={styles.operationalDateForm} onSubmit={(event) => {
          event.preventDefault();
          const parsed = DashboardDateRangeSchema.safeParse(dateDraft);
          if (!parsed.success) { setDateError("Chọn khoảng ngày hợp lệ, không sau hôm nay và tối đa 90 ngày."); return; }
          setDateError(""); setDateDraft(parsed.data); setDateFilter(parsed.data); onPageChange(0); event.currentTarget.closest("details")?.removeAttribute("open");
        }}>
          <label>Từ ngày<input type="date" required value={dateDraft.fromDate} max={dateDraft.toDate || businessToday()} onChange={(event) => setDateDraft((current) => ({ ...current, fromDate: event.target.value }))} /></label>
          <label>Đến ngày<input type="date" required value={dateDraft.toDate} min={dateDraft.fromDate || undefined} max={businessToday()} onChange={(event) => setDateDraft((current) => ({ ...current, toDate: event.target.value }))} /></label>
          <button type="submit">Áp dụng</button>
          {dateError ? <p role="alert">{dateError}</p> : null}
        </form>
      </details>
      <select aria-label="Chọn kỳ dữ liệu" value="" onChange={(event) => {
        if (!event.target.value) return;
        const range = makePresetRange(event.target.value as CalendarPreset, businessToday());
        setDateError(""); setDateDraft(range); setDateFilter(range); onPageChange(0);
      }}>
        <option value="">Chọn kỳ</option>{calendarPresets.map(({ key, label }) => <option value={key} key={key}>{label}</option>)}
      </select>
    </div> : null}
    <Panel title="Rà soát mất kết nối" aria-label="Rà soát mất kết nối" actions={selectedId ? <TextLinkButton back onClick={() => onSelect(undefined)}>Về danh sách hồ sơ</TextLinkButton> : null}>
    {!selectedId && <><TableFilters className={styles.offlineReviewFilters} selects={[{ id: "offline-review-status", ariaLabel: "Trạng thái rà soát", label: "Trạng thái rà soát", value: status, options: [{ value: "", label: "Tất cả" }, ...Object.entries(labels).map(([value, label]) => ({ value, label }))], onChange: onFilterChange }]} showSubmit={false} />
    {loading ? <p role="status">Đang tải hồ sơ rà soát…</p> : null}
    {error ? <p className={styles.operationalOverviewErrorText} role="alert">{error}</p> : page ? <>
      <DataTable rows={filteredItems ?? []} rowKey={(row) => row.id} emptyMessage={dateFilter.fromDate || dateFilter.toDate ? "Không có hồ sơ phù hợp trên trang đang xem." : "Chưa có hồ sơ rà soát trong phạm vi đã chọn."} columns={[
        ...(!machineId ? [{ key: "machine", header: "Máy", render: (row: OfflineViolationReview) => <span title={row.machineId}>{machineLabels?.[row.machineId] ?? row.machineId.slice(0, 8).toUpperCase()}</span> }] : []),
        { key: "time", header: "Thời điểm phát hiện", render: (row) => <TextLinkButton onClick={() => onSelect(row.id)}>{formatTime(row.detectedAt)}</TextLinkButton> },
        { key: "limit", header: "Giới hạn mất kết nối", align: "center", render: (row) => `${row.offlineLimitMinutes} phút` },
        { key: "status", header: "Trạng thái", render: (row) => <span className={styles.offlineReviewStatus} data-status={row.status}>{labels[row.status]}</span> },
      ]} />
      <Pagination page={page.page} hasNext={page.hasNext} isFetching={loading} ariaLabel={M.PAGINATE_OFFLINE_REVIEWS} onPageChange={onPageChange} previousLabel={M.PREVIOUS_PAGE} nextLabel={M.NEXT_PAGE} hideWhenSinglePage={false} />
    </> : null}
    </>}
    {detailLoading ? <p role="status">Đang tải chi tiết rà soát…</p> : null}
    {detailError ? <p className={styles.operationalOverviewErrorText} role="alert">{detailError}</p> : null}
    {detail && !detailLoading ? <OfflineReviewDetail key={detail.id} review={detail} canDecide={canDecide && !detailError} onDecide={onDecide} onClose={() => onSelect(undefined)} /> : null}
    </Panel>
  </>;
}

function OfflineReviewDetail({ review, canDecide, onDecide, onClose }: { review: OfflineViolationReview; canDecide: boolean; onDecide?: (id: string, body: OfflineViolationReviewDecisionRequest, files: File[]) => Promise<void>; onClose: () => void }) {
  const [decision, setDecision] = useState<"NO_ACTION" | "FOLLOW_UP">("FOLLOW_UP");
  const [reason, setReason] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const fileError = evidenceFileError(files, { min: 1, max: 5 });
  const [confirm, setConfirm] = useState(false), [pending, setPending] = useState(false), [error, setError] = useState("");
  const submitting = useRef(false);
  const draft = OfflineViolationReviewDecisionRequestSchema.safeParse({ decision, reason });
  const submit = async () => {
    if (submitting.current || !draft.success || fileError || !onDecide || review.status !== "REVIEW_REQUIRED") return;
    submitting.current = true; setPending(true); setError("");
    try { await onDecide(review.id, draft.data, files); setConfirm(false); }
    catch (requestError) { setConfirm(false); setError(requestError instanceof Error ? requestError.message : "Chưa thể ghi nhận kết quả. Hãy làm mới hồ sơ để kiểm tra trước khi thử lại."); }
    finally { submitting.current = false; setPending(false); }
  };
  return <div className={styles.offlineReviewDetail}>
    <div className={styles.operationalOverviewPanelHeading}><h3>Chi tiết rà soát</h3><ButtonBar disabled={pending} onClick={onClose}>Đóng chi tiết</ButtonBar></div>
    <dl className={styles.machineHeartbeatFields}>
      <div><dt>Trạng thái</dt><dd>{labels[review.status]}</dd></div><div><dt>Bắt đầu mất kết nối</dt><dd>{formatTime(review.observedOfflineSince)}</dd></div>
      <div><dt>Theo dõi gần nhất</dt><dd>{formatTime(review.lastObservedAt)}</dd></div><div><dt>Kết thúc mất kết nối</dt><dd>{formatTime(review.observedOfflineUntil)}</dd></div>
      {review.decision ? <><div><dt>Kết quả rà soát</dt><dd>{review.decision === "NO_ACTION" ? "Không cần xử lý thêm" : "Tiếp tục theo dõi, xử lý"}</dd></div><div><dt>Nội dung</dt><dd>{review.decisionReason ?? "—"}</dd></div><div><dt>Ghi nhận lúc</dt><dd>{formatTime(review.decidedAt)}</dd></div></> : null}
    </dl>
    <EvidenceList resource="OFFLINE_REVIEW" parentId={review.id} title="Chứng từ rà soát" />
    <p className={styles.telemetryRangeCaption}>Thời gian theo giờ máy chủ.</p>
    {canDecide && onDecide && review.status === "REVIEW_REQUIRED" ? <><PageActions actions={[{ id: "offline-review-decide", label: "Tiếp tục xác nhận", variant: "primary", priority: 50, type: "submit", form: "offline-review-decision-form", disabled: !draft.success || Boolean(fileError) || pending, disabledReason: fileError ?? "Nhập lý do hợp lệ.", pending }]} /><form id="offline-review-decision-form" className={styles.offlineReviewForm} onSubmit={(event) => { event.preventDefault(); if (draft.success && !fileError) setConfirm(true); }}>
      <label>Kết quả<select disabled={pending} value={decision} onChange={(event) => setDecision(event.target.value as typeof decision)}><option value="FOLLOW_UP">Tiếp tục theo dõi, xử lý</option><option value="NO_ACTION">Không cần xử lý thêm</option></select></label>
      <label>Lý do rà soát<textarea name="reason" required maxLength={2000} value={reason} disabled={pending} onChange={(event) => setReason(event.target.value)} /></label>
      <label>Chứng từ rà soát<input name="evidenceFiles" type="file" multiple accept={EVIDENCE_ACCEPT} disabled={pending} onChange={(event) => setFiles(Array.from(event.target.files ?? []))} /></label>
      {files.map((file, index) => <p key={`${file.name}-${index}`}>{file.name}</p>)}
    </form></> : null}
    {error ? <p className={styles.operationalOverviewErrorText} role="alert">{error}</p> : null}
    {confirm ? <NotificationDialog variant="confirm" title="Ghi nhận kết quả rà soát?" description={reason.trim()} onClose={() => { if (!pending) setConfirm(false); }} closeOnEscape={!pending} primaryAction={{ label: "Xác nhận kết quả", onClick: () => void submit(), pending, pendingLabel: "Đang ghi nhận…", disabled: pending }} secondaryAction={{ label: "Quay lại", disabled: pending, onClick: () => setConfirm(false) }} /> : null}
  </div>;
}
