import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { installationWorkOrdersApi } from "@/apis/installation-work-orders.api";
import { machinesApi } from "@/apis/machines.api";
import { repairCasesApi } from "@/apis/repair-cases.api";
import { ButtonBar } from "@/components/button/button-bar";
import { TextLinkButton } from "@/components/button/text-link-button";
import { DataTable } from "@/components/table/data-table";
import { getApiErrorMessage } from "@/lib/api-errors";
import { PATH_TECHNICIAN } from "@/routes/path";
import type { AssignedInstallationWorkOrderSummary, InstallationWorkOrderDetails } from "@/schema/installation-work-orders.schema";
import type { RepairCase, RepairCustodyEventRequest } from "@/schema/machines.schema";
import { TECHNICIAN_MESSAGES as T } from "@/text/technician/technician-messages";
import { TechnicianShell } from "../technician-shell";
import shellStyles from "../technician-shell.module.css";
import styles from "./work-order-detail-screen.module.css";

const messages = T.WORKFLOWS;
const detailQueryKey = (workOrderId: string) => ["dolores", "installation-work-orders", "id", workOrderId] as const;
const assignedQueryKey = ["dolores", "technician", "installation-work-orders", "assigned"] as const;
const MAX_EVIDENCE_BYTES = 20 * 1024 * 1024;
const ALLOWED_EVIDENCE_TYPES = new Set(["application/pdf", "image/jpeg", "image/png"]);
type ChecklistResult = "PASSED" | "FAILED" | "NOT_APPLICABLE";
type ChecklistEdit = { result: ChecklistResult | ""; notes: string };

const statusLabels: Record<AssignedInstallationWorkOrderSummary["status"], string> = {
  PENDING: messages.TASKS_STATUS_PENDING,
  ASSIGNED: messages.TASKS_STATUS_ASSIGNED,
  IN_PROGRESS: messages.TASKS_STATUS_IN_PROGRESS,
  COMPLETED: messages.TASKS_STATUS_COMPLETED,
  FAILED: messages.TASKS_STATUS_FAILED,
  CANCELLED: messages.TASKS_STATUS_CANCELLED,
};

function formatDateTime(value: string | null | undefined) {
  if (!value) return "—";
  const timestamp = Date.parse(value);
  return Number.isNaN(timestamp)
    ? value
    : new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium", timeStyle: "short" }).format(timestamp);
}

function formatFileSize(value: number) {
  return `${(value / (1024 * 1024)).toFixed(2)} MB`;
}

function DetailValue({ label, value, code = false }: { label: string; value: string; code?: boolean }) {
  return (
    <div className={styles.detailItem}>
      <dt>{label}</dt>
      <dd className={code ? styles.codeValue : undefined}>{value}</dd>
    </div>
  );
}

const repairStatusLabels: Record<RepairCase["status"], string> = {
  REPORTED: "Đã báo sự cố",
  TRIAGE: "Đang phân loại",
  WAITING_REPLACEMENT: "Chờ máy thay thế",
  WAITING_OWNER_DECISION: "Chờ Owner xác nhận",
  REPLACEMENT_PLANNED: "Đã lên lịch thay máy",
  PRIMARY_COLLECTED: "Đã nhận máy cần sửa",
  REPLACEMENT_DELIVERED: "Đã giao máy thay thế",
  DIAGNOSIS: "Đang chẩn đoán",
  REPAIR_IN_PROGRESS: "Đang sửa chữa",
  REPAIR_COMPLETED: "Đã sửa xong",
  REPLACEMENT_COLLECTED: "Đã thu hồi máy thay thế",
  PRIMARY_RETURNED: "Đã trả máy chính",
  OWNER_ACKNOWLEDGED: "Owner đã xác nhận",
  CLOSED: "Đã đóng",
  REJECTED: "Đã từ chối",
  CANCELLED: "Đã hủy",
};

const repairCustodyLabels: Record<RepairCustodyEventRequest["eventType"], string> = {
  PRIMARY_COLLECTED: "Nhận máy chính để sửa",
  REPLACEMENT_DELIVERED: "Giao máy thay thế",
  REPLACEMENT_COLLECTED: "Thu hồi máy thay thế",
  PRIMARY_RETURNED: "Trả máy chính cho Owner",
};

