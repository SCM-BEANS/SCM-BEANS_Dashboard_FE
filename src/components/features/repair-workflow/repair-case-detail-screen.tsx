import { EVIDENCE_ACCEPT, evidenceFileError } from "@/lib/evidence-multipart";
import axios from "axios";
import { useRepairCaseCostDispute } from "./use-repair-case-cost-dispute";
import { ReplacementActions } from "./replacement-actions";
import { useState, type FormEvent, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { repairCasesApi } from "@/apis/repair-cases.api";
import { maintenanceRequestsApi } from "@/apis/maintenance-requests.api";
import { machinesApi } from "@/apis/machines.api";
import { replacementAssignmentsApi } from "@/apis/replacement-assignments.api";
import { TECHNICIAN_WORK_ITEMS_QUERY_KEY } from "@/apis/technician-work-items.api";
import { ButtonBar } from "@/components/button/button-bar";
import { PageActions } from "@/components/action-bar/page-actions";
import { PageActionsRenderer } from "@/components/action-bar/page-actions-renderer";
import { BackButtonHeading } from "@/components/navigation/back-button-heading";
import { SectionHeading } from "@/components/heading/section-heading";
import { NotificationDialog } from "@/components/notification-dialog/notification-dialog";
import { getApiErrorMessage } from "@/lib/api-errors";
import {
  RepairCaseIdSchema,
  ReplacementAssignmentIdSchema,
  type MaintenanceCustodyEvent,
  type MaintenanceCustodyEventCreateRequest,
  type RepairDiagnosisRequest,
  type ReplacementAssignmentActivateRequest,
  type ReplacementAssignmentReleaseRequest,
  type RepairWorkCompletionRequest,
} from "@/schema/machines.schema";
import { REPAIR_WORKFLOW_MESSAGES as M } from "@/text/repair-workflow/repair-workflow-messages";
import { maintenanceCustodyEventLabel } from "@/components/features/maintenance-workflow/maintenance-status-labels";
import { PATH_ADMIN, PATH_CUSTOMER, PATH_MODERATOR } from "@/routes/path";
import { EvidenceList } from "@/components/evidence/evidence-list";
import { querySubject, type RepairWorkflowRole } from "./repair-workflow-query-identity";
import styles from "./repair-workflow.module.css";

function formatDateTime(value: string | null | undefined): string {
  if (!value) return "—";
  const timestamp = Date.parse(value);
  return Number.isNaN(timestamp)
    ? value
    : new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium", timeStyle: "short" }).format(timestamp);
}

function statusLabel(status: string | null | undefined): string {
  if (!status) return "—";
  return M.STATUS_LABELS[status as keyof typeof M.STATUS_LABELS] ?? status;
}

function ticketStatusLabel(status: string | null | undefined): string {
  if (!status) return "—";
  return M.TICKET_STATUS_LABELS[status as keyof typeof M.TICKET_STATUS_LABELS] ?? status;
}

function assignmentStatusLabel(status: string | null | undefined): string {
  if (!status) return "—";
  return M.ASSIGNMENT_STATUS_LABELS[status as keyof typeof M.ASSIGNMENT_STATUS_LABELS] ?? status;
}

function DetailValue({ label, value, code = false }: { label: string; value: string; code?: boolean }) {
  return (
    <div className={styles.detailItem}>
      <dt>{label}</dt>
      <dd className={code ? styles.codeValue : undefined}>{value || "—"}</dd>
    </div>
  );
}

function QueryError({ label, error, onRetry }: { label: string; error: unknown; onRetry: () => void }) {
  return (
    <div className={`${styles.notice} ${styles.error}`} role="alert">
      <p>{label} {getApiErrorMessage(error)}</p>
      <button className={styles.inlineButton} type="button" onClick={onRetry}>{M.CASE_RETRY}</button>
    </div>
  );
}

type WorkflowStepState = "complete" | "current" | "waiting" | "locked";

function WorkflowStep({
  title,
  status,
  children,
  compact = false,
}: {
  compact?: boolean;
  title: string;
  status: WorkflowStepState;
  children?: ReactNode;
}) {
  const statusText = {
    complete: M.PROCESS_STEP_COMPLETE,
    current: M.PROCESS_STEP_CURRENT,
    waiting: M.PROCESS_STEP_WAITING,
    locked: M.PROCESS_STEP_LOCKED,
  }[status];
  const statusClass = {
    complete: styles.workflowStepComplete,
    current: styles.workflowStepCurrent,
    waiting: styles.workflowStepWaiting,
    locked: styles.workflowStepLocked,
  }[status];

  return (
    <li className={`${styles.workflowStep} ${statusClass}`} aria-current={status === "current" ? "step" : undefined}>
      {compact ? <details className={styles.historyDisclosure} open={status === "current"} key={status}>
        <summary className={styles.workflowStepHeading}><strong>{title}</strong><span className={styles.historyRowMeta}>{statusText}</span></summary>
        <div className={styles.workflowStepBody}>{children}</div>
      </details> : <><div className={styles.workflowStepHeading}><strong>{title}</strong><span>{statusText}</span></div>{children}</>}
    </li>
  );
}

const operatorHistoryLabels: Record<string, string> = {
  TRIAGE_ACCEPTED: "Tiếp nhận yêu cầu sửa chữa",
  REPLACEMENT_PLANNED: "Lập kế hoạch thay máy",
  CUSTODY_PRIMARY_COLLECTED: "Nhận máy chính",
  CUSTODY_REPLACEMENT_DELIVERED: "Bàn giao máy thay thế",
  CUSTODY_REPLACEMENT_COLLECTED: "Thu máy thay thế",
  CUSTODY_PRIMARY_RETURNED: "Trả máy chính",
  CUSTODY_ACKNOWLEDGED: "Xác nhận bàn giao",
  DIAGNOSIS_RECORDED: "Ghi nhận chẩn đoán",
  REPAIR_WORK_STARTED: "Bắt đầu sửa chữa",
  REPAIR_WORK_COMPLETED: "Hoàn tất sửa chữa",
  CASE_CLOSED: "Đóng hồ sơ",
};

const operatorHistoryRoles: Record<string, string> = {
  ADMIN: "Quản trị viên",
  MODERATOR: "Điều phối viên",
  TECHNICIAN: "Kỹ thuật viên",
  OWNER: "Khách hàng",
};

function AdminHistoryRow({ title, meta, status, children }: {
  title: string;
  meta: string;
  status?: ReactNode;
  children: ReactNode;
}) {
  return (
    <li className={styles.timelineItem}>
      <details className={styles.historyDisclosure}>
        <summary>
          <strong>{title}</strong>
          <span className={styles.historyRowMeta}>{meta}{status && <> · {status}</>}</span>
        </summary>
        <div className={styles.historyExpanded}>{children}</div>
      </details>
    </li>
  );
}

function timelineDetails(reason: string | null | undefined, details: string | null | undefined): string {
  const value = reason || details || "—";
  return value
    .replace(/;evidence=[\s\S]*$/i, "")
    .replace(/;emergencyAuthorizationId=[\s\S]*$/i, "") || "—";
}

function replacementAssignmentIdFromTimeline(events: Array<{ eventType: string; reason?: string | null }>): string | undefined {
  const plannedEvent = [...events].reverse().find((event) => event.eventType === "REPLACEMENT_PLANNED");
  const match = plannedEvent?.reason?.match(/(?:^|[;\s])replacementAssignmentId=([0-9a-f-]{36})(?:;|$)/i);
  if (!match) return undefined;
  const parsedId = ReplacementAssignmentIdSchema.safeParse(match[1]);
  return parsedId.success ? parsedId.data : undefined;
}

function tableVariant(role: RepairWorkflowRole): "operations" | "moderator" | "standard" | "customer" {
  if (role === "owner") return "customer";
  if (role === "technician") return "standard";
  if (role === "moderator") return "moderator";
  return "operations";
}

export function RepairCaseDetailScreen({
  caseId,
  role,
  listHref,
  relatedOnly = false,
}: {
  caseId: string;
  role: RepairWorkflowRole;
  listHref: string;
  relatedOnly?: boolean;
}) {
  const compactLayout = role !== "technician";
  const operatorPaths = role === "moderator" ? PATH_MODERATOR : PATH_ADMIN;
  const CaseActions = role === "admin" ? PageActionsRenderer : PageActions;
  const validCaseId = RepairCaseIdSchema.safeParse(caseId).success;
  const queryClient = useQueryClient();
  const subject = querySubject(role);
  const [emergencyAuthorizationId, setEmergencyAuthorizationId] = useState("");
  const [timelinePage, setTimelinePage] = useState(0);
  const [custodyPage, setCustodyPage] = useState(0);
  const [expandedTimeline, setExpandedTimeline] = useState(false);
  const [historyView, setHistoryView] = useState<"timeline" | "custody">("timeline");
  const [receiveMachineNotes, setReceiveMachineNotes] = useState<Record<string, string>>({});
  const [receiveMachineEvidenceReferences, setReceiveMachineEvidenceReferences] = useState<Record<string, File[]>>({});
  const [acknowledgementTexts, setAcknowledgementTexts] = useState<Record<string, string>>({});
  const [activationEvidence, setActivationEvidence] = useState<File[]>([]);
  const [activationReason, setActivationReason] = useState("");
  const [activationAttempt, setActivationAttempt] = useState<{
    fingerprint: string;
    idempotencyKey: string;
    correlationId: string;
  } | null>(null);
  const [replacementDeliveryNotes, setReplacementDeliveryNotes] = useState("");
  const [replacementDeliveryEvidence, setReplacementDeliveryEvidence] = useState<File[]>([]);
  const [replacementCollectionConditions, setReplacementCollectionConditions] = useState<Record<string, string>>({});
  const [replacementCollectionEvidenceReferences, setReplacementCollectionEvidenceReferences] = useState<Record<string, File[]>>({});
  const [primaryReturnConditions, setPrimaryReturnConditions] = useState<Record<string, string>>({});
  const [primaryReturnEvidenceReferences, setPrimaryReturnEvidenceReferences] = useState<Record<string, File[]>>({});
  const [releaseEvidenceReferences, setReleaseEvidenceReferences] = useState<Record<string, File[]>>({});
  const [releaseConfirmationDialogs, setReleaseConfirmationDialogs] = useState<Record<string, boolean>>({});
  const [releaseAttempts, setReleaseAttempts] = useState<Record<string, {
    fingerprint: string;
    idempotencyKey: string;
    correlationId: string;
  }>>({});
  const [workScopes, setWorkScopes] = useState<Record<string, string>>({});
  const [diagnosisTexts, setDiagnosisTexts] = useState<Record<string, string>>({});
  const [diagnosisEvidenceReferences, setDiagnosisEvidenceReferences] = useState<Record<string, File[]>>({});
  const [completionWorkScopes, setCompletionWorkScopes] = useState<Record<string, string>>({});
  const [resolutionResults, setResolutionResults] = useState<Record<string, string>>({});
  const [completionEvidenceReferences, setCompletionEvidenceReferences] = useState<Record<string, File[]>>({});
  const [completionNotes, setCompletionNotes] = useState<Record<string, string>>({});
  const receiveMachineConditionNotes = receiveMachineNotes[caseId] ?? "";
  const receiveMachineEvidenceReference = receiveMachineEvidenceReferences[caseId] ?? [];
  const workScope = workScopes[caseId] ?? "";
  const diagnosisText = diagnosisTexts[caseId] ?? "";
  const diagnosisEvidenceReference = diagnosisEvidenceReferences[caseId] ?? [];
  const completionWorkScope = completionWorkScopes[caseId] ?? "";
  const resolutionResult = resolutionResults[caseId] ?? "";
  const completionEvidenceReferenceText = completionEvidenceReferences[caseId] ?? [];
  const completionNote = completionNotes[caseId] ?? "";
  const replacementCollectionCondition = replacementCollectionConditions[caseId] ?? "";
  const replacementCollectionEvidenceReference = replacementCollectionEvidenceReferences[caseId] ?? [];
  const primaryReturnCondition = primaryReturnConditions[caseId] ?? "";
  const primaryReturnEvidenceReference = primaryReturnEvidenceReferences[caseId] ?? [];
  const releaseEvidenceReference = releaseEvidenceReferences[caseId] ?? [];
  const releaseConfirmationOpen = releaseConfirmationDialogs[caseId] ?? false;
  const setWorkScope = (value: string) => setWorkScopes((current) => ({ ...current, [caseId]: value }));
  const dispute = useRepairCaseCostDispute(caseId, !relatedOnly);
  const selectedAuthorization = dispute.authorizations.find(item => item.authorizationId === emergencyAuthorizationId);
  const workError = (error: unknown) => dispute.isDisputed && axios.isAxiosError(error) && error.response?.status === 409 ? "Ủy quyền này đã được sử dụng hoặc không khớp phạm vi công việc." : getApiErrorMessage(error);
  const invalidateWorkflowQueries = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["dolores", "repair-workflow"] }),
      queryClient.invalidateQueries({ queryKey: ["dolores", "repair-cases", caseId, "timeline", "all"] }),
      queryClient.invalidateQueries({ queryKey: ["dolores", "repair-cost-reviews"] }),
      queryClient.invalidateQueries({ queryKey: ["dolores", "maintenance-requests"] }),
      queryClient.invalidateQueries({ queryKey: ["dolores", "dashboard", "action-items"] }),
      queryClient.invalidateQueries({ queryKey: TECHNICIAN_WORK_ITEMS_QUERY_KEY }),
    ]);
  };
  const repairCase = useQuery({
    queryKey: ["dolores", "repair-workflow", subject, "case", caseId],
    queryFn: ({ signal }) => repairCasesApi.getById(caseId, signal),
    enabled: validCaseId,
    retry: false,
  });
  const request = useQuery({
    queryKey: ["dolores", "repair-workflow", subject, "request", repairCase.data?.maintenanceRequestId],
    queryFn: ({ signal }) => maintenanceRequestsApi.getById(repairCase.data!.maintenanceRequestId, signal),
    enabled: Boolean(repairCase.data?.maintenanceRequestId),
    retry: false,
  });
  const ticket = useQuery({
    queryKey: ["dolores", "repair-workflow", subject, "ticket", repairCase.data?.maintenanceTicketId],
    queryFn: ({ signal }) => machinesApi.getMaintenanceTicketById(repairCase.data!.maintenanceTicketId!, signal),
    enabled: Boolean(repairCase.data?.maintenanceTicketId),
    retry: false,
  });
  const timeline = useQuery({
    queryKey: ["dolores", "repair-workflow", subject, "timeline", caseId, timelinePage, 50],
    queryFn: ({ signal }) => repairCasesApi.getTimeline(caseId, timelinePage, 50, signal),
    enabled: validCaseId && repairCase.isSuccess,
    retry: false,
  });
  const replacementAssignmentId = request.data?.replacementAssignmentId ??
    replacementAssignmentIdFromTimeline(timeline.data?.content ?? []);
  const assignment = useQuery({
    queryKey: ["dolores", "repair-workflow", subject, "assignment", replacementAssignmentId],
    queryFn: ({ signal }) => replacementAssignmentsApi.getById(replacementAssignmentId!, signal),
    enabled: Boolean(replacementAssignmentId),
    retry: false,
  });
  const custody = useQuery({
    queryKey: ["dolores", "repair-workflow", subject, "custody", caseId, custodyPage, 50],
    queryFn: ({ signal }) => repairCasesApi.listCustodyEvents(caseId, custodyPage, 50, signal),
    enabled: !relatedOnly && validCaseId && repairCase.isSuccess,
    retry: false,
  });
  const custodyEvents = custody.data?.items ?? [];
  const primaryCollectionEvent = custodyEvents.find((event) => event.eventType === "PRIMARY_COLLECTED");
  const replacementDeliveredEvent = custodyEvents.find((event) => event.eventType === "REPLACEMENT_DELIVERED");
  const replacementCollectionEvent = custodyEvents.find((event) => event.eventType === "REPLACEMENT_COLLECTED");
  const primaryReturnEvent = custodyEvents.find((event) => event.eventType === "PRIMARY_RETURNED");
  const primaryCollectionAcknowledged = Boolean(primaryCollectionEvent?.ownerAcknowledgedAt);
  const replacementDeliveryAcknowledged = Boolean(replacementDeliveredEvent?.ownerAcknowledgedAt);
  const replacementCollectionAcknowledged = Boolean(replacementCollectionEvent?.ownerAcknowledgedAt);
  const primaryReturnAcknowledged = Boolean(primaryReturnEvent?.ownerAcknowledgedAt);
  const currentSubjectId = subject.slice(subject.indexOf(":") + 1);
  const isAssignedTechnician = role === "technician" &&
    Boolean(ticket.data?.assignedTechnicianId) &&
    ticket.data?.assignedTechnicianId?.toLowerCase() === currentSubjectId.toLowerCase() &&
    ticket.data?.repairCaseId === caseId;
  const acknowledgeCustody = useMutation({
    mutationFn: ({ eventId, acknowledgement }: { eventId: string; acknowledgement: string }) => {
      if (role !== "owner") throw new Error(M.ACKNOWLEDGMENT_OWNER_ONLY);
      return repairCasesApi.acknowledgeCustodyEvent(caseId, eventId, { acknowledgement });
    },
    onSuccess: (_event, variables) => {
      setAcknowledgementTexts((current) => ({ ...current, [variables.eventId]: "" }));
    },
    onSettled: invalidateWorkflowQueries,
  });
  const recordRepairDiagnosis = useMutation({
    mutationFn: ({ expectedTicketId, diagnosis }: RepairDiagnosisRequest & { expectedTicketId: string }) => {
      if (
        role !== "technician" || !isAssignedTechnician ||
        repairCase.isFetching || assignment.isFetching || ticket.isFetching || custody.isFetching ||
        repairCase.data?.status !== "REPLACEMENT_DELIVERED" ||
        ticket.data?.status !== "ASSIGNED" || ticket.data?.id !== expectedTicketId ||
        ticket.data?.repairCaseId !== caseId ||
        assignment.data?.status !== "ACTIVE" || assignment.data.repairCaseId !== caseId ||
        !replacementDeliveryAcknowledged
      ) {
        throw new Error(M.TECHNICIAN_DIAGNOSIS_STATUS_CHANGED);
      }
      return repairCasesApi.recordDiagnosis(caseId, expectedTicketId, { diagnosis }, diagnosisEvidenceReference);
    },
    onSuccess: () => {
      setDiagnosisTexts((current) => ({ ...current, [caseId]: "" }));
      setDiagnosisEvidenceReferences((current) => ({ ...current, [caseId]: [] }));
    },
    onSettled: invalidateWorkflowQueries,
  });
  const startRepairWork = useMutation({
    mutationFn: ({ expectedTicketId, workScope, authorizationId }: { expectedTicketId: string; workScope: string; authorizationId?: string }) => {
      if (
        role !== "technician" || !isAssignedTechnician ||
        repairCase.isFetching || assignment.isFetching || ticket.isFetching || custody.isFetching ||
        repairCase.data?.status !== "DIAGNOSIS" ||
        ticket.data?.status !== "ASSIGNED" || ticket.data?.id !== expectedTicketId ||
        ticket.data?.repairCaseId !== caseId ||
        assignment.data?.status !== "ACTIVE" || assignment.data.repairCaseId !== caseId ||
        !replacementDeliveryAcknowledged
      ) throw new Error(M.TECHNICIAN_START_STATUS_CHANGED);
      return authorizationId
        ? repairCasesApi.startWork(caseId, expectedTicketId, { workScope, emergencyAuthorizationId: authorizationId })
        : repairCasesApi.startWork(caseId, expectedTicketId, { workScope });
    },
    onSettled: invalidateWorkflowQueries,
  });
  const completeRepairWork = useMutation({
    mutationFn: ({ expectedTicketId, request }: { expectedTicketId: string; request: RepairWorkCompletionRequest }) => {
      if (
        role !== "technician" || !isAssignedTechnician ||
        repairCase.isFetching || assignment.isFetching || ticket.isFetching || custody.isFetching ||
        repairCase.data?.status !== "REPAIR_IN_PROGRESS" ||
        ticket.data?.status !== "IN_PROGRESS" || ticket.data?.id !== expectedTicketId ||
        ticket.data?.repairCaseId !== caseId ||
        assignment.data?.status !== "ACTIVE" || assignment.data.repairCaseId !== caseId ||
        !replacementDeliveryAcknowledged
      ) throw new Error(M.TECHNICIAN_COMPLETION_STATUS_CHANGED);
      return repairCasesApi.completeWork(caseId, expectedTicketId, request, completionEvidenceReferenceText);
    },
    onSuccess: () => {
      setCompletionWorkScopes((current) => ({ ...current, [caseId]: "" }));
      setResolutionResults((current) => ({ ...current, [caseId]: "" }));
      setCompletionEvidenceReferences((current) => ({ ...current, [caseId]: [] }));
      setCompletionNotes((current) => ({ ...current, [caseId]: "" }));
    },
    onSettled: invalidateWorkflowQueries,
  });
  const recordPrimaryCollection = useMutation({
    mutationFn: ({ submittedCaseId, conditionNotes }: { submittedCaseId: string; conditionNotes: string }) => {
      if (submittedCaseId !== caseId) throw new Error(M.TECHNICIAN_RECEIVE_MACHINE_STATUS_CHANGED);
      if (role !== "technician" || !isAssignedTechnician) throw new Error(M.TECHNICIAN_RECEIVE_MACHINE_STATUS_CHANGED);
      if (repairCase.data?.status !== "REPLACEMENT_PLANNED" || !repairCase.data.primaryMachineId) {
        throw new Error(M.TECHNICIAN_RECEIVE_MACHINE_STATUS_CHANGED);
      }
      if (!custody.isSuccess || custody.isFetching || primaryCollectionEvent) {
        throw new Error(M.TECHNICIAN_RECEIVE_MACHINE_STATUS_CHANGED);
      }
      return repairCasesApi.recordPrimaryCollection(caseId, {
        machineId: repairCase.data.primaryMachineId,
        conditionNotes,
      }, receiveMachineEvidenceReference);
    },
    onSuccess: () => {
      setReceiveMachineNotes((current) => {
        const next = { ...current };
        delete next[caseId];
        return next;
      });
      setReceiveMachineEvidenceReferences((current) => {
        const next = { ...current };
        delete next[caseId];
        return next;
      });
    },
    onSettled: invalidateWorkflowQueries,
  });
  const activateReplacementAssignment = useMutation({
    mutationFn: (input: ReplacementAssignmentActivateRequest) => {
      if (
        (role !== "admin" && role !== "moderator") ||
        repairCase.isFetching || assignment.isFetching || ticket.isFetching || custody.isFetching ||
        repairCase.data?.status !== "PRIMARY_COLLECTED" ||
        assignment.data?.status !== "PLANNED" ||
        assignment.data.repairCaseId !== caseId ||
        ticket.data?.status !== "ASSIGNED" ||
        !primaryCollectionEvent?.ownerAcknowledgedAt ||
        !assignment.data.id
      ) {
        throw new Error(M.ACTIVATE_STATUS_CHANGED);
      }
      return replacementAssignmentsApi.activate(assignment.data.id, input, activationEvidence);
    },
    onSuccess: () => {
      setActivationEvidence([]);
      setActivationReason("");
      setActivationAttempt(null);
    },
    onSettled: invalidateWorkflowQueries,
  });
  const recordReplacementDelivery = useMutation({
    mutationFn: (input: MaintenanceCustodyEventCreateRequest) => {
      const canRecordAsRole = role === "admin" || role === "moderator" || (role === "technician" && isAssignedTechnician);
      if (
        !canRecordAsRole ||
        repairCase.isFetching || assignment.isFetching || ticket.isFetching || custody.isFetching ||
        input.eventType !== "REPLACEMENT_DELIVERED" ||
        repairCase.data?.status !== "PRIMARY_COLLECTED" ||
        assignment.data?.status !== "ACTIVE" ||
        assignment.data.repairCaseId !== caseId ||
        !primaryCollectionEvent?.ownerAcknowledgedAt ||
        !assignment.data.replacementMachineId ||
        input.machineId !== assignment.data.replacementMachineId ||
        replacementDeliveredEvent
      ) {
        throw new Error(M.REPLACEMENT_DELIVERY_STATUS_CHANGED);
      }
      return repairCasesApi.recordCustodyEvent(caseId, input, replacementDeliveryEvidence);
    },
    onSuccess: () => {
      setReplacementDeliveryNotes("");
      setReplacementDeliveryEvidence([]);
    },
    onSettled: invalidateWorkflowQueries,
  });
  const recordReturnCustodyEvent = useMutation({
    mutationFn: (input: MaintenanceCustodyEventCreateRequest) => {
      const canRecordAsRole = role === "admin" || role === "moderator" || (role === "technician" && isAssignedTechnician);
      const sharedDataReady = canRecordAsRole &&
        repairCase.isSuccess && !repairCase.isFetching && assignment.isSuccess && !assignment.isFetching &&
        ticket.isSuccess && !ticket.isFetching && custody.isSuccess && !custody.isFetching &&
        assignment.data?.status === "ACTIVE" && assignment.data.repairCaseId === caseId &&
        ticket.data?.repairCaseId === caseId;
      const expectedMachineId = input.eventType === "REPLACEMENT_COLLECTED"
        ? assignment.data?.replacementMachineId
        : input.eventType === "PRIMARY_RETURNED"
          ? repairCase.data?.primaryMachineId
          : undefined;
      const canRecordCurrentEvent = input.eventType === "REPLACEMENT_COLLECTED"
        ? repairCase.data?.status === "REPAIR_COMPLETED" && ticket.data?.status === "RESOLVED" &&
          Boolean(replacementDeliveredEvent?.ownerAcknowledgedAt) &&
          replacementDeliveredEvent?.machineId === assignment.data?.replacementMachineId && !replacementCollectionEvent
        : input.eventType === "PRIMARY_RETURNED"
          ? repairCase.data?.status === "REPLACEMENT_COLLECTED" && ticket.data?.status === "RESOLVED" &&
            Boolean(replacementCollectionEvent?.ownerAcknowledgedAt) &&
            replacementCollectionEvent?.machineId === assignment.data?.replacementMachineId &&
            assignment.data?.primaryMachineId === repairCase.data?.primaryMachineId && !primaryReturnEvent
          : false;
      if (!sharedDataReady || !canRecordCurrentEvent || !expectedMachineId || input.machineId !== expectedMachineId) {
        throw new Error(M.CUSTODY_EVENT_STATUS_CHANGED);
      }
      return repairCasesApi.recordCustodyEvent(caseId, input, input.eventType === "REPLACEMENT_COLLECTED" ? replacementCollectionEvidenceReference : primaryReturnEvidenceReference);
    },
    onSuccess: (_event, input) => {
      if (input.eventType === "REPLACEMENT_COLLECTED") {
        setReplacementCollectionConditions((current) => ({ ...current, [caseId]: "" }));
        setReplacementCollectionEvidenceReferences((current) => ({ ...current, [caseId]: [] }));
      }
      if (input.eventType === "PRIMARY_RETURNED") {
        setPrimaryReturnConditions((current) => ({ ...current, [caseId]: "" }));
        setPrimaryReturnEvidenceReferences((current) => ({ ...current, [caseId]: [] }));
      }
    },
    onSettled: invalidateWorkflowQueries,
  });
  const releaseReplacementAssignment = useMutation({
    mutationFn: ({
      expectedCaseId,
      expectedAssignmentId,
      request: releaseRequest,
    }: {
      expectedCaseId: string;
      expectedAssignmentId: string;
      request: ReplacementAssignmentReleaseRequest;
    }) => {
      const canReleaseAsRole = role === "admin" || role === "moderator" || role === "technician";
      const prerequisitesReady = canReleaseAsRole &&
        repairCase.isSuccess && !repairCase.isFetching && repairCase.data?.id === expectedCaseId &&
        repairCase.data?.status === "OWNER_ACKNOWLEDGED" &&
        assignment.isSuccess && !assignment.isFetching && assignment.data?.id === expectedAssignmentId &&
        assignment.data?.status === "ACTIVE" && assignment.data.repairCaseId === caseId &&
        assignment.data.primaryMachineId === repairCase.data.primaryMachineId &&
        assignment.data.replacementMachineId !== repairCase.data.primaryMachineId &&
        custody.isSuccess && !custody.isFetching &&
        Boolean(replacementCollectionEvent?.ownerAcknowledgedAt) &&
        replacementCollectionEvent?.machineId === assignment.data?.replacementMachineId &&
        Boolean(primaryReturnEvent?.ownerAcknowledgedAt) &&
        primaryReturnEvent?.machineId === repairCase.data.primaryMachineId;
      if (!prerequisitesReady) throw new Error(M.RELEASE_STATUS_CHANGED);
      return replacementAssignmentsApi.release(expectedAssignmentId, releaseRequest, releaseEvidenceReference);
    },
    onSuccess: () => {
      setReleaseEvidenceReferences((current) => ({ ...current, [caseId]: [] }));
      setReleaseConfirmationDialogs((current) => ({ ...current, [caseId]: false }));
      setReleaseAttempts((current) => {
        const next = { ...current };
        delete next[caseId];
        return next;
      });
    },
    onSettled: invalidateWorkflowQueries,
  });

  const isRefreshing = repairCase.isFetching || request.isFetching || ticket.isFetching || assignment.isFetching || timeline.isFetching || custody.isFetching ||
    acknowledgeCustody.isPending || recordRepairDiagnosis.isPending || startRepairWork.isPending || completeRepairWork.isPending ||
    recordPrimaryCollection.isPending || activateReplacementAssignment.isPending || recordReplacementDelivery.isPending || recordReturnCustodyEvent.isPending ||
    releaseReplacementAssignment.isPending;
  const currentPrimaryCollectionSuccess = recordPrimaryCollection.isSuccess && recordPrimaryCollection.variables?.submittedCaseId === caseId;
  const currentPrimaryCollectionError = recordPrimaryCollection.isError && recordPrimaryCollection.variables?.submittedCaseId === caseId;
  const canActivateAssignment = (role === "admin" || role === "moderator") &&
    !repairCase.isFetching && !assignment.isFetching && !ticket.isFetching && custody.isSuccess && !custody.isFetching &&
    repairCase.data?.status === "PRIMARY_COLLECTED" &&
    assignment.data?.status === "PLANNED" && assignment.data.repairCaseId === caseId &&
    ticket.data?.status === "ASSIGNED" && primaryCollectionAcknowledged;
  const canRecordReplacementDelivery =
    (role === "admin" || role === "moderator" || (role === "technician" && isAssignedTechnician)) &&
    !repairCase.isFetching && !assignment.isFetching && !ticket.isFetching && custody.isSuccess && !custody.isFetching &&
    repairCase.data?.status === "PRIMARY_COLLECTED" &&
    assignment.data?.status === "ACTIVE" && assignment.data.repairCaseId === caseId &&
    primaryCollectionAcknowledged && Boolean(assignment.data.replacementMachineId) && !replacementDeliveredEvent;
  const canSubmitReceiveMachine = role === "technician" && repairCase.isSuccess && !repairCase.isFetching &&
    repairCase.data.status === "REPLACEMENT_PLANNED" && Boolean(repairCase.data.primaryMachineId) &&
    isAssignedTechnician && custody.isSuccess && !custody.isFetching && !primaryCollectionEvent;
  const canRecordReturnCustodyAsRole = role === "admin" || role === "moderator" || (role === "technician" && isAssignedTechnician);
  const canCollectReplacement = repairCase.isSuccess && !repairCase.isFetching &&
    ticket.isSuccess && !ticket.isFetching && assignment.isSuccess && !assignment.isFetching && custody.isSuccess && !custody.isFetching &&
    repairCase.data?.status === "REPAIR_COMPLETED" && ticket.data?.status === "RESOLVED" && ticket.data.repairCaseId === caseId &&
    assignment.data?.status === "ACTIVE" && assignment.data.repairCaseId === caseId && Boolean(assignment.data.replacementMachineId) &&
    assignment.data.replacementMachineId !== repairCase.data.primaryMachineId &&
    assignment.data.primaryMachineId === repairCase.data.primaryMachineId &&
    replacementDeliveryAcknowledged && replacementDeliveredEvent?.machineId === assignment.data.replacementMachineId && !replacementCollectionEvent;
  const canReturnPrimary = repairCase.isSuccess && !repairCase.isFetching &&
    ticket.isSuccess && !ticket.isFetching && assignment.isSuccess && !assignment.isFetching && custody.isSuccess && !custody.isFetching &&
    repairCase.data?.status === "REPLACEMENT_COLLECTED" && ticket.data?.status === "RESOLVED" && ticket.data.repairCaseId === caseId &&
    assignment.data?.status === "ACTIVE" && assignment.data.repairCaseId === caseId && Boolean(repairCase.data.primaryMachineId) &&
    assignment.data.primaryMachineId === repairCase.data.primaryMachineId &&
    replacementCollectionAcknowledged && replacementCollectionEvent?.machineId === assignment.data.replacementMachineId && !primaryReturnEvent;
  const canSubmitReplacementCollection = canRecordReturnCustodyAsRole && canCollectReplacement;
  const canSubmitPrimaryReturn = canRecordReturnCustodyAsRole && canReturnPrimary;
  const canReleaseAsRole = role === "admin" || role === "moderator" || role === "technician";
  const canReleaseReplacement = repairCase.isSuccess && !repairCase.isFetching &&
    assignment.isSuccess && !assignment.isFetching && custody.isSuccess && !custody.isFetching &&
    repairCase.data?.status === "OWNER_ACKNOWLEDGED" &&
    assignment.data?.status === "ACTIVE" && assignment.data.repairCaseId === caseId &&
    assignment.data.primaryMachineId === repairCase.data.primaryMachineId &&
    assignment.data.replacementMachineId !== repairCase.data.primaryMachineId &&
    replacementCollectionAcknowledged && replacementCollectionEvent?.machineId === assignment.data.replacementMachineId &&
    primaryReturnAcknowledged && primaryReturnEvent?.machineId === repairCase.data.primaryMachineId;
  const canSubmitRelease = canReleaseAsRole && canReleaseReplacement;
  const releaseReadAfterWriteConfirmed = assignment.data?.status === "RELEASED" && repairCase.data?.status === "CLOSED" &&
    replacementCollectionAcknowledged && primaryReturnAcknowledged;
  const ownerWaitingForHandover = role === "owner" && (
    repairCase.data?.status === "REPLACEMENT_PLANNED" && !primaryCollectionEvent ||
    repairCase.data?.status === "PRIMARY_COLLECTED" && primaryCollectionAcknowledged && !replacementDeliveredEvent
  );
  const currentRepairCaseStatus = repairCase.data?.status;
  const currentTicketStatus = ticket.data?.status;
  const ticketDiagnosis = ticket.data?.diagnosis?.trim() ?? "";
  const diagnosisConfirmed =
    (currentRepairCaseStatus === "DIAGNOSIS" && currentTicketStatus === "ASSIGNED") ||
    (currentRepairCaseStatus === "REPAIR_IN_PROGRESS" && currentTicketStatus === "IN_PROGRESS") ||
    (["REPAIR_COMPLETED", "REPLACEMENT_COLLECTED", "PRIMARY_RETURNED", "OWNER_ACKNOWLEDGED", "CLOSED"].includes(currentRepairCaseStatus ?? "") && currentTicketStatus === "RESOLVED");
  const repairStartConfirmed =
    (currentRepairCaseStatus === "REPAIR_IN_PROGRESS" && currentTicketStatus === "IN_PROGRESS") ||
    (["REPAIR_COMPLETED", "REPLACEMENT_COLLECTED", "PRIMARY_RETURNED", "OWNER_ACKNOWLEDGED", "CLOSED"].includes(currentRepairCaseStatus ?? "") && currentTicketStatus === "RESOLVED");
  const repairCompletionCaseReached = ["REPAIR_COMPLETED", "REPLACEMENT_COLLECTED", "PRIMARY_RETURNED", "OWNER_ACKNOWLEDGED", "CLOSED"].includes(currentRepairCaseStatus ?? "");
  const repairCompletionConfirmed = repairCompletionCaseReached && currentTicketStatus === "RESOLVED";
  const canRecordDiagnosis = role === "technician" && isAssignedTechnician &&
    repairCase.isSuccess && !repairCase.isFetching &&
    ticket.isSuccess && !ticket.isFetching &&
    assignment.isSuccess && !assignment.isFetching &&
    custody.isSuccess && !custody.isFetching &&
    repairCase.data?.status === "REPLACEMENT_DELIVERED" &&
    ticket.data?.status === "ASSIGNED" && ticket.data.repairCaseId === caseId &&
    assignment.data?.status === "ACTIVE" && assignment.data.repairCaseId === caseId &&
    replacementDeliveryAcknowledged;
  const canStartWork = isAssignedTechnician &&
    repairCase.isSuccess && !repairCase.isFetching &&
    ticket.isSuccess && !ticket.isFetching &&
    assignment.isSuccess && !assignment.isFetching &&
    custody.isSuccess && !custody.isFetching &&
    repairCase.data?.status === "DIAGNOSIS" &&
    ticket.data?.status === "ASSIGNED" && ticket.data.repairCaseId === caseId &&
    assignment.data?.status === "ACTIVE" && assignment.data.repairCaseId === caseId &&
    replacementDeliveryAcknowledged;
  const canCompleteWork = role === "technician" && isAssignedTechnician &&
    repairCase.isSuccess && !repairCase.isFetching &&
    ticket.isSuccess && !ticket.isFetching &&
    assignment.isSuccess && !assignment.isFetching &&
    custody.isSuccess && !custody.isFetching &&
    repairCase.data?.status === "REPAIR_IN_PROGRESS" &&
    ticket.data?.status === "IN_PROGRESS" && ticket.data.repairCaseId === caseId &&
    Boolean(ticketDiagnosis) &&
    assignment.data?.status === "ACTIVE" && assignment.data.repairCaseId === caseId &&
    replacementDeliveryAcknowledged;
  const primaryCollectionStepState: WorkflowStepState = primaryCollectionEvent
    ? "complete"
    : repairCase.data?.status === "REPLACEMENT_PLANNED"
      ? canSubmitReceiveMachine ? "current" : "waiting"
      : "locked";
  const primaryAcknowledgmentStepState: WorkflowStepState = primaryCollectionAcknowledged
    ? "complete"
    : primaryCollectionEvent
      ? role === "owner" ? "current" : "waiting"
      : "locked";
  const activationStepState: WorkflowStepState = assignment.data?.status === "ACTIVE" || assignment.data?.status === "RELEASED"
    ? "complete"
    : canActivateAssignment
      ? "current"
      : primaryCollectionAcknowledged ? "waiting" : "locked";
  const replacementDeliveryStepState: WorkflowStepState = replacementDeliveredEvent
    ? "complete"
    : canRecordReplacementDelivery
      ? "current"
      : assignment.data?.status === "ACTIVE" ? "waiting" : "locked";
  const replacementAcknowledgmentStepState: WorkflowStepState = replacementDeliveryAcknowledged
    ? "complete"
    : replacementDeliveredEvent
      ? role === "owner" && primaryCollectionAcknowledged ? "current" : "waiting"
      : "locked";
  const diagnosisStepState: WorkflowStepState = diagnosisConfirmed
    ? "complete"
    : replacementDeliveryAcknowledged ? canRecordDiagnosis ? "current" : "waiting" : "locked";
  const startWorkStepState: WorkflowStepState = repairStartConfirmed
    ? "complete"
    : repairCase.data?.status === "DIAGNOSIS" ? canStartWork ? "current" : "waiting"
      : repairCase.data?.status === "REPAIR_IN_PROGRESS" || ["REPAIR_COMPLETED", "REPLACEMENT_COLLECTED", "PRIMARY_RETURNED", "OWNER_ACKNOWLEDGED", "CLOSED"].includes(repairCase.data?.status ?? "")
        ? "waiting"
        : replacementDeliveryAcknowledged ? "waiting" : "locked";
  const completeWorkStepState: WorkflowStepState = repairCompletionConfirmed
    ? "complete"
    : repairCase.data?.status === "REPAIR_IN_PROGRESS" ? canCompleteWork ? "current" : "waiting"
      : repairCompletionCaseReached ? "waiting" : "locked";
  const replacementCollectionStepState: WorkflowStepState = replacementCollectionEvent
    ? "complete"
    : repairCase.data?.status === "REPAIR_COMPLETED" ? canSubmitReplacementCollection ? "current" : "waiting" : "locked";
  const replacementCollectionAcknowledgmentStepState: WorkflowStepState = replacementCollectionAcknowledged
    ? "complete"
    : replacementCollectionEvent ? role === "owner" ? "current" : "waiting" : "locked";
  const primaryReturnStepState: WorkflowStepState = primaryReturnEvent
    ? "complete"
    : repairCase.data?.status === "REPLACEMENT_COLLECTED" ? canSubmitPrimaryReturn ? "current" : "waiting" : "locked";
  const primaryReturnFinalStateConfirmed = primaryReturnAcknowledged &&
    ["OWNER_ACKNOWLEDGED", "CLOSED"].includes(repairCase.data?.status ?? "");
  const primaryReturnAcknowledgmentStepState: WorkflowStepState = primaryReturnFinalStateConfirmed
    ? "complete"
    : primaryReturnEvent ? role === "owner" && !primaryReturnAcknowledged ? "current" : "waiting" : "locked";
  const ownerHasPendingAcknowledgment = role === "owner" && [
    primaryAcknowledgmentStepState, replacementAcknowledgmentStepState,
    replacementCollectionAcknowledgmentStepState, primaryReturnAcknowledgmentStepState,
  ].includes("current");
  const releaseStepState: WorkflowStepState = releaseReadAfterWriteConfirmed
    ? "complete"
    : releaseReplacementAssignment.isSuccess ? "waiting"
      : canSubmitRelease ? "current"
      : repairCase.data?.status === "OWNER_ACKNOWLEDGED" || releaseReplacementAssignment.isSuccess ? "waiting" : "locked";
  const repairProgressStepGroups: WorkflowStepState[][] = [
    [primaryCollectionStepState, primaryAcknowledgmentStepState],
    [activationStepState, replacementDeliveryStepState, replacementAcknowledgmentStepState],
    [diagnosisStepState, startWorkStepState, completeWorkStepState],
    [replacementCollectionStepState, replacementCollectionAcknowledgmentStepState, primaryReturnStepState, primaryReturnAcknowledgmentStepState, releaseStepState],
  ];
  const currentRepairProgressIndex = repairProgressStepGroups.findIndex((steps) => !steps.every((step) => step === "complete"));

  const submitAcknowledgement = (event: FormEvent<HTMLFormElement>, eventId: string) => {
    event.preventDefault();
    const acknowledgement = acknowledgementTexts[eventId]?.trim();
    if (role !== "owner" || !acknowledgement || acknowledgement.length > 1000 || acknowledgeCustody.isPending) return;
    acknowledgeCustody.mutate({ eventId, acknowledgement });
  };
  const submitStartWork = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!validCaseId || !canStartWork || !ticket.data?.id || !workScope.trim() || (dispute.isDisputed && !selectedAuthorization) || dispute.isLoading || dispute.isError || startRepairWork.isPending || startRepairWork.isSuccess) return;
    startRepairWork.mutate({ expectedTicketId: ticket.data.id, workScope: dispute.isDisputed ? selectedAuthorization!.workScope : workScope.trim(), authorizationId: dispute.isDisputed ? selectedAuthorization?.authorizationId : undefined });
  };
  const submitDiagnosis = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const diagnosis = diagnosisText.trim();
    if (
      !validCaseId || !canRecordDiagnosis || !ticket.data?.id || !diagnosis || Boolean(evidenceFileError(diagnosisEvidenceReference, { min: 1, max: 1 })) ||
      recordRepairDiagnosis.isPending || recordRepairDiagnosis.isSuccess
    ) return;
    recordRepairDiagnosis.mutate({ expectedTicketId: ticket.data.id, diagnosis });
  };
  const submitCompleteWork = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const diagnosis = ticketDiagnosis;
    const result = resolutionResult.trim();
    const scope = dispute.isDisputed ? selectedAuthorization?.workScope ?? "" : completionWorkScope.trim();
    const notes = completionNote.trim();
    if (
      !validCaseId || !canCompleteWork || !ticket.data?.id || !diagnosis || !result || !scope || Boolean(evidenceFileError(completionEvidenceReferenceText, { min: 1, max: 5 })) ||
      dispute.isLoading || dispute.isError || (dispute.isDisputed && !selectedAuthorization) || completeRepairWork.isPending || completeRepairWork.isSuccess
    ) return;
    completeRepairWork.mutate({
      expectedTicketId: ticket.data.id,
      request: {
        diagnosis,
        resolutionResult: result,
        workScope: scope,
        ...(notes ? { notes } : {}),
        ...(dispute.isDisputed && selectedAuthorization ? { emergencyAuthorizationId: selectedAuthorization.authorizationId } : {}),
      },
    });
  };
  const submitReceiveMachine = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const conditionNotes = receiveMachineConditionNotes.trim();
    if (!validCaseId || !canSubmitReceiveMachine || !conditionNotes || Boolean(evidenceFileError(receiveMachineEvidenceReference, { min: 1, max: 1 })) || recordPrimaryCollection.isPending || currentPrimaryCollectionSuccess) return;
    recordPrimaryCollection.mutate({ submittedCaseId: caseId, conditionNotes });
  };
  const submitActivation = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const handoverEvidence = activationEvidence.map((file) => `${file.name}:${file.size}:${file.lastModified}`).join("|");
    const approvalReasonText = activationReason.trim();
    if (!validCaseId || !canActivateAssignment || Boolean(evidenceFileError(activationEvidence, { min: 1, max: 1 })) || !approvalReasonText || isRefreshing || activateReplacementAssignment.isPending) return;
    const fingerprint = `${caseId}|${assignment.data?.id}|${handoverEvidence}|${approvalReasonText}`;
    const attempt = activationAttempt?.fingerprint === fingerprint
      ? activationAttempt
      : {
          fingerprint,
          idempotencyKey: globalThis.crypto.randomUUID(),
          correlationId: globalThis.crypto.randomUUID(),
        };
    setActivationAttempt(attempt);
    activateReplacementAssignment.mutate({
      approvalReason: approvalReasonText,
      idempotencyKey: attempt.idempotencyKey,
      correlationId: attempt.correlationId,
    });
  };
  const submitReplacementDelivery = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const conditionNotes = replacementDeliveryNotes.trim();
    const replacementMachineId = assignment.data?.replacementMachineId;
    if (!validCaseId || !canRecordReplacementDelivery || !replacementMachineId || !conditionNotes || Boolean(evidenceFileError(replacementDeliveryEvidence, { min: 1, max: 1 })) || isRefreshing || recordReplacementDelivery.isPending) return;
    recordReplacementDelivery.mutate({
      eventType: "REPLACEMENT_DELIVERED",
      machineId: replacementMachineId,
      conditionNotes,
    });
  };
  const submitReplacementCollection = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const conditionNotes = replacementCollectionCondition.trim();
    const machineId = assignment.data?.replacementMachineId;
    if (!validCaseId || !canSubmitReplacementCollection || !machineId || !conditionNotes || Boolean(evidenceFileError(replacementCollectionEvidenceReference, { min: 1, max: 1 })) || isRefreshing || recordReturnCustodyEvent.isPending) return;
    recordReturnCustodyEvent.mutate({ eventType: "REPLACEMENT_COLLECTED", machineId, conditionNotes });
  };
  const submitPrimaryReturn = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const conditionNotes = primaryReturnCondition.trim();
    const machineId = repairCase.data?.primaryMachineId;
    if (!validCaseId || !canSubmitPrimaryReturn || !machineId || !conditionNotes || Boolean(evidenceFileError(primaryReturnEvidenceReference, { min: 1, max: 1 })) || isRefreshing || recordReturnCustodyEvent.isPending) return;
    recordReturnCustodyEvent.mutate({ eventType: "PRIMARY_RETURNED", machineId, conditionNotes });
  };
  const submitReleaseReplacement = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!validCaseId || !canSubmitRelease || !assignment.data?.id || Boolean(evidenceFileError(releaseEvidenceReference, { min: 1, max: 1 })) || isRefreshing || releaseReplacementAssignment.isSuccess) return;
    setReleaseConfirmationDialogs((current) => ({ ...current, [caseId]: true }));
  };
  const confirmReleaseReplacement = () => {
    const evidence = releaseEvidenceReference.map((file) => `${file.name}:${file.size}:${file.lastModified}`).join("|");
    const assignmentId = assignment.data?.id;
    if (!validCaseId || !canSubmitRelease || !assignmentId || evidenceFileError(releaseEvidenceReference, { min: 1, max: 1 }) || isRefreshing || releaseReplacementAssignment.isSuccess) return;
    const fingerprint = `${caseId}|${assignmentId}|${evidence}`;
    const attempt = releaseAttempts[caseId]?.fingerprint === fingerprint
      ? releaseAttempts[caseId]
      : {
          fingerprint,
          idempotencyKey: globalThis.crypto.randomUUID(),
          correlationId: globalThis.crypto.randomUUID(),
        };
    setReleaseAttempts((current) => ({ ...current, [caseId]: attempt }));
    releaseReplacementAssignment.mutate({
      expectedCaseId: caseId,
      expectedAssignmentId: assignmentId,
      request: {
        idempotencyKey: attempt.idempotencyKey,
        correlationId: attempt.correlationId,
      },
    });
  };
  const renderOwnerAcknowledgment = (event: MaintenanceCustodyEvent | undefined, prompt: string) => {
    if (role !== "owner" || !event || event.ownerAcknowledgedAt) return null;
    const acknowledgementPending = acknowledgeCustody.isPending && acknowledgeCustody.variables?.eventId === event.id;
    const acknowledgementError = acknowledgeCustody.isError && acknowledgeCustody.variables?.eventId === event.id;
    return (
      <>
        <p>{prompt}</p>
        {acknowledgementError ? (
          <p className={`${styles.notice} ${styles.error}`} role="alert">{getApiErrorMessage(acknowledgeCustody.error)}</p>
        ) : null}
        <form className={styles.assignmentForm} onSubmit={(formEvent) => submitAcknowledgement(formEvent, event.id)}>
          <label className={styles.formField} htmlFor={`custody-acknowledgement-${event.id}`}>
            <span>{M.ACKNOWLEDGMENT_TEXT}</span>
            <textarea
              id={`custody-acknowledgement-${event.id}`}
              maxLength={1000}
              disabled={isRefreshing || acknowledgeCustody.isPending}
              onChange={(inputEvent) => setAcknowledgementTexts((current) => ({
                ...current,
                [event.id]: inputEvent.target.value,
              }))}
              required
              value={acknowledgementTexts[event.id] ?? ""}
            />
          </label>
          <ButtonBar type="submit" disabled={!acknowledgementTexts[event.id]?.trim() || isRefreshing || acknowledgeCustody.isPending}>
            {acknowledgementPending ? M.ACKNOWLEDGMENT_SUBMITTING : M.ACKNOWLEDGMENT_SUBMIT}
          </ButtonBar>
        </form>
      </>
    );
  };
  const historyActor = (actorRole: string) => compactLayout
    ? operatorHistoryRoles[actorRole.toUpperCase()] ?? actorRole
    : actorRole;

  const timelineEvents = timeline.data?.content ?? [];
  const previewTimeline = compactLayout && timelinePage === 0 && !expandedTimeline;
  const renderTimelineHistory = (showHeading = true) => (
    <>
      {showHeading ? <SectionHeading title={M.TIMELINE_TITLE} description="Các bước xử lý được sắp theo thời gian." /> : null}
      {timeline.isPending ? <p className={styles.notice} role="status">{M.TIMELINE_LOADING}</p> : null}
      {timeline.isError ? <QueryError label={M.TIMELINE_ERROR} error={timeline.error} onRetry={() => void timeline.refetch()} /> : null}
      {timeline.data?.content.length === 0 ? <p className={styles.notice} role="status">{M.TIMELINE_EMPTY}</p> : null}
      {timeline.data && timeline.data.content.length > 0 ? (
        <ol className={styles.timeline} aria-label={M.TIMELINE_TITLE}>
          {(previewTimeline ? timelineEvents.slice(0, 5) : timelineEvents).map((event) => {
            const title = maintenanceCustodyEventLabel(event.eventType);
            const detail = timelineDetails(event.reason, event.details);
            if (compactLayout) return (
              <AdminHistoryRow key={event.id} title={operatorHistoryLabels[event.eventType] ?? title}
                meta={`${formatDateTime(event.occurredAt)} · ${historyActor(event.actorRole)}`}>
                <p>{detail === "—" ? "Không có ghi chú." : detail}</p>
                {event.eventType === "EMERGENCY_WORK_AUTHORIZED" && <p>Phạm vi và mã ủy quyền: {event.details}</p>}
                {event.actorId && <span>Mã người thực hiện: {event.actorId}</span>}
              </AdminHistoryRow>
            );

            return (
              <li className={styles.timelineItem} key={event.id}>
                <strong>{title}</strong>
                <p>{detail}</p>
                {event.eventType === "EMERGENCY_WORK_AUTHORIZED" && <p>Phạm vi và mã cho phép: {event.details}</p>}
                <span>{formatDateTime(event.occurredAt)} · {event.actorRole}{event.actorId ? ` · ${event.actorId}` : ""}</span>
              </li>
            );
          })}
        </ol>
      ) : null}
      {compactLayout && timelinePage === 0 && timelineEvents.length > 5 && (
        <div className={styles.historyMore}>
          <ButtonBar type="button" aria-expanded={expandedTimeline} onClick={() => setExpandedTimeline(!expandedTimeline)}>
            {expandedTimeline ? "Thu gọn" : `Xem thêm ${timelineEvents.length - 5} sự kiện`}
          </ButtonBar>
        </div>
      )}
      {timeline.data && timeline.data.totalPages > 1 ? (
        <nav className={styles.pagination} aria-label="Phân trang dòng thời gian">
          <button className={styles.inlineButton} type="button" disabled={timeline.data.first || timeline.isFetching} onClick={() => setTimelinePage((current) => Math.max(0, current - 1))}>{M.PREVIOUS}</button>
          <span>{M.PAGE} {timeline.data.number + 1} / {timeline.data.totalPages}</span>
          <button className={styles.inlineButton} type="button" disabled={timeline.data.last || timeline.isFetching} onClick={() => setTimelinePage((current) => current + 1)}>{M.NEXT}</button>
        </nav>
      ) : null}
    </>
  );
  const renderCustodyHistory = (showHeading = true) => (
    <>
      {showHeading ? <SectionHeading title={M.CUSTODY_TITLE} description="Biên nhận bàn giao và xác nhận của khách hàng được lưu tại đây." /> : null}
      {custody.isPending ? <p className={styles.notice} role="status">{M.CUSTODY_LOADING}</p> : null}
      {custody.isError ? <QueryError label={M.CUSTODY_ERROR} error={custody.error} onRetry={() => void custody.refetch()} /> : null}
      {custody.data?.items.length === 0 ? <p className={styles.notice} role="status">{M.CUSTODY_EMPTY}</p> : null}
      {custody.data && custody.data.items.length > 0 ? (
        <ol className={styles.timeline} aria-label={M.CUSTODY_TITLE}>
          {custody.data.items.map((event) => {
            const title = maintenanceCustodyEventLabel(event.eventType);
            const status = event.ownerAcknowledgedAt ? M.ACKNOWLEDGED : M.AWAITING_ACKNOWLEDGMENT;
            const statusClass = event.ownerAcknowledgedAt ? styles.acknowledged : styles.waitingAcknowledgment;
            const acknowledgement = event.ownerAcknowledgedAt
              ? `${status}: ${formatDateTime(event.ownerAcknowledgedAt)}${event.ownerAcknowledgement ? ` · ${event.ownerAcknowledgement}` : ""}`
              : status;
            if (compactLayout) return (
              <AdminHistoryRow key={event.id} title={title}
                meta={`${formatDateTime(event.occurredAt)} · ${historyActor(event.actorRole)}`}
                status={<span className={statusClass}>{status}</span>}>
                <p>{event.conditionNotes || "Không có ghi chú bàn giao."}</p>
                <span>Mã máy: {event.machineId}</span>
                {event.ownerAcknowledgedAt && <p className={statusClass}>{acknowledgement}</p>}
              </AdminHistoryRow>
            );

            return (
              <li className={styles.timelineItem} key={event.id}>
                <strong>{title}</strong>
                <p>{event.conditionNotes || "—"}</p>
                <span>{formatDateTime(event.occurredAt)} · {event.actorRole} · {event.machineId}</span>
                <span className={statusClass}>{acknowledgement}</span>
              </li>
            );
          })}
        </ol>
      ) : null}
      {custody.data && (custody.data.page > 0 || custody.data.hasNext) ? (
        <nav className={styles.pagination} aria-label="Phân trang lịch sử bàn giao">
          <button className={styles.inlineButton} type="button" disabled={custodyPage === 0 || custody.isFetching} onClick={() => setCustodyPage((current) => Math.max(0, current - 1))}>{M.PREVIOUS}</button>
          <span>{M.PAGE} {custody.data.page + 1}</span>
          <button className={styles.inlineButton} type="button" disabled={!custody.data.hasNext || custody.isFetching} onClick={() => setCustodyPage((current) => current + 1)}>{M.NEXT}</button>
        </nav>
      ) : null}
    </>
  );

  const renderRelatedWork = (caseData: NonNullable<typeof repairCase.data>) => (
    <>
      <section className={styles.panel} aria-label="Công việc liên quan">
        <SectionHeading title="Công việc liên quan" description="Các mã liên kết và trạng thái hiện tại của ticket, máy thay thế." />
        {ticket.isError ? <QueryError label={M.MAINTENANCE_TICKET} error={ticket.error} onRetry={() => void ticket.refetch()} /> : null}
        {request.isError ? <QueryError label={M.REQUEST} error={request.error} onRetry={() => void request.refetch()} /> : null}
        {assignment.isError ? <QueryError label={M.REPLACEMENT_ASSIGNMENT} error={assignment.error} onRetry={() => void assignment.refetch()} /> : null}
        <dl className={styles.detailGrid}>
          <DetailValue label={M.MAINTENANCE_TICKET} value={caseData.maintenanceTicketId ?? "—"} code />
          <DetailValue label={M.TICKET_STATUS} value={
            !caseData.maintenanceTicketId ? "—" : ticket.isPending ? "Đang tải…" : ticketStatusLabel(ticket.data?.status)
          } />
          <DetailValue label={M.REPLACEMENT_ASSIGNMENT} value={
            replacementAssignmentId ?? (request.isPending || timeline.isPending ? "Đang tải…" : "—")
          } code />
          <DetailValue label={M.ASSIGNMENT_STATUS} value={
            replacementAssignmentId ? (assignment.isPending ? "Đang tải…" : assignmentStatusLabel(assignment.data?.status)) : "—"
          } />
          <DetailValue label={M.ASSIGNMENT_MACHINE} value={assignment.data?.replacementMachineId ?? "—"} code />
          <DetailValue label={M.START_AT} value={formatDateTime(assignment.data?.startAt)} />
          <DetailValue label={M.END_AT} value={formatDateTime(assignment.data?.endAt)} />
        </dl>
      </section>
      <EvidenceList resource="REPAIR_CASE" parentId={caseId} showSize={!relatedOnly} title="Chứng từ hồ sơ sửa chữa" />
      {replacementAssignmentId ? <EvidenceList resource="REPLACEMENT_ASSIGNMENT" parentId={replacementAssignmentId} showSize={!relatedOnly} title="Chứng từ máy thay thế" /> : null}
    </>
  );

  if (!validCaseId) {
    return <div className={styles.screen}><p className={`${styles.notice} ${styles.error}`} role="alert">{M.INVALID_CASE_ID}</p></div>;
  }

  return (
    <div className={compactLayout ? `${styles.screen} ${styles.operatorWorkspace}` : styles.screen} data-screen="repair-case" data-role={role}>
      <div className={compactLayout ? styles.casePageHeader : undefined}>
        <BackButtonHeading
          className={styles.heading}
          title={relatedOnly ? "Công việc liên quan & chứng từ" : M.CASE_DETAIL_TITLE}
          titleId="repair-case-detail-title"
          description={relatedOnly ? `Hồ sơ sửa chữa · ${caseId.slice(0, 8).toUpperCase()}` : compactLayout ? undefined : M.CASE_DETAIL_DESCRIPTION}
          back={relatedOnly ? null : { label: "Quay lại danh sách", fallbackHref: listHref }}
        />
        {relatedOnly ? (
          <ButtonBar href={role === "owner" ? PATH_CUSTOMER.SUPPORT_REPAIR_CASE_DETAIL(caseId) : operatorPaths.TECHNICAL_REPAIR_CASE_DETAIL(caseId)}>Về hồ sơ sửa chữa</ButtonBar>
        ) : compactLayout && repairCase.isSuccess ? (
          <ButtonBar href={role === "owner" ? PATH_CUSTOMER.SUPPORT_REPAIR_CASE_RELATED(caseId) : operatorPaths.TECHNICAL_REPAIR_CASE_RELATED(caseId)}>Công việc liên quan &amp; chứng từ</ButtonBar>
        ) : null}
      </div>

      {repairCase.isPending ? <p className={styles.notice} role="status">{M.CASE_LOADING}</p> : null}
      {repairCase.isError ? <QueryError label={M.CASE_NOT_FOUND} error={repairCase.error} onRetry={() => void repairCase.refetch()} /> : null}
      {repairCase.data && !repairCase.isError && (relatedOnly ? renderRelatedWork(repairCase.data) : (
        <>
          {(role === "admin" || role === "moderator") && <ReplacementActions repairCase={repairCase.data} refresh={invalidateWorkflowQueries} role={role} />}
          {(role === "admin" || role === "moderator" || (role === "technician" && isAssignedTechnician)) && dispute.authorizations.length > 0 && <section><h3>Ủy quyền khẩn cấp</h3>{dispute.authorizations.map(item => <p key={item.authorizationId}>{formatDateTime(item.authorizedAt)} · {({ ADMIN: "Quản trị viên", MODERATOR: "Điều phối viên" } as Record<string, string>)[item.actorRole] ?? item.actorRole} · Lý do: {item.reason || "—"} · Phạm vi công việc: {item.workScope}</p>)}</section>}
          {compactLayout ? (
            <section className={`${styles.workOrderSummary} ${styles.workOrderProgressPanel} ${styles.adminRepairProgress}`} aria-labelledby="repair-case-progress-title">
              <div className={styles.workOrderSummaryHeading}>
                <div><h2 id="repair-case-progress-title">Tiến độ xử lý</h2></div>
                <span className={styles.workOrderProgressStatus} data-tone={repairCase.data.status === "CLOSED" ? "success" : repairCase.data.status === "CANCELLED" ? "danger" : undefined}>
                  {statusLabel(repairCase.data.status)}
                </span>
              </div>
              <ol className={styles.workOrderProgress} aria-label="Tiến độ hồ sơ sửa chữa">
                {["Tiếp nhận máy", "Máy thay thế", "Chẩn đoán và sửa chữa", "Hoàn trả và kết thúc"].map((label, index) => {
                  const terminal = repairCase.data.status === "CLOSED" || repairCase.data.status === "CANCELLED";
                  const complete = repairCase.data.status === "CLOSED" || repairProgressStepGroups[index].every((step) => step === "complete");
                  const current = !terminal && index === currentRepairProgressIndex;
                  const stepClass = complete ? styles.workOrderProgressComplete : current ? styles.workOrderProgressCurrent : "";
                  return (
                    <li className={`${styles.workOrderProgressStep} ${stepClass}`} key={label} aria-current={current ? "step" : undefined}>
                      <span aria-hidden="true">{complete ? "✓" : index + 1}</span>
                      <small>{label}</small>
                    </li>
                  );
                })}
              </ol>
            </section>
          ) : null}
          <div className={compactLayout ? styles.caseWorkspace : undefined} data-status={repairCase.data.status}>
          {compactLayout ? <section className={[styles.panel, styles.caseSummary].join(" ")} aria-label="Thông tin hồ sơ">
            <h2>Hồ sơ sửa chữa</h2>
            <dl className={styles.detailGrid}>
              <DetailValue label={M.CREATED_AT} value={formatDateTime(repairCase.data.createdAt)} />
              <DetailValue label={M.CLOSED_AT} value={formatDateTime(repairCase.data.closedAt)} />
            </dl>
            <details className={styles.technicalDetails}><summary>Thông tin liên kết</summary><dl className={styles.detailGrid}>
              <DetailValue label={M.CASE_ID} value={repairCase.data.id} code />
              <DetailValue label={M.REQUEST_ID} value={repairCase.data.maintenanceRequestId} code />
              {role !== "owner" && <DetailValue label={M.OWNER} value={repairCase.data.ownerId} code />}
              <DetailValue label={M.CONTRACT} value={repairCase.data.contractId} code />
              <DetailValue label={M.PRIMARY_MACHINE} value={repairCase.data.primaryMachineId} code />
            </dl></details>
          </section> : <>          <section className={styles.panel} aria-label="Thông tin hồ sơ">
            <SectionHeading title="Thông tin hồ sơ" description="Trạng thái do hệ thống Dolores trả về." />
            <dl className={styles.detailGrid}>
              <DetailValue label={M.CASE_ID} value={repairCase.data.id} code />
              <DetailValue label={M.STATUS} value={statusLabel(repairCase.data.status)} />
              <DetailValue label={M.REQUEST_ID} value={repairCase.data.maintenanceRequestId} code />
              <DetailValue label={M.OWNER} value={repairCase.data.ownerId} code />
              <DetailValue label={M.CONTRACT} value={repairCase.data.contractId} code />
              <DetailValue label={M.PRIMARY_MACHINE} value={repairCase.data.primaryMachineId} code />
              <DetailValue label={M.CREATED_AT} value={formatDateTime(repairCase.data.createdAt)} />
              <DetailValue label={M.CLOSED_AT} value={formatDateTime(repairCase.data.closedAt)} />
            </dl>
          </section>

</>}

          {!compactLayout && (
            <details className={styles.technicalDetails} open>
              <summary>Công việc liên quan &amp; chứng từ</summary>
              {renderRelatedWork(repairCase.data)}
            </details>
          )}

          <section className={[styles.panel, styles.caseProcess].join(" ")} aria-label={M.PROCESS_TITLE}>
            {!compactLayout && <SectionHeading title={M.PROCESS_TITLE} description={M.PROCESS_DESCRIPTION} />}
            {ownerWaitingForHandover && <p className={styles.notice} role="status">{M.WAITING_FOR_OPERATOR}</p>}
            <details className={styles.processDisclosure} open={!compactLayout || ownerHasPendingAcknowledgment}>
              <summary>{M.PROCESS_TITLE}</summary>
            <ol className={styles.workflowSteps} aria-label={M.PROCESS_TITLE}>
              <WorkflowStep title={M.PROCESS_PRIMARY_COLLECTION} compact={compactLayout} status={primaryCollectionStepState}>
                <p>{M.PROCESS_PRIMARY_COLLECTION_DESCRIPTION}</p>
                {primaryCollectionEvent ? (
                  <p className={styles.acknowledged} role="status">{`${M.TECHNICIAN_RECEIVE_MACHINE_SUCCESS} ${formatDateTime(primaryCollectionEvent.occurredAt)} · ${primaryCollectionEvent.machineId}`}</p>
                ) : canSubmitReceiveMachine ? (
                  <form id="receive-machine-form" className={styles.assignmentForm} onSubmit={submitReceiveMachine}>
                    <label className={styles.formField} htmlFor="primary-collection-condition">
                      <span>{M.TECHNICIAN_RECEIVE_MACHINE_CONDITION}</span>
                      <textarea
                        id="primary-collection-condition"
                        maxLength={2000}
                        disabled={recordPrimaryCollection.isPending || currentPrimaryCollectionSuccess}
                        onChange={(event) => setReceiveMachineNotes((current) => ({ ...current, [caseId]: event.target.value }))}
                        required
                        value={receiveMachineConditionNotes}
                      />
                    </label>
                    <label className={styles.formField} htmlFor="primary-collection-evidence-reference">
                      <span>Tệp minh chứng *</span>
                      <input
                        type="file" accept={EVIDENCE_ACCEPT}
                        id="primary-collection-evidence-reference"
                        disabled={recordPrimaryCollection.isPending || currentPrimaryCollectionSuccess}
                        onChange={(event) => setReceiveMachineEvidenceReferences((current) => ({ ...current, [caseId]: Array.from(event.target.files ?? []) }))}
                        required
                      />
                      <span className={styles.formHint}>{receiveMachineEvidenceReference.map((file) => file.name).join(", ")}</span>
                      <span className={styles.formHint}>PDF, JPEG hoặc PNG.</span>
                    </label>
                    {currentPrimaryCollectionError ? (
                      <p className={`${styles.notice} ${styles.error}`} role="alert">{getApiErrorMessage(recordPrimaryCollection.error, "mutation")}</p>
                    ) : null}
                    <CaseActions actions={[{ id: "receive-machine", label: M.TECHNICIAN_RECEIVE_MACHINE, variant: "primary", priority: 100, type: "submit", form: "receive-machine-form", disabled: !canSubmitReceiveMachine || !receiveMachineConditionNotes.trim() || Boolean(evidenceFileError(receiveMachineEvidenceReference, { min: 1, max: 1 })) || recordPrimaryCollection.isPending || currentPrimaryCollectionSuccess, disabledReason: evidenceFileError(receiveMachineEvidenceReference, { min: 1, max: 1 }) ?? "Điền tình trạng máy và đính kèm tệp minh chứng để tiếp tục.", pending: recordPrimaryCollection.isPending, pendingLabel: M.TECHNICIAN_RECEIVE_MACHINE_SUBMITTING }]} />
                  </form>
                ) : (
                  <p className={styles.notice} role="status">{M.PROCESS_WAITING_FOR_TECHNICIAN}</p>
                )}
              </WorkflowStep>

              <WorkflowStep title={M.PROCESS_PRIMARY_ACKNOWLEDGMENT} compact={compactLayout} status={primaryAcknowledgmentStepState}>
                <p>{M.PROCESS_PRIMARY_ACKNOWLEDGMENT_DESCRIPTION}</p>
                {primaryCollectionAcknowledged ? (
                  <p className={styles.acknowledged} role="status">{`${M.ACKNOWLEDGED}: ${formatDateTime(primaryCollectionEvent?.ownerAcknowledgedAt)}`}</p>
                ) : primaryCollectionEvent && role === "owner" ? (
                  renderOwnerAcknowledgment(primaryCollectionEvent, M.ACKNOWLEDGMENT_PRIMARY_PROMPT)
                ) : primaryCollectionEvent ? (
                  <p className={styles.notice} role="status">{M.PROCESS_WAITING_FOR_OWNER}</p>
                ) : (
                  <p className={styles.notice} role="status">{M.PROCESS_WAITING_FOR_TECHNICIAN}</p>
                )}
              </WorkflowStep>

              <WorkflowStep title={M.PROCESS_ACTIVATE_ASSIGNMENT} compact={compactLayout} status={activationStepState}>
                <p>{M.PROCESS_ACTIVATE_ASSIGNMENT_DESCRIPTION}</p>
                {assignment.data?.status === "ACTIVE" || assignment.data?.status === "RELEASED" ? (
                  <p className={styles.acknowledged} role="status">{`${M.ACTIVATE_SUCCESS} ${assignmentStatusLabel(assignment.data.status)}`}</p>
                ) : canActivateAssignment ? (
                  <form id="activate-replacement-form" className={styles.assignmentForm} onSubmit={submitActivation}>
                    <label className={styles.formField} htmlFor="replacement-activation-evidence">
                      <span>Tệp minh chứng *</span>
                      <input
                        type="file" accept={EVIDENCE_ACCEPT}
                        id="replacement-activation-evidence"
                        disabled={activateReplacementAssignment.isPending}
                        onChange={(event) => setActivationEvidence(Array.from(event.target.files ?? []))}
                        required
                      />
                      <span className={styles.formHint}>{activationEvidence.map((file) => file.name).join(", ")}</span>
                      <span className={styles.formHint}>PDF, JPEG hoặc PNG.</span>
                    </label>
                    <label className={styles.formField} htmlFor="replacement-activation-reason">
                      <span>{M.ACTIVATE_REASON}</span>
                      <textarea
                        id="replacement-activation-reason"
                        maxLength={2000}
                        disabled={activateReplacementAssignment.isPending}
                        value={activationReason}
                        onChange={(event) => setActivationReason(event.target.value)}
                        required
                      />
                    </label>
                    {activateReplacementAssignment.isError ? (
                      <p className={`${styles.notice} ${styles.error}`} role="alert">{getApiErrorMessage(activateReplacementAssignment.error, "mutation")}</p>
                    ) : null}
                    <CaseActions actions={[{ id: "activate-replacement", label: M.ACTIVATE_SUBMIT, variant: "primary", priority: 100, type: "submit", form: "activate-replacement-form", disabled: Boolean(evidenceFileError(activationEvidence, { min: 1, max: 1 })) || !activationReason.trim() || activateReplacementAssignment.isPending, disabledReason: evidenceFileError(activationEvidence, { min: 1, max: 1 }) ?? "Điền lý do phê duyệt và đính kèm tệp minh chứng.", pending: activateReplacementAssignment.isPending, pendingLabel: M.ACTIVATE_SUBMITTING }]} />
                  </form>
                ) : (
                  <p className={styles.notice} role="status">
                    {!primaryCollectionEvent?.ownerAcknowledgedAt
                      ? primaryCollectionEvent ? M.PROCESS_WAITING_FOR_OWNER : M.PROCESS_WAITING_FOR_TECHNICIAN
                      : role === "admin" || role === "moderator" ? M.ACTIVATE_PREREQUISITES_PENDING : M.PROCESS_WAITING_FOR_OPERATOR}
                  </p>
                )}
              </WorkflowStep>

              <WorkflowStep title={M.PROCESS_REPLACEMENT_DELIVERY} compact={compactLayout} status={replacementDeliveryStepState}>
                <p>{M.PROCESS_REPLACEMENT_DELIVERY_DESCRIPTION}</p>
                {replacementDeliveredEvent ? (
                  <p className={styles.acknowledged} role="status">{`${M.REPLACEMENT_DELIVERY_SUCCESS} ${formatDateTime(replacementDeliveredEvent.occurredAt)} · ${replacementDeliveredEvent.machineId}`}</p>
                ) : canRecordReplacementDelivery ? (
                  <form id="replacement-delivery-form" className={styles.assignmentForm} onSubmit={submitReplacementDelivery}>
                    <DetailValue label={M.ASSIGNMENT_MACHINE} value={assignment.data?.replacementMachineId ?? "—"} code />
                    <label className={styles.formField} htmlFor="replacement-delivery-condition">
                      <span>{M.REPLACEMENT_DELIVERY_CONDITION}</span>
                      <textarea
                        id="replacement-delivery-condition"
                        maxLength={2000}
                        disabled={recordReplacementDelivery.isPending}
                        value={replacementDeliveryNotes}
                        onChange={(event) => setReplacementDeliveryNotes(event.target.value)}
                        required
                      />
                    </label>
                    <label className={styles.formField} htmlFor="replacement-delivery-evidence-reference">
                      <span>Tệp minh chứng *</span>
                      <input
                        type="file" accept={EVIDENCE_ACCEPT}
                        id="replacement-delivery-evidence-reference"
                        disabled={recordReplacementDelivery.isPending}
                        onChange={(event) => setReplacementDeliveryEvidence(Array.from(event.target.files ?? []))}
                        required
                      />
                      <span className={styles.formHint}>{replacementDeliveryEvidence.map((file) => file.name).join(", ")}</span>
                      <span className={styles.formHint}>PDF, JPEG hoặc PNG.</span>
                    </label>
                    {recordReplacementDelivery.isError ? (
                      <p className={`${styles.notice} ${styles.error}`} role="alert">{getApiErrorMessage(recordReplacementDelivery.error, "mutation")}</p>
                    ) : null}
                    <CaseActions actions={[{ id: "replacement-delivery", label: M.REPLACEMENT_DELIVERY_SUBMIT, variant: "primary", priority: 100, type: "submit", form: "replacement-delivery-form", disabled: !replacementDeliveryNotes.trim() || Boolean(evidenceFileError(replacementDeliveryEvidence, { min: 1, max: 1 })) || recordReplacementDelivery.isPending, disabledReason: evidenceFileError(replacementDeliveryEvidence, { min: 1, max: 1 }) ?? "Điền tình trạng máy và đính kèm tệp minh chứng bàn giao.", pending: recordReplacementDelivery.isPending, pendingLabel: M.REPLACEMENT_DELIVERY_SUBMITTING }]} />
                  </form>
                ) : assignment.data?.status === "ACTIVE" ? (
                  <p className={styles.notice} role="status">
                    {primaryCollectionAcknowledged ? M.PROCESS_WAITING_FOR_TECHNICIAN : M.PROCESS_WAITING_FOR_OWNER}
                  </p>
                ) : (
                  <p className={styles.notice} role="status">{M.PROCESS_WAITING_FOR_OPERATOR}</p>
                )}
              </WorkflowStep>

              <WorkflowStep title={M.PROCESS_REPLACEMENT_ACKNOWLEDGMENT} compact={compactLayout} status={replacementAcknowledgmentStepState}>
                <p>{M.PROCESS_REPLACEMENT_ACKNOWLEDGMENT_DESCRIPTION}</p>
                {replacementDeliveryAcknowledged ? (
                  <p className={styles.acknowledged} role="status">{`${M.ACKNOWLEDGED}: ${formatDateTime(replacementDeliveredEvent?.ownerAcknowledgedAt)}`}</p>
                ) : replacementDeliveredEvent && primaryCollectionAcknowledged && role === "owner" ? (
                  renderOwnerAcknowledgment(replacementDeliveredEvent, M.ACKNOWLEDGMENT_REPLACEMENT_PROMPT)
                ) : replacementDeliveredEvent ? (
                  <p className={styles.notice} role="status">{M.PROCESS_WAITING_FOR_OWNER}</p>
                ) : (
                  <p className={styles.notice} role="status">{M.PROCESS_WAITING_FOR_HANDOVER}</p>
                )}
              </WorkflowStep>

              <WorkflowStep title={M.PROCESS_DIAGNOSIS} compact={compactLayout} status={diagnosisStepState}>
                <p>{M.PROCESS_DIAGNOSIS_DESCRIPTION}</p>
                {diagnosisStepState === "complete" ? (
                  <p className={styles.acknowledged} role="status">{M.TECHNICIAN_DIAGNOSIS_SUCCESS}</p>
                ) : recordRepairDiagnosis.isSuccess ? (
                  <p className={styles.notice} role="status">{M.TECHNICIAN_STATUS_SYNC_PENDING}</p>
                ) : canRecordDiagnosis ? (
                  <form id="repair-diagnosis-form" className={styles.assignmentForm} onSubmit={submitDiagnosis}>
                    <label className={styles.formField} htmlFor={`repair-diagnosis-${caseId}`}>
                      <span>{M.TECHNICIAN_DIAGNOSIS}</span>
                      <textarea
                        id={`repair-diagnosis-${caseId}`}
                        maxLength={4000}
                        disabled={isRefreshing || recordRepairDiagnosis.isSuccess}
                        onChange={(event) => setDiagnosisTexts((current) => ({ ...current, [caseId]: event.target.value }))}
                        required
                        value={diagnosisText}
                      />
                    </label>
                    <label className={styles.formField} htmlFor={`repair-diagnosis-evidence-${caseId}`}>
                      <span>Tệp minh chứng *</span>
                      <input
                        type="file" accept={EVIDENCE_ACCEPT}
                        id={`repair-diagnosis-evidence-${caseId}`}
                        disabled={isRefreshing || recordRepairDiagnosis.isSuccess}
                        onChange={(event) => setDiagnosisEvidenceReferences((current) => ({ ...current, [caseId]: Array.from(event.target.files ?? []) }))}
                        required
                      />
                      <span className={styles.formHint}>{diagnosisEvidenceReference.map((file) => file.name).join(", ")}</span>
                      <span className={styles.formHint}>PDF, JPEG hoặc PNG.</span>
                    </label>
                    {recordRepairDiagnosis.isError ? (
                      <p className={`${styles.notice} ${styles.error}`} role="alert">{getApiErrorMessage(recordRepairDiagnosis.error)}</p>
                    ) : null}
                    <CaseActions actions={[{ id: "repair-diagnosis", label: M.TECHNICIAN_DIAGNOSIS_SUBMIT, variant: "primary", priority: 100, type: "submit", form: "repair-diagnosis-form", disabled: !diagnosisText.trim() || Boolean(evidenceFileError(diagnosisEvidenceReference, { min: 1, max: 1 })) || isRefreshing || recordRepairDiagnosis.isSuccess, disabledReason: evidenceFileError(diagnosisEvidenceReference, { min: 1, max: 1 }) ?? "Nhập nội dung chẩn đoán và đính kèm tệp minh chứng.", pending: recordRepairDiagnosis.isPending, pendingLabel: M.TECHNICIAN_DIAGNOSIS_SUBMITTING }]} />
                  </form>
                ) : (
                  <p className={styles.notice} role="status">
                    {!replacementDeliveryAcknowledged ? M.TECHNICIAN_WAITING_OWNER_ACK : !isAssignedTechnician ? M.TECHNICIAN_WAITING_ASSIGNED_TASK : M.TECHNICIAN_DIAGNOSIS_STATUS_CHANGED}
                  </p>
                )}
              </WorkflowStep>

              <WorkflowStep title={M.PROCESS_START_REPAIR} compact={compactLayout} status={startWorkStepState}>
                <p>{M.PROCESS_START_REPAIR_DESCRIPTION}</p>
                {startWorkStepState === "complete" ? (
                  <p className={styles.acknowledged} role="status">{M.TECHNICIAN_WORK_START_SUCCESS}</p>
                ) : startRepairWork.isSuccess ? (
                  <p className={styles.notice} role="status">{M.TECHNICIAN_STATUS_SYNC_PENDING}</p>
                ) : canStartWork ? (
                  <form id="start-repair-work-form" className={styles.assignmentForm} onSubmit={submitStartWork}>
                    {dispute.isDisputed && <label className={styles.formField}>Ủy quyền xử lý khẩn cấp<select value={emergencyAuthorizationId} onChange={event => { const id = event.target.value; setEmergencyAuthorizationId(id); const scope = dispute.authorizations.find(item => item.authorizationId === id)?.workScope ?? ""; setWorkScope(scope); setCompletionWorkScopes(current => ({ ...current, [caseId]: scope })); }}><option value="">Chọn ủy quyền</option>{dispute.authorizations.map(item => <option key={item.authorizationId} value={item.authorizationId}>{formatDateTime(item.authorizedAt)} · {item.workScope}</option>)}</select></label>}
                    <label className={styles.formField} htmlFor={`repair-work-scope-${caseId}`}>
                      <span>{M.TECHNICIAN_WORK_SCOPE}</span>
                      <textarea
                        readOnly={dispute.isDisputed}
                        id={`repair-work-scope-${caseId}`}
                        maxLength={2000}
                        disabled={isRefreshing || startRepairWork.isSuccess}
                        onChange={(event) => setWorkScope(event.target.value)}
                        required
                        value={workScope}
                      />
                    </label>
                    {startRepairWork.isError ? (
                      <p className={`${styles.notice} ${styles.error}`} role="alert">{workError(startRepairWork.error)}</p>
                    ) : null}
                    <p className={styles.notice} role="note">{M.TECHNICIAN_COST_DISPUTE_NOTICE}</p>
                    <CaseActions actions={[{ id: "start-repair-work", label: M.TECHNICIAN_START_WORK, variant: "primary", priority: 100, type: "submit", form: "start-repair-work-form", disabled: !workScope.trim() || dispute.isLoading || dispute.isError || (dispute.isDisputed && !selectedAuthorization) || isRefreshing || startRepairWork.isSuccess, disabledReason: "Nhập phạm vi công việc và chọn phê duyệt nếu có tranh chấp chi phí.", pending: startRepairWork.isPending, pendingLabel: M.TECHNICIAN_START_WORKING }]} />
                  </form>
                ) : (
                  <p className={styles.notice} role="status">
                    {repairCase.data.status === "REPAIR_IN_PROGRESS" || repairCompletionCaseReached
                      ? M.TECHNICIAN_STATUS_SYNC_PENDING
                      : repairCase.data.status === "REPLACEMENT_DELIVERED" && replacementDeliveryAcknowledged
                      ? M.PROCESS_WAITING_FOR_TECHNICIAN
                      : !isAssignedTechnician ? M.TECHNICIAN_WAITING_ASSIGNED_TASK
                        : !replacementDeliveryAcknowledged ? M.TECHNICIAN_WAITING_OWNER_ACK
                          : ticket.data?.status !== "ASSIGNED" ? M.TECHNICIAN_WAITING_ASSIGNED_TICKET
                            : M.TECHNICIAN_START_STATUS_CHANGED}
                  </p>
                )}
              </WorkflowStep>

              <WorkflowStep title={M.PROCESS_COMPLETE_REPAIR} compact={compactLayout} status={completeWorkStepState}>
                <p>{M.PROCESS_COMPLETE_REPAIR_DESCRIPTION}</p>
                {completeWorkStepState === "complete" ? (
                  <p className={styles.acknowledged} role="status">{M.TECHNICIAN_WORK_COMPLETION_SUCCESS}</p>
                ) : completeRepairWork.isSuccess ? (
                  <p className={styles.notice} role="status">{M.TECHNICIAN_STATUS_SYNC_PENDING}</p>
                ) : canCompleteWork ? (
                  <form id="complete-repair-work-form" className={styles.assignmentForm} onSubmit={submitCompleteWork}>
                    {dispute.isDisputed && <label className={styles.formField}>Ủy quyền xử lý khẩn cấp<select value={emergencyAuthorizationId} onChange={event => { const id = event.target.value; setEmergencyAuthorizationId(id); const scope = dispute.authorizations.find(item => item.authorizationId === id)?.workScope ?? ""; setWorkScope(scope); setCompletionWorkScopes(current => ({ ...current, [caseId]: scope })); }}><option value="">Chọn ủy quyền</option>{dispute.authorizations.map(item => <option key={item.authorizationId} value={item.authorizationId}>{formatDateTime(item.authorizedAt)} · {item.workScope}</option>)}</select></label>}
                    <p className={styles.notice} role="note"><strong>{M.TECHNICIAN_RECORDED_DIAGNOSIS}:</strong> {ticketDiagnosis}</p>
                    <label className={styles.formField} htmlFor={`repair-completion-scope-${caseId}`}>
                      <span>{M.TECHNICIAN_WORK_SCOPE}</span>
                      <textarea
                        readOnly={dispute.isDisputed}
                        id={`repair-completion-scope-${caseId}`}
                        maxLength={2000}
                        disabled={isRefreshing || completeRepairWork.isSuccess}
                        onChange={(event) => setCompletionWorkScopes((current) => ({ ...current, [caseId]: event.target.value }))}
                        required
                        value={completionWorkScope}
                      />
                    </label>
                    <label className={styles.formField} htmlFor={`repair-resolution-result-${caseId}`}>
                      <span>{M.TECHNICIAN_RESOLUTION_RESULT}</span>
                      <textarea
                        id={`repair-resolution-result-${caseId}`}
                        maxLength={4000}
                        disabled={isRefreshing || completeRepairWork.isSuccess}
                        onChange={(event) => setResolutionResults((current) => ({ ...current, [caseId]: event.target.value }))}
                        required
                        value={resolutionResult}
                      />
                    </label>
                    <label className={styles.formField} htmlFor={`repair-completion-evidence-${caseId}`}>
                      <span>Tệp minh chứng *</span>
                      <input
                        type="file" accept={EVIDENCE_ACCEPT} multiple
                        id={`repair-completion-evidence-${caseId}`}
                        disabled={isRefreshing || completeRepairWork.isSuccess}
                        onChange={(event) => setCompletionEvidenceReferences((current) => ({ ...current, [caseId]: Array.from(event.target.files ?? []) }))}
                        required
                      />
                      <span className={styles.formHint}>{completionEvidenceReferenceText.map((file) => file.name).join(", ")}</span>
                      <span className={styles.formHint}>PDF, JPEG hoặc PNG.</span>
                    </label>
                    <label className={styles.formField} htmlFor={`repair-completion-notes-${caseId}`}>
                      <span>{M.TECHNICIAN_COMPLETION_NOTES}</span>
                      <textarea
                        id={`repair-completion-notes-${caseId}`}
                        maxLength={4000}
                        disabled={isRefreshing || completeRepairWork.isSuccess}
                        onChange={(event) => setCompletionNotes((current) => ({ ...current, [caseId]: event.target.value }))}
                        value={completionNote}
                      />
                    </label>
                    {completeRepairWork.isError ? (
                      <p className={`${styles.notice} ${styles.error}`} role="alert">{workError(completeRepairWork.error)}</p>
                    ) : null}
                    <p className={styles.notice} role="note">{M.TECHNICIAN_COST_DISPUTE_NOTICE}</p>
                    <CaseActions actions={[{ id: "complete-repair-work", label: M.TECHNICIAN_COMPLETION_SUBMIT, variant: "primary", priority: 100, type: "submit", form: "complete-repair-work-form", disabled: !completionWorkScope.trim() || dispute.isLoading || dispute.isError || (dispute.isDisputed && !selectedAuthorization) || !resolutionResult.trim() || Boolean(evidenceFileError(completionEvidenceReferenceText, { min: 1, max: 5 })) || isRefreshing || completeRepairWork.isSuccess, disabledReason: evidenceFileError(completionEvidenceReferenceText, { min: 1, max: 5 }) ?? "Điền phạm vi công việc, kết quả sửa chữa và đính kèm tệp minh chứng. Nếu có tranh chấp chi phí, hãy chọn phương án được duyệt.", pending: completeRepairWork.isPending, pendingLabel: M.TECHNICIAN_COMPLETION_SUBMITTING }]} />
                  </form>
                ) : (
                  <p className={styles.notice} role="status">
                    {repairCase.data.status === "REPAIR_IN_PROGRESS" && !ticketDiagnosis
                      ? M.TECHNICIAN_DIAGNOSIS_DETAILS_UNAVAILABLE
                      : repairCompletionCaseReached ? M.TECHNICIAN_STATUS_SYNC_PENDING
                      : !isAssignedTechnician ? M.TECHNICIAN_WAITING_ASSIGNED_TASK
                        : repairCase.data.status !== "REPAIR_IN_PROGRESS" ? M.PROCESS_COMPLETE_REPAIR_LOCKED
                          : ticket.data?.status !== "IN_PROGRESS" ? M.TECHNICIAN_WAITING_IN_PROGRESS_TICKET
                            : M.TECHNICIAN_COMPLETION_STATUS_CHANGED}
                  </p>
                )}
              </WorkflowStep>

              <WorkflowStep title={M.PROCESS_REPLACEMENT_COLLECTION} compact={compactLayout} status={replacementCollectionStepState}>
                <p>{M.PROCESS_REPLACEMENT_COLLECTION_DESCRIPTION}</p>
                {replacementCollectionEvent ? (
                  <p className={styles.acknowledged} role="status">{`${M.REPLACEMENT_COLLECTION_SUCCESS} ${formatDateTime(replacementCollectionEvent.occurredAt)} · ${replacementCollectionEvent.machineId}`}</p>
                ) : recordReturnCustodyEvent.isSuccess && recordReturnCustodyEvent.variables?.eventType === "REPLACEMENT_COLLECTED" ? (
                  <p className={styles.notice} role="status">{M.CUSTODY_STATUS_SYNC_PENDING}</p>
                ) : canSubmitReplacementCollection ? (
                  <form id="replacement-collection-form" className={styles.assignmentForm} onSubmit={submitReplacementCollection}>
                    <p className={styles.notice} role="note">{`${M.ASSIGNMENT_MACHINE}: ${assignment.data?.replacementMachineId ?? "—"}`}</p>
                    <label className={styles.formField} htmlFor={`replacement-collection-condition-${caseId}`}>
                      <span>{M.REPLACEMENT_COLLECTION_CONDITION}</span>
                      <textarea
                        id={`replacement-collection-condition-${caseId}`}
                        maxLength={2000}
                        disabled={isRefreshing}
                        onChange={(event) => setReplacementCollectionConditions((current) => ({ ...current, [caseId]: event.target.value }))}
                        required
                        value={replacementCollectionCondition}
                      />
                    </label>
                    <label className={styles.formField} htmlFor={`replacement-collection-evidence-${caseId}`}>
                      <span>Tệp minh chứng *</span>
                      <input
                        type="file" accept={EVIDENCE_ACCEPT}
                        id={`replacement-collection-evidence-${caseId}`}
                        aria-describedby={`replacement-collection-evidence-hint-${caseId}`}
                        disabled={isRefreshing}
                        onChange={(event) => setReplacementCollectionEvidenceReferences((current) => ({ ...current, [caseId]: Array.from(event.target.files ?? []) }))}
                        required
                      />
                      <span className={styles.formHint}>{replacementCollectionEvidenceReference.map((file) => file.name).join(", ")}</span>
                      <span className={styles.formHint} id={`replacement-collection-evidence-hint-${caseId}`}>PDF, JPEG hoặc PNG.</span>
                    </label>
                    {recordReturnCustodyEvent.isError && recordReturnCustodyEvent.variables?.eventType === "REPLACEMENT_COLLECTED" ? (
                      <p className={`${styles.notice} ${styles.error}`} role="alert">{getApiErrorMessage(recordReturnCustodyEvent.error)}</p>
                    ) : null}
                    <CaseActions actions={[{ id: "replacement-collection", label: M.REPLACEMENT_COLLECTION_SUBMIT, variant: "primary", priority: 100, type: "submit", form: "replacement-collection-form", disabled: !replacementCollectionCondition.trim() || Boolean(evidenceFileError(replacementCollectionEvidenceReference, { min: 1, max: 1 })) || isRefreshing, disabledReason: evidenceFileError(replacementCollectionEvidenceReference, { min: 1, max: 1 }) ?? "Điền tình trạng máy và đính kèm tệp minh chứng khi thu hồi.", pending: recordReturnCustodyEvent.isPending, pendingLabel: M.REPLACEMENT_COLLECTION_SUBMITTING }]} />
                  </form>
                ) : (
                  <p className={styles.notice} role="status">
                    {!replacementDeliveryAcknowledged ? M.PROCESS_WAITING_FOR_OWNER
                      : role === "owner" ? M.PROCESS_WAITING_FOR_CUSTODY_ACTOR
                        : role === "technician" && !isAssignedTechnician ? M.TECHNICIAN_WAITING_ASSIGNED_TASK
                          : M.PROCESS_COMPLETE_REPAIR_LOCKED}
                  </p>
                )}
              </WorkflowStep>

              <WorkflowStep title={M.PROCESS_REPLACEMENT_COLLECTION_ACKNOWLEDGMENT} compact={compactLayout} status={replacementCollectionAcknowledgmentStepState}>
                <p>{M.PROCESS_REPLACEMENT_COLLECTION_ACKNOWLEDGMENT_DESCRIPTION}</p>
                {replacementCollectionAcknowledged ? (
                  <p className={styles.acknowledged} role="status">{`${M.ACKNOWLEDGED}: ${formatDateTime(replacementCollectionEvent?.ownerAcknowledgedAt)}`}</p>
                ) : replacementCollectionEvent && role === "owner" ? (
                  renderOwnerAcknowledgment(replacementCollectionEvent, M.ACKNOWLEDGMENT_REPLACEMENT_COLLECTED_PROMPT)
                ) : replacementCollectionEvent ? (
                  <p className={styles.notice} role="status">{M.PROCESS_WAITING_FOR_OWNER}</p>
                ) : (
                  <p className={styles.notice} role="status">{M.PROCESS_WAITING_FOR_CUSTODY_ACTOR}</p>
                )}
              </WorkflowStep>

              <WorkflowStep title={M.PROCESS_PRIMARY_RETURN} compact={compactLayout} status={primaryReturnStepState}>
                <p>{M.PROCESS_PRIMARY_RETURN_DESCRIPTION}</p>
                {primaryReturnEvent ? (
                  <p className={styles.acknowledged} role="status">{`${M.PRIMARY_RETURN_SUCCESS} ${formatDateTime(primaryReturnEvent.occurredAt)} · ${primaryReturnEvent.machineId}`}</p>
                ) : recordReturnCustodyEvent.isSuccess && recordReturnCustodyEvent.variables?.eventType === "PRIMARY_RETURNED" ? (
                  <p className={styles.notice} role="status">{M.CUSTODY_STATUS_SYNC_PENDING}</p>
                ) : canSubmitPrimaryReturn ? (
                  <form id="primary-return-form" className={styles.assignmentForm} onSubmit={submitPrimaryReturn}>
                    <p className={styles.notice} role="note">{`${M.PRIMARY_MACHINE}: ${repairCase.data?.primaryMachineId ?? "—"}`}</p>
                    <label className={styles.formField} htmlFor={`primary-return-condition-${caseId}`}>
                      <span>{M.PRIMARY_RETURN_CONDITION}</span>
                      <textarea
                        id={`primary-return-condition-${caseId}`}
                        maxLength={2000}
                        disabled={isRefreshing}
                        onChange={(event) => setPrimaryReturnConditions((current) => ({ ...current, [caseId]: event.target.value }))}
                        required
                        value={primaryReturnCondition}
                      />
                    </label>
                    <label className={styles.formField} htmlFor={`primary-return-evidence-${caseId}`}>
                      <span>Tệp minh chứng *</span>
                      <input
                        type="file" accept={EVIDENCE_ACCEPT}
                        id={`primary-return-evidence-${caseId}`}
                        aria-describedby={`primary-return-evidence-hint-${caseId}`}
                        disabled={isRefreshing}
                        onChange={(event) => setPrimaryReturnEvidenceReferences((current) => ({ ...current, [caseId]: Array.from(event.target.files ?? []) }))}
                        required
                      />
                      <span className={styles.formHint}>{primaryReturnEvidenceReference.map((file) => file.name).join(", ")}</span>
                      <span className={styles.formHint} id={`primary-return-evidence-hint-${caseId}`}>PDF, JPEG hoặc PNG.</span>
                    </label>
                    {recordReturnCustodyEvent.isError && recordReturnCustodyEvent.variables?.eventType === "PRIMARY_RETURNED" ? (
                      <p className={`${styles.notice} ${styles.error}`} role="alert">{getApiErrorMessage(recordReturnCustodyEvent.error)}</p>
                    ) : null}
                    <CaseActions actions={[{ id: "primary-return", label: M.PRIMARY_RETURN_SUBMIT, variant: "primary", priority: 100, type: "submit", form: "primary-return-form", disabled: !primaryReturnCondition.trim() || Boolean(evidenceFileError(primaryReturnEvidenceReference, { min: 1, max: 1 })) || isRefreshing, disabledReason: evidenceFileError(primaryReturnEvidenceReference, { min: 1, max: 1 }) ?? "Điền tình trạng máy và đính kèm tệp minh chứng khi trả máy chính.", pending: recordReturnCustodyEvent.isPending, pendingLabel: M.PRIMARY_RETURN_SUBMITTING }]} />
                  </form>
                ) : (
                  <p className={styles.notice} role="status">
                    {!replacementCollectionAcknowledged ? M.PROCESS_WAITING_FOR_OWNER
                      : role === "owner" ? M.PROCESS_WAITING_FOR_CUSTODY_ACTOR
                        : role === "technician" && !isAssignedTechnician ? M.TECHNICIAN_WAITING_ASSIGNED_TASK
                          : M.PROCESS_WAITING_FOR_OWNER}
                  </p>
                )}
              </WorkflowStep>

              <WorkflowStep title={M.PROCESS_PRIMARY_RETURN_ACKNOWLEDGMENT} compact={compactLayout} status={primaryReturnAcknowledgmentStepState}>
                <p>{M.PROCESS_PRIMARY_RETURN_ACKNOWLEDGMENT_DESCRIPTION}</p>
                {primaryReturnAcknowledged ? (
                  primaryReturnFinalStateConfirmed ? (
                    <p className={styles.acknowledged} role="status">{`${M.ACKNOWLEDGED}: ${formatDateTime(primaryReturnEvent?.ownerAcknowledgedAt)}`}</p>
                  ) : (
                    <p className={styles.notice} role="status">{M.PRIMARY_RETURN_STATUS_SYNC_PENDING}</p>
                  )
                ) : primaryReturnEvent && role === "owner" ? (
                  renderOwnerAcknowledgment(primaryReturnEvent, M.ACKNOWLEDGMENT_PRIMARY_RETURNED_PROMPT)
                ) : primaryReturnEvent ? (
                  <p className={styles.notice} role="status">{M.PROCESS_WAITING_FOR_OWNER}</p>
                ) : (
                  <p className={styles.notice} role="status">{M.PROCESS_WAITING_FOR_CUSTODY_ACTOR}</p>
                )}
              </WorkflowStep>

              <WorkflowStep title={M.PROCESS_RELEASE_ASSIGNMENT} compact={compactLayout} status={releaseStepState}>
                <p>{M.PROCESS_RELEASE_ASSIGNMENT_DESCRIPTION}</p>
                {releaseReadAfterWriteConfirmed ? (
                  <p className={styles.acknowledged} role="status">{`${M.RELEASE_SUCCESS} ${formatDateTime(assignment.data?.releasedAt)}`}</p>
                ) : releaseReplacementAssignment.isSuccess ? (
                  <p className={styles.notice} role="status">{M.RELEASE_STATUS_SYNC_PENDING}</p>
                ) : canSubmitRelease ? (
                  <form id="release-replacement-form" className={styles.assignmentForm} onSubmit={submitReleaseReplacement}>
                    <p className={styles.notice} role="note">{`${M.REPLACEMENT_ASSIGNMENT}: ${assignment.data?.id ?? "—"}`}</p>
                    <p className={styles.notice} role="note">{`${M.PRIMARY_MACHINE}: ${repairCase.data?.primaryMachineId ?? "—"} · ${M.ASSIGNMENT_MACHINE}: ${assignment.data?.replacementMachineId ?? "—"}`}</p>
                    <label className={styles.formField} htmlFor={`release-evidence-${caseId}`}>
                      <span>Tệp minh chứng *</span>
                      <input
                        type="file" accept={EVIDENCE_ACCEPT}
                        id={`release-evidence-${caseId}`}
                        aria-describedby={`release-evidence-hint-${caseId}`}
                        disabled={isRefreshing || releaseReplacementAssignment.isSuccess}
                        onChange={(event) => setReleaseEvidenceReferences((current) => ({ ...current, [caseId]: Array.from(event.target.files ?? []) }))}
                        required
                      />
                      <span className={styles.formHint}>{releaseEvidenceReference.map((file) => file.name).join(", ")}</span>
                      <span className={styles.formHint} id={`release-evidence-hint-${caseId}`}>PDF, JPEG hoặc PNG.</span>
                    </label>
                    {releaseReplacementAssignment.isError ? (
                      <p className={`${styles.notice} ${styles.error}`} role="alert">{getApiErrorMessage(releaseReplacementAssignment.error)}</p>
                    ) : null}
                    <CaseActions actions={[{ id: "release-replacement", label: M.RELEASE_REVIEW_ACTION, variant: "primary", priority: 100, type: "submit", form: "release-replacement-form", disabled: Boolean(evidenceFileError(releaseEvidenceReference, { min: 1, max: 1 })) || isRefreshing || releaseReplacementAssignment.isSuccess, disabledReason: evidenceFileError(releaseEvidenceReference, { min: 1, max: 1 }) ?? "Đính kèm tệp minh chứng để tiếp tục.", pending: releaseReplacementAssignment.isPending, pendingLabel: "Đang xử lý…" }]} />
                  </form>
                ) : (
                  <>
                    <p className={styles.notice} role="status">
                      {role === "owner" && canReleaseReplacement ? M.RELEASE_WAITING_FOR_ACTOR : M.RELEASE_PREREQUISITES_PENDING}
                    </p>
                    {releaseReplacementAssignment.isError ? (
                      <p className={`${styles.notice} ${styles.error}`} role="alert">{getApiErrorMessage(releaseReplacementAssignment.error)}</p>
                    ) : null}
                  </>
                )}
              </WorkflowStep>
            </ol>
            </details>
          </section>

          </div>
          {compactLayout ? (
            <section className={`${styles.technicalDetails} ${styles.adminHistory}`} aria-labelledby="repair-case-history-title">
              <header className={styles.adminHistoryHeader}>
                <h2 id="repair-case-history-title">Lịch sử hồ sơ</h2>
                <nav className={styles.relatedNav} aria-label="Lịch sử hồ sơ">
                  <button type="button" aria-pressed={historyView === "timeline"} onClick={() => setHistoryView("timeline")}>Sự kiện</button>
                  <button type="button" aria-pressed={historyView === "custody"} onClick={() => setHistoryView("custody")}>Bàn giao máy</button>
                </nav>
              </header>
              <div className={styles.adminHistoryContent} role="region" aria-labelledby="repair-case-history-title" aria-live="polite">
                {historyView === "timeline" ? renderTimelineHistory(false) : renderCustodyHistory(false)}
              </div>
            </section>
          ) : (
            <>
              <details className={styles.technicalDetails} open>
                <summary>{M.TIMELINE_TITLE}</summary>
                {renderTimelineHistory()}
              </details>
              <details className={styles.technicalDetails} open>
                <summary>{M.CUSTODY_TITLE}</summary>
                {renderCustodyHistory()}
              </details>
            </>
          )}
        </>
      ))}
      {!relatedOnly && releaseConfirmationOpen ? (
        <NotificationDialog
          variant="confirm"
          title={M.RELEASE_CONFIRM_TITLE}
          description={M.RELEASE_CONFIRM_DESCRIPTION}
          onClose={() => {
            if (!releaseReplacementAssignment.isPending) {
              setReleaseConfirmationDialogs((current) => ({ ...current, [caseId]: false }));
            }
          }}
          primaryAction={{
            label: M.RELEASE_CONFIRM_ACTION,
            pendingLabel: M.RELEASE_CONFIRM_PENDING,
            pending: releaseReplacementAssignment.isPending,
            disabled: !canSubmitRelease || Boolean(evidenceFileError(releaseEvidenceReference, { min: 1, max: 1 })) || isRefreshing,
            onClick: confirmReleaseReplacement,
          }}
          secondaryAction={{
            label: M.RELEASE_CONFIRM_CANCEL,
            disabled: releaseReplacementAssignment.isPending,
            onClick: () => setReleaseConfirmationDialogs((current) => ({ ...current, [caseId]: false })),
          }}
        >
          <p>{`${M.PRIMARY_MACHINE}: ${repairCase.data?.primaryMachineId ?? "—"}`}</p>
          <p>{`${M.ASSIGNMENT_MACHINE}: ${assignment.data?.replacementMachineId ?? "—"}`}</p>
          {releaseReplacementAssignment.isError ? (
            <p className={`${styles.notice} ${styles.error}`} role="alert">{getApiErrorMessage(releaseReplacementAssignment.error)}</p>
          ) : null}
        </NotificationDialog>
      ) : null}
    </div>
  );
}
