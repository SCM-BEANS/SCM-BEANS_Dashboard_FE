import { useQuery } from "@tanstack/react-query";
import { BackButtonHeading } from "@/components/navigation/back-button-heading";
import { DataTable } from "@/components/table/data-table";
import { repairCostReviewsApi } from "@/apis/repair-cost-reviews.api";
import { getApiErrorMessage } from "@/lib/api-errors";
import { RepairCostReviewIdSchema, type RepairCostReview } from "@/schema/repair-cost-reviews.schema";
import { querySubject, type RepairWorkflowRole } from "@/components/features/repair-workflow/repair-workflow-query-identity";
import { EvidenceList } from "@/components/evidence/evidence-list";
import styles from "./repair-cost-review-screen.module.css";

const labels: Record<string, string> = {
  PROPOSED: "Chờ xem xét", DISPUTED: "Đang tranh chấp", OWNER_ACKNOWLEDGED: "Khách hàng đã xác nhận",
  APPROVED_PENDING_OWNER_ACK: "Chờ khách hàng xác nhận", RESOLVED_PENDING_OWNER_ACK: "Chờ xác nhận sau phân xử",
  APPROVED_NO_OWNER_CHARGE: "Không tính phí khách hàng", COLLECTIBLE: "Đủ điều kiện thu phí", REJECTED: "Đã từ chối",
  NORMAL_WEAR: "Hao mòn thông thường", WARRANTY_OR_MACHINE_FAULT: "Bảo hành hoặc lỗi máy", MISUSE: "Sử dụng sai cách", EXTERNAL_DAMAGE: "Hư hỏng do tác động bên ngoài", UNDETERMINED: "Chưa xác định",
  PARTS: "Linh kiện", LABOR: "Nhân công", TRANSPORT: "Vận chuyển", OTHER: "Chi phí khác",
  COMPANY: "Dolores", TENANT: "Khách hàng", OWNER: "Khách hàng", UNKNOWN: "Chưa xác định",
};
function formatAmount(value: number | string | null | undefined, currency?: string | null) {
  if (value === null || value === undefined) return "—";
  const amount = Number(value);
  if (!Number.isFinite(amount)) return String(value);
  const validCurrency = currency && /^[A-Za-z]{3}$/.test(currency) ? currency.toUpperCase() : "VND";
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: validCurrency,
    maximumFractionDigits: 2,
  }).format(amount);
}

function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  const timestamp = Date.parse(value);
  return Number.isNaN(timestamp)
    ? value
    : new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium", timeStyle: "short" }).format(timestamp);
}

function ActionGate({ role, status }: { role: RepairWorkflowRole; status: RepairCostReview["status"] }) {
  const ownerMustAct = status === "APPROVED_PENDING_OWNER_ACK" || status === "RESOLVED_PENDING_OWNER_ACK";
  const operatorMustAct = status === "PROPOSED" || status === "DISPUTED";
  const message = role === "owner" && ownerMustAct
    ? "Chưa thể xác nhận hoặc tranh chấp vì màn hình chưa có API tải lên và xem nội dung minh chứng riêng tư."
    : (role === "admin" || role === "moderator") && operatorMustAct
      ? "Chưa thể duyệt hoặc phân xử vì chưa có API đọc minh chứng riêng tư để đối chiếu."
      : role === "technician" && status === "PROPOSED"
        ? "Chưa thể gửi đề xuất chi phí vì chưa có API tải lên minh chứng riêng tư gắn với ticket."
        : "Chưa có thao tác cần thực hiện ở vai trò và trạng thái hiện tại.";

  return (
    <section className={styles.notice} aria-labelledby="repair-cost-actions-title">
      <h2 id="repair-cost-actions-title">Bước tiếp theo</h2>
      <p>{message}</p>
      {role === "owner" && ownerMustAct ? (
        <div className={styles.actions}>
          <button className={styles.disabledButton} type="button" disabled aria-describedby="repair-cost-action-reason">Xác nhận số tiền</button>
          <button className={styles.disabledButton} type="button" disabled aria-describedby="repair-cost-action-reason">Tranh chấp chi phí</button>
        </div>
      ) : null}
      {(role === "admin" || role === "moderator") && operatorMustAct ? (
        <div className={styles.actions}>
          <button className={styles.disabledButton} type="button" disabled aria-describedby="repair-cost-action-reason">Ghi quyết định</button>
          {status === "DISPUTED" ? <button className={styles.disabledButton} type="button" disabled aria-describedby="repair-cost-action-reason">Phân xử tranh chấp</button> : null}
        </div>
      ) : null}
      <p className={styles.hint} id="repair-cost-action-reason">Các thao tác tài chính không được tự động bỏ qua điều kiện minh chứng hoặc quyền của Owner.</p>
    </section>
  );
}