function TechnicianRepairCaseScreen({ repairCaseId }: { repairCaseId: string }) {
  const queryClient = useQueryClient();
  const [diagnosis, setDiagnosis] = useState("");
  const [diagnosisEvidence, setDiagnosisEvidence] = useState("");
  const [workScope, setWorkScope] = useState("");
  const [resolutionResult, setResolutionResult] = useState("");
  const [completionEvidence, setCompletionEvidence] = useState("");
  const [completionNotes, setCompletionNotes] = useState("");
  const [custodyType, setCustodyType] = useState<RepairCustodyEventRequest["eventType"] | "">("");
  const [custodyNotes, setCustodyNotes] = useState("");
  const [custodyEvidence, setCustodyEvidence] = useState("");

  const repairCase = useQuery({
    queryKey: ["dolores", "technician", "repair-cases", "id", repairCaseId],
    queryFn: ({ signal }) => repairCasesApi.getById(repairCaseId, signal),
    retry: false,
  });
  const timelinePage = Math.max(0, Math.ceil((repairCase.data?.timelineCount ?? 0) / 50) - 1);
  const timeline = useQuery({
    queryKey: ["dolores", "technician", "repair-cases", "timeline", repairCaseId, timelinePage],
    queryFn: ({ signal }) => repairCasesApi.getTimeline(repairCaseId, timelinePage, 50, signal),
    enabled: repairCase.isSuccess,
  });
  const custodyEvents = useQuery({
    queryKey: ["dolores", "technician", "repair-cases", "custody", repairCaseId],
    queryFn: ({ signal }) => repairCasesApi.getCustodyEvents(repairCaseId, signal),
    enabled: repairCase.isSuccess,
  });
  const ticket = useQuery({
    queryKey: ["dolores", "technician", "maintenance-ticket", repairCase.data?.maintenanceTicketId],
    queryFn: ({ signal }) => machinesApi.getMaintenanceTicketById(repairCase.data!.maintenanceTicketId!, signal),
    enabled: Boolean(repairCase.data?.maintenanceTicketId),
    retry: false,
  });
  const caseData = repairCase.data;
  const custodyData = custodyEvents.data ?? [];
  const replacementDelivered = custodyData.find((event) => event.eventType === "REPLACEMENT_DELIVERED");
  const replacementMachineId = replacementDelivered?.machineId ?? timeline.data?.content
    .find((event) => event.eventType === "REPLACEMENT_PLANNED")
    ?.details?.match(/machineId=([0-9a-f-]{36})/i)?.[1];

  const refreshRepairCase = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["dolores", "technician", "repair-cases", "id", repairCaseId] }),
      queryClient.invalidateQueries({ queryKey: ["dolores", "technician", "repair-cases", "timeline", repairCaseId] }),
      queryClient.invalidateQueries({ queryKey: ["dolores", "technician", "repair-cases", "custody", repairCaseId] }),
      queryClient.invalidateQueries({ queryKey: ["dolores", "technician", "maintenance-ticket", repairCase.data?.maintenanceTicketId] }),
      queryClient.invalidateQueries({ queryKey: ["dolores", "technician", "repair-cases"] }),
    ]);
  };

  const recordDiagnosis = useMutation({
    mutationFn: () => repairCasesApi.recordDiagnosis(repairCaseId, { diagnosis, evidenceReference: diagnosisEvidence }),
    onSuccess: refreshRepairCase,
  });
  const startWork = useMutation({
    mutationFn: () => repairCasesApi.startWork(repairCaseId, { workScope }),
    onSuccess: refreshRepairCase,
  });
  const completeWork = useMutation({
    mutationFn: () => repairCasesApi.completeWork(repairCaseId, {
      diagnosis,
      resolutionResult,
      workScope,
      evidenceReferences: completionEvidence.split(/\r?\n/).map((value) => value.trim()).filter(Boolean),
      ...(completionNotes.trim() ? { notes: completionNotes.trim() } : {}),
    }),
    onSuccess: refreshRepairCase,
  });
  const recordCustody = useMutation({
    mutationFn: () => {
      if (!caseData || !custodyType) throw new Error("Choose a valid machine custody event.");
      const machineId = custodyType === "PRIMARY_COLLECTED" || custodyType === "PRIMARY_RETURNED"
        ? caseData.primaryMachineId
        : replacementMachineId;
      if (!machineId) throw new Error("The replacement machine ID is not available in the repair case history.");
      return repairCasesApi.recordCustodyEvent(repairCaseId, {
        eventType: custodyType,
        machineId,
        conditionNotes: custodyNotes,
        evidenceReference: custodyEvidence,
      });
    },
    onSuccess: refreshRepairCase,
  });

  const ownerAcknowledgedReplacement = Boolean(replacementDelivered?.ownerAcknowledgedAt);
  const canDiagnose = caseData?.status === "REPLACEMENT_DELIVERED"
    && ownerAcknowledgedReplacement && ticket.data?.status === "ASSIGNED";
  const canStartWork = caseData?.status === "DIAGNOSIS" && ticket.data?.status === "ASSIGNED";
  const canCompleteWork = caseData?.status === "REPAIR_IN_PROGRESS" && ticket.data?.status === "IN_PROGRESS";
  const custodyTypeOptions: RepairCustodyEventRequest["eventType"][] = [];
  if (caseData?.status === "REPLACEMENT_PLANNED" && !custodyData.some((event) => event.eventType === "PRIMARY_COLLECTED")) {
    custodyTypeOptions.push("PRIMARY_COLLECTED");
  }
  const primaryCollected = custodyData.find((event) => event.eventType === "PRIMARY_COLLECTED");
  if (caseData?.status === "PRIMARY_COLLECTED" && primaryCollected?.ownerAcknowledgedAt && replacementMachineId
    && !replacementDelivered) {
    custodyTypeOptions.push("REPLACEMENT_DELIVERED");
  }
  if (caseData?.status === "REPAIR_COMPLETED" && replacementDelivered?.ownerAcknowledgedAt
    && !custodyData.some((event) => event.eventType === "REPLACEMENT_COLLECTED")) {
    custodyTypeOptions.push("REPLACEMENT_COLLECTED");
  }
  const replacementCollected = custodyData.find((event) => event.eventType === "REPLACEMENT_COLLECTED");
  if (caseData?.status === "REPLACEMENT_COLLECTED" && replacementCollected?.ownerAcknowledgedAt
    && !custodyData.some((event) => event.eventType === "PRIMARY_RETURNED")) {
    custodyTypeOptions.push("PRIMARY_RETURNED");
  }

  return (
    <TechnicianShell pageTitle="Chi tiết sửa chữa">
      <section className={shellStyles.pageContent} aria-labelledby="technician-repair-case-title">
        <header className={shellStyles.pageHeading}>
          <h1 id="technician-repair-case-title">Chi tiết sửa chữa</h1>
          <p>Theo dõi bàn giao, chẩn đoán và xử lý hồ sơ được giao.</p>
          <div className={styles.backLink}>
            <TextLinkButton href={PATH_TECHNICIAN.TASKS}>Về danh sách công việc</TextLinkButton>
          </div>
        </header>
        {repairCase.isPending && <p className={shellStyles.pendingNotice} role="status">Đang tải hồ sơ sửa chữa…</p>}
        {repairCase.isError && <p className={shellStyles.errorNotice} role="alert">{getApiErrorMessage(repairCase.error)}</p>}
        {caseData ? (
          <>
            <section className={styles.panel} aria-labelledby="repair-case-summary-title">
              <h2 id="repair-case-summary-title">Thông tin hồ sơ sửa chữa</h2>
              <dl className={styles.detailGrid}>
                <DetailValue label="Mã hồ sơ" value={caseData.id} code />
                <DetailValue label="Trạng thái" value={repairStatusLabels[caseData.status]} />
                <DetailValue label="Mã máy chính" value={caseData.primaryMachineId} code />
                <DetailValue label="Mã hợp đồng" value={caseData.contractId} code />
                <DetailValue label="Mã lệnh bảo trì" value={caseData.maintenanceTicketId ?? "Chưa tạo"} code />
                <DetailValue label="Cập nhật gần nhất" value={formatDateTime(caseData.updatedAt)} />
                {ticket.data?.diagnosis ? <DetailValue label="Chẩn đoán đã lưu" value={ticket.data.diagnosis} /> : null}
                {ticket.data?.actionableInstructions ? <DetailValue label="Hướng dẫn xử lý" value={ticket.data.actionableInstructions} /> : null}
              </dl>
              {ticket.isPending && <p className={styles.hint} role="status">Đang tải lệnh bảo trì được giao…</p>}
              {ticket.isError && <p className={styles.error} role="alert">Không tải được lệnh bảo trì. Hãy kiểm tra phân công với Moderator.</p>}
            </section>

            {canDiagnose ? (
              <section className={styles.panel} aria-labelledby="repair-diagnosis-title">
                <h2 id="repair-diagnosis-title">Ghi nhận chẩn đoán</h2>
                <p className={styles.hint}>Owner đã xác nhận nhận máy thay thế. Chẩn đoán cần một mã tham chiếu minh chứng riêng tư.</p>
                <label className={styles.formField} htmlFor="repair-diagnosis">
                  <span>Chẩn đoán</span>
                  <textarea id="repair-diagnosis" rows={3} maxLength={4000} value={diagnosis} onChange={(event) => setDiagnosis(event.target.value)} />
                </label>
                <label className={styles.formField} htmlFor="repair-diagnosis-evidence">
                  <span>Mã tham chiếu minh chứng</span>
                  <input id="repair-diagnosis-evidence" maxLength={512} value={diagnosisEvidence} onChange={(event) => setDiagnosisEvidence(event.target.value)} />
                </label>
                {recordDiagnosis.isError && <p className={styles.error} role="alert">{getApiErrorMessage(recordDiagnosis.error, "mutation")}</p>}
                {recordDiagnosis.isSuccess && <p className={styles.success} role="status">Đã lưu chẩn đoán.</p>}
                <ButtonBar type="button" disabled={!diagnosis.trim() || !diagnosisEvidence.trim() || recordDiagnosis.isPending} onClick={() => recordDiagnosis.mutate()}>
                  {recordDiagnosis.isPending ? "Đang lưu…" : "Lưu chẩn đoán"}
                </ButtonBar>
              </section>
            ) : null}

            {canStartWork ? (
              <section className={styles.panel} aria-labelledby="repair-work-start-title">
                <h2 id="repair-work-start-title">Bắt đầu sửa chữa</h2>
                <p className={styles.hint}>Mô tả phạm vi thao tác trước khi bắt đầu. Nếu có tranh chấp chi phí, Moderator cần cấp quyền xử lý khẩn cấp.</p>
                <label className={styles.formField} htmlFor="repair-work-scope">
                  <span>Phạm vi công việc</span>
                  <textarea id="repair-work-scope" rows={3} maxLength={2000} value={workScope} onChange={(event) => setWorkScope(event.target.value)} />
                </label>
                {startWork.isError && <p className={styles.error} role="alert">{getApiErrorMessage(startWork.error, "mutation")}</p>}
                <ButtonBar type="button" disabled={!workScope.trim() || startWork.isPending} onClick={() => startWork.mutate()}>
                  {startWork.isPending ? "Đang bắt đầu…" : "Bắt đầu sửa chữa"}
                </ButtonBar>
              </section>
            ) : null}

            {canCompleteWork ? (
              <section className={styles.panel} aria-labelledby="repair-work-complete-title">
                <h2 id="repair-work-complete-title">Hoàn tất sửa chữa</h2>
                <div className={styles.formGrid}>
                  <label className={styles.formField} htmlFor="repair-completion-diagnosis">
                    <span>Chẩn đoán cuối</span>
                    <textarea id="repair-completion-diagnosis" rows={3} maxLength={4000} value={diagnosis} onChange={(event) => setDiagnosis(event.target.value)} />
                  </label>
                  <label className={styles.formField} htmlFor="repair-resolution-result">
                    <span>Kết quả xử lý</span>
                    <textarea id="repair-resolution-result" rows={3} maxLength={4000} value={resolutionResult} onChange={(event) => setResolutionResult(event.target.value)} />
                  </label>
                  <label className={styles.formField} htmlFor="repair-completion-scope">
                    <span>Phạm vi công việc</span>
                    <textarea id="repair-completion-scope" rows={3} maxLength={2000} value={workScope} onChange={(event) => setWorkScope(event.target.value)} />
                  </label>
                  <label className={styles.formField} htmlFor="repair-completion-evidence">
                    <span>Mã tham chiếu minh chứng (mỗi mã một dòng)</span>
                    <textarea id="repair-completion-evidence" rows={3} maxLength={4096} value={completionEvidence} onChange={(event) => setCompletionEvidence(event.target.value)} />
                  </label>
                  <label className={styles.formField} htmlFor="repair-completion-notes">
                    <span>Ghi chú (nếu có)</span>
                    <textarea id="repair-completion-notes" rows={3} maxLength={4000} value={completionNotes} onChange={(event) => setCompletionNotes(event.target.value)} />
                  </label>
                </div>
                {completeWork.isError && <p className={styles.error} role="alert">{getApiErrorMessage(completeWork.error, "mutation")}</p>}
                {completeWork.isSuccess && <p className={styles.success} role="status">Đã hoàn tất công việc sửa chữa.</p>}
                <ButtonBar
                  type="button"
                  disabled={!diagnosis.trim() || !resolutionResult.trim() || !workScope.trim() || !completionEvidence.split(/\r?\n/).some((value) => value.trim()) || completeWork.isPending}
                  onClick={() => completeWork.mutate()}
                >
                  {completeWork.isPending ? "Đang lưu kết quả…" : "Xác nhận hoàn tất"}
                </ButtonBar>
              </section>
            ) : null}

            {custodyTypeOptions.length ? (
              <section className={styles.panel} aria-labelledby="repair-custody-record-title">
                <h2 id="repair-custody-record-title">Ghi nhận bàn giao máy</h2>
                <p className={styles.hint}>Ghi từng bước theo thứ tự. Bước tiếp theo chỉ mở sau khi Owner xác nhận bước bàn giao trước.</p>
                <label className={styles.formField} htmlFor="repair-custody-type">
                  <span>Sự kiện</span>
                  <select id="repair-custody-type" value={custodyType} onChange={(event) => setCustodyType(event.target.value as typeof custodyType)}>
                    <option value="">Chọn bước bàn giao</option>
                    {custodyTypeOptions.map((type) => <option key={type} value={type}>{repairCustodyLabels[type]}</option>)}
                  </select>
                </label>
                <label className={styles.formField} htmlFor="repair-custody-notes">
                  <span>Tình trạng máy</span>
                  <textarea id="repair-custody-notes" rows={3} maxLength={2000} value={custodyNotes} onChange={(event) => setCustodyNotes(event.target.value)} />
                </label>
                <label className={styles.formField} htmlFor="repair-custody-evidence">
                  <span>Mã tham chiếu minh chứng riêng tư</span>
                  <input id="repair-custody-evidence" maxLength={512} value={custodyEvidence} onChange={(event) => setCustodyEvidence(event.target.value)} />
                </label>
                {recordCustody.isError && <p className={styles.error} role="alert">{getApiErrorMessage(recordCustody.error, "mutation")}</p>}
                {recordCustody.isSuccess && <p className={styles.success} role="status">Đã ghi nhận bàn giao.</p>}
                <ButtonBar
                  type="button"
                  disabled={!custodyType || !custodyNotes.trim() || !custodyEvidence.trim() || recordCustody.isPending}
                  onClick={() => recordCustody.mutate()}
                >
                  {recordCustody.isPending ? "Đang ghi nhận…" : "Ghi nhận bàn giao"}
                </ButtonBar>
              </section>
            ) : null}

            <section className={styles.panel} aria-labelledby="repair-case-history-title">
              <h2 id="repair-case-history-title">Lịch sử xử lý</h2>
              {timeline.isPending && <p className={styles.hint} role="status">Đang tải lịch sử…</p>}
              {timeline.isError && <p className={styles.error} role="alert">Không tải được lịch sử xử lý.</p>}
              {timeline.data?.content.length ? (
                <ol className={styles.eventList}>
                  {timeline.data.content.map((event) => (
                    <li key={event.id}>
                      <strong>{formatDateTime(event.occurredAt)} · {event.toStatus ?? event.eventType}</strong>
                      {event.reason || event.details ? <p>{event.reason ?? event.details}</p> : null}
                    </li>
                  ))}
                </ol>
              ) : timeline.isSuccess ? <p className={styles.hint}>Chưa có cập nhật.</p> : null}
            </section>

            <section className={styles.panel} aria-labelledby="repair-case-custody-history-title">
              <h2 id="repair-case-custody-history-title">Lịch sử bàn giao</h2>
              {custodyEvents.isPending && <p className={styles.hint} role="status">Đang tải sự kiện bàn giao…</p>}
              {custodyEvents.isError && <p className={styles.error} role="alert">Không tải được lịch sử bàn giao.</p>}
              {custodyData.length ? (
                <ol className={styles.eventList}>
                  {custodyData.map((event) => (
                    <li key={event.id}>
                      <strong>{formatDateTime(event.occurredAt)} · {repairCustodyLabels[event.eventType]}</strong>
                      <p>Máy: {event.machineId} · {event.ownerAcknowledgedAt ? "Owner đã xác nhận" : "Đang chờ Owner xác nhận"}</p>
                      {event.conditionNotes ? <p>Tình trạng: {event.conditionNotes}</p> : null}
                    </li>
                  ))}
                </ol>
              ) : custodyEvents.isSuccess ? <p className={styles.hint}>Chưa có sự kiện bàn giao.</p> : null}
            </section>
          </>
        ) : null}
      </section>
    </TechnicianShell>
  );
}

