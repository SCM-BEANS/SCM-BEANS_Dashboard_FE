import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { TECHNICIAN_WORK_ITEMS_QUERY_KEY } from "@/apis/technician-work-items.api";
import { installationWorkOrdersApi } from "@/apis/installation-work-orders.api";
import { machinesApi } from "@/apis/machines.api";
import { repairCasesApi } from "@/apis/repair-cases.api";
import { recallWorkOrdersApi } from "@/apis/recall-work-orders.api";
import { terminationCasesApi } from "@/apis/termination-cases.api";
import { ButtonBar } from "@/components/button/button-bar";
import { PageActions } from "@/components/action-bar/page-actions";
import { TextLinkButton } from "@/components/button/text-link-button";
import { InstallationWorkOrderRecords, installationWorkOrderRecordsQueryPrefix } from "@/components/features/installation/installation-work-order-records";
import { DataTable } from "@/components/table/data-table";
import { getApiErrorMessage } from "@/lib/api-errors";
import { PATH_TECHNICIAN } from "@/routes/path";
import type { AssignedInstallationWorkOrderSummary, InstallationWorkOrderDetails } from "@/schema/installation-work-orders.schema";
import type { RepairCase, RepairCustodyEventRequest } from "@/schema/machines.schema";
import type { RecallEvidence, RecallWorkOrder } from "@/schema/recall-work-orders.schema";
import { EVIDENCE_ACCEPT, evidenceFileError } from "@/lib/evidence-multipart";
import type { TerminationInspectionRequest } from "@/schema/termination-cases.schema";
import { TECHNICIAN_MESSAGES as T } from "@/text/technician/technician-messages";
import { TechnicianShell } from "../technician-shell";
import shellStyles from "../technician-shell.module.css";
import styles from "./work-order-detail-screen.module.css";