export function RepairCostReviewScreen({
  reviewId,
  role,
  listHref,
}: {
  reviewId: string;
  role: RepairWorkflowRole;
  listHref: string;
}) {
  const validId = RepairCostReviewIdSchema.safeParse(reviewId).success;
  const review = useQuery({
    queryKey: ["dolores", "repair-cost-reviews", querySubject(role), reviewId],
    queryFn: ({ signal }) => repairCostReviewsApi.getById(reviewId, signal),
    enabled: validId,
    retry: false,
  });

  return (
    <section className={styles.pageContent} data-role={role} aria-labelledby="repair-cost-review-title">
      <BackButtonHeading
        back={{ label: role === "owner" ? "Quay lại thông báo" : "Về danh sách yêu cầu", fallbackHref: listHref }}
        title="Xem xét chi phí sửa chữa"
        titleId="repair-cost-review-title"
        description="Theo dõi đề xuất, quyết định và trạng thái phần chi phí sửa chữa."
        className={styles.pageHeading}
      />
      {!validId ? <p className={styles.notice} role="alert">Mã xem xét chi phí không hợp lệ.</p> : null}
      {validId && review.isPending ? <p className={styles.notice} role="status">Đang tải thông tin xem xét…</p> : null}
      {validId && review.isError ? (
        <div className={[styles.notice, styles.error].join(" ")} role="alert">
          <p>{getApiErrorMessage(review.error)}</p>
          <button className={styles.button} type="button" onClick={() => void review.refetch()}>Thử lại</button>
        </div>
      ) : null}
      {review.data ? (
        <>
          <div className={styles.reviewLayout}>
          <div className={styles.reviewMain}>
          <section className={styles.notice}>
            <h2>Chẩn đoán</h2>
            <p>{review.data.diagnosis}</p>
          </section>
          {review.data.disputeReason ? (
            <section className={styles.notice}>
              <h2>Nội dung tranh chấp</h2>
              <p>{review.data.disputeReason}</p>
              <p>Số tiền đang tranh chấp: {formatAmount(review.data.disputedAmount, review.data.currency)}</p>
              <p>Phần chưa tranh chấp: {formatAmount(review.data.undisputedAmount, review.data.currency)}</p>
            </section>
          ) : null}
          <section className={styles.panel}>
            <h2>Thành phần chi phí ({review.data.costComponents.length})</h2>
            <DataTable
              variant="accounts"
              className={styles.costTable}
              style={{ minWidth: 0 }}
              rows={review.data.costComponents}
              rowKey={(item) => item.id}
              emptyMessage="Không có thành phần chi phí."
              columns={[
                { key: "category", header: "Loại", render: (item) => labels[item.category] ?? item.category },
                { key: "description", header: "Mô tả", render: (item) => item.description },
                { key: "quantity", header: "Số lượng", render: (item) => item.quantity },
                { key: "unit-price", header: "Đơn giá", render: (item) => formatAmount(item.unitPrice, review.data?.currency) },
                { key: "amount", header: "Thành tiền", render: (item) => formatAmount(item.amount, review.data?.currency) },
              ]}
            />
          </section>
          </div>
          <aside className={styles.reviewSidebar}>
            <section className={styles.panel}><h2>Tóm tắt chi phí</h2>
          <dl className={styles.detailGrid}>
            <div><dt>Trạng thái</dt><dd>{labels[review.data.status] ?? review.data.status}</dd></div>
            <div><dt>Nguyên nhân đề xuất</dt><dd>{labels[review.data.cause] ?? review.data.cause}</dd></div>
            <div><dt>Trách nhiệm đề xuất</dt><dd>{labels[review.data.proposedResponsibleParty] ?? review.data.proposedResponsibleParty}</dd></div>
            <div><dt>Số tiền đề xuất</dt><dd>{formatAmount(review.data.estimatedAmount, review.data.currency)}</dd></div>
            <div><dt>Số tiền đã duyệt</dt><dd>{formatAmount(review.data.approvedAmount, review.data.currency)}</dd></div>
            <div><dt>Trách nhiệm đã duyệt</dt><dd>{review.data.approvedResponsibleParty ? labels[review.data.approvedResponsibleParty] ?? review.data.approvedResponsibleParty : "Chưa quyết định"}</dd></div>
          </dl>            </section>
            <ActionGate role={role} status={review.data.status} />
          </aside>
          </div>
          <details className={styles.panel}><summary>Thông tin đối chiếu</summary><dl className={styles.detailGrid}>
            <div><dt>Mã xem xét</dt><dd className={styles.code}>{review.data.id}</dd></div>
            <div><dt>Ticket</dt><dd className={styles.code}>{review.data.maintenanceTicketId}</dd></div>
            <div><dt>Máy</dt><dd className={styles.code}>{review.data.machineId}</dd></div>
            <div><dt>Thời điểm tạo</dt><dd>{formatDate(review.data.createdAt)}</dd></div>
            <div><dt>Minh chứng</dt><dd>{review.data.evidenceReferences ? "Đã đính kèm minh chứng riêng tư" : "Chưa có minh chứng"}</dd></div>
            {review.data.currentInvoiceId ? <div><dt>Hóa đơn liên quan</dt><dd className={styles.code}>{review.data.currentInvoiceId}</dd></div> : null}</dl></details>
          <details className={styles.panel}><summary>Chứng từ rà soát chi phí</summary>
            <EvidenceList resource="REPAIR_COST_REVIEW" parentId={reviewId} title="Chứng từ rà soát chi phí" />
          </details>
          <details className={styles.panel}>
            <summary>Lịch sử quyết định ({review.data.decisions.length})</summary>
            {review.data.decisions.length ? (
              <ol className={styles.timeline}>
                {review.data.decisions.map((decision) => (
                  <li key={decision.id}>
                    <strong>{decision.type} · {decision.actorRole ?? "—"}</strong>
                    <span>{formatDate(decision.occurredAt)} · {formatAmount(decision.amount, decision.currency)}</span>
                    {decision.reason ? <p>{decision.reason}</p> : null}
                  </li>
                ))}
              </ol>
            ) : <p>Chưa có quyết định nào.</p>}
          </details>
        </>
      ) : null}
    </section>
  );
}