export function TechnicianInstallationWorkOrderScreen({ workOrderId }: { workOrderId: string }) {
  const queryClient = useQueryClient();
  const fileInput = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [handoverRecipient, setHandoverRecipient] = useState("");
  const [evidenceError, setEvidenceError] = useState("");
  const [checklistEdits, setChecklistEdits] = useState<Record<string, ChecklistEdit>>({});
  const [accessoryName, setAccessoryName] = useState("");
  const [accessoryQuantity, setAccessoryQuantity] = useState("1");
  const [accessorySerialNumber, setAccessorySerialNumber] = useState("");
  const [accessoryNotes, setAccessoryNotes] = useState("");
  const [failureReason, setFailureReason] = useState("");

  const details = useQuery({
    queryKey: detailQueryKey(workOrderId),
    queryFn: ({ signal }) => installationWorkOrdersApi.getById(workOrderId, signal),
    retry: false,
  });
  const repairCaseDetails = useQuery({
    queryKey: ["dolores", "technician", "repair-cases", "id", workOrderId],
    queryFn: ({ signal }) => repairCasesApi.getById(workOrderId, signal),
    enabled: details.isError,
    retry: false,
  });

  if (repairCaseDetails.data) {
    return <TechnicianRepairCaseScreen repairCaseId={workOrderId} />;
  }

  const refreshWorkOrder = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: detailQueryKey(workOrderId) }),
      queryClient.invalidateQueries({ queryKey: assignedQueryKey }),
    ]);
  };

  const start = useMutation({
    mutationFn: () => installationWorkOrdersApi.start(workOrderId),
    onSuccess: refreshWorkOrder,
    onError: refreshWorkOrder,
  });
  const updateChecklist = useMutation({
    mutationFn: (input: { checklistItemId: string; result: ChecklistResult; notes: string }) =>
      installationWorkOrdersApi.updateChecklist(workOrderId, input.checklistItemId, {
        result: input.result,
        notes: input.notes,
      }),
    onSuccess: async (_result, input) => {
      setChecklistEdits((current) => {
        const next = { ...current };
        delete next[input.checklistItemId];
        return next;
      });
      await refreshWorkOrder();
    },
    onError: refreshWorkOrder,
  });
  const addAccessory = useMutation({
    mutationFn: () => installationWorkOrdersApi.addAccessory(workOrderId, {
      accessoryName,
      quantity: Number(accessoryQuantity),
      ...(accessorySerialNumber.trim() ? { serialNumber: accessorySerialNumber.trim() } : {}),
      ...(accessoryNotes.trim() ? { notes: accessoryNotes.trim() } : {}),
    }),
    onSuccess: async () => {
      setAccessoryName("");
      setAccessoryQuantity("1");
      setAccessorySerialNumber("");
      setAccessoryNotes("");
      await refreshWorkOrder();
    },
    onError: refreshWorkOrder,
  });
  const fail = useMutation({
    mutationFn: () => installationWorkOrdersApi.fail(workOrderId, { failureReason: failureReason.trim() }),
    onSuccess: async () => {
      setFailureReason("");
      await refreshWorkOrder();
    },
    onError: refreshWorkOrder,
  });
  const uploadEvidence = useMutation({
    mutationFn: (file: File) => installationWorkOrdersApi.uploadEvidence(workOrderId, file),
    onSuccess: async () => {
      setSelectedFile(null);
      if (fileInput.current) fileInput.current.value = "";
      await refreshWorkOrder();
    },
    onError: refreshWorkOrder,
  });
  const complete = useMutation({
    mutationFn: (recipient: string) => installationWorkOrdersApi.complete(workOrderId, { handoverRecipient: recipient }),
    onSuccess: refreshWorkOrder,
    onError: refreshWorkOrder,
  });

  const detailData = details.data;
  const workOrder = detailData?.workOrder;
  const evidenceCount = detailData?.evidenceCount ?? detailData?.evidence.length ?? 0;
  const canComplete = Boolean(workOrder?.status === "IN_PROGRESS" && evidenceCount > 0 && handoverRecipient.trim());

  const handleFileChange = (file: File | null) => {
    setEvidenceError("");
    setSelectedFile(file);
    if (!file) return;
    if (file.size <= 0) {
      setEvidenceError("Tệp minh chứng không được để trống.");
      return;
    }
    if (file.size > MAX_EVIDENCE_BYTES) {
      setEvidenceError("Tệp minh chứng không được vượt quá 20 MB.");
      return;
    }
    if (!ALLOWED_EVIDENCE_TYPES.has(file.type)) {
      setEvidenceError("Chỉ chấp nhận tệp PDF, JPEG hoặc PNG.");
    }
  };

  return (
    <TechnicianShell pageTitle={messages.TASK_DETAIL_TITLE}>
      <section className={shellStyles.pageContent} aria-labelledby="technician-work-order-title">
        <header className={shellStyles.pageHeading}>
          <h1 id="technician-work-order-title">{messages.TASK_DETAIL_TITLE}</h1>
          <p>Thực hiện lắp đặt, tải minh chứng bàn giao và xác nhận người nhận theo trạng thái của lệnh.</p>
          <div className={styles.backLink}>
            <TextLinkButton href={PATH_TECHNICIAN.TASKS}>Về danh sách công việc</TextLinkButton>
          </div>
        </header>

        {(details.isPending || (details.isError && repairCaseDetails.isPending)) && <p className={shellStyles.pendingNotice} role="status">Đang tải chi tiết công việc…</p>}
        {details.isError && repairCaseDetails.isError && (
          <div className={styles.notice} role="alert">
            <p>{getApiErrorMessage(details.error)}</p>
            <ButtonBar
              type="button"
              disabled={details.isFetching || repairCaseDetails.isFetching}
              onClick={() => void Promise.all([details.refetch(), repairCaseDetails.refetch()])}
            >
              {details.isFetching || repairCaseDetails.isFetching ? "Đang tải…" : "Tải lại"}
            </ButtonBar>
          </div>
        )}

        {detailData && workOrder && !details.isError && (
          <>
            <section className={styles.panel} aria-labelledby="work-order-overview-title">
              <h2 id="work-order-overview-title">Thông tin lệnh lắp đặt</h2>
              <dl className={styles.detailGrid}>
                <DetailValue label="Mã công việc" value={workOrder.id} code />
                <DetailValue label="Trạng thái" value={statusLabels[workOrder.status]} />
                <DetailValue label="Mã hợp đồng" value={workOrder.contractId} code />
                <DetailValue label="Mã máy" value={workOrder.machineId} code />
                <DetailValue label="Loại máy" value={workOrder.machineType === "SMART_IOT" ? messages.TASKS_MACHINE_TYPE_SMART_IOT : messages.TASKS_MACHINE_TYPE_CONVENTIONAL} />
                <DetailValue label="Chủ sở hữu" value={workOrder.ownerId} code />
                <DetailValue label="Lịch dự kiến" value={formatDateTime(workOrder.scheduledFor)} />
                <DetailValue label="Bắt đầu lúc" value={formatDateTime(workOrder.startedAt)} />
                <DetailValue label="Hoàn tất lúc" value={formatDateTime(workOrder.completedAt)} />
                <DetailValue label="Người nhận bàn giao" value={workOrder.handoverRecipient ?? "—"} />
                {workOrder.failureReason && <DetailValue label="Lý do thất bại" value={workOrder.failureReason} />}
              </dl>
              {detailData.installationNotes && <p className={styles.notes}><strong>Ghi chú:</strong> {detailData.installationNotes}</p>}
            </section>

            {workOrder.status === "ASSIGNED" && (
              <section className={styles.panel} aria-labelledby="work-order-start-title">
                <h2 id="work-order-start-title">Bắt đầu lắp đặt</h2>
                <p className={styles.hint}>Lệnh chỉ có thể bắt đầu khi đang ở trạng thái “Đã phân công”.</p>
                {start.isError && <p className={styles.error} role="alert">{getApiErrorMessage(start.error, "mutation")}</p>}
                <ButtonBar type="button" disabled={start.isPending} onClick={() => start.mutate()}>
                  {start.isPending ? "Đang bắt đầu…" : "Bắt đầu lắp đặt"}
                </ButtonBar>
              </section>
            )}

            {workOrder.status === "IN_PROGRESS" && (
              <section className={styles.panel} aria-labelledby="work-order-failure-title">
                <h2 id="work-order-failure-title">Báo lắp đặt không thành công</h2>
                <p className={styles.hint}>Ghi rõ lý do để Moderator có thể điều phối bước tiếp theo.</p>
                <label className={styles.formField} htmlFor="work-order-failure-reason">
                  <span>Lý do</span>
                  <textarea
                    id="work-order-failure-reason"
                    maxLength={4000}
                    rows={3}
                    value={failureReason}
                    onChange={(event) => setFailureReason(event.target.value)}
                  />
                </label>
                {fail.isError && <p className={styles.error} role="alert">{getApiErrorMessage(fail.error, "mutation")}</p>}
                <ButtonBar
                  type="button"
                  disabled={!failureReason.trim() || fail.isPending || start.isPending || complete.isPending}
                  onClick={() => fail.mutate()}
                >
                  {fail.isPending ? "Đang gửi báo cáo…" : "Gửi báo cáo thất bại"}
                </ButtonBar>
              </section>
            )}

            {workOrder.status === "IN_PROGRESS" && (
              <>
                <section className={styles.panel} aria-labelledby="work-order-evidence-title">
                  <h2 id="work-order-evidence-title">Minh chứng bàn giao ({evidenceCount})</h2>
                  <p className={styles.hint}>Tải ít nhất một tệp PDF, JPEG hoặc PNG, dung lượng tối đa 20 MB. Tệp được lưu riêng tư.</p>
                  {detailData.evidence.length > 0 && (
                    <DataTable
                      variant="moderator"
                      rows={detailData.evidence}
                      rowKey={(item) => item.id}
                      columns={[
                        { key: "filename", header: "Tệp", render: (item) => item.originalFilename },
                        { key: "type", header: "Định dạng", render: (item) => item.contentType ?? "—" },
                        { key: "size", header: "Dung lượng", render: (item) => formatFileSize(item.sizeBytes) },
                        { key: "uploaded", header: "Ngày tải", render: (item) => formatDateTime(item.uploadedAt) },
                      ]}
                    />
                  )}
                  <div className={styles.uploadRow}>
                    <label className={styles.fileField} htmlFor="work-order-evidence-file">
                      <span>Chọn minh chứng</span>
                      <input
                        ref={fileInput}
                        id="work-order-evidence-file"
                        type="file"
                        accept="application/pdf,image/jpeg,image/png,.pdf,.jpg,.jpeg,.png"
                        disabled={uploadEvidence.isPending}
                        onChange={(event) => handleFileChange(event.target.files?.[0] ?? null)}
                      />
                    </label>
                    {selectedFile && <span className={styles.fileName}>{selectedFile.name} · {formatFileSize(selectedFile.size)}</span>}
                    <ButtonBar
                      type="button"
                      disabled={!selectedFile || Boolean(evidenceError) || uploadEvidence.isPending}
                      onClick={() => selectedFile && uploadEvidence.mutate(selectedFile)}
                    >
                      {uploadEvidence.isPending ? "Đang tải minh chứng…" : "Tải minh chứng"}
                    </ButtonBar>
                  </div>
                  {evidenceError && <p className={styles.error} role="alert">{evidenceError}</p>}
                  {uploadEvidence.isError && <p className={styles.error} role="alert">{getApiErrorMessage(uploadEvidence.error, "mutation")}</p>}
                </section>

                <section className={styles.panel} aria-labelledby="work-order-complete-title">
                  <h2 id="work-order-complete-title">Hoàn tất bàn giao</h2>
                  <p className={styles.hint}>Checklist không bắt buộc. Cần ít nhất một minh chứng đã tải lên và tên người nhận bàn giao.</p>
                  <label className={styles.recipientField} htmlFor="work-order-handover-recipient">
                    <span>Người nhận bàn giao</span>
                    <input
                      id="work-order-handover-recipient"
                      type="text"
                      value={handoverRecipient}
                      onChange={(event) => setHandoverRecipient(event.target.value)}
                    />
                  </label>
                  {complete.isError && <p className={styles.error} role="alert">{getApiErrorMessage(complete.error, "mutation")}</p>}
                  <ButtonBar
                    type="button"
                    disabled={!canComplete || complete.isPending || uploadEvidence.isPending}
                    onClick={() => complete.mutate(handoverRecipient.trim())}
                  >
                    {complete.isPending ? "Đang hoàn tất…" : "Xác nhận hoàn tất bàn giao"}
                  </ButtonBar>
                </section>
              </>
            )}

            {workOrder.status === "COMPLETED" && (
              <p className={styles.success} role="status">Đã hoàn tất bàn giao. Hợp đồng đã sẵn sàng để Admin hoặc Moderator kiểm tra và kích hoạt.</p>
            )}

            {workOrder.status === "PENDING" && (
              <p className={styles.notice} role="status">Công việc đang chờ Moderator phân công kỹ thuật viên.</p>
            )}

            {(workOrder.status === "FAILED" || workOrder.status === "CANCELLED") && (
              <p className={styles.notice} role="status">Lệnh lắp đặt đã kết thúc với trạng thái {statusLabels[workOrder.status]}.</p>
            )}

            <section className={styles.panel} aria-labelledby="work-order-checklist-title">
              <h2 id="work-order-checklist-title">Checklist tham khảo ({detailData.checklistItemCount ?? detailData.checklistItems.length})</h2>
              <p className={styles.hint}>
                {workOrder.status === "IN_PROGRESS"
                  ? "Chọn kết quả cho từng mục rồi lưu. Không thể gửi trạng thái Chờ xử lý. Checklist không thay thế minh chứng bàn giao."
                  : "Checklist chỉ có thể cập nhật khi lệnh đang được xử lý."}
              </p>
              {updateChecklist.isError && <p className={styles.error} role="alert">{getApiErrorMessage(updateChecklist.error, "mutation")}</p>}
              {updateChecklist.isSuccess && <p className={styles.success} role="status">Đã lưu kết quả checklist.</p>}
              <DataTable
                variant="moderator"
                rows={detailData.checklistItems}
                rowKey={(item) => item.id}
                emptyMessage="Không có mục checklist cho lệnh này."
                columns={[
                  { key: "code", header: "Mã mục", render: (item) => item.itemCode },
                  { key: "label", header: "Nội dung", render: (item) => item.label },
                  { key: "required", header: "Bắt buộc", render: (item) => item.required ? "Có" : "Không" },
                  {
                    key: "result",
                    header: "Kết quả",
                    render: (item) => {
                      const edit = checklistEdits[item.id];
                      const result = edit?.result ?? (item.result === "PENDING" ? "" : item.result);
                      return workOrder.status === "IN_PROGRESS" ? (
                        <select
                          className={styles.tableControl}
                          aria-label={`Kết quả ${item.label}`}
                          disabled={updateChecklist.isPending}
                          value={result}
                          onChange={(event) => setChecklistEdits((current) => ({
                            ...current,
                            [item.id]: {
                              result: event.target.value as ChecklistEdit["result"],
                              notes: current[item.id]?.notes ?? item.notes ?? "",
                            },
                          }))}
                        >
                          <option value="">Chọn kết quả</option>
                          <option value="PASSED">Đạt</option>
                          <option value="FAILED">Không đạt</option>
                          <option value="NOT_APPLICABLE">Không áp dụng</option>
                        </select>
                      ) : item.result;
                    },
                  },
                  {
                    key: "notes",
                    header: "Ghi chú",
                    render: (item) => workOrder.status === "IN_PROGRESS" ? (
                      <input
                        className={styles.tableControl}
                        aria-label={`Ghi chú ${item.label}`}
                        maxLength={4000}
                        value={checklistEdits[item.id]?.notes ?? item.notes ?? ""}
                        disabled={updateChecklist.isPending}
                        onChange={(event) => setChecklistEdits((current) => ({
                          ...current,
                          [item.id]: {
                            result: current[item.id]?.result ?? (item.result === "PENDING" ? "" : item.result),
                            notes: event.target.value,
                          },
                        }))}
                      />
                    ) : item.notes ?? "—",
                  },
                  ...(workOrder.status === "IN_PROGRESS" ? [{
                    key: "save",
                    header: "",
                    render: (item: InstallationWorkOrderDetails["checklistItems"][number]) => {
                      const edit = checklistEdits[item.id];
                      const result = edit?.result ?? (item.result === "PENDING" ? "" : item.result);
                      const notes = edit?.notes ?? item.notes ?? "";
                      const changed = result !== item.result || notes !== (item.notes ?? "");
                      return (
                        <ButtonBar
                          type="button"
                          disabled={!result || !changed || updateChecklist.isPending}
                          onClick={() => result && updateChecklist.mutate({
                            checklistItemId: item.id,
                            result: result as ChecklistResult,
                            notes: notes.trim(),
                          })}
                        >
                          {updateChecklist.isPending ? "Đang lưu…" : "Lưu"}
                        </ButtonBar>
                      );
                    },
                  }] : []),
                ]}
              />
            </section>

            {(detailData.accessories.length > 0 || workOrder.status === "IN_PROGRESS") && (
              <section className={styles.panel} aria-labelledby="work-order-accessories-title">
                <h2 id="work-order-accessories-title">Phụ kiện đã ghi nhận</h2>
                {detailData.accessories.length ? (
                  <DataTable
                    variant="moderator"
                    rows={detailData.accessories}
                    rowKey={(item) => item.id}
                    columns={[
                      { key: "name", header: "Phụ kiện", render: (item) => item.accessoryName },
                      { key: "quantity", header: "Số lượng", render: (item) => item.quantity },
                      { key: "serial", header: "Số sê-ri", render: (item) => item.serialNumber ?? "—" },
                      { key: "notes", header: "Ghi chú", render: (item) => item.notes ?? "—" },
                    ]}
                  />
                ) : <p className={styles.hint}>Chưa ghi nhận phụ kiện.</p>}
                {workOrder.status === "IN_PROGRESS" && (
                  <>
                    <div className={styles.formGrid}>
                      <label className={styles.formField} htmlFor="work-order-accessory-name">
                        <span>Tên phụ kiện</span>
                        <input id="work-order-accessory-name" maxLength={160} value={accessoryName} onChange={(event) => setAccessoryName(event.target.value)} />
                      </label>
                      <label className={styles.formField} htmlFor="work-order-accessory-quantity">
                        <span>Số lượng</span>
                        <input id="work-order-accessory-quantity" type="number" min="1" step="1" value={accessoryQuantity} onChange={(event) => setAccessoryQuantity(event.target.value)} />
                      </label>
                      <label className={styles.formField} htmlFor="work-order-accessory-serial">
                        <span>Số sê-ri (nếu có)</span>
                        <input id="work-order-accessory-serial" maxLength={128} value={accessorySerialNumber} onChange={(event) => setAccessorySerialNumber(event.target.value)} />
                      </label>
                      <label className={styles.formField} htmlFor="work-order-accessory-notes">
                        <span>Ghi chú (nếu có)</span>
                        <input id="work-order-accessory-notes" maxLength={4000} value={accessoryNotes} onChange={(event) => setAccessoryNotes(event.target.value)} />
                      </label>
                    </div>
                    {addAccessory.isError && <p className={styles.error} role="alert">{getApiErrorMessage(addAccessory.error, "mutation")}</p>}
                    <ButtonBar
                      type="button"
                      disabled={!accessoryName.trim() || !Number.isInteger(Number(accessoryQuantity)) || Number(accessoryQuantity) < 1 || addAccessory.isPending}
                      onClick={() => addAccessory.mutate()}
                    >
                      {addAccessory.isPending ? "Đang lưu phụ kiện…" : "Ghi nhận phụ kiện"}
                    </ButtonBar>
                  </>
                )}
              </section>
            )}
          </>
        )}
      </section>
    </TechnicianShell>
  );
}
