import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { machinesApi } from "@/apis/machines.api";
import { profilesApi } from "@/apis/profiles.api";
import { recallWorkOrdersApi } from "@/apis/recall-work-orders.api";
import { terminationCasesApi } from "@/apis/termination-cases.api";
import { ButtonBar } from "@/components/button/button-bar";
import { getBillingWorkflowErrorMessage as getApiErrorMessage } from "@/lib/api-errors";
import type { TerminationCaseStatus } from "@/schema/termination-cases.schema";
import type { RecallWorkOrderStatus } from "@/schema/recall-work-orders.schema";
import { RefundWorkflowPanel, useRefundDetail } from "@/components/features/billing/refund-workflow-panel";
import styles from "./termination-workflow-panel.module.css";

type Props = {
  mode: "operator" | "owner";
  role: "ADMIN" | "MODERATOR" | "OWNER";
  contractId: string;
  caseId?: string | null;
  contractStatus?: string | null;
};

function correlationId(prefix: string) {
  return `${prefix}-${globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`}`;
}

function formatDateTime(value?: string | null) {
  if (!value) return "Chưa cập nhật";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function formatVnd(value: number) {
  return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 2 }).format(value);
}

const caseStatusLabels: Record<TerminationCaseStatus, string> = {
  REQUESTED: "Đang chờ xử lý",
  RECOVERY_PENDING: "Đang thu hồi máy",
  INSPECTION_PENDING: "Chờ kiểm tra máy",
  SETTLEMENT_PENDING: "Chờ quyết toán",
  APPROVED: "Đã duyệt quyết toán",
  COMPLETED: "Đã kết thúc hợp đồng",
  REJECTED: "Đã từ chối",
};

const recallStatusLabels: Record<RecallWorkOrderStatus, string> = {
  UNASSIGNED: "Chưa phân công",
  ASSIGNED: "Đã phân công kỹ thuật viên",
  SCHEDULED: "Đã lên lịch nhận máy",
  PICKUP_IN_PROGRESS: "Đang nhận máy",
  OWNER_ACK_PENDING: "Chờ khách hàng xác nhận bàn giao",
  CUSTODY_VERIFICATION_PENDING: "Chờ kỹ thuật viên xác nhận máy về kho",
  RECEIPT_REVIEW_PENDING: "Chờ duyệt biên nhận tại kho",
  RECEIVED_AT_DEPOT: "Đã nhận máy tại kho",
  LEGACY_REVIEW_REQUIRED: "Cần rà soát hồ sơ cũ",
  CANCELLED: "Đã hủy",
};

function ErrorNotice({ error }: { error: unknown }) {
  return error ? <p className={styles.error} role="alert">{getApiErrorMessage(error, "mutation")}</p> : null;
}

export function TerminationWorkflowPanel({ mode, role, contractId, caseId, contractStatus }: Props) {
  const queryClient = useQueryClient();
  const [selectedRecallId, setSelectedRecallId] = useState("");
  const [technicianId, setTechnicianId] = useState("");
  const [scheduledPickupAt, setScheduledPickupAt] = useState("");
  const [receiptReason, setReceiptReason] = useState("");
  const [receiptLocation, setReceiptLocation] = useState("");
  const [ownerConditionNotes, setOwnerConditionNotes] = useState("");
  const [ownerEvidenceId, setOwnerEvidenceId] = useState("");
  const [evidenceFile, setEvidenceFile] = useState<File | null>(null);
  const [inspectionAssignedTo, setInspectionAssignedTo] = useState("");
  const [downloadError, setDownloadError] = useState("");
  const [settlementDecision, setSettlementDecision] = useState<"NO_DAMAGE" | "DAMAGE" | "PARTIAL_DAMAGE">("NO_DAMAGE");
  const [damageAmount, setDamageAmount] = useState("0");
  const [penaltyAmount, setPenaltyAmount] = useState("0");
  const [outstandingAmount, setOutstandingAmount] = useState("0");
  const [settlementEvidenceReference, setSettlementEvidenceReference] = useState("");
  const settlementAttempts = useRef(new Map<string, { idempotencyKey: string; correlationId: string }>());

  const recallOrders = useQuery({
    queryKey: ["dolores", "recall-work-orders", "contract", contractId],
    queryFn: ({ signal }) => recallWorkOrdersApi.list({ contractId, page: 0, size: 100 }, signal),
    enabled: Boolean(contractId),
    retry: false,
  });
  const contractRecallOrders = useMemo(() => {
    const orders = recallOrders.data?.content ?? [];
    return caseId ? orders.filter((order) => order.terminationCaseId === caseId) : orders;
  }, [caseId, recallOrders.data]);
  const selectedRecallIsAvailable = contractRecallOrders.some((order) => order.id === selectedRecallId);
  const recallId = selectedRecallIsAvailable ? selectedRecallId : contractRecallOrders[0]?.id ?? "";
  const selectedRecallSummary = contractRecallOrders.find((order) => order.id === recallId);
  const resolvedCaseId = caseId ?? selectedRecallSummary?.terminationCaseId ?? "";
  const terminationCase = useQuery({
    queryKey: ["dolores", "termination-cases", "id", resolvedCaseId],
    queryFn: async ({ signal }) => {
      const result = await terminationCasesApi.getById(resolvedCaseId, signal);
      if (result.contractId !== contractId) throw new Error("Hồ sơ chấm dứt không thuộc hợp đồng đang xem.");
      return result;
    },
    enabled: Boolean(resolvedCaseId),
    retry: false,
  });
  const recallOrder = useQuery({
    queryKey: ["dolores", "recall-work-orders", "id", recallId],
    queryFn: ({ signal }) => recallWorkOrdersApi.getById(recallId, signal),
    enabled: Boolean(recallId),
    retry: false,
  });
  const recallEvents = useQuery({
    queryKey: ["dolores", "recall-work-orders", "events", recallId],
    queryFn: ({ signal }) => recallWorkOrdersApi.listEvents(recallId, 0, 50, signal),
    enabled: Boolean(recallId),
    retry: false,
  });
  const recallEvidence = useQuery({
    queryKey: ["dolores", "recall-work-orders", "evidence", recallId],
    queryFn: ({ signal }) => recallWorkOrdersApi.listEvidence(recallId, signal),
    enabled: Boolean(recallId),
    retry: false,
  });
  const technicians = useQuery({
    queryKey: ["dolores", "profiles", "termination-technicians"],
    queryFn: async ({ signal }) => (await profilesApi.list({ role: "TECHNICIAN", status: "ACTIVE", page: 0, size: 100 }, signal)).items
      .filter((profile) => profile.status === "ACTIVE" && profile.emailVerified && profile.roles.includes("TECHNICIAN")),
    enabled: mode === "operator",
    retry: false,
  });
  const inspectionTicketId = terminationCase.data?.inspectionTicketId ?? "";
  const inspectionTicket = useQuery({
    queryKey: ["dolores", "termination-inspection-ticket", inspectionTicketId],
    queryFn: ({ signal }) => machinesApi.getMaintenanceTicketById(inspectionTicketId, signal),
    enabled: Boolean(inspectionTicketId),
    retry: false,
  });
  const caseData = terminationCase.data;
  const parsedDamageAmount = Number(damageAmount);
  const parsedPenaltyAmount = Number(penaltyAmount);
  const parsedOutstandingAmount = Number(outstandingAmount);
  const settlementRuleError = caseData?.type === "NORMAL" && parsedPenaltyAmount > 0
    ? "Hợp đồng kết thúc theo kỳ hạn không được tính tiền phạt."
    : caseData?.type !== "NORMAL" && caseData?.type !== undefined && parsedPenaltyAmount <= 0
      ? "Chấm dứt trước hạn hoặc do vi phạm cần có tiền phạt lớn hơn 0."
      : settlementDecision === "NO_DAMAGE" && parsedDamageAmount > 0
        ? "Không ghi nhận hư hỏng thì chi phí hư hỏng phải bằng 0."
        : "";
  const canSubmitSettlement = Boolean(
    settlementEvidenceReference.trim()
    && damageAmount.trim() !== ""
    && penaltyAmount.trim() !== ""
    && outstandingAmount.trim() !== ""
    && Number.isFinite(parsedDamageAmount) && parsedDamageAmount >= 0
    && Number.isFinite(parsedPenaltyAmount) && parsedPenaltyAmount >= 0
    && Number.isFinite(parsedOutstandingAmount) && parsedOutstandingAmount >= 0
    && !settlementRuleError,
  );
  const refundContext = { ownerId: caseData?.ownerId ?? "", contractId, terminationCaseId: resolvedCaseId, kind: "DEPOSIT" as const };
  const refund = useRefundDetail(caseData?.refundId ?? "", role, refundContext);
  const inspectionResolved = Boolean(inspectionTicket.data
    && inspectionTicket.data.id === inspectionTicketId
    && inspectionTicket.data.contractId === contractId
    && inspectionTicket.data.machineId === caseData?.machineId
    && inspectionTicket.data.terminationCaseId === resolvedCaseId
    && inspectionTicket.data.status === "RESOLVED" && inspectionTicket.data.completedAt
    && !inspectionTicket.isError);
  const handoverReady = Boolean(caseData?.handoverEvidenceReference
    && recallOrder.data?.terminationCaseId === resolvedCaseId
    && recallOrder.data.status === "RECEIVED_AT_DEPOT" && !recallOrder.isError);
  const refundComplete = caseData?.depositRefundAmount === 0
    ? !caseData.refundId
    : Boolean(caseData?.depositRefundAmount != null && caseData.refundId && !refund.isError
      && refund.data?.status === "COMPLETED" && refund.data.amount === caseData.depositRefundAmount);
  const canComplete = Boolean(caseData?.status === "APPROVED" && caseData.settlementId
    && contractStatus === "ACTIVE" && inspectionResolved && handoverReady && refundComplete);


  useEffect(() => {
    const firstId = contractRecallOrders[0]?.id;
    if (firstId && !contractRecallOrders.some((item) => item.id === selectedRecallId)) {
      setSelectedRecallId(firstId);
    }
    if (!firstId && selectedRecallId) setSelectedRecallId("");
  }, [contractRecallOrders, selectedRecallId]);

  const refresh = async (recallWorkOrderId = recallId) => {
    await Promise.all([
      ...(resolvedCaseId ? [queryClient.invalidateQueries({ queryKey: ["dolores", "termination-cases", "id", resolvedCaseId] })] : []),
      queryClient.invalidateQueries({ queryKey: ["dolores", "contracts", "id", contractId] }),
      queryClient.invalidateQueries({ queryKey: ["dolores", "contract-expiry", contractId] }),
      queryClient.invalidateQueries({ queryKey: ["dolores", "recall-work-orders", "contract", contractId] }),
      ...(recallWorkOrderId ? [
        queryClient.invalidateQueries({ queryKey: ["dolores", "recall-work-orders", "id", recallWorkOrderId] }),
        queryClient.invalidateQueries({ queryKey: ["dolores", "recall-work-orders", "events", recallWorkOrderId] }),
        queryClient.invalidateQueries({ queryKey: ["dolores", "recall-work-orders", "evidence", recallWorkOrderId] }),
      ] : []),
      ...(inspectionTicketId ? [queryClient.invalidateQueries({ queryKey: ["dolores", "termination-inspection-ticket", inspectionTicketId] })] : []),
    ]);
  };

  const beginRecovery = useMutation({
    mutationFn: () => terminationCasesApi.beginRecovery(resolvedCaseId, { correlationId: correlationId("termination-recovery") }),
    onSuccess: () => refresh(),
  });
  const createInspectionTicket = useMutation({
    mutationFn: () => terminationCasesApi.createInspectionTicket(resolvedCaseId, { correlationId: correlationId("termination-inspection") }),
    onSuccess: () => refresh(),
  });
  const rejectCase = useMutation({
    mutationFn: (reason: string) => terminationCasesApi.reject(resolvedCaseId, { reason, correlationId: correlationId("termination-reject") }),
    onSuccess: () => refresh(),
  });
  const completeCase = useMutation({
    mutationFn: () => terminationCasesApi.complete(resolvedCaseId, { correlationId: correlationId("termination-complete") }),
    onSuccess: () => refresh(),
  });
  const settleCase = useMutation({
    mutationFn: () => {
      const payload = { decision: settlementDecision, damageAmount: parsedDamageAmount,
        penaltyAmount: parsedPenaltyAmount, outstandingAmount: parsedOutstandingAmount,
        evidenceReference: settlementEvidenceReference.trim() };
      const signature = JSON.stringify({ caseId: resolvedCaseId, ...payload });
      const attempt = settlementAttempts.current.get(signature) ?? {
        idempotencyKey: correlationId("termination-settlement-idempotency"), correlationId: correlationId("termination-settlement"),
      };
      settlementAttempts.current.set(signature, attempt);
      return terminationCasesApi.settle(resolvedCaseId, { ...payload, ...attempt });
    },
    onSuccess: () => refresh(),
    onError: () => refresh(),
  });
  const assignRecall = useMutation({
    mutationFn: () => recallWorkOrdersApi.assign(recallId, {
      technicianId,
      ...(scheduledPickupAt ? { scheduledPickupAt: scheduledPickupAt.length === 16 ? `${scheduledPickupAt}:00` : scheduledPickupAt } : {}),
      correlationId: correlationId("recall-assignment"),
    }),
    onSuccess: () => refresh(recallId),
  });
  const reviewReceipt = useMutation({
    mutationFn: (approved: boolean) => recallWorkOrdersApi.reviewDepotReceipt(recallId, {
      approved,
      ...(receiptReason.trim() ? { reason: receiptReason.trim() } : {}),
      correlationId: correlationId("recall-receipt-review"),
    }),
    onSuccess: () => { setReceiptReason(""); return refresh(recallId); },
  });
  const uploadEvidence = useMutation({
    mutationFn: (input: { type: "OWNER_HANDOVER"; file: File }) => recallWorkOrdersApi.uploadEvidence(recallId, input.type, correlationId("recall-evidence"), input.file),
    onSuccess: async (evidence) => {
      setOwnerEvidenceId(evidence.id);
      setEvidenceFile(null);
      await refresh(recallId);
    },
  });
  const acknowledgeHandover = useMutation({
    mutationFn: () => recallWorkOrdersApi.acknowledgeOwner(recallId, {
      conditionNotes: ownerConditionNotes.trim(),
      evidenceId: ownerEvidenceId,
      correlationId: correlationId("owner-handover"),
    }),
    onSuccess: () => { setOwnerEvidenceId(""); setOwnerConditionNotes(""); return refresh(recallId); },
  });
  const assignInspection = useMutation({
    mutationFn: () => machinesApi.assignMaintenanceTicket(inspectionTicketId, { technicianId, assignedTo: inspectionAssignedTo.trim() || undefined }),
    onSuccess: () => refresh(),
  });

  const recallData = recallOrder.data;
  const downloadEvidence = async (evidenceId: string, filename: string) => {
    setDownloadError("");
    try {
      const { blob } = await recallWorkOrdersApi.downloadEvidence(recallId, evidenceId);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = filename.replace(/[\\/:*?"<>|\u0000-\u001f]/g, "_").slice(0, 180) || "recall-evidence";
      anchor.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error) {
      setDownloadError(getApiErrorMessage(error));
    }
  };

  return (
    <section className={styles.panel} aria-labelledby="termination-workflow-title">
      <div className={styles.heading}>
        <div>
          <h2 id="termination-workflow-title">Chấm dứt hợp đồng và thu hồi máy</h2>
          <p>{mode === "operator"
            ? "Theo dõi hồ sơ, điều phối thu hồi và kiểm tra máy theo trạng thái backend."
            : "Theo dõi lịch thu hồi và xác nhận tình trạng máy khi bàn giao cho kỹ thuật viên."}</p>
        </div>
        <div className={styles.actions}>
          {caseData ? <span className={styles.status}>{caseStatusLabels[caseData.status]}</span> : null}
          <ButtonBar type="button" disabled={terminationCase.isFetching || recallOrders.isFetching || recallOrder.isFetching || inspectionTicket.isFetching || refund.isFetching} onClick={() => { void refresh(); if (caseData?.refundId) void refund.refetch(); }}>Làm mới hồ sơ</ButtonBar>
        </div>
      </div>

      {mode === "operator" && !resolvedCaseId ? <p className={styles.notice}>Chưa có mã hồ sơ chấm dứt được liên kết với trang này. Tạo hồ sơ từ thao tác hợp đồng để bắt đầu quy trình.</p> : null}
      {resolvedCaseId && terminationCase.isPending ? <p className={styles.notice} role="status">Đang tải hồ sơ chấm dứt…</p> : null}
      {resolvedCaseId && terminationCase.isError ? <p className={styles.error} role="alert">Không tải được hồ sơ chấm dứt: {getApiErrorMessage(terminationCase.error)}</p> : null}
      {caseData ? (
        <>
          <dl className={styles.summary}>
            <div><dt>Mã hồ sơ</dt><dd>{caseData.id}</dd></div>
            <div><dt>Loại yêu cầu</dt><dd>{caseData.type === "NORMAL" ? "Kết thúc theo kỳ hạn" : caseData.type === "EARLY" ? "Chấm dứt trước hạn" : "Chấm dứt do vi phạm"}</dd></div>
            <div><dt>Lý do</dt><dd>{caseData.reason || "Chưa ghi lý do"}</dd></div>
            <div><dt>Ngày hiệu lực</dt><dd>{caseData.effectiveDate ?? "Chưa xác định"}</dd></div>
            <div><dt>Cập nhật</dt><dd>{formatDateTime(caseData.updatedAt)}</dd></div>
          </dl>

          {mode === "operator" ? (
            <div className={styles.actions}>
              {caseData.status === "REQUESTED" ? (
                <>
                  <ButtonBar type="button" disabled={beginRecovery.isPending} onClick={() => beginRecovery.mutate()}>
                    {beginRecovery.isPending ? "Đang mở thu hồi…" : "Bắt đầu thu hồi máy"}
                  </ButtonBar>
                  <label className={styles.rejectField}>Lý do từ chối<textarea value={receiptReason} maxLength={1000} onChange={(event) => setReceiptReason(event.target.value)} placeholder="Nhập lý do nếu yêu cầu chưa thể xử lý" /></label>
                  <ButtonBar type="button" disabled={!receiptReason.trim() || rejectCase.isPending} onClick={() => rejectCase.mutate(receiptReason.trim())}>Từ chối hồ sơ</ButtonBar>
                </>
              ) : null}
              {caseData.status === "APPROVED" ? (
                <>
                  <p className={styles.notice}>Hồ sơ đã được duyệt. Hoàn tất sẽ chấm dứt hợp đồng và cập nhật máy về kho.</p>
                  {!canComplete ? <p className={styles.notice}>Chưa đủ điều kiện hoàn tất: cần bàn giao hợp lệ, phiếu kiểm tra đã hoàn tất, quyết toán đã lưu và khoản hoàn cọc (nếu có) đã được khách hàng xác nhận nhận đủ.</p> : null}
                  <ButtonBar type="button" disabled={!canComplete || completeCase.isPending} onClick={() => completeCase.mutate()}>{completeCase.isPending ? "Đang hoàn tất…" : "Hoàn tất chấm dứt hợp đồng"}</ButtonBar>
                </>
              ) : null}
              {beginRecovery.isError ? <ErrorNotice error={beginRecovery.error} /> : null}
              {rejectCase.isError ? <ErrorNotice error={rejectCase.error} /> : null}
              {completeCase.isError ? <ErrorNotice error={completeCase.error} /> : null}
            </div>
          ) : null}

          {caseData.status === "INSPECTION_PENDING" && !caseData.inspectionTicketId && mode === "operator" ? (
            <div className={styles.step}>
              <h3>Tạo phiếu kiểm tra máy</h3>
              <p>Chỉ tạo sau khi biên nhận nhận máy tại kho đã được duyệt.</p>
              <ButtonBar type="button" disabled={recallOrder.data?.status !== "RECEIVED_AT_DEPOT" || recallOrder.isError || createInspectionTicket.isPending} onClick={() => createInspectionTicket.mutate()}>
                {createInspectionTicket.isPending ? "Đang tạo phiếu…" : "Tạo phiếu kiểm tra"}
              </ButtonBar>
              {createInspectionTicket.isError ? <ErrorNotice error={createInspectionTicket.error} /> : null}
            </div>
          ) : null}

          {caseData.inspectionTicketId ? (
            <div className={styles.step}>
              <h3>Phiếu kiểm tra máy</h3>
              {inspectionTicket.isPending ? <p role="status">Đang tải trạng thái phiếu…</p> : null}
              {inspectionTicket.isError ? <p className={styles.error} role="alert">Không tải được phiếu kiểm tra: {getApiErrorMessage(inspectionTicket.error)}</p> : null}
              {inspectionTicket.data ? (
                <>
                  <p>Mã phiếu: <code>{inspectionTicket.data.id}</code></p>
                  <p>Trạng thái: <strong>{inspectionTicket.data.status ?? "Chưa cập nhật"}</strong></p>
                  {mode === "operator" && inspectionTicket.data.status === "PENDING" ? (
                    <div className={styles.formGrid}>
                      <label>Kỹ thuật viên đã xác minh
                        <select value={technicianId} onChange={(event) => setTechnicianId(event.target.value)}>
                          <option value="">Chọn kỹ thuật viên</option>
                          {(technicians.data ?? []).map((profile) => <option key={profile.idaasUserId} value={profile.idaasUserId}>{profile.fullName} · {profile.email}</option>)}
                        </select>
                      </label>
                      <label>Tên hiển thị (không bắt buộc)<input value={inspectionAssignedTo} onChange={(event) => setInspectionAssignedTo(event.target.value)} /></label>
                      <ButtonBar type="button" disabled={!technicianId || assignInspection.isPending} onClick={() => assignInspection.mutate()}>{assignInspection.isPending ? "Đang giao phiếu…" : "Giao phiếu kiểm tra"}</ButtonBar>
                      {technicians.isError ? <ErrorNotice error={technicians.error} /> : null}
                      {assignInspection.isError ? <ErrorNotice error={assignInspection.error} /> : null}
                    </div>
                  ) : null}
                </>
              ) : null}
            </div>
          ) : null}

          {caseData.status === "SETTLEMENT_PENDING" && mode === "operator" ? (
            <div className={styles.step}>
              <h3>Quyết toán chấm dứt hợp đồng</h3>
              <p>Ghi nhận kết quả kiểm tra và các khoản phải khấu trừ. Gửi quyết toán sẽ tự chuyển hồ sơ sang trạng thái đã duyệt.</p>
              <div className={styles.formGrid}>
                <label>Đánh giá tình trạng
                  <select value={settlementDecision} onChange={(event) => setSettlementDecision(event.target.value as typeof settlementDecision)}>
                    <option value="NO_DAMAGE">Không ghi nhận hư hỏng</option>
                    <option value="DAMAGE">Có hư hỏng</option>
                    <option value="PARTIAL_DAMAGE">Hư hỏng một phần</option>
                  </select>
                </label>
                <label>Chi phí hư hỏng (VND)
                  <input type="number" min="0" step="1" value={damageAmount} onChange={(event) => setDamageAmount(event.target.value)} />
                </label>
                <label>Tiền phạt (VND)
                  <input type="number" min="0" step="1" value={penaltyAmount} onChange={(event) => setPenaltyAmount(event.target.value)} />
                </label>
                <label>Công nợ còn lại (VND)
                  <input type="number" min="0" step="1" value={outstandingAmount} onChange={(event) => setOutstandingAmount(event.target.value)} />
                </label>
                <label className={styles.fullWidth}>Mã tham chiếu biên bản kiểm tra / chứng cứ
                  <input value={settlementEvidenceReference} maxLength={2000} onChange={(event) => setSettlementEvidenceReference(event.target.value)} placeholder="Nhập mã tham chiếu đã lưu trong hệ thống" />
                </label>
              </div>
              {!inspectionResolved || !handoverReady ? <p className={styles.notice}>Chờ xác nhận biên nhận kho, bàn giao và phiếu kiểm tra đã hoàn tất trước khi quyết toán.</p> : null}
              {settlementRuleError ? <p className={styles.error} role="alert">{settlementRuleError}</p> : null}
              <p className={styles.notice}>
                Quy tắc: hợp đồng kết thúc đúng hạn không tính tiền phạt; chấm dứt sớm hoặc do vi phạm cần ghi nhận tiền phạt lớn hơn 0. Không ghi nhận hư hỏng thì chi phí hư hỏng phải bằng 0.
              </p>
              <ButtonBar type="button" disabled={!canSubmitSettlement || !inspectionResolved || !handoverReady || settleCase.isPending} onClick={() => settleCase.mutate()}>
                {settleCase.isPending ? "Đang gửi quyết toán…" : "Ghi nhận quyết toán"}
              </ButtonBar>
              {settleCase.isError ? <ErrorNotice error={settleCase.error} /> : null}
            </div>
          ) : null}

            <div className={styles.step}>
              <h3>Hoàn tiền cọc</h3>
              {!caseData.settlementId && caseData.status !== "APPROVED" && caseData.status !== "COMPLETED" ? (
                <p className={styles.notice} role="status">{caseData.status === "REJECTED"
                  ? "Hồ sơ chấm dứt đã bị từ chối; chưa phát sinh khoản hoàn cọc từ hồ sơ này."
                  : caseData.status === "SETTLEMENT_PENDING"
                    ? "Đang chờ quyết toán. Sau khi Admin hoặc Moderator ghi nhận quyết toán, hệ thống sẽ xác định số cọc còn phải hoàn và tạo khoản hoàn nếu có."
                    : "Khoản hoàn cọc được xác định sau khi thu hồi máy, hoàn tất kiểm tra và ghi nhận quyết toán."}</p>
              ) : <>
              <p>Khoản dự kiến hoàn: <strong>{caseData.depositRefundAmount == null ? "Chưa nhận được số tiền hoàn từ API" : formatVnd(caseData.depositRefundAmount)}</strong></p>
              {caseData.depositRefundAmount === 0 && !caseData.refundId ? (
                <p className={styles.success}>Không phát sinh khoản hoàn cọc. Có thể tiếp tục bước hoàn tất chấm dứt hợp đồng.</p>
              ) : caseData.refundId ? (
                <>
                  <RefundWorkflowPanel key={caseData.refundId} refundId={caseData.refundId} role={role} context={refundContext} onChanged={() => refresh()} />
                </>
              ) : caseData.depositRefundAmount == null ? (
                <p className={styles.error} role="alert">Không thể xác nhận điều kiện hoàn tất vì API chưa trả số tiền hoàn cọc.</p>
              ) : caseData.depositRefundAmount > 0 ? (
                <p className={styles.error} role="alert">API trả số tiền cần hoàn nhưng chưa trả mã khoản hoàn. Hãy làm mới hồ sơ hoặc kiểm tra trạng thái với backend.</p>
              ) : null}
              {role === "MODERATOR" && caseData.refundId && caseData.refundStatus === "REQUESTED" ? <p className={styles.notice}>Đang chờ khách hàng xác nhận yêu cầu hoàn cọc. Sau đó Admin duyệt, rồi nhân viên vận hành mới gửi chứng từ chuyển khoản.</p> : null}
              </>}
            </div>

          {caseData.status === "SETTLEMENT_PENDING" && mode === "owner" ? (
            <div className={styles.step} role="status">
              <h3>Hồ sơ đang chờ bước tiếp theo</h3>
              <p>Kiểm tra máy đã hoàn tất. Bộ phận vận hành sẽ xử lý bước quyết toán tiếp theo; hợp đồng chưa được chấm dứt.</p>
            </div>
          ) : null}
        </>
      ) : null}

      <div className={styles.recallSection}>
        <div className={styles.subheading}>
          <h3>Lệnh thu hồi máy</h3>
          {recallOrders.data ? <span>{recallOrders.data.totalElements} lệnh</span> : null}
        </div>
        {recallOrders.isPending ? <p className={styles.notice} role="status">Đang tải lệnh thu hồi…</p> : null}
        {recallOrders.isError ? <p className={styles.error} role="alert">Không tải được lệnh thu hồi: {getApiErrorMessage(recallOrders.error)}</p> : null}
        {recallOrders.isSuccess && contractRecallOrders.length === 0 ? <p className={styles.notice}>{resolvedCaseId ? "Chưa có lệnh thu hồi cho hồ sơ này." : "Chưa có lệnh thu hồi cho hợp đồng này."}</p> : null}
        {contractRecallOrders.length ? (
          <label className={styles.orderPicker}>Chọn lệnh
            <select value={recallId} onChange={(event) => { setSelectedRecallId(event.target.value); setOwnerEvidenceId(""); setOwnerConditionNotes(""); setEvidenceFile(null); }}>
              {contractRecallOrders.map((order) => <option key={order.id} value={order.id}>Máy {order.machineId.slice(0, 8).toUpperCase()} · {recallStatusLabels[order.status]}</option>)}
            </select>
          </label>
        ) : null}
        {recallData ? (
          <>
            <dl className={styles.summary}>
              <div><dt>Mã lệnh</dt><dd>{recallData.id}</dd></div>
              <div><dt>Trạng thái</dt><dd>{recallStatusLabels[recallData.status]}</dd></div>
              <div><dt>Máy</dt><dd>{recallData.machineId}</dd></div>
              <div><dt>Kỹ thuật viên</dt><dd>{recallData.assignedTechnicianId ?? "Chưa phân công"}</dd></div>
              <div><dt>Lịch nhận máy</dt><dd>{formatDateTime(recallData.scheduledPickupAt)}</dd></div>
              <div><dt>Đã nhận tại kho</dt><dd>{formatDateTime(recallData.depotReceivedAt)}</dd></div>
            </dl>
            {mode === "operator" && ["UNASSIGNED", "ASSIGNED", "SCHEDULED"].includes(recallData.status) ? (
              <div className={styles.step}>
                <h3>Điều phối nhận máy</h3>
                <div className={styles.formGrid}>
                  <label>Kỹ thuật viên đã xác minh
                    <select value={technicianId} onChange={(event) => setTechnicianId(event.target.value)}>
                      <option value="">Chọn kỹ thuật viên</option>
                      {(technicians.data ?? []).map((profile) => <option key={profile.idaasUserId} value={profile.idaasUserId}>{profile.fullName} · {profile.email}</option>)}
                    </select>
                  </label>
                  <label>Lịch nhận máy (không bắt buộc)<input type="datetime-local" value={scheduledPickupAt} onChange={(event) => setScheduledPickupAt(event.target.value)} /></label>
                </div>
                {technicians.isError ? <ErrorNotice error={technicians.error} /> : null}
                {assignRecall.isError ? <ErrorNotice error={assignRecall.error} /> : null}
                <ButtonBar type="button" disabled={!technicianId || assignRecall.isPending} onClick={() => assignRecall.mutate()}>{assignRecall.isPending ? "Đang điều phối…" : "Giao lệnh thu hồi"}</ButtonBar>
              </div>
            ) : null}
            {mode === "operator" && recallData.status === "RECEIPT_REVIEW_PENDING" ? (
              <div className={styles.step}>
                <h3>Duyệt nhận máy tại kho</h3>
                <label>Lý do đối chiếu biên nhận<textarea value={receiptReason} maxLength={1000} onChange={(event) => setReceiptReason(event.target.value)} placeholder="Ghi kết quả kiểm tra máy và chứng từ" /></label>
                <div className={styles.actions}>
                  <ButtonBar type="button" disabled={!receiptReason.trim() || recallData.depotSubmittedBy === refund.subject || reviewReceipt.isPending} onClick={() => reviewReceipt.mutate(true)}>Xác nhận đã nhận máy</ButtonBar>
                  <ButtonBar type="button" disabled={!receiptReason.trim() || recallData.depotSubmittedBy === refund.subject || reviewReceipt.isPending} onClick={() => reviewReceipt.mutate(false)}>Từ chối biên nhận</ButtonBar>
                </div>
                {recallData.depotSubmittedBy === refund.subject ? <p className={styles.notice}>Người gửi biên nhận không được tự xét duyệt. Cần nhân viên khác kiểm tra.</p> : null}
                {reviewReceipt.isError ? <ErrorNotice error={reviewReceipt.error} /> : null}
              </div>
            ) : null}
            {mode === "owner" && recallData.status === "OWNER_ACK_PENDING" ? (
              <div className={styles.step}>
                <h3>Xác nhận đã bàn giao máy</h3>
                <p>Xác nhận tình trạng bàn giao không đồng nghĩa với chấp nhận chi phí sửa chữa hoặc quyết toán.</p>
                <label>Tình trạng máy khi bàn giao<textarea required maxLength={2000} value={ownerConditionNotes} onChange={(event) => setOwnerConditionNotes(event.target.value)} /></label>
                {recallEvidence.data?.some((item) => item.evidenceType === "OWNER_HANDOVER") ? (
                  <label>Chứng cứ đã tải lên
                    <select value={ownerEvidenceId} onChange={(event) => setOwnerEvidenceId(event.target.value)}>
                      <option value="">Chọn chứng cứ bàn giao</option>
                      {recallEvidence.data.filter((item) => item.evidenceType === "OWNER_HANDOVER").map((item) => (
                        <option key={item.id} value={item.id}>{item.originalFilename} · {formatDateTime(item.uploadedAt)}</option>
                      ))}
                    </select>
                  </label>
                ) : null}
                <label>Ảnh hoặc biên bản bàn giao<input type="file" accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png" onChange={(event) => { setEvidenceFile(event.target.files?.[0] ?? null); setOwnerEvidenceId(""); }} /></label>
                <div className={styles.actions}>
                  <ButtonBar type="button" disabled={!evidenceFile || uploadEvidence.isPending} onClick={() => evidenceFile && uploadEvidence.mutate({ type: "OWNER_HANDOVER", file: evidenceFile })}>{uploadEvidence.isPending ? "Đang tải chứng cứ…" : "Tải chứng cứ bàn giao"}</ButtonBar>
                  <ButtonBar type="button" disabled={!ownerConditionNotes.trim() || !ownerEvidenceId || acknowledgeHandover.isPending} onClick={() => acknowledgeHandover.mutate()}>{acknowledgeHandover.isPending ? "Đang xác nhận…" : "Xác nhận bàn giao"}</ButtonBar>
                </div>
                {ownerEvidenceId ? <p className={styles.success}>Đã tải chứng cứ. Nhấn “Xác nhận bàn giao” để hoàn tất bước này.</p> : null}
                {uploadEvidence.isError ? <ErrorNotice error={uploadEvidence.error} /> : null}
                {acknowledgeHandover.isError ? <ErrorNotice error={acknowledgeHandover.error} /> : null}
              </div>
            ) : null}
            {recallEvidence.data?.length ? (
              <div className={styles.step}>
                <h3>Chứng cứ đã lưu</h3>
                <ul className={styles.evidenceList}>{recallEvidence.data.map((item) => <li key={item.id}>
                  <span>{item.evidenceType === "PICKUP" ? "Nhận máy" : item.evidenceType === "OWNER_HANDOVER" ? "Bàn giao của khách hàng" : "Nhận máy tại kho"} · {item.originalFilename}</span>
                  <ButtonBar type="button" onClick={() => void downloadEvidence(item.id, item.originalFilename)}>Tải tệp</ButtonBar>
                </li>)}</ul>
              </div>
            ) : null}
            {downloadError ? <p className={styles.error} role="alert">{downloadError}</p> : null}
            {recallEvents.data?.content.length ? (
              <div className={styles.step}>
                <h3>Lịch sử thu hồi</h3>
                <ol className={styles.eventList}>{recallEvents.data.content.map((event) => <li key={event.id}>
                  <strong>{event.eventType.replaceAll("_", " ")}</strong>
                  <span>{formatDateTime(event.occurredAt)}</span>
                  {event.reason ? <p>{event.reason}</p> : null}
                </li>)}</ol>
              </div>
            ) : null}
            {recallEvents.isError || recallEvidence.isError ? <p className={styles.error} role="alert">Không tải đầy đủ lịch sử hoặc chứng cứ của lệnh thu hồi.</p> : null}
          </>
        ) : null}
      </div>

      {mode === "operator" && caseData?.status === "APPROVED" ? <p className={styles.notice}>Hồ sơ đã được duyệt. Hoàn tất sẽ chấm dứt hợp đồng và cập nhật máy về kho.</p> : null}
      {mode === "operator" && caseData?.status === "COMPLETED" ? <p className={styles.success}>Hợp đồng đã chấm dứt và máy đã được trả về kho.</p> : null}
    </section>
  );
}
