import { useRef, useState } from "react";
import { ButtonBar } from "@/components/button/button-bar";
import { DataTable } from "@/components/table/data-table";
import { NotificationDialog } from "@/components/notification-dialog/notification-dialog";
import { OfflineViolationReviewDecisionRequestSchema, type OfflineViolationReview, type OfflineViolationReviewDecisionRequest } from "@/schema/offline-violation-reviews.schema";
import styles from "./machines.module.css";

const labels = { OBSERVING: "Đang theo dõi", REVIEW_REQUIRED: "Cần rà soát", REVIEWED: "Đã rà soát", CLEARED: "Đã kết thúc theo dõi" };
const formatTime = (value: string | null) => value ? `${value.slice(11, 19)} ${value.slice(0, 10).split("-").reverse().join("/")}` : "—";
type Page = { items: OfflineViolationReview[]; page: number; size: number; hasNext: boolean };

export function OfflineReviewPanel({ page, detail, status, machineId, machineLabels, canDecide, loading, detailLoading, error, detailError, onFilterChange, onPageChange, onSelect, onRefresh, onDecide }: {
  page?: Page; detail?: OfflineViolationReview; status: string; machineId?: string; machineLabels?: Record<string, string>; canDecide: boolean;
  loading?: boolean; detailLoading?: boolean; error?: string; detailError?: string;
  onFilterChange: (status: string) => void; onPageChange: (page: number) => void;
  onSelect: (id: string | undefined) => void; onRefresh: () => void;
  onDecide?: (id: string, body: OfflineViolationReviewDecisionRequest) => Promise<void>;
}) {
  return <section className={styles.smartIotPanel} aria-label="Rà soát mất kết nối">
    <div className={styles.operationalOverviewPanelHeading}><h2>Rà soát mất kết nối</h2><ButtonBar onClick={onRefresh} disabled={loading}>Làm mới</ButtonBar></div>
    <label className={styles.telemetryFieldSelector}>Trạng thái rà soát<select value={status} onChange={(event) => onFilterChange(event.target.value)}>
      <option value="">Tất cả</option>{Object.entries(labels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
    </select></label>
    {loading ? <p role="status">Đang tải hồ sơ rà soát…</p> : null}
    {error ? <p className={styles.operationalOverviewErrorText} role="alert">{error}</p> : page ? <>
      <DataTable headerVariant="admin" rows={page.items} rowKey={(row) => row.id} emptyMessage="Chưa có hồ sơ rà soát trong phạm vi đã chọn." columns={[
        ...(!machineId ? [{ key: "machine", header: "Máy", render: (row: OfflineViolationReview) => <span title={row.machineId}>{machineLabels?.[row.machineId] ?? row.machineId.slice(0, 8).toUpperCase()}</span> }] : []),
        { key: "time", header: "Phát hiện lúc · giờ máy chủ", render: (row) => formatTime(row.detectedAt) },
        { key: "limit", header: "Giới hạn mất kết nối", align: "center", render: (row) => `${row.offlineLimitMinutes} phút` },
        { key: "status", header: "Trạng thái", render: (row) => <span className={styles.offlineReviewStatus} data-status={row.status}>{labels[row.status]}</span> },
        { key: "open", header: "Chi tiết", render: (row) => <ButtonBar onClick={() => onSelect(row.id)}>Xem hồ sơ</ButtonBar> },
      ]} />
      <div className={styles.offlineReviewPagination}><ButtonBar disabled={page.page === 0 || loading} onClick={() => onPageChange(page.page - 1)}>Trang trước</ButtonBar><span>Trang {page.page + 1}</span><ButtonBar disabled={!page.hasNext || loading} onClick={() => onPageChange(page.page + 1)}>Trang sau</ButtonBar></div>
    </> : null}
    {detailLoading ? <p role="status">Đang tải chi tiết rà soát…</p> : null}
    {detailError ? <p className={styles.operationalOverviewErrorText} role="alert">{detailError}</p> : null}
    {detail && !detailLoading ? <OfflineReviewDetail key={detail.id} review={detail} canDecide={canDecide && !detailError} onDecide={onDecide} onClose={() => onSelect(undefined)} /> : null}
  </section>;
}

function OfflineReviewDetail({ review, canDecide, onDecide, onClose }: { review: OfflineViolationReview; canDecide: boolean; onDecide?: (id: string, body: OfflineViolationReviewDecisionRequest) => Promise<void>; onClose: () => void }) {
  const [decision, setDecision] = useState<"NO_ACTION" | "FOLLOW_UP">("FOLLOW_UP");
  const [reason, setReason] = useState(""), [evidence, setEvidence] = useState("");
  const [confirm, setConfirm] = useState(false), [pending, setPending] = useState(false), [error, setError] = useState("");
  const submitting = useRef(false);
  const draft = OfflineViolationReviewDecisionRequestSchema.safeParse({ decision, reason, evidenceReferences: evidence });
  const submit = async () => {
    if (submitting.current || !draft.success || !onDecide || review.status !== "REVIEW_REQUIRED") return;
    submitting.current = true; setPending(true); setError("");
    try { await onDecide(review.id, draft.data); setConfirm(false); }
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
    <p className={styles.telemetryRangeCaption}>Thời gian giữ theo giờ máy chủ; dữ liệu rà soát không tự áp dụng tiền phạt hoặc công nợ.</p>
    {canDecide && review.status === "REVIEW_REQUIRED" ? <form className={styles.offlineReviewForm} onSubmit={(event) => { event.preventDefault(); if (draft.success) setConfirm(true); }}>
      <label>Kết quả<select disabled={pending} value={decision} onChange={(event) => setDecision(event.target.value as typeof decision)}><option value="FOLLOW_UP">Tiếp tục theo dõi, xử lý</option><option value="NO_ACTION">Không cần xử lý thêm</option></select></label>
      <label>Lý do rà soát<textarea name="reason" required maxLength={2000} value={reason} disabled={pending} onChange={(event) => setReason(event.target.value)} /></label>
      <label>Mã tham chiếu minh chứng riêng tư<input name="evidenceReferences" required maxLength={2000} placeholder="private://…" value={evidence} disabled={pending} onChange={(event) => setEvidence(event.target.value)} /></label>
      <ButtonBar type="submit" disabled={!draft.success || pending}>Tiếp tục xác nhận</ButtonBar>
    </form> : null}
    {error ? <p className={styles.operationalOverviewErrorText} role="alert">{error}</p> : null}
    {confirm ? <NotificationDialog variant="confirm" title="Ghi nhận kết quả rà soát?" description={reason.trim()} onClose={() => { if (!pending) setConfirm(false); }} closeOnEscape={!pending} primaryAction={{ label: "Xác nhận kết quả", onClick: () => void submit(), pending, pendingLabel: "Đang ghi nhận…", disabled: pending }} secondaryAction={{ label: "Quay lại", disabled: pending, onClick: () => setConfirm(false) }} /> : null}
  </div>;
}
