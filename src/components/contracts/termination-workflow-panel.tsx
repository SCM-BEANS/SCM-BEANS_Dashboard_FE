import { Panel } from "@/components/panel/panel";
import axios from "axios";
import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { machinesApi } from "@/apis/machines.api";
import { profilesApi } from "@/apis/profiles.api";
import { recallWorkOrdersApi } from "@/apis/recall-work-orders.api";
import { terminationCasesApi } from "@/apis/termination-cases.api";
import { ButtonBar } from "@/components/button/button-bar";
import { EvidenceList } from "@/components/evidence/evidence-list";
import { maintenanceTicketStatusLabel } from "@/components/features/maintenance-workflow/maintenance-status-labels";
import { recallEventLabel } from "@/components/features/contract-termination/recall-event-label";
import { StatusBadge } from "@/components/status-badge/status-badge";
import { TruncatedId } from "@/components/truncated-id/truncated-id";
import { getBillingWorkflowErrorMessage as getApiErrorMessage } from "@/lib/api-errors";
import { EVIDENCE_ACCEPT, evidenceFileError } from "@/lib/evidence-multipart";
import type { TerminationCaseStatus } from "@/schema/termination-cases.schema";
import type { RecallWorkOrderStatus } from "@/schema/recall-work-orders.schema";
import type { TerminationSettlementPreviewRequest } from "@/schema/termination-workflow.schema";
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

const inspectionCostFormat = new Intl.NumberFormat("vi-VN");
const inspectionCompletedAtFormat = new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium", timeStyle: "short" });

function formatInspectionCost(value: number) {
  return `${inspectionCostFormat.format(value)} ₫`;
}

function formatInspectionCompletedAt(value?: string | null) {
  if (!value) return "Chưa hoàn tất";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Chưa hoàn tất" : inspectionCompletedAtFormat.format(date);
}

const inspectionDecisionLabels: Record<"NO_DAMAGE" | "DAMAGE" | "PARTIAL_DAMAGE", string> = {
  NO_DAMAGE: "Không hư hỏng",
  DAMAGE: "Có hư hỏng",
  PARTIAL_DAMAGE: "Hư hỏng một phần",
};

const caseStatusLabels: Record<TerminationCaseStatus, string> = {
  REQUESTED: "Đang chờ xử lý",
  RECOVERY_PENDING: "Đang thu hồi máy",
  INSPECTION_PENDING: "Chờ kiểm tra máy",
  SETTLEMENT_PENDING: "Chờ quyết toán",
  APPROVED: "Đã duyệt quyết toán",
  COMPLETED: "Đã kết thúc hợp đồng",
  REJECTED: "Đã từ chối",
};

