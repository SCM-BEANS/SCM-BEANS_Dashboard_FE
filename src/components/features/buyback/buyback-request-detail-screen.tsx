import { useQuery } from "@tanstack/react-query";
import { buybacksApi } from "@/apis/buybacks.api";
import { ButtonBar } from "@/components/button/button-bar";
import { EvidenceList } from "@/components/evidence/evidence-list";
import { StatusBadge } from "@/components/status-badge/status-badge";
import { TruncatedId } from "@/components/truncated-id/truncated-id";
import { useOwnerNames } from "@/hooks/use-owner-names";
import { authScopedQuerySubject } from "@/lib/query-subject";
import { getApiErrorMessage } from "@/lib/api-errors";
import { BuybackIdSchema } from "@/schema/buybacks.schema";
import { buybackStatusLabels, formatBuybackDateTime, formatBuybackMoney } from "./buyback-formatters";
import { BuybackWorkflowLayout } from "./buyback-workflow-shared";
import styles from "./buyback-admin.module.css";

export function BuybackRequestDetailScreen({ caseId, role = "ADMIN", listHref = "/admin/buybacks" }: { caseId: string; role?: "ADMIN" | "MODERATOR" | "OWNER"; listHref?: string }) {
  const requestHref = role === "MODERATOR" ? `${listHref.replace(/\/list$/, "")}/${encodeURIComponent(caseId)}` : `${listHref}?caseId=${encodeURIComponent(caseId)}`;
  const validId = BuybackIdSchema.safeParse(caseId).success;
  const query = useQuery({
    queryKey: ["dolores", role === "OWNER" ? "owner" : "operator", "buyback", authScopedQuerySubject(role), caseId],
    queryFn: ({ signal }) => buybacksApi.getById(caseId, signal),
    enabled: validId,
    retry: false,
  });
  const item = query.data;
  const names = useOwnerNames(item && role !== "OWNER" ? [item.ownerId, item.responsibleModeratorId] : []);
  return <BuybackWorkflowLayout className={styles.screen} title="Chi tiết yêu cầu kỹ thuật"
    description="Thông tin yêu cầu thu mua máy, tình trạng xử lý và các tài liệu liên quan."
    back={{ label: "Về danh sách thu mua", fallbackHref: listHref }}>
    {!validId ? <p role="alert">Mã hồ sơ không hợp lệ.</p> : null}
    {validId && query.isPending ? <p role="status">Đang tải yêu cầu…</p> : null}
    {query.isError ? <div role="alert"><p>{getApiErrorMessage(query.error)}</p><ButtonBar type="button" onClick={() => void query.refetch()}>Thử lại</ButtonBar></div> : null}
    {item ? <>
      <div className={styles.requestLayout}>
        <section className={styles.card} aria-labelledby="buyback-request-info">
          <h2 id="buyback-request-info">Thông tin yêu cầu</h2>
          <dl className={styles.requestFacts}>
            <div><dt>Khách hàng</dt><dd>{role === "OWNER" ? "Bạn" : names.data?.[item.ownerId] || <TruncatedId value={item.ownerId} />}</dd></div>
            <div><dt>Thiết bị</dt><dd>{item.machineModelName ?? item.assetModelLabel ?? item.machineSerialNumber ?? item.assetSerial ?? "Chờ kiểm tra máy"}</dd></div>
            <div><dt>Loại yêu cầu</dt><dd>Thu mua và tân trang máy</dd></div>
            <div><dt>Ngày gửi</dt><dd>{formatBuybackDateTime(item.requestedAt || item.createdAt)}</dd></div>
          </dl>
          <div className={styles.requestDescription}><h3>Nội dung yêu cầu</h3><p>{item.reason || item.assetDescription || "Yêu cầu thu mua máy đã được tiếp nhận."}</p></div>
          <details className={styles.disclosure}><summary>Mã liên kết</summary><dl className={styles.facts}>
            <div><dt>Mã yêu cầu</dt><dd>{item.id}</dd></div>
            <div><dt>Hợp đồng</dt><dd>{item.contractId ? <TruncatedId value={item.contractId} /> : "Không có hợp đồng liên kết"}</dd></div>
            <div><dt>Máy đã đăng ký</dt><dd>{item.registeredMachineId ? <TruncatedId value={item.registeredMachineId} /> : "Chưa đăng ký máy"}</dd></div>
          </dl></details>
        </section>
        <section className={`${styles.card} ${styles.requestStatus}`} aria-labelledby="buyback-request-status">
          <h2 id="buyback-request-status">Tình trạng xử lý</h2>
          <StatusBadge variant="dot" status={item.status}>{buybackStatusLabels[item.status]}</StatusBadge>
          <dl className={styles.facts}>
            <div><dt>Điều phối viên</dt><dd>{item.responsibleModeratorId ? names.data?.[item.responsibleModeratorId] || <TruncatedId value={item.responsibleModeratorId} /> : "Chưa phân công"}</dd></div>
            <div><dt>Cập nhật gần nhất</dt><dd>{formatBuybackDateTime(item.updatedAt)}</dd></div>
          </dl>
          <ButtonBar rollingLabel href={`${requestHref}${role === "MODERATOR" ? "?" : "&"}view=work-order`}>Mở chi tiết lệnh</ButtonBar>
        </section>
      </div>
      <section className={styles.card} aria-labelledby="buyback-related-records">
        <h2 id="buyback-related-records">Phiếu và tài liệu liên quan</h2>
        <div className={styles.relatedRecords}>
          {item.inspection ? <article><h3>Biên bản kiểm tra máy</h3><dl className={styles.facts}>
            <div><dt>Kết quả</dt><dd>{item.inspection.condition}</dd></div>
            <div><dt>Giá đề xuất</dt><dd>{formatBuybackMoney(item.inspection.valuationAmount, item.inspection.currency)}</dd></div>
            <div><dt>Thời điểm kiểm tra</dt><dd>{formatBuybackDateTime(item.inspection.inspectedAt)}</dd></div>
            {item.inspection.notes ? <div><dt>Ghi chú</dt><dd>{item.inspection.notes}</dd></div> : null}
          </dl></article> : null}
          {item.refurbishment ? <article><h3>Biên bản tân trang</h3><dl className={styles.facts}>
            <div><dt>Nội dung thực hiện</dt><dd>{item.refurbishment.workPerformed || "Chưa ghi nhận"}</dd></div>
            <div><dt>Kết quả</dt><dd>{item.refurbishment.result || "Chưa có kết quả"}</dd></div>
            <div><dt>Hoàn tất lúc</dt><dd>{formatBuybackDateTime(item.refurbishment.completedAt)}</dd></div>
          </dl></article> : null}
          {!item.inspection && !item.refurbishment ? <p>Chưa có biên bản kiểm tra hoặc tân trang.</p> : null}
        </div>
        <div className={styles.relatedEvidence}><EvidenceList resource="BUYBACK_CASE" parentId={item.id} title="Tài liệu yêu cầu" showSize={false} pageSize={10} /></div>
      </section>
    </> : null}
  </BuybackWorkflowLayout>;
}
