import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { repairCasesApi } from "@/apis/repair-cases.api";
import { maintenanceRequestsApi } from "@/apis/maintenance-requests.api";
import { machinesApi } from "@/apis/machines.api";
import { replacementAssignmentsApi } from "@/apis/replacement-assignments.api";
import { ActionBarConfig } from "@/components/action-bar/action-bar";
import { ButtonBar } from "@/components/button/button-bar";
import { BackButtonHeading } from "@/components/navigation/back-button-heading";
import { SectionHeading } from "@/components/heading/section-heading";
import { getApiErrorMessage } from "@/lib/api-errors";
import { RepairCaseIdSchema } from "@/schema/machines.schema";
import { REPAIR_WORKFLOW_MESSAGES as M } from "@/text/repair-workflow/repair-workflow-messages";
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

function eventLabel(eventType: string): string {
  const labels: Record<string, string> = {
    PRIMARY_COLLECTED: "Nhận máy chính",
    REPLACEMENT_DELIVERED: "Giao máy thay thế",
    REPLACEMENT_COLLECTED: "Thu máy thay thế",
    PRIMARY_RETURNED: "Trả máy chính",
  };
  return labels[eventType] ?? eventType.replaceAll("_", " ");
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
}: {
  caseId: string;
  role: RepairWorkflowRole;
  listHref: string;
}) {
  const validCaseId = RepairCaseIdSchema.safeParse(caseId).success;
  const queryClient = useQueryClient();
  const subject = querySubject(role);
  const [timelinePage, setTimelinePage] = useState(0);
  const [custodyPage, setCustodyPage] = useState(0);
  const [acknowledgementTexts, setAcknowledgementTexts] = useState<Record<string, string>>({});
  const [workScopes, setWorkScopes] = useState<Record<string, string>>({});
  const workScope = workScopes[caseId] ?? "";
  const setWorkScope = (value: string) => setWorkScopes((current) => ({ ...current, [caseId]: value }));
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
  const assignment = useQuery({
    queryKey: ["dolores", "repair-workflow", subject, "assignment", request.data?.replacementAssignmentId],
    queryFn: ({ signal }) => replacementAssignmentsApi.getById(request.data!.replacementAssignmentId!, signal),
    enabled: Boolean(request.data?.replacementAssignmentId),
    retry: false,
  });
  const timeline = useQuery({
    queryKey: ["dolores", "repair-workflow", subject, "timeline", caseId, timelinePage, 50],
    queryFn: ({ signal }) => repairCasesApi.getTimeline(caseId, timelinePage, 50, signal),
    enabled: validCaseId && repairCase.isSuccess,
    retry: false,
  });
  const custody = useQuery({
    queryKey: ["dolores", "repair-workflow", subject, "custody", caseId, custodyPage, 50],
    queryFn: ({ signal }) => repairCasesApi.listCustodyEvents(caseId, custodyPage, 50, signal),
    enabled: validCaseId && repairCase.isSuccess,
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
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: ["dolores", "repair-workflow", subject] });
    },
  });
  const startRepairWork = useMutation({
    mutationFn: ({ expectedTicketId, workScope }: { expectedTicketId: string; workScope: string }) => {
      if (role !== "technician" || !isAssignedTechnician) throw new Error(M.TECHNICIAN_WAITING_ASSIGNED_TASK);
      if (repairCase.data?.status !== "DIAGNOSIS") throw new Error(M.TECHNICIAN_DIAGNOSIS_EVIDENCE_REQUIRED);
      if (ticket.data?.status !== "ASSIGNED") throw new Error(M.TECHNICIAN_WAITING_ASSIGNED_TICKET);
      if (!replacementDeliveryAcknowledged) throw new Error(M.TECHNICIAN_WAITING_OWNER_ACK);
      return repairCasesApi.startWork(caseId, expectedTicketId, { workScope });
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: ["dolores", "repair-workflow", subject] });
    },
  });

  const refreshAll = async () => {
    await Promise.all([
      repairCase.refetch(),
      ...(repairCase.data ? [request.refetch(), ticket.refetch(), timeline.refetch(), custody.refetch()] : []),
      ...(request.data?.replacementAssignmentId ? [assignment.refetch()] : []),
    ]);
  };
  const isRefreshing = repairCase.isFetching || request.isFetching || ticket.isFetching || assignment.isFetching || timeline.isFetching || custody.isFetching || acknowledgeCustody.isPending || startRepairWork.isPending;
  const canRecordCustody = role === "admin" || role === "moderator" || role === "technician";
  const canCollectReplacement = repairCase.data?.status === "REPAIR_COMPLETED" &&
    ticket.data?.status === "RESOLVED" && assignment.data?.status === "ACTIVE" && replacementDeliveryAcknowledged;
  const canReturnPrimary = repairCase.data?.status === "REPLACEMENT_COLLECTED" &&
    assignment.data?.status === "ACTIVE" && replacementCollectionAcknowledged;
  const canReleaseReplacement = repairCase.data?.status === "OWNER_ACKNOWLEDGED" &&
    assignment.data?.status === "ACTIVE" && replacementCollectionAcknowledged && primaryReturnAcknowledged;
  const privateEvidenceStepBlocked = canRecordCustody && custody.isSuccess && (
    (repairCase.data?.status === "REPLACEMENT_PLANNED" &&
      assignment.data?.status === "PLANNED" && ticket.data?.status === "ASSIGNED" && !primaryCollectionEvent ||
    repairCase.data?.status === "PRIMARY_COLLECTED" && primaryCollectionAcknowledged && (
      assignment.data?.status === "PLANNED" ||
      assignment.data?.status === "ACTIVE" && !replacementDeliveredEvent
    )) ||
    canCollectReplacement && !replacementCollectionEvent ||
    canReturnPrimary && !primaryReturnEvent
  );
  const ownerWaitingForHandover = role === "owner" && (
    repairCase.data?.status === "REPLACEMENT_PLANNED" && !primaryCollectionEvent ||
    repairCase.data?.status === "PRIMARY_COLLECTED" && primaryCollectionAcknowledged && !replacementDeliveredEvent
  );
  const ownerWaitingForReplacementCollection = role === "owner" && canCollectReplacement && !replacementCollectionEvent;
  const ownerWaitingForPrimaryReturn = role === "owner" && canReturnPrimary && !primaryReturnEvent;
  const ownerWaitingForRelease = role === "owner" && canReleaseReplacement;
  const releaseEvidenceStepBlocked = canRecordCustody && custody.isSuccess && canReleaseReplacement;
  const canStartWork = isAssignedTechnician &&
    repairCase.data?.status === "DIAGNOSIS" &&
    ticket.data?.status === "ASSIGNED" &&
    Boolean(ticket.data?.id) &&
    replacementDeliveryAcknowledged;

  const submitAcknowledgement = (event: FormEvent<HTMLFormElement>, eventId: string) => {
    event.preventDefault();
    const acknowledgement = acknowledgementTexts[eventId]?.trim();
    if (role !== "owner" || !acknowledgement || acknowledgement.length > 1000 || acknowledgeCustody.isPending) return;
    acknowledgeCustody.mutate({ eventId, acknowledgement });
  };
  const submitStartWork = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!validCaseId || !canStartWork || !ticket.data?.id || !workScope.trim() || startRepairWork.isPending || startRepairWork.isSuccess) return;
    startRepairWork.mutate({ expectedTicketId: ticket.data.id, workScope: workScope.trim() });
  };

  if (!validCaseId) {
    return <div className={styles.screen}><p className={`${styles.notice} ${styles.error}`} role="alert">{M.INVALID_CASE_ID}</p></div>;
  }

  return (
    <div className={styles.screen}>
      <BackButtonHeading
        className={styles.heading}
        title={M.CASE_DETAIL_TITLE}
        titleId="repair-case-detail-title"
        description={M.CASE_DETAIL_DESCRIPTION}
        back={{ label: "Quay lại danh sách", fallbackHref: listHref }}
      />
      <ActionBarConfig>
        <ButtonBar type="button" disabled={isRefreshing} onClick={() => void refreshAll()}>
          {isRefreshing ? M.CASE_REFRESHING : M.CASE_REFRESH}
        </ButtonBar>
      </ActionBarConfig>

      {repairCase.isPending ? <p className={styles.notice} role="status">{M.CASE_LOADING}</p> : null}
      {repairCase.isError ? <QueryError label={M.CASE_NOT_FOUND} error={repairCase.error} onRetry={() => void repairCase.refetch()} /> : null}
      {repairCase.data ? (
        <>
          <section className={styles.panel} aria-label="Thông tin hồ sơ">
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

          <section className={styles.panel} aria-label="Công việc liên quan">
            <SectionHeading title="Công việc liên quan" description="Các mã liên kết và trạng thái hiện tại của ticket, máy thay thế." />
            {ticket.isError ? <QueryError label={M.MAINTENANCE_TICKET} error={ticket.error} onRetry={() => void ticket.refetch()} /> : null}
            {request.isError ? <QueryError label={M.REQUEST} error={request.error} onRetry={() => void request.refetch()} /> : null}
            {assignment.isError ? <QueryError label={M.REPLACEMENT_ASSIGNMENT} error={assignment.error} onRetry={() => void assignment.refetch()} /> : null}
            <dl className={styles.detailGrid}>
              <DetailValue label={M.MAINTENANCE_TICKET} value={repairCase.data.maintenanceTicketId ?? "—"} code />
              <DetailValue label={M.TICKET_STATUS} value={
                !repairCase.data.maintenanceTicketId ? "—" : ticket.isPending ? "Đang tải…" : ticketStatusLabel(ticket.data?.status)
              } />
              <DetailValue label={M.REPLACEMENT_ASSIGNMENT} value={
                request.isPending ? "Đang tải…" : request.data?.replacementAssignmentId ?? "—"
              } code />
              <DetailValue label={M.ASSIGNMENT_STATUS} value={
                request.isPending ? "Đang tải…" : !request.data?.replacementAssignmentId ? "—" : assignment.isPending ? "Đang tải…" : assignmentStatusLabel(assignment.data?.status)
              } />
              <DetailValue label={M.ASSIGNMENT_MACHINE} value={assignment.data?.replacementMachineId ?? "—"} code />
              <DetailValue label={M.START_AT} value={formatDateTime(assignment.data?.startAt)} />
              <DetailValue label={M.END_AT} value={formatDateTime(assignment.data?.endAt)} />
            </dl>
          </section>

          {role === "technician" && ["REPLACEMENT_DELIVERED", "DIAGNOSIS", "REPAIR_IN_PROGRESS"].includes(repairCase.data.status) ? (
            <section className={styles.panel} aria-label={M.TECHNICIAN_ACTIONS}>
              <SectionHeading title={M.TECHNICIAN_ACTIONS} description={M.TECHNICIAN_ACTIONS_DESCRIPTION} />
              {startRepairWork.isSuccess ? (
                <p className={styles.notice} role="status">{M.TECHNICIAN_WORK_START_SUCCESS}</p>
              ) : null}
              {repairCase.data.status === "REPLACEMENT_DELIVERED" ? (
                !replacementDeliveryAcknowledged ? (
                  <p className={styles.notice} role="status">{M.TECHNICIAN_WAITING_OWNER_ACK}</p>
                ) : isAssignedTechnician ? (
                  <p className={styles.notice} role="note">{M.TECHNICIAN_DIAGNOSIS_EVIDENCE_REQUIRED}</p>
                ) : (
                  <p className={styles.notice} role="status">{M.TECHNICIAN_WAITING_ASSIGNED_TASK}</p>
                )
              ) : null}
              {repairCase.data.status === "DIAGNOSIS" ? (
                canStartWork ? (
                  <form className={styles.assignmentForm} onSubmit={submitStartWork}>
                    <label className={styles.formField} htmlFor="repair-work-scope">
                      <span>{M.TECHNICIAN_WORK_SCOPE}</span>
                      <textarea
                        id="repair-work-scope"
                        maxLength={2000}
                        onChange={(event) => setWorkScope(event.target.value)}
                        required
                        value={workScope}
                      />
                    </label>
                    {startRepairWork.isError ? (
                      <p className={`${styles.notice} ${styles.error}`} role="alert">{getApiErrorMessage(startRepairWork.error)}</p>
                    ) : null}
                    <p className={styles.notice} role="note">{M.TECHNICIAN_COST_DISPUTE_NOTICE}</p>
                    <button className={styles.inlineButton} disabled={!workScope.trim() || startRepairWork.isPending || startRepairWork.isSuccess} type="submit">
                      {startRepairWork.isPending ? M.TECHNICIAN_START_WORKING : M.TECHNICIAN_START_WORK}
                    </button>
                  </form>
                ) : !isAssignedTechnician ? (
                  <p className={styles.notice} role="status">{M.TECHNICIAN_WAITING_ASSIGNED_TASK}</p>
                ) : !replacementDeliveryAcknowledged ? (
                  <p className={styles.notice} role="status">{M.TECHNICIAN_WAITING_OWNER_ACK}</p>
                ) : ticket.data?.status !== "ASSIGNED" ? (
                  <p className={styles.notice} role="status">{M.TECHNICIAN_WAITING_ASSIGNED_TICKET}</p>
                ) : !ticket.data?.id ? (
                  <p className={styles.notice} role="status">{M.TECHNICIAN_TICKET_DETAILS_UNAVAILABLE}</p>
                ) : (
                  <p className={styles.notice} role="status">{M.TECHNICIAN_WAITING_ASSIGNED_TASK}</p>
                )
              ) : null}
              {repairCase.data.status === "REPAIR_IN_PROGRESS" ? (
                isAssignedTechnician
                  ? <p className={styles.notice} role="note">{M.TECHNICIAN_COMPLETION_EVIDENCE_REQUIRED}</p>
                  : <p className={styles.notice} role="status">{M.TECHNICIAN_WAITING_ASSIGNED_TASK}</p>
              ) : null}
            </section>
          ) : null}

          <section className={styles.panel} aria-label={M.TIMELINE_TITLE}>
            <SectionHeading title={M.TIMELINE_TITLE} description="Sự kiện RepairCase được sắp theo thời điểm." />
            {timeline.isPending ? <p className={styles.notice} role="status">{M.TIMELINE_LOADING}</p> : null}
            {timeline.isError ? <QueryError label={M.TIMELINE_ERROR} error={timeline.error} onRetry={() => void timeline.refetch()} /> : null}
            {timeline.data?.content.length === 0 ? <p className={styles.notice} role="status">{M.TIMELINE_EMPTY}</p> : null}
            {timeline.data && timeline.data.content.length > 0 ? (
              <ol className={styles.timeline} aria-label={M.TIMELINE_TITLE}>
                {timeline.data.content.map((event) => (
                  <li className={styles.timelineItem} key={event.id}>
                    <strong>{event.eventType.replaceAll("_", " ")}</strong>
                    <p>{event.reason || event.details || "—"}</p>
                    <span>{formatDateTime(event.occurredAt)} · {event.actorRole}{event.actorId ? ` · ${event.actorId}` : ""}</span>
                  </li>
                ))}
              </ol>
            ) : null}
            {timeline.data && timeline.data.totalPages > 1 ? (
              <nav className={styles.pagination} aria-label="Phân trang dòng thời gian">
                <button className={styles.inlineButton} type="button" disabled={timeline.data.first || timeline.isFetching} onClick={() => setTimelinePage((current) => Math.max(0, current - 1))}>{M.PREVIOUS}</button>
                <span>{M.PAGE} {timeline.data.number + 1} / {timeline.data.totalPages}</span>
                <button className={styles.inlineButton} type="button" disabled={timeline.data.last || timeline.isFetching} onClick={() => setTimelinePage((current) => current + 1)}>{M.NEXT}</button>
              </nav>
            ) : null}
          </section>

          <section className={styles.panel} aria-label={M.CUSTODY_TITLE}>
            <SectionHeading title={M.CUSTODY_TITLE} description="Biên nhận bàn giao và xác nhận của Owner được lưu riêng với các sự kiện trạng thái." />
            {privateEvidenceStepBlocked ? <p className={styles.notice} role="status">{M.PRIVATE_EVIDENCE_SOURCE_REQUIRED}</p> : null}
            {ownerWaitingForHandover ? <p className={styles.notice} role="status">{M.WAITING_FOR_OPERATOR}</p> : null}
            {ownerWaitingForReplacementCollection ? <p className={styles.notice} role="status">{M.WAITING_FOR_REPLACEMENT_COLLECTION}</p> : null}
            {ownerWaitingForPrimaryReturn ? <p className={styles.notice} role="status">{M.WAITING_FOR_PRIMARY_RETURN}</p> : null}
            {ownerWaitingForRelease ? <p className={styles.notice} role="status">{M.OWNER_WAITING_RELEASE}</p> : null}
            {releaseEvidenceStepBlocked ? <p className={styles.notice} role="status">{M.PRIVATE_EVIDENCE_RELEASE_REQUIRED}</p> : null}
            {custody.isPending ? <p className={styles.notice} role="status">{M.CUSTODY_LOADING}</p> : null}
            {custody.isError ? <QueryError label={M.CUSTODY_ERROR} error={custody.error} onRetry={() => void custody.refetch()} /> : null}
            {custody.data?.items.length === 0 ? <p className={styles.notice} role="status">{M.CUSTODY_EMPTY}</p> : null}
            {custody.data && custody.data.items.length > 0 ? (
              <ol className={styles.timeline} aria-label={M.CUSTODY_TITLE}>
                {custody.data.items.map((event) => {
                  const canAcknowledgeEvent = role === "owner" && !event.ownerAcknowledgedAt && (
                    event.eventType === "PRIMARY_COLLECTED" ||
                    event.eventType === "REPLACEMENT_DELIVERED" && primaryCollectionAcknowledged ||
                    event.eventType === "REPLACEMENT_COLLECTED" && replacementDeliveryAcknowledged ||
                    event.eventType === "PRIMARY_RETURNED" && replacementCollectionAcknowledged
                  );
                  const acknowledgementPending = acknowledgeCustody.isPending && acknowledgeCustody.variables?.eventId === event.id;
                  const acknowledgementPrompt = event.eventType === "PRIMARY_COLLECTED"
                    ? M.ACKNOWLEDGMENT_PRIMARY_PROMPT
                    : event.eventType === "REPLACEMENT_DELIVERED"
                      ? M.ACKNOWLEDGMENT_REPLACEMENT_PROMPT
                      : event.eventType === "REPLACEMENT_COLLECTED"
                        ? M.ACKNOWLEDGMENT_REPLACEMENT_COLLECTED_PROMPT
                        : M.ACKNOWLEDGMENT_PRIMARY_RETURNED_PROMPT;

                  return (
                    <li className={styles.timelineItem} key={event.id}>
                      <strong>{eventLabel(event.eventType)}</strong>
                      <p>{event.conditionNotes || "—"}</p>
                      <span>{formatDateTime(event.occurredAt)} · {event.actorRole} · {event.machineId}</span>
                      <span className={event.ownerAcknowledgedAt ? styles.acknowledged : styles.waitingAcknowledgment}>
                        {event.ownerAcknowledgedAt
                          ? `${M.ACKNOWLEDGED}: ${formatDateTime(event.ownerAcknowledgedAt)}${event.ownerAcknowledgement ? ` · ${event.ownerAcknowledgement}` : ""}`
                          : M.AWAITING_ACKNOWLEDGMENT}
                      </span>
                      {canAcknowledgeEvent ? (
                        <>
                          <p>{acknowledgementPrompt}</p>
                          {acknowledgeCustody.isError && acknowledgeCustody.variables?.eventId === event.id ? (
                            <p className={`${styles.notice} ${styles.error}`} role="alert">{getApiErrorMessage(acknowledgeCustody.error)}</p>
                          ) : null}
                          <form className={styles.assignmentForm} onSubmit={(formEvent) => submitAcknowledgement(formEvent, event.id)}>
                            <label className={styles.formField} htmlFor={`custody-acknowledgement-${event.id}`}>
                              <span>{M.ACKNOWLEDGMENT_TEXT}</span>
                              <textarea
                                id={`custody-acknowledgement-${event.id}`}
                                maxLength={1000}
                                onChange={(inputEvent) => setAcknowledgementTexts((current) => ({
                                  ...current,
                                  [event.id]: inputEvent.target.value,
                                }))}
                                required
                                value={acknowledgementTexts[event.id] ?? ""}
                              />
                            </label>
                            <button
                              className={styles.inlineButton}
                              disabled={!acknowledgementTexts[event.id]?.trim() || acknowledgeCustody.isPending}
                              type="submit"
                            >
                              {acknowledgementPending ? M.ACKNOWLEDGMENT_SUBMITTING : M.ACKNOWLEDGMENT_SUBMIT}
                            </button>
                          </form>
                        </>
                      ) : null}
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
          </section>
        </>
      ) : null}
    </div>
  );
}