const messages = T.WORKFLOWS;
const detailQueryKey = (workOrderId: string) => ["dolores", "installation-work-orders", "id", workOrderId] as const;
const assignedQueryKey = TECHNICIAN_WORK_ITEMS_QUERY_KEY;
const MAX_EVIDENCE_BYTES = 20 * 1024 * 1024;
const ALLOWED_EVIDENCE_TYPES = new Set(["application/pdf", "image/jpeg", "image/png"]);
const createWorkflowCorrelationId = (prefix: string) => `${prefix}-${globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`}`;
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

function evidenceMediaType(filename: string, metadataType: string | null | undefined, blob: Blob): string {
  const declaredType = metadataType?.split(";")[0].trim().toLowerCase();
  if (declaredType && declaredType !== "application/octet-stream") return declaredType;
  const extension = filename.toLowerCase().split(".").pop();
  if (extension === "pdf") return "application/pdf";
  if (extension === "jpg" || extension === "jpeg") return "image/jpeg";
  if (extension === "png") return "image/png";
  return declaredType || blob.type || "application/octet-stream";
}

function safeEvidenceFilename(filename: string, evidenceId: string): string {
  return filename.replace(/[\\/:*?"<>|\u0000-\u001f]/g, "_").trim().slice(0, 180) || `evidence-${evidenceId}`;
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
  const [diagnosisEvidence, setDiagnosisEvidence] = useState<File[]>([]);
  const [workScope, setWorkScope] = useState("");
  const [resolutionResult, setResolutionResult] = useState("");
  const [completionEvidence, setCompletionEvidence] = useState<File[]>([]);
  const [completionNotes, setCompletionNotes] = useState("");
  const [custodyType, setCustodyType] = useState<RepairCustodyEventRequest["eventType"] | "">("");
  const [custodyNotes, setCustodyNotes] = useState("");
  const [custodyEvidence, setCustodyEvidence] = useState<File[]>([]);

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
      queryClient.invalidateQueries({ queryKey: TECHNICIAN_WORK_ITEMS_QUERY_KEY }),
    ]);
  };

  const recordDiagnosis = useMutation({
    mutationFn: () => repairCasesApi.recordDiagnosis(repairCaseId, ticket.data?.id ?? "", { diagnosis }, diagnosisEvidence),
    onSuccess: refreshRepairCase,
  });
  const startWork = useMutation({
    mutationFn: () => repairCasesApi.startWork(repairCaseId, ticket.data?.id ?? "", { workScope }),
    onSuccess: refreshRepairCase,
  });
  const completeWork = useMutation({
    mutationFn: () => repairCasesApi.completeWork(repairCaseId, ticket.data?.id ?? "", {
      diagnosis,
      resolutionResult,
      workScope,
      ...(completionNotes.trim() ? { notes: completionNotes.trim() } : {}),
    }, completionEvidence),
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
      }, custodyEvidence);
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
                <p className={styles.hint}>Owner đã xác nhận nhận máy thay thế. Chẩn đoán cần một tệp minh chứng.</p>
                <label className={styles.formField} htmlFor="repair-diagnosis">
                  <span>Chẩn đoán</span>
                  <textarea id="repair-diagnosis" rows={3} maxLength={4000} value={diagnosis} onChange={(event) => setDiagnosis(event.target.value)} />
                </label>
                <label className={styles.formField} htmlFor="repair-diagnosis-evidence">
                  <span>Tệp minh chứng</span>
                  <input id="repair-diagnosis-evidence" type="file" accept={EVIDENCE_ACCEPT} onChange={(event) => setDiagnosisEvidence(Array.from(event.target.files ?? []))} />
                  {diagnosisEvidence.map((file) => <span key={file.name}>{file.name}</span>)}
                </label>
                {recordDiagnosis.isError && <p className={styles.error} role="alert">{getApiErrorMessage(recordDiagnosis.error, "mutation")}</p>}
                {recordDiagnosis.isSuccess && <p className={styles.success} role="status">Đã lưu chẩn đoán.</p>}
                <PageActions actions={[{ id: "record-diagnosis", label: "Lưu chẩn đoán", variant: "primary", priority: 50, disabled: !diagnosis.trim() || Boolean(evidenceFileError(diagnosisEvidence, { min: 1, max: 1 })), disabledReason: evidenceFileError(diagnosisEvidence, { min: 1, max: 1 }) ?? "Nhập chẩn đoán.", pending: recordDiagnosis.isPending, onClick: () => recordDiagnosis.mutate() }]} />
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
                <PageActions actions={[{ id: "start-repair", label: "Bắt đầu sửa chữa", variant: "primary", priority: 50, disabled: !workScope.trim(), disabledReason: "Nhập phạm vi công việc.", pending: startWork.isPending, onClick: () => startWork.mutate() }]} />
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
                    <span>Tệp minh chứng</span>
                    <input id="repair-completion-evidence" type="file" multiple accept={EVIDENCE_ACCEPT} onChange={(event) => setCompletionEvidence(Array.from(event.target.files ?? []))} />
                    {completionEvidence.map((file) => <span key={file.name}>{file.name}</span>)}
                  </label>
                  <label className={styles.formField} htmlFor="repair-completion-notes">
                    <span>Ghi chú (nếu có)</span>
                    <textarea id="repair-completion-notes" rows={3} maxLength={4000} value={completionNotes} onChange={(event) => setCompletionNotes(event.target.value)} />
                  </label>
                </div>
                {completeWork.isError && <p className={styles.error} role="alert">{getApiErrorMessage(completeWork.error, "mutation")}</p>}
                {completeWork.isSuccess && <p className={styles.success} role="status">Đã hoàn tất công việc sửa chữa.</p>}
                <PageActions actions={[{ id: "complete-repair", label: "Xác nhận hoàn tất", variant: "primary", priority: 50, disabled: !diagnosis.trim() || !resolutionResult.trim() || !workScope.trim() || Boolean(evidenceFileError(completionEvidence, { min: 1, max: 5 })), disabledReason: evidenceFileError(completionEvidence, { min: 1, max: 5 }) ?? "Nhập đầy đủ kết quả.", pending: completeWork.isPending, onClick: () => completeWork.mutate() }]} />
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
                  <span>Tệp minh chứng</span>
                  <input id="repair-custody-evidence" type="file" accept={EVIDENCE_ACCEPT} onChange={(event) => setCustodyEvidence(Array.from(event.target.files ?? []))} />
                  {custodyEvidence.map((file) => <span key={file.name}>{file.name}</span>)}
                </label>
                {recordCustody.isError && <p className={styles.error} role="alert">{getApiErrorMessage(recordCustody.error, "mutation")}</p>}
                {recordCustody.isSuccess && <p className={styles.success} role="status">Đã ghi nhận bàn giao.</p>}
                <ButtonBar
                  type="button"
                  disabled={!custodyType || !custodyNotes.trim() || Boolean(evidenceFileError(custodyEvidence, { min: 1, max: 1 })) || recordCustody.isPending}
                  aria-describedby="repair-custody-file-error"
                  onClick={() => recordCustody.mutate()}
                >
                  {recordCustody.isPending ? "Đang ghi nhận…" : "Ghi nhận bàn giao"}
                </ButtonBar>
                <p id="repair-custody-file-error">{evidenceFileError(custodyEvidence, { min: 1, max: 1 })}</p>
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
                      <strong>{formatDateTime(event.occurredAt)} · {repairCustodyLabels[event.eventType as keyof typeof repairCustodyLabels] ?? event.eventType}</strong>
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

const recallStatusLabels: Record<RecallWorkOrder["status"], string> = {
  UNASSIGNED: "Chưa phân công",
  ASSIGNED: "Đã phân công",
  SCHEDULED: "Đã lên lịch nhận máy",
  PICKUP_IN_PROGRESS: "Đang nhận máy",
  OWNER_ACK_PENDING: "Chờ Owner xác nhận bàn giao",
  CUSTODY_VERIFICATION_PENDING: "Chờ đưa máy về kho",
  RECEIPT_REVIEW_PENDING: "Chờ duyệt biên nhận kho",
  RECEIVED_AT_DEPOT: "Đã nhận tại kho",
  LEGACY_REVIEW_REQUIRED: "Cần rà soát hồ sơ cũ",
  CANCELLED: "Đã hủy",
};

function TechnicianRecallWorkOrderScreen({ recallWorkOrderId }: { recallWorkOrderId: string }) {
  const queryClient = useQueryClient();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadedEvidence, setUploadedEvidence] = useState<{ id: string; type: RecallEvidence["evidenceType"] } | null>(null);
  const [pickupNotes, setPickupNotes] = useState("");
  const [depotLocation, setDepotLocation] = useState("");
  const [fileError, setFileError] = useState("");
  const [evidenceActionError, setEvidenceActionError] = useState("");
  const orderQuery = useQuery({
    queryKey: ["dolores", "recall-work-orders", "id", recallWorkOrderId],
    queryFn: ({ signal }) => recallWorkOrdersApi.getById(recallWorkOrderId, signal),
    retry: false,
  });
  const events = useQuery({
    queryKey: ["dolores", "recall-work-orders", "events", recallWorkOrderId],
    queryFn: ({ signal }) => recallWorkOrdersApi.listEvents(recallWorkOrderId, 0, 50, signal),
    retry: false,
  });
  const evidence = useQuery({
    queryKey: ["dolores", "recall-work-orders", "evidence", recallWorkOrderId],
    queryFn: ({ signal }) => recallWorkOrdersApi.listEvidence(recallWorkOrderId, signal),
    retry: false,
  });
  const order = orderQuery.data;
  const uploadType: RecallEvidence["evidenceType"] | null = order?.status === "PICKUP_IN_PROGRESS"
    ? "PICKUP"
    : order?.status === "CUSTODY_VERIFICATION_PENDING" ? "DEPOT_RECEIPT" : null;
  const refresh = async () => Promise.all([
    queryClient.invalidateQueries({ queryKey: ["dolores", "recall-work-orders", "id", recallWorkOrderId] }),
    queryClient.invalidateQueries({ queryKey: ["dolores", "recall-work-orders", "events", recallWorkOrderId] }),
    queryClient.invalidateQueries({ queryKey: ["dolores", "recall-work-orders", "evidence", recallWorkOrderId] }),
    queryClient.invalidateQueries({ queryKey: TECHNICIAN_WORK_ITEMS_QUERY_KEY }),
  ]);
  const startPickup = useMutation({
    mutationFn: () => recallWorkOrdersApi.startPickup(recallWorkOrderId, createWorkflowCorrelationId("recall-pickup-start")),
    onSuccess: refresh,
  });
  const upload = useMutation({
    mutationFn: (file: File) => {
      if (!uploadType) throw new Error("Lệnh thu hồi chưa ở bước cần tải chứng cứ.");
      return recallWorkOrdersApi.uploadEvidence(recallWorkOrderId, uploadType, createWorkflowCorrelationId("recall-evidence"), file);
    },
    onSuccess: async (item) => {
      setUploadedEvidence({ id: item.id, type: item.evidenceType });
      setSelectedFile(null);
      setFileError("");
      await refresh();
    },
  });
  const pickupAttempt = useMutation({
    mutationFn: (successful: boolean) => recallWorkOrdersApi.recordPickup(recallWorkOrderId, {
      successful,
      ...(successful && uploadedEvidence?.type === "PICKUP" ? { evidenceId: uploadedEvidence.id } : {}),
      ...(pickupNotes.trim() ? { notes: pickupNotes.trim() } : {}),
      correlationId: createWorkflowCorrelationId("recall-pickup-attempt"),
    }),
    onSuccess: async () => {
      setPickupNotes("");
      setUploadedEvidence(null);
      await refresh();
    },
  });
  const depotReceipt = useMutation({
    mutationFn: () => recallWorkOrdersApi.submitDepotReceipt(recallWorkOrderId, {
      depotLocation: depotLocation.trim(),
      evidenceId: uploadedEvidence?.type === "DEPOT_RECEIPT" ? uploadedEvidence.id : "",
      correlationId: createWorkflowCorrelationId("recall-depot-receipt"),
    }),
    onSuccess: async () => {
      setDepotLocation("");
      setUploadedEvidence(null);
      await refresh();
    },
  });
  const downloadEvidence = async (evidenceId: string, filename: string) => {
    setEvidenceActionError("");
    try {
      const { blob } = await recallWorkOrdersApi.downloadEvidence(recallWorkOrderId, evidenceId);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = safeEvidenceFilename(filename, evidenceId);
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error) {
      setEvidenceActionError(getApiErrorMessage(error));
    }
  };
  const handleFile = (file: File | null) => {
    setSelectedFile(file);
    setUploadedEvidence(null);
    setFileError("");
    if (!file) return;
    if (file.size <= 0) setFileError("Tệp chứng cứ không được để trống.");
    else if (file.size > MAX_EVIDENCE_BYTES) setFileError("Tệp chứng cứ không được vượt quá 20 MB.");
    else if (!ALLOWED_EVIDENCE_TYPES.has(file.type)) setFileError("Chỉ chấp nhận tệp PDF, JPEG hoặc PNG.");
  };
  const isPickupEvidenceReady = uploadedEvidence?.type === "PICKUP";
  const isDepotEvidenceReady = uploadedEvidence?.type === "DEPOT_RECEIPT";

  return (
    <TechnicianShell pageTitle="Thu hồi máy">
      <section className={shellStyles.pageContent} aria-labelledby="technician-recall-title">
        <header className={shellStyles.pageHeading}>
          <h1 id="technician-recall-title">Thu hồi máy theo hợp đồng</h1>
          <p>Nhận máy từ Owner, ghi nhận chứng cứ và bàn giao vào kho theo đúng thứ tự.</p>
          <div className={styles.backLink}><TextLinkButton href={PATH_TECHNICIAN.TASKS}>Về danh sách công việc</TextLinkButton></div>
        </header>
        {orderQuery.isPending ? <p className={shellStyles.pendingNotice} role="status">Đang tải lệnh thu hồi…</p> : null}
        {orderQuery.isError ? <div className={styles.notice} role="alert"><p>{getApiErrorMessage(orderQuery.error)}</p><ButtonBar type="button" onClick={() => void orderQuery.refetch()}>Tải lại</ButtonBar></div> : null}
        {order ? (
          <>
            <section className={styles.panel} aria-labelledby="technician-recall-overview-title">
              <h2 id="technician-recall-overview-title">Thông tin lệnh thu hồi</h2>
              <dl className={styles.detailGrid}>
                <DetailValue label="Mã lệnh" value={order.id} code />
                <DetailValue label="Trạng thái" value={recallStatusLabels[order.status]} />
                <DetailValue label="Mã hồ sơ chấm dứt" value={order.terminationCaseId} code />
                <DetailValue label="Mã hợp đồng" value={order.contractId} code />
                <DetailValue label="Mã máy" value={order.machineId} code />
                <DetailValue label="Lịch nhận máy" value={formatDateTime(order.scheduledPickupAt)} />
              </dl>
              {order.status === "ASSIGNED" || order.status === "SCHEDULED" ? (
                <>
                  <p className={styles.hint}>Bắt đầu khi đã đến điểm nhận máy theo lịch được giao.</p>
                  {startPickup.isError ? <p className={styles.error} role="alert">{getApiErrorMessage(startPickup.error, "mutation")}</p> : null}
                  <PageActions actions={[{ id: "start-pickup", label: "Bắt đầu nhận máy", variant: "primary", priority: 50, pending: startPickup.isPending, onClick: () => startPickup.mutate() }]} />
                </>
              ) : null}
            </section>

            {order.status === "PICKUP_IN_PROGRESS" ? (
              <section className={styles.panel} aria-labelledby="technician-recall-pickup-title">
                <h2 id="technician-recall-pickup-title">Ghi nhận lần đến nhận máy</h2>
                <p className={styles.hint}>Nếu nhận được máy, tải chứng cứ trước rồi xác nhận. Nếu chưa nhận được, ghi rõ lý do để Moderator sắp xếp lại.</p>
                <label className={styles.formField} htmlFor="recall-pickup-evidence">
                  <span>Ảnh hoặc biên bản nhận máy</span>
                  <input id="recall-pickup-evidence" type="file" accept="application/pdf,image/jpeg,image/png,.pdf,.jpg,.jpeg,.png" onChange={(event) => handleFile(event.target.files?.[0] ?? null)} />
                </label>
                {evidence.data?.some((item) => item.evidenceType === "PICKUP") ? (
                  <label className={styles.formField} htmlFor="recall-existing-pickup-evidence">
                    <span>Hoặc chọn chứng cứ đã tải lên</span>
                    <select id="recall-existing-pickup-evidence" value={uploadedEvidence?.type === "PICKUP" ? uploadedEvidence.id : ""} onChange={(event) => {
                      const item = evidence.data?.find((candidate) => candidate.id === event.target.value && candidate.evidenceType === "PICKUP");
                      setUploadedEvidence(item ? { id: item.id, type: item.evidenceType } : null);
                      setSelectedFile(null);
                      setFileError("");
                    }}>
                      <option value="">Chọn chứng cứ nhận máy</option>
                      {evidence.data.filter((item) => item.evidenceType === "PICKUP").map((item) => (
                        <option key={item.id} value={item.id}>{item.originalFilename} · {formatDateTime(item.uploadedAt)}</option>
                      ))}
                    </select>
                  </label>
                ) : null}
                {selectedFile ? <p className={styles.fileName}>{selectedFile.name} · {formatFileSize(selectedFile.size)}</p> : null}
                {fileError ? <p className={styles.error} role="alert">{fileError}</p> : null}
                {upload.isError ? <p className={styles.error} role="alert">{getApiErrorMessage(upload.error, "mutation")}</p> : null}
                {uploadType === "PICKUP" && selectedFile ? <ButtonBar type="button" disabled={Boolean(fileError) || upload.isPending} onClick={() => upload.mutate(selectedFile)}>{upload.isPending ? "Đang tải chứng cứ…" : "Tải chứng cứ nhận máy"}</ButtonBar> : null}
                {isPickupEvidenceReady ? <p className={styles.success} role="status">Đã tải chứng cứ nhận máy.</p> : null}
                <label className={styles.formField} htmlFor="recall-pickup-notes">
                  <span>Ghi chú lần nhận máy</span>
                  <textarea id="recall-pickup-notes" rows={3} maxLength={2000} value={pickupNotes} onChange={(event) => setPickupNotes(event.target.value)} />
                </label>
                {pickupAttempt.isError ? <p className={styles.error} role="alert">{getApiErrorMessage(pickupAttempt.error, "mutation")}</p> : null}
                <div className={styles.evidenceActions}>
                  <PageActions actions={[{ id: "pickup-failed", label: "Chưa nhận được máy", priority: 50, disabled: !pickupNotes.trim(), disabledReason: "Nhập lý do chưa nhận máy.", pending: pickupAttempt.isPending, onClick: () => pickupAttempt.mutate(false) }, { id: "pickup-received", label: "Đã nhận được máy", variant: "primary", priority: 50, disabled: !isPickupEvidenceReady, disabledReason: "Tải chứng cứ nhận máy.", pending: pickupAttempt.isPending, onClick: () => pickupAttempt.mutate(true) }]} />
                </div>
              </section>
            ) : null}

            {order.status === "OWNER_ACK_PENDING" ? <p className={styles.notice} role="status">Đang chờ Owner xác nhận tình trạng và việc bàn giao máy. Sau khi Owner xác nhận, bạn có thể tiếp tục nộp biên nhận kho.</p> : null}

            {order.status === "CUSTODY_VERIFICATION_PENDING" ? (
              <section className={styles.panel} aria-labelledby="technician-recall-depot-title">
                <h2 id="technician-recall-depot-title">Bàn giao máy vào kho</h2>
                <p className={styles.hint}>Owner đã xác nhận bàn giao. Tải chứng cứ nhận kho rồi gửi địa điểm để Moderator duyệt.</p>
                <label className={styles.formField} htmlFor="recall-depot-location"><span>Địa điểm kho</span><input id="recall-depot-location" maxLength={240} value={depotLocation} onChange={(event) => setDepotLocation(event.target.value)} /></label>
                <label className={styles.formField} htmlFor="recall-depot-evidence">
                  <span>Ảnh hoặc biên bản nhận kho</span>
                  <input id="recall-depot-evidence" type="file" accept="application/pdf,image/jpeg,image/png,.pdf,.jpg,.jpeg,.png" onChange={(event) => handleFile(event.target.files?.[0] ?? null)} />
                </label>
                {evidence.data?.some((item) => item.evidenceType === "DEPOT_RECEIPT") ? (
                  <label className={styles.formField} htmlFor="recall-existing-depot-evidence">
                    <span>Hoặc chọn chứng cứ đã tải lên</span>
                    <select id="recall-existing-depot-evidence" value={uploadedEvidence?.type === "DEPOT_RECEIPT" ? uploadedEvidence.id : ""} onChange={(event) => {
                      const item = evidence.data?.find((candidate) => candidate.id === event.target.value && candidate.evidenceType === "DEPOT_RECEIPT");
                      setUploadedEvidence(item ? { id: item.id, type: item.evidenceType } : null);
                      setSelectedFile(null);
                      setFileError("");
                    }}>
                      <option value="">Chọn chứng cứ nhận kho</option>
                      {evidence.data.filter((item) => item.evidenceType === "DEPOT_RECEIPT").map((item) => (
                        <option key={item.id} value={item.id}>{item.originalFilename} · {formatDateTime(item.uploadedAt)}</option>
                      ))}
                    </select>
                  </label>
                ) : null}
                {selectedFile ? <p className={styles.fileName}>{selectedFile.name} · {formatFileSize(selectedFile.size)}</p> : null}
                {fileError ? <p className={styles.error} role="alert">{fileError}</p> : null}
                {upload.isError ? <p className={styles.error} role="alert">{getApiErrorMessage(upload.error, "mutation")}</p> : null}
                {uploadType === "DEPOT_RECEIPT" && selectedFile ? <ButtonBar type="button" disabled={Boolean(fileError) || upload.isPending} onClick={() => upload.mutate(selectedFile)}>{upload.isPending ? "Đang tải chứng cứ…" : "Tải chứng cứ nhận kho"}</ButtonBar> : null}
                {isDepotEvidenceReady ? <p className={styles.success} role="status">Đã tải chứng cứ nhận kho.</p> : null}
                {depotReceipt.isError ? <p className={styles.error} role="alert">{getApiErrorMessage(depotReceipt.error, "mutation")}</p> : null}
                <PageActions actions={[{ id: "depot-receipt", label: "Gửi biên nhận về kho", variant: "primary", priority: 50, disabled: !depotLocation.trim() || !isDepotEvidenceReady, disabledReason: "Nhập địa điểm và tải chứng cứ.", pending: depotReceipt.isPending, onClick: () => depotReceipt.mutate() }]} />
              </section>
            ) : null}

            {order.status === "RECEIPT_REVIEW_PENDING" ? <p className={styles.notice} role="status">Biên nhận đã gửi. Đang chờ Admin hoặc Moderator xác nhận máy đã về kho.</p> : null}
            {order.status === "RECEIVED_AT_DEPOT" ? <p className={styles.success} role="status">Máy đã được nhận tại kho. Admin hoặc Moderator có thể tạo phiếu kiểm tra.</p> : null}
            {order.status === "CANCELLED" ? <p className={styles.notice} role="status">Lệnh thu hồi đã bị hủy. Liên hệ Moderator nếu cần hướng dẫn tiếp theo.</p> : null}

            {evidence.data?.length ? (
              <section className={styles.panel} aria-labelledby="technician-recall-evidence-title">
                <h2 id="technician-recall-evidence-title">Chứng cứ đã lưu ({evidence.data.length})</h2>
                <DataTable variant="moderator" rows={evidence.data} rowKey={(item) => item.id} columns={[
                  { key: "type", header: "Loại", render: (item) => item.evidenceType === "PICKUP" ? "Nhận máy" : item.evidenceType === "OWNER_HANDOVER" ? "Bàn giao Owner" : "Nhận kho" },
                  { key: "file", header: "Tệp", render: (item) => item.originalFilename },
                  { key: "uploaded", header: "Thời điểm", render: (item) => formatDateTime(item.uploadedAt) },
                  { key: "action", header: "Thao tác", render: (item) => <ButtonBar type="button" onClick={() => void downloadEvidence(item.id, item.originalFilename)}>Tải xuống</ButtonBar> },
                ]} />
                {evidenceActionError ? <p className={styles.error} role="alert">{evidenceActionError}</p> : null}
              </section>
            ) : null}
            {evidence.isError || events.isError ? <p className={styles.error} role="alert">Không tải được đầy đủ lịch sử hoặc chứng cứ của lệnh thu hồi.</p> : null}
            {events.data?.content.length ? (
              <section className={styles.panel} aria-labelledby="technician-recall-events-title">
                <h2 id="technician-recall-events-title">Lịch sử xử lý</h2>
                <ol className={styles.eventList}>{events.data.content.map((event) => <li key={event.id}><strong>{event.eventType.replaceAll("_", " ")}</strong> · {formatDateTime(event.occurredAt)}{event.reason ? <p>{event.reason}</p> : null}</li>)}</ol>
              </section>
            ) : null}
          </>
        ) : null}
      </section>
    </TechnicianShell>
  );
}

function TechnicianTerminationInspectionScreen({ maintenanceTicketId, terminationCaseId }: { maintenanceTicketId: string; terminationCaseId: string }) {
  const queryClient = useQueryClient();
  const [diagnosis, setDiagnosis] = useState("");
  const [responsibility, setResponsibility] = useState<TerminationInspectionRequest["responsibility"]>("UNKNOWN");
  const [inspectionDecision, setInspectionDecision] = useState<TerminationInspectionRequest["inspectionDecision"]>("NO_DAMAGE");
  const [actualCost, setActualCost] = useState("");
  const [evidenceReference, setEvidenceReference] = useState<File[]>([]);
  const [resolutionResult, setResolutionResult] = useState("");
  const [notes, setNotes] = useState("");
  const ticket = useQuery({
    queryKey: ["dolores", "technician", "maintenance-ticket", maintenanceTicketId],
    queryFn: ({ signal }) => machinesApi.getMaintenanceTicketById(maintenanceTicketId, signal),
    retry: false,
  });
  const terminationCase = useQuery({
    queryKey: ["dolores", "termination-cases", "id", terminationCaseId],
    queryFn: ({ signal }) => terminationCasesApi.getById(terminationCaseId, signal),
    retry: false,
  });
  const refresh = async () => Promise.all([
    queryClient.invalidateQueries({ queryKey: ["dolores", "technician", "maintenance-ticket", maintenanceTicketId] }),
    queryClient.invalidateQueries({ queryKey: ["dolores", "termination-cases", "id", terminationCaseId] }),
    queryClient.invalidateQueries({ queryKey: TECHNICIAN_WORK_ITEMS_QUERY_KEY }),
  ]);
  const start = useMutation({
    mutationFn: () => machinesApi.updateMaintenanceTicketStatus(maintenanceTicketId, "IN_PROGRESS"),
    onSuccess: refresh,
  });
  const completeInspection = useMutation({
    mutationFn: () => terminationCasesApi.completeInspection(terminationCaseId, {
      maintenanceTicketId,
      diagnosis: diagnosis.trim(),
      responsibility,
      inspectionDecision,
      ...(actualCost.trim() ? { actualCost: Number(actualCost) } : {}),
      resolutionResult: resolutionResult.trim(),
      ...(notes.trim() ? { notes: notes.trim() } : {}),
      correlationId: createWorkflowCorrelationId("termination-inspection"),
    }, evidenceReference),
    onSuccess: refresh,
  });
  const canSubmit = Boolean(diagnosis.trim() && !evidenceFileError(evidenceReference, { min: 1, max: 1 }) && resolutionResult.trim()
    && (!actualCost.trim() || (Number.isFinite(Number(actualCost)) && Number(actualCost) >= 0)));

  return (
    <TechnicianShell pageTitle="Kiểm tra máy thu hồi">
      <section className={shellStyles.pageContent} aria-labelledby="termination-inspection-title">
        <header className={shellStyles.pageHeading}>
          <h1 id="termination-inspection-title">Kiểm tra máy sau khi thu hồi</h1>
          <p>Ghi nhận chẩn đoán và kết quả kiểm tra cho hồ sơ chấm dứt hợp đồng.</p>
          <div className={styles.backLink}><TextLinkButton href={PATH_TECHNICIAN.TASKS}>Về danh sách công việc</TextLinkButton></div>
        </header>
        {ticket.isPending || terminationCase.isPending ? <p className={shellStyles.pendingNotice} role="status">Đang tải phiếu kiểm tra…</p> : null}
        {ticket.isError ? <p className={styles.error} role="alert">Không tải được phiếu kiểm tra: {getApiErrorMessage(ticket.error)}</p> : null}
        {terminationCase.isError ? <p className={styles.error} role="alert">Không tải được hồ sơ chấm dứt: {getApiErrorMessage(terminationCase.error)}</p> : null}
        {ticket.data ? (
          <>
            <section className={styles.panel} aria-labelledby="termination-inspection-summary-title">
              <h2 id="termination-inspection-summary-title">Thông tin công việc</h2>
              <dl className={styles.detailGrid}>
                <DetailValue label="Mã phiếu" value={ticket.data.id ?? "?"} code />
                <DetailValue label="Trạng thái phiếu" value={ticket.data.status ?? "Chưa cập nhật"} />
                <DetailValue label="Mã hồ sơ chấm dứt" value={terminationCaseId} code />
                <DetailValue label="Trạng thái hồ sơ" value={terminationCase.data?.status ?? "Chưa tải được"} />
                <DetailValue label="Mã máy" value={ticket.data.machineId ?? "—"} code />
                <DetailValue label="Mã hợp đồng" value={ticket.data.contractId ?? "—"} code />
              </dl>
              {ticket.data.status === "ASSIGNED" ? (
                <>
                  <p className={styles.hint}>Bắt đầu kiểm tra khi máy đã về kho và phiếu được giao cho bạn.</p>
                  {start.isError ? <p className={styles.error} role="alert">{getApiErrorMessage(start.error, "mutation")}</p> : null}
                  <PageActions actions={[{ id: "start-termination-inspection", label: "Bắt đầu kiểm tra", variant: "primary", priority: 50, pending: start.isPending, onClick: () => start.mutate() }]} />
                </>
              ) : null}
            </section>
            {ticket.data.status === "IN_PROGRESS" ? (
              <form id="termination-inspection-form" className={styles.panel} onSubmit={(event) => { event.preventDefault(); if (canSubmit) completeInspection.mutate(); }}>
                <h2>Kết quả kiểm tra máy</h2>
                <label className={styles.formField} htmlFor="termination-diagnosis"><span>Chẩn đoán *</span><textarea id="termination-diagnosis" required rows={4} maxLength={4000} value={diagnosis} onChange={(event) => setDiagnosis(event.target.value)} /></label>
                <div className={styles.formGrid}>
                  <label className={styles.formField} htmlFor="termination-responsibility"><span>Trách nhiệm chi phí *</span><select id="termination-responsibility" value={responsibility} onChange={(event) => setResponsibility(event.target.value as TerminationInspectionRequest["responsibility"])}><option value="UNKNOWN">Chưa xác định</option><option value="TENANT">Khách thuê / Owner</option><option value="COMPANY">Công ty Dolores</option></select></label>
                  <label className={styles.formField} htmlFor="termination-decision"><span>Kết luận kiểm tra *</span><select id="termination-decision" value={inspectionDecision} onChange={(event) => setInspectionDecision(event.target.value as TerminationInspectionRequest["inspectionDecision"])}><option value="NO_DAMAGE">Không hư hỏng</option><option value="DAMAGE">Hư hỏng</option><option value="PARTIAL_DAMAGE">Hư hỏng một phần</option></select></label>
                  <label className={styles.formField} htmlFor="termination-actual-cost"><span>Chi phí thực tế (VND, nếu có)</span><input id="termination-actual-cost" type="number" min="0" step="any" value={actualCost} onChange={(event) => setActualCost(event.target.value)} /></label>
                  <label className={styles.formField} htmlFor="termination-evidence-reference"><span>Tệp chứng cứ *</span><input id="termination-evidence-reference" type="file" accept={EVIDENCE_ACCEPT} required onChange={(event) => setEvidenceReference(Array.from(event.target.files ?? []))} />{evidenceReference.map((file) => <span key={file.name}>{file.name}</span>)}</label>
                  <label className={styles.formField} htmlFor="termination-resolution-result"><span>Kết quả xử lý *</span><input id="termination-resolution-result" required maxLength={4000} value={resolutionResult} onChange={(event) => setResolutionResult(event.target.value)} /></label>
                </div>
                <label className={styles.formField} htmlFor="termination-inspection-notes"><span>Ghi chú thêm</span><textarea id="termination-inspection-notes" rows={3} maxLength={4000} value={notes} onChange={(event) => setNotes(event.target.value)} /></label>
                <p className={styles.hint}>Gửi kết quả sẽ hoàn tất phiếu kiểm tra liên kết. Hợp đồng chỉ được chấm dứt sau khi bộ phận vận hành hoàn tất các bước tiếp theo.</p>
                {completeInspection.isError ? <p className={styles.error} role="alert">{getApiErrorMessage(completeInspection.error, "mutation")}</p> : null}
                {completeInspection.isSuccess ? <p className={styles.success} role="status">Đã gửi kết quả kiểm tra.</p> : null}
                <PageActions actions={[{ id: "complete-termination-inspection", label: "Gửi kết quả kiểm tra", variant: "primary", priority: 100, type: "submit", form: "termination-inspection-form", disabled: !canSubmit, disabledReason: evidenceFileError(evidenceReference, { min: 1, max: 1 }) ?? "Nhập đầy đủ kết quả kiểm tra.", pending: completeInspection.isPending }]} />
              </form>
            ) : null}
            {ticket.data.status === "RESOLVED" ? <p className={styles.success} role="status">Phiếu kiểm tra đã hoàn tất. Hồ sơ chấm dứt đang chờ bước tiếp theo từ bộ phận vận hành.</p> : null}
            {ticket.data.status === "PENDING" ? <p className={styles.notice} role="status">Phiếu đang chờ Admin hoặc Moderator phân công kỹ thuật viên.</p> : null}
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
  const [evidenceAction, setEvidenceAction] = useState<{ id: string; action: "view" | "download" } | null>(null);
  const [evidenceActionError, setEvidenceActionError] = useState("");
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
  const recallWorkOrderDetails = useQuery({
    queryKey: ["dolores", "recall-work-orders", "id", workOrderId],
    queryFn: ({ signal }) => recallWorkOrdersApi.getById(workOrderId, signal),
    enabled: details.isError && repairCaseDetails.isError,
    retry: false,
  });
  const terminationInspectionTicket = useQuery({
    queryKey: ["dolores", "technician", "maintenance-ticket", workOrderId],
    queryFn: ({ signal }) => machinesApi.getMaintenanceTicketById(workOrderId, signal),
    enabled: details.isError && repairCaseDetails.isError && recallWorkOrderDetails.isError,
    retry: false,
  });

  const refreshWorkOrder = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: detailQueryKey(workOrderId) }),
      queryClient.invalidateQueries({ queryKey: assignedQueryKey }),
      queryClient.invalidateQueries({ queryKey: ["dolores", "recall-work-orders", "id", workOrderId] }),
      queryClient.invalidateQueries({ queryKey: ["dolores", "recall-work-orders", "events", workOrderId] }),
      queryClient.invalidateQueries({ queryKey: ["dolores", "recall-work-orders", "evidence", workOrderId] }),
      queryClient.invalidateQueries({ queryKey: ["dolores", "technician", "maintenance-ticket", workOrderId] }),
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
      await Promise.all([
        refreshWorkOrder(),
        queryClient.invalidateQueries({ queryKey: installationWorkOrderRecordsQueryPrefix(workOrderId, "checklist") }),
      ]);
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
      await Promise.all([
        refreshWorkOrder(),
        queryClient.invalidateQueries({ queryKey: installationWorkOrderRecordsQueryPrefix(workOrderId, "accessories") }),
      ]);
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
      await Promise.all([
        refreshWorkOrder(),
        queryClient.invalidateQueries({ queryKey: installationWorkOrderRecordsQueryPrefix(workOrderId, "evidence") }),
      ]);
    },
    onError: refreshWorkOrder,
  });
  const complete = useMutation({
    mutationFn: (recipient: string) => installationWorkOrdersApi.complete(workOrderId, { handoverRecipient: recipient }),
    onSuccess: refreshWorkOrder,
    onError: refreshWorkOrder,
  });

  if (repairCaseDetails.data) {
    return <TechnicianRepairCaseScreen repairCaseId={workOrderId} />;
  }
  if (recallWorkOrderDetails.data) {
    return <TechnicianRecallWorkOrderScreen recallWorkOrderId={workOrderId} />;
  }
  if (terminationInspectionTicket.data?.source === "TERMINATION_INSPECTION" && terminationInspectionTicket.data.terminationCaseId) {
    return <TechnicianTerminationInspectionScreen maintenanceTicketId={workOrderId} terminationCaseId={terminationInspectionTicket.data.terminationCaseId} />;
  }

  const detailData = details.data;
  const workOrder = detailData?.workOrder;
  const evidenceCount = detailData?.evidenceCount ?? detailData?.evidence.length ?? 0;
  const canComplete = Boolean(workOrder?.status === "IN_PROGRESS" && evidenceCount > 0 && handoverRecipient.trim());
  const renderChecklistActions = workOrder?.status === "IN_PROGRESS"
    ? (item: InstallationWorkOrderDetails["checklistItems"][number]) => {
      const edit = checklistEdits[item.id];
      const result = edit?.result ?? (item.result === "PENDING" ? "" : item.result);
      const notes = edit?.notes ?? item.notes ?? "";
      const changed = result !== item.result || notes !== (item.notes ?? "");
      return (
        <div className={styles.checklistActions}>
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
          <input
            className={styles.tableControl}
            aria-label={`Ghi chú ${item.label}`}
            maxLength={4000}
            value={notes}
            disabled={updateChecklist.isPending}
            onChange={(event) => setChecklistEdits((current) => ({
              ...current,
              [item.id]: {
                result: current[item.id]?.result ?? (item.result === "PENDING" ? "" : item.result),
                notes: event.target.value,
              },
            }))}
          />
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
        </div>
      );
    }
    : undefined;
  const accessoryActions = workOrder?.status === "IN_PROGRESS" ? (
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
  ) : undefined;
  const renderEvidenceActions = (item: InstallationWorkOrderDetails["evidence"][number]) => (
    <div className={styles.evidenceActions}>
      <ButtonBar className={styles.evidenceActionButton} type="button" disabled={Boolean(evidenceAction)} onClick={() => void viewEvidence(item)}>
        {evidenceAction?.id === item.id && evidenceAction.action === "view" ? "Đang mở…" : "Xem"}
      </ButtonBar>
      <ButtonBar className={styles.evidenceActionButton} type="button" disabled={Boolean(evidenceAction)} onClick={() => void downloadEvidence(item)}>
        {evidenceAction?.id === item.id && evidenceAction.action === "download" ? "Đang tải…" : "Tải xuống"}
      </ButtonBar>
    </div>
  );
  const evidenceActions = workOrder?.status === "IN_PROGRESS" ? (
    <>
      <p className={styles.hint}>Tải ít nhất một tệp PDF, JPEG hoặc PNG, dung lượng tối đa 20 MB. Tệp được lưu riêng tư.</p>
      <div className={styles.uploadRow}>
        <label className={styles.fileField} htmlFor="work-order-evidence-file">
          <span>Chọn chứng từ</span>
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
          {uploadEvidence.isPending ? "Đang tải chứng từ…" : "Tải chứng từ"}
        </ButtonBar>
      </div>
      {evidenceError && <p className={styles.error} role="alert">{evidenceError}</p>}
      {uploadEvidence.isError && <p className={styles.error} role="alert">{getApiErrorMessage(uploadEvidence.error, "mutation")}</p>}
    </>
  ) : undefined;
  const checklistMessage = workOrder ? (
    <>
      <p className={styles.hint}>
        {workOrder.status === "IN_PROGRESS"
          ? "Chọn kết quả cho từng mục rồi lưu. Không thể gửi trạng thái Chờ xử lý. Checklist không thay thế chứng từ bàn giao."
          : "Checklist chỉ có thể cập nhật khi lệnh đang được xử lý."}
      </p>
      {updateChecklist.isError && <p className={styles.error} role="alert">{getApiErrorMessage(updateChecklist.error, "mutation")}</p>}
      {updateChecklist.isSuccess && <p className={styles.success} role="status">Đã lưu kết quả checklist.</p>}
    </>
  ) : undefined;

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

  async function viewEvidence(item: InstallationWorkOrderDetails["evidence"][number]) {
    const previewWindow = window.open("about:blank", "_blank");
    if (!previewWindow) {
      setEvidenceActionError("Trình duyệt đã chặn cửa sổ xem minh chứng. Hãy cho phép cửa sổ bật lên hoặc chọn tải xuống.");
      return;
    }
    previewWindow.opener = null;
    setEvidenceAction({ id: item.id, action: "view" });
    setEvidenceActionError("");
    try {
      const downloadedBlob = await installationWorkOrdersApi.downloadEvidence(workOrderId, item.id);
      const type = evidenceMediaType(item.originalFilename, item.contentType, downloadedBlob);
      if (!(type === "application/pdf" || type === "image/jpeg" || type === "image/png")) {
        previewWindow.close();
        setEvidenceActionError("Định dạng này chưa hỗ trợ xem trước. Bạn có thể tải tệp xuống.");
        return;
      }
      const objectUrl = URL.createObjectURL(new Blob([downloadedBlob], { type }));
      previewWindow.location.replace(objectUrl);
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 5 * 60 * 1000);
    } catch (error) {
      previewWindow.close();
      setEvidenceActionError(getApiErrorMessage(error));
    } finally {
      setEvidenceAction(null);
    }
  }

  async function downloadEvidence(item: InstallationWorkOrderDetails["evidence"][number]) {
    setEvidenceAction({ id: item.id, action: "download" });
    setEvidenceActionError("");
    try {
      const downloadedBlob = await installationWorkOrdersApi.downloadEvidence(workOrderId, item.id);
      const type = evidenceMediaType(item.originalFilename, item.contentType, downloadedBlob);
      const objectUrl = URL.createObjectURL(new Blob([downloadedBlob], { type }));
      const anchor = document.createElement("a");
      anchor.href = objectUrl;
      anchor.download = safeEvidenceFilename(item.originalFilename, item.id);
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
    } catch (error) {
      setEvidenceActionError(getApiErrorMessage(error));
    } finally {
      setEvidenceAction(null);
    }
  }

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

        {(details.isPending
          || (details.isError && repairCaseDetails.isPending)
          || (details.isError && repairCaseDetails.isError && recallWorkOrderDetails.isPending)
          || (details.isError && repairCaseDetails.isError && recallWorkOrderDetails.isError && terminationInspectionTicket.isPending))
          && <p className={shellStyles.pendingNotice} role="status">Đang tải chi tiết công việc…</p>}
        {details.isError && repairCaseDetails.isError && recallWorkOrderDetails.isError && terminationInspectionTicket.isError && (
          <div className={styles.notice} role="alert">
            <p>{getApiErrorMessage(terminationInspectionTicket.error)}</p>
            <ButtonBar
              type="button"
              disabled={details.isFetching || repairCaseDetails.isFetching || recallWorkOrderDetails.isFetching || terminationInspectionTicket.isFetching}
              onClick={() => void Promise.all([details.refetch(), repairCaseDetails.refetch(), recallWorkOrderDetails.refetch(), terminationInspectionTicket.refetch()])}
            >
              {details.isFetching || repairCaseDetails.isFetching || recallWorkOrderDetails.isFetching || terminationInspectionTicket.isFetching ? "Đang tải…" : "Tải lại"}
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
                <PageActions actions={[{ id: "start-installation", label: "Bắt đầu lắp đặt", variant: "primary", priority: 50, pending: start.isPending, onClick: () => start.mutate() }]} />
              </section>
            )}

            {workOrder.status === "IN_PROGRESS" && (
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
                  <PageActions actions={[{ id: "complete-installation", label: "Xác nhận hoàn tất bàn giao", variant: "primary", priority: 50, disabled: !canComplete || uploadEvidence.isPending, disabledReason: "Nhập người nhận và tải minh chứng.", pending: complete.isPending, onClick: () => complete.mutate(handoverRecipient.trim()) }]} />
                </section>
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

            <InstallationWorkOrderRecords
              workOrderId={workOrderId}
              renderChecklistActions={renderChecklistActions}
              checklistMessage={checklistMessage}
              accessoryActions={accessoryActions}
              renderEvidenceActions={renderEvidenceActions}
              evidenceMessage={evidenceActionError ? <p className={styles.error} role="alert">{evidenceActionError}</p> : undefined}
              evidenceActions={evidenceActions}
            />
          </>
        )}
      </section>
    </TechnicianShell>
  );
}