const terminationSteps = ["Hồ sơ", "Thu hồi máy", "Kiểm tra máy", "Quyết toán", "Hoàn tất"];
const terminationStepByStatus: Record<TerminationCaseStatus, number> = {
  REQUESTED: 0,
  RECOVERY_PENDING: 1,
  INSPECTION_PENDING: 2,
  SETTLEMENT_PENDING: 3,
  APPROVED: 4,
  COMPLETED: 5,
  REJECTED: -1,
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
  const focused = role === "MODERATOR";
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
  const [settlementFiles, setSettlementFiles] = useState<File[]>([]);
  const settlementFileError = evidenceFileError(settlementFiles, { min: 1, max: 1 });
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
  const inspectionResult = useQuery({
    queryKey: ["dolores", "termination-inspection-result", resolvedCaseId],
    queryFn: ({ signal }) => terminationCasesApi.getInspection(resolvedCaseId, signal),
    enabled: Boolean(resolvedCaseId && inspectionTicketId) && role !== "OWNER",
    retry: false,
  });
  const caseData = terminationCase.data;
  const currentWorkflowStep = caseData ? terminationStepByStatus[caseData.status] : -1;
  const workflowProgress = currentWorkflowStep < 0 ? 0 : Math.min(1, currentWorkflowStep / (terminationSteps.length - 1));
  const parsedDamageAmount = Number(damageAmount);
  const parsedPenaltyAmount = Number(penaltyAmount);
  const settlementRuleError = caseData?.type === "NORMAL" && parsedPenaltyAmount > 0
    ? "Hợp đồng kết thúc theo kỳ hạn không được tính tiền phạt."
    : caseData?.type !== "NORMAL" && caseData?.type !== undefined && parsedPenaltyAmount <= 0
      ? "Chấm dứt trước hạn hoặc do vi phạm cần có tiền phạt lớn hơn 0."
      : settlementDecision === "NO_DAMAGE" && parsedDamageAmount > 0
        ? "Không ghi nhận hư hỏng thì chi phí hư hỏng phải bằng 0."
        : "";
  const validSettlementInputs = Boolean(
    damageAmount.trim() !== ""
    && penaltyAmount.trim() !== ""
    && Number.isFinite(parsedDamageAmount) && parsedDamageAmount >= 0
    && Number.isFinite(parsedPenaltyAmount) && parsedPenaltyAmount >= 0
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
  const settlementInputs: TerminationSettlementPreviewRequest = {
    decision: settlementDecision,
    damageAmount: parsedDamageAmount,
    penaltyAmount: parsedPenaltyAmount,
  };
  const settlementPreview = useMutation({
    mutationFn: ({ caseId, input }: { caseId: string; input: TerminationSettlementPreviewRequest }) =>
      terminationCasesApi.previewSettlement(caseId, contractId, input),
  });
  const preview = settlementPreview.data;
  const previewInput = settlementPreview.variables?.input;
  const previewVersion = validSettlementInputs && preview?.ready && preview.blockers.length === 0
    && preview.terminationCaseId === resolvedCaseId
    && previewInput?.decision === settlementInputs.decision
    && previewInput.damageAmount === settlementInputs.damageAmount
    && previewInput.penaltyAmount === settlementInputs.penaltyAmount
    ? preview.previewVersion : undefined;
  const settleCase = useMutation({
    mutationFn: () => {
      if (!previewVersion || settlementFileError || caseData?.status !== "SETTLEMENT_PENDING") {
        throw new Error("Cần bảng kê quyết toán hợp lệ và chứng từ trước khi xác nhận.");
      }
      const payload = { ...settlementInputs, previewVersion };
      const signature = JSON.stringify({ caseId: resolvedCaseId, ...payload, files: settlementFiles.map(({ name, size, lastModified }) => ({ name, size, lastModified })) });
      const attempt = settlementAttempts.current.get(signature) ?? {
        idempotencyKey: correlationId("termination-settlement-idempotency"), correlationId: correlationId("termination-settlement"),
      };
      settlementAttempts.current.set(signature, attempt);
      return terminationCasesApi.settle(resolvedCaseId, { ...payload, ...attempt }, settlementFiles);
    },
    onSuccess: (result) => {
      queryClient.setQueryData(["dolores", "termination-cases", "id", result.id], result);
      return refresh();
    },
    onError: (error) => {
      if (axios.isAxiosError(error) && [409, 422].includes(error.response?.status ?? 0)) settlementPreview.reset();
      return refresh();
    },
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
  const recallStatus = recallData?.status ?? selectedRecallSummary?.status;
  const openRecallByDefault = caseData?.status === "RECOVERY_PENDING"
    || Boolean(recallStatus && ["UNASSIGNED", "ASSIGNED", "SCHEDULED", "RECEIPT_REVIEW_PENDING", "LEGACY_REVIEW_REQUIRED"].includes(recallStatus));
  const showInspectionResult = !focused || Boolean(
    inspectionResolved
    || inspectionResult.data?.inspectionDecision
    || inspectionResult.data?.diagnosis
    || inspectionResult.data?.completedAt
    || inspectionResult.data?.actualCost != null
    || (inspectionResult.isError && !(axios.isAxiosError(inspectionResult.error) && inspectionResult.error.response?.status === 404))
  );
  const caseDocuments = <>
    {resolvedCaseId ? <EvidenceList resource="TERMINATION_CASE" parentId={resolvedCaseId} title="Chứng từ chấm dứt hợp đồng" /> : null}
    {contractId && role !== "OWNER" ? <EvidenceList resource="DEPOSIT" parentId={contractId} title="Chứng từ tiền cọc" /> : null}
  </>;
  const RecallSection = focused ? "details" : "div";
  const EvidenceSection = focused ? "details" : "div";
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
    <Panel className={focused ? `${styles.panel} ${styles.focused}` : styles.panel} aria-labelledby="termination-workflow-title">
      <div className={styles.heading}>
        <div>
          <h2 id="termination-workflow-title">{focused ? "Tiến độ xử lý" : "Chấm dứt hợp đồng và thu hồi máy"}</h2>
          {!focused && <p>{mode === "operator"
            ? "Theo dõi hồ sơ, điều phối thu hồi và kiểm tra máy theo tiến độ xử lý."
            : "Theo dõi lịch thu hồi và xác nhận tình trạng máy khi bàn giao cho kỹ thuật viên."}</p>}
        </div>
        <div className={styles.actions}>
          {caseData ? <span className={styles.status}>{caseStatusLabels[caseData.status]}</span> : null}
          <ButtonBar type="button" disabled={terminationCase.isFetching || recallOrders.isFetching || recallOrder.isFetching || inspectionTicket.isFetching || refund.isFetching || settleCase.isPending} onClick={() => { settlementPreview.reset(); void refresh(); if (caseData?.refundId) void refund.refetch(); }}>Làm mới hồ sơ</ButtonBar>
        </div>
      </div>

      {mode === "operator" && !resolvedCaseId ? <p className={styles.notice}>Chưa có mã hồ sơ chấm dứt được liên kết với trang này. Tạo hồ sơ từ thao tác hợp đồng để bắt đầu quy trình.</p> : null}
      {resolvedCaseId && terminationCase.isPending ? <p className={styles.notice} role="status">Đang tải hồ sơ chấm dứt…</p> : null}
      {resolvedCaseId && terminationCase.isError ? <p className={styles.error} role="alert">Không tải được hồ sơ chấm dứt: {getApiErrorMessage(terminationCase.error)}</p> : null}
      {caseData ? (
        <>
          {caseData.status !== "REJECTED" ? <ol
            className={styles.workflowSteps}
            aria-label="Tiến độ chấm dứt hợp đồng"
            style={{ "--workflow-progress": workflowProgress } as CSSProperties}
          >
            {terminationSteps.map((step, index) => {
              const complete = caseData.status === "COMPLETED" || index < currentWorkflowStep;
              const current = index === currentWorkflowStep;
              return <li key={step} className={styles.workflowStep} data-state={complete ? "done" : current ? "current" : "upcoming"} aria-current={current ? "step" : undefined}>
                <span className={styles.workflowDot} aria-hidden="true">
                  {complete ? <svg viewBox="0 0 16 16"><path d="M3.5 8.4l3 3 6-6.4" /></svg> : index + 1}
                </span>
                <span className={styles.workflowLabel}>{step}</span>
              </li>;
            })}
          </ol> : null}
          <dl className={styles.summary}>
            <div><dt>Mã hồ sơ</dt><dd>{focused ? <TruncatedId value={caseData.id} /> : caseData.id}</dd></div>
            <div><dt>Loại yêu cầu</dt><dd>{caseData.type === "NORMAL" ? "Kết thúc theo kỳ hạn" : caseData.type === "EARLY" ? "Chấm dứt trước hạn" : "Chấm dứt do vi phạm"}</dd></div>
            <div><dt>Lý do</dt><dd>{caseData.reason || "Chưa ghi lý do"}</dd></div>
            <div><dt>Ngày hiệu lực</dt><dd>{caseData.effectiveDate ?? "Chưa xác định"}</dd></div>
            <div><dt>Cập nhật</dt><dd>{formatDateTime(caseData.updatedAt)}</dd></div>
            {focused && caseData.status === "REJECTED" && caseData.rejectedReason && <div><dt>Lý do từ chối</dt><dd>{caseData.rejectedReason}</dd></div>}
          </dl>

          {mode === "operator" && (!focused || caseData.status === "REQUESTED" || caseData.status === "APPROVED" || beginRecovery.isError || rejectCase.isError || completeCase.isError) ? (
            <div className={styles.actions}>
              {caseData.status === "REQUESTED" ? (
                <>
                  <ButtonBar type="button" disabled={beginRecovery.isPending} onClick={() => beginRecovery.mutate()}>
                    {beginRecovery.isPending ? "Đang mở thu hồi…" : "Bắt đầu thu hồi máy"}
                  </ButtonBar>
                  <label className={styles.rejectField}>Lý do từ chối<textarea value={receiptReason} maxLength={1000} onChange={(event) => setReceiptReason(event.target.value)} placeholder="Nhập lý do nếu yêu cầu chưa thể xử lý" /></label>
                  <ButtonBar type="button" holdToConfirm disabled={!receiptReason.trim() || rejectCase.isPending} onClick={() => rejectCase.mutate(receiptReason.trim())}>Từ chối hồ sơ</ButtonBar>
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
                  {focused ? <>
                    <dl className={styles.summary}>
                      <div><dt>Mã phiếu</dt><dd>{inspectionTicket.data.id ? <TruncatedId value={inspectionTicket.data.id} /> : "—"}</dd></div>
                      <div><dt>Trạng thái</dt><dd><StatusBadge variant="dot" status={inspectionTicket.data.status}>{maintenanceTicketStatusLabel(inspectionTicket.data.status)}</StatusBadge></dd></div>
                      {inspectionTicket.data.assignedTo && <div><dt>Kỹ thuật viên</dt><dd>{inspectionTicket.data.assignedTo}</dd></div>}
                    </dl>
                    {inspectionTicket.data.status === "ASSIGNED" && <p>Chờ kỹ thuật viên bắt đầu kiểm tra.</p>}
                    {inspectionTicket.data.status === "IN_PROGRESS" && <p>Kỹ thuật viên đang kiểm tra máy.</p>}
                  </> : <>
                    <p>Mã phiếu: <code>{inspectionTicket.data.id}</code></p>
                    <p>Trạng thái: <strong>{inspectionTicket.data.status ?? "Chưa cập nhật"}</strong></p>
                  </>}
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

          {role !== "OWNER" && inspectionTicketId && showInspectionResult ? (
            <div className={styles.step}>
              <h3>Kết quả kiểm tra</h3>
              {inspectionResult.isPending ? <p role="status">Đang tải kết quả kiểm tra…</p> : null}
              {inspectionResult.isError ? (
                axios.isAxiosError(inspectionResult.error) && inspectionResult.error.response?.status === 404
                  ? <p>Chưa có kết quả kiểm tra.</p>
                  : <p role="alert">{getApiErrorMessage(inspectionResult.error)}</p>
              ) : null}
              {inspectionResult.data ? (
                <>
                  <dl className={styles.summary}>
                    <div><dt>Kết luận</dt><dd>{inspectionResult.data.inspectionDecision ? inspectionDecisionLabels[inspectionResult.data.inspectionDecision] : "Chưa có kết luận"}</dd></div>
                    <div><dt>Chẩn đoán</dt><dd>{inspectionResult.data.diagnosis || "—"}</dd></div>
                    <div><dt>Chi phí thực tế</dt><dd>{inspectionResult.data.actualCost === null ? "Chưa ghi nhận" : formatInspectionCost(inspectionResult.data.actualCost)}</dd></div>
                    <div><dt>Hoàn tất lúc</dt><dd>{formatInspectionCompletedAt(inspectionResult.data.completedAt)}</dd></div>
                  </dl>
                  {!(inspectionResult.data.status === "RESOLVED" && inspectionResult.data.completedAt) ? (
                    <p className={styles.notice}>Kết quả chưa hoàn tất, chưa dùng để đề xuất mức trừ cọc.</p>
                  ) : null}
                </>
              ) : null}
            </div>
          ) : null}

          {caseData.status === "SETTLEMENT_PENDING" && mode === "operator" ? (
            <div className={styles.step}>
              <h3>Quyết toán chấm dứt hợp đồng</h3>
              <p>Nhập chi phí hư hỏng và tiền phạt nếu có, sau đó xem bảng kê trước khi xác nhận quyết toán.</p>
              <div className={styles.formGrid}>
                <label>Đánh giá tình trạng
                  <select disabled={settleCase.isPending} value={settlementDecision} onChange={(event) => { settlementPreview.reset(); settleCase.reset(); setSettlementDecision(event.target.value as typeof settlementDecision); }}>
                    <option value="NO_DAMAGE">Không ghi nhận hư hỏng</option>
                    <option value="DAMAGE">Có hư hỏng</option>
                    <option value="PARTIAL_DAMAGE">Hư hỏng một phần</option>
                  </select>
                </label>
                <label>Chi phí hư hỏng (VND)
                  <input type="number" min="0" step="1" disabled={settleCase.isPending} value={damageAmount} onChange={(event) => { settlementPreview.reset(); settleCase.reset(); setDamageAmount(event.target.value); }} />
                </label>
                <label>Tiền phạt (VND)
                  <input type="number" min="0" step="1" disabled={settleCase.isPending} value={penaltyAmount} onChange={(event) => { settlementPreview.reset(); settleCase.reset(); setPenaltyAmount(event.target.value); }} />
                </label>
              </div>
              {settlementRuleError ? <p className={styles.error} role="alert">{settlementRuleError}</p> : null}
              <ButtonBar type="button" disabled={!validSettlementInputs || settlementPreview.isPending || settleCase.isPending} onClick={() => {
                settleCase.reset();
                settlementPreview.mutate({ caseId: resolvedCaseId, input: settlementInputs });
              }}>
                {settlementPreview.isPending ? "Đang tính bảng kê…" : preview ? "Tính lại bảng kê" : "Xem trước quyết toán"}
              </ButtonBar>
              {settlementPreview.isError ? <ErrorNotice error={settlementPreview.error} /> : null}
              {preview && !settlementPreview.isPending && (
                <>
                  <h4>Bảng kê quyết toán</h4>
                  <dl className={styles.summary}>
                    <div><dt>Công nợ hóa đơn</dt><dd>{formatVnd(preview.invoiceDebtTotal)}</dd></div>
                    <div><dt>Lượt pha chưa xuất hóa đơn</dt><dd>{formatVnd(preview.unbilledUsageTotal)}</dd></div>
                    <div><dt>Chi phí hư hỏng</dt><dd>{formatVnd(preview.damageAmount)}</dd></div>
                    <div><dt>Tiền phạt</dt><dd>{formatVnd(preview.penaltyAmount)}</dd></div>
                    <div><dt>Tổng nghĩa vụ</dt><dd>{formatVnd(preview.totalLiability)}</dd></div>
                    <div><dt>Cọc khả dụng</dt><dd>{formatVnd(preview.depositAvailable)}</dd></div>
                    <div><dt>Cọc dùng để cấn trừ</dt><dd>{formatVnd(preview.depositOffsetAmount)}</dd></div>
                    <div><dt>Còn phải thu sau cấn trừ</dt><dd>{formatVnd(preview.receivableAmount)}</dd></div>
                    <div><dt>Cọc còn hoàn</dt><dd>{formatVnd(preview.depositRefundAmount)}</dd></div>
                  </dl>
                  {preview.debts.length > 0 && <details className={styles.disclosure}>
                    <summary>Chi tiết các khoản phải thu</summary>
                    <ul className={styles.eventList}>{preview.debts.map((line, index) => <li key={index}><span>{line.description || "Khoản phải thu"}</span><strong>{formatVnd(line.amount)}</strong></li>)}</ul>
                  </details>}
                  {!previewVersion && <div className={styles.notice} role="status">
                    <strong>Chưa đủ điều kiện xác nhận quyết toán</strong>
                    {preview.blockers.length > 0 && <ul>{preview.blockers.map((blocker, index) => <li key={index}>{blocker}</li>)}</ul>}
                  </div>}
                </>
              )}
              {previewVersion && !settlementPreview.isPending && <>
                <label>Tệp biên bản kiểm tra / chứng cứ
                  <input type="file" accept={EVIDENCE_ACCEPT} disabled={settleCase.isPending} onChange={(event) => setSettlementFiles(Array.from(event.target.files ?? []))} />
                  {settlementFiles.map((file) => <span key={file.name}>{file.name}</span>)}
                </label>
                {settlementFileError ? <p id="settlement-file-error">{settlementFileError}</p> : null}
                <ButtonBar variant="primary" type="button" aria-describedby={settlementFileError ? "settlement-file-error" : undefined} disabled={Boolean(settlementFileError) || settleCase.isPending} onClick={() => settleCase.mutate()}>
                  {settleCase.isPending ? "Đang gửi quyết toán…" : "Xác nhận quyết toán"}
                </ButtonBar>
              </>}
              {settleCase.isError ? <>
                <ErrorNotice error={settleCase.error} />
                {!previewVersion && <p className={styles.notice}>Xem trước lại bảng kê để kiểm tra dữ liệu mới nhất trước khi xác nhận.</p>}
              </> : null}
            </div>
          ) : null}

            {(!focused || caseData.settlementId || caseData.refundId || caseData.status === "APPROVED" || caseData.status === "COMPLETED") && <div className={styles.step}>
              <h3>Hoàn tiền cọc</h3>
              {!caseData.settlementId && caseData.status !== "APPROVED" && caseData.status !== "COMPLETED" ? (
                <p className={styles.notice} role="status">{caseData.status === "REJECTED"
                  ? "Hồ sơ chấm dứt đã bị từ chối; chưa phát sinh khoản hoàn cọc từ hồ sơ này."
                  : caseData.status === "SETTLEMENT_PENDING"
                    ? "Đang chờ quyết toán. Sau khi Admin hoặc Moderator ghi nhận quyết toán, hệ thống sẽ xác định số cọc còn phải hoàn và tạo khoản hoàn nếu có."
                    : "Khoản hoàn cọc được xác định sau khi thu hồi máy, hoàn tất kiểm tra và ghi nhận quyết toán."}</p>
              ) : <>
              <p>Khoản dự kiến hoàn: <strong>{caseData.depositRefundAmount == null ? "Chưa có thông tin khoản hoàn" : formatVnd(caseData.depositRefundAmount)}</strong></p>
              {caseData.depositRefundAmount === 0 && !caseData.refundId ? (
                <p className={styles.success}>Không phát sinh khoản hoàn cọc. Có thể tiếp tục bước hoàn tất chấm dứt hợp đồng.</p>
              ) : caseData.refundId ? (
                <>
                  <RefundWorkflowPanel key={caseData.refundId} refundId={caseData.refundId} role={role} context={refundContext} onChanged={() => refresh()} />
                </>
              ) : caseData.depositRefundAmount == null ? (
                <p className={styles.error} role="alert">Chưa thể xác nhận điều kiện hoàn tất vì thiếu số tiền cần hoàn. Hãy làm mới hồ sơ hoặc liên hệ bộ phận vận hành.</p>
              ) : caseData.depositRefundAmount > 0 ? (
                <p className={styles.error} role="alert">Có khoản cần hoàn nhưng chưa có mã khoản hoàn. Hãy làm mới hồ sơ hoặc liên hệ bộ phận vận hành.</p>
              ) : null}
              {role === "MODERATOR" && caseData.refundId && caseData.refundStatus === "REQUESTED" ? <p className={styles.notice}>Đang chờ khách hàng xác nhận yêu cầu hoàn cọc. Sau đó Admin duyệt, rồi nhân viên vận hành mới gửi chứng từ chuyển khoản.</p> : null}
              </>}
            </div>}

          {caseData.status === "SETTLEMENT_PENDING" && mode === "owner" ? (
            <div className={styles.step} role="status">
              <h3>Hồ sơ đang chờ bước tiếp theo</h3>
              <p>Kiểm tra máy đã hoàn tất. Bộ phận vận hành sẽ xử lý bước quyết toán tiếp theo; hợp đồng chưa được chấm dứt.</p>
            </div>
          ) : null}
        </>
      ) : null}

      {!focused && caseDocuments}
      <RecallSection
        key={focused ? `${resolvedCaseId}:${openRecallByDefault}` : undefined}
        className={focused ? styles.disclosure : styles.recallSection}
        open={focused ? openRecallByDefault : undefined}
      >
        {focused ? <summary>
          <span>Thu hồi máy</span>
          {recallStatus && <span className={styles.disclosureMeta}>{recallStatusLabels[recallStatus]}</span>}
        </summary> : <div className={styles.subheading}>
          <h3>Lệnh thu hồi máy</h3>
          {recallOrders.data ? <span>{recallOrders.data.totalElements} lệnh</span> : null}
        </div>}
        <div className={focused ? styles.disclosureContent : styles.recallContent}>
        {recallOrders.isPending ? <p className={styles.notice} role="status">Đang tải lệnh thu hồi…</p> : null}
        {recallOrders.isError ? <p className={styles.error} role="alert">Không tải được lệnh thu hồi: {getApiErrorMessage(recallOrders.error)}</p> : null}
        {recallOrders.isSuccess && contractRecallOrders.length === 0 ? <p className={styles.notice}>{resolvedCaseId ? "Chưa có lệnh thu hồi cho hồ sơ này." : "Chưa có lệnh thu hồi cho hợp đồng này."}</p> : null}
        {contractRecallOrders.length > (focused ? 1 : 0) ? (
          <label className={styles.orderPicker}>Chọn lệnh
            <select value={recallId} onChange={(event) => { setSelectedRecallId(event.target.value); setOwnerEvidenceId(""); setOwnerConditionNotes(""); setEvidenceFile(null); }}>
              {contractRecallOrders.map((order) => <option key={order.id} value={order.id}>Máy {order.machineId.slice(0, 8).toUpperCase()} · {recallStatusLabels[order.status]}</option>)}
            </select>
          </label>
        ) : null}
        {focused && recallId && recallOrder.isPending && <p className={styles.notice} role="status">Đang tải chi tiết lệnh thu hồi…</p>}
        {focused && recallOrder.isError && <p className={styles.error} role="alert">{getApiErrorMessage(recallOrder.error)}</p>}
        {recallData ? (
          <>
            <dl className={styles.summary}>
              <div><dt>Mã lệnh</dt><dd>{focused ? <TruncatedId value={recallData.id} /> : recallData.id}</dd></div>
              {!focused && <div><dt>Trạng thái</dt><dd>{recallStatusLabels[recallData.status]}</dd></div>}
              {!focused && <div><dt>Máy</dt><dd>{recallData.machineId}</dd></div>}
              <div><dt>Kỹ thuật viên</dt><dd>{focused && recallData.assignedTechnicianId ? technicians.data?.find((profile) => profile.idaasUserId === recallData.assignedTechnicianId)?.fullName || <TruncatedId value={recallData.assignedTechnicianId} /> : recallData.assignedTechnicianId ?? "Chưa phân công"}</dd></div>
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
                  <ButtonBar variant="danger" type="button" holdToConfirm disabled={!receiptReason.trim() || recallData.depotSubmittedBy === refund.subject || reviewReceipt.isPending} onClick={() => reviewReceipt.mutate(false)}>Từ chối biên nhận</ButtonBar>
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
              <EvidenceSection className={focused ? styles.disclosure : styles.step}>
                {focused ? <summary>Chứng từ thu hồi <span className={styles.disclosureMeta}>{recallEvidence.data.length} tệp</span></summary> : <h3>Chứng cứ đã lưu</h3>}
                <ul className={styles.evidenceList}>{recallEvidence.data.map((item) => <li key={item.id}>
                  <span>{item.evidenceType === "PICKUP" ? "Nhận máy" : item.evidenceType === "OWNER_HANDOVER" ? "Bàn giao của khách hàng" : "Nhận máy tại kho"} · {item.originalFilename}</span>
                  <ButtonBar type="button" onClick={() => void downloadEvidence(item.id, item.originalFilename)}>Tải tệp</ButtonBar>
                </li>)}</ul>
              </EvidenceSection>
            ) : null}
            {downloadError ? <p className={styles.error} role="alert">{downloadError}</p> : null}
            {recallEvents.data?.content.length ? (
              <EvidenceSection className={focused ? styles.disclosure : styles.step}>
                {focused ? <summary>Lịch sử thu hồi <span className={styles.disclosureMeta}>{recallEvents.data.content.length} sự kiện</span></summary> : <h3>Lịch sử thu hồi</h3>}
                <ol className={styles.eventList}>{recallEvents.data.content.map((event) => <li key={event.id}>
                  <strong>{focused ? recallEventLabel(event.eventType) : event.eventType.replaceAll("_", " ")}</strong>
                  <span>{formatDateTime(event.occurredAt)}</span>
                  {event.reason ? <p>{event.reason}</p> : null}
                </li>)}</ol>
              </EvidenceSection>
            ) : null}
            {recallEvents.isError || recallEvidence.isError ? <p className={styles.error} role="alert">Không tải đầy đủ lịch sử hoặc chứng cứ của lệnh thu hồi.</p> : null}
          </>
        ) : null}
        </div>
      </RecallSection>

      {focused && (resolvedCaseId || contractId) ? (
        <details className={styles.disclosure}>
          <summary>Chứng từ hồ sơ và tiền cọc</summary>
          <div className={styles.disclosureContent}>{caseDocuments}</div>
        </details>
      ) : null}

      {!focused && mode === "operator" && caseData?.status === "APPROVED" ? <p className={styles.notice}>Hồ sơ đã được duyệt. Hoàn tất sẽ chấm dứt hợp đồng và cập nhật máy về kho.</p> : null}
      {mode === "operator" && caseData?.status === "COMPLETED" ? <p className={styles.success}>Hợp đồng đã chấm dứt và máy đã được trả về kho.</p> : null}
    </Panel>
  );
}
