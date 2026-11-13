import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { machinesApi } from "@/apis/machines.api";
import { maintenanceRequestsApi } from "@/apis/maintenance-requests.api";
import { profilesApi } from "@/apis/profiles.api";
import { repairCasesApi } from "@/apis/repair-cases.api";
import { BackButtonHeading } from "@/components/navigation/back-button-heading";
import { querySubject, type RepairWorkflowRole } from "./repair-workflow-query-identity";
import { getApiErrorMessage } from "@/lib/api-errors";
import { MaintenanceRequestIdSchema } from "@/schema/machines.schema";
import { ProfileIdSchema } from "@/schema/profiles.schema";
import { MODERATOR_MESSAGES } from "@/text/moderator/moderator-messages";
import { createIdempotencyKey } from "@/lib/idempotency-key";
import styles from "./repair-workflow.module.css";
import { RepairWorkflowPagination } from "./repair-workflow-pagination";

import { maintenanceRequestStatusLabel, maintenanceTicketStatusLabel } from "@/components/features/maintenance-workflow/maintenance-status-labels";

const messages = MODERATOR_MESSAGES.READ_SCREENS;
const TECHNICIAN_PAGE_SIZE = 10;

export function MaintenanceRequestAssignmentScreen({
  requestId,
  listHref,
  role,
}: {
  requestId: string;
  listHref: string;
  role: Extract<RepairWorkflowRole, "admin" | "moderator">;
}) {
  const validId = MaintenanceRequestIdSchema.safeParse(requestId).success;
  const queryClient = useQueryClient();
  const [replacementMachineId, setReplacementMachineId] = useState("");
  const [machinePage, setMachinePage] = useState(0);
  const [startAt, setStartAt] = useState("");
  const [endAt, setEndAt] = useState("");
  const [reason, setReason] = useState("");
  const [idempotencyKey, setIdempotencyKey] = useState("");
  const [correlationId, setCorrelationId] = useState("");
  const idempotencyKeyRef = useRef<string | null>(null);
  const [technicianId, setTechnicianId] = useState("");
  const [technicianSearchInput, setTechnicianSearchInput] = useState("");
  const [technicianSearch, setTechnicianSearch] = useState("");
  const [technicianPage, setTechnicianPage] = useState(0);
  const isAdmin = role === "admin";

  useEffect(() => {
    if (!idempotencyKeyRef.current) {
      const initialIdempotencyKey = createIdempotencyKey();
      idempotencyKeyRef.current = initialIdempotencyKey;
      setIdempotencyKey(initialIdempotencyKey);
    }
    setCorrelationId(createIdempotencyKey());
  }, []);
  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setTechnicianSearch(technicianSearchInput.trim());
      setTechnicianPage(0);
    }, 250);
    return () => window.clearTimeout(timeoutId);
  }, [technicianSearchInput]);
  const requestsQuery = useQuery({
    queryKey: ["dolores", "maintenance-requests", querySubject(role), "detail", requestId],
    queryFn: ({ signal }) => maintenanceRequestsApi.getById(requestId, signal),
    enabled: validId,
    retry: false,
  });
  const request = requestsQuery.data;
  const ticketId = request?.maintenanceTicketId ?? "";
  const ticketQuery = useQuery({
    queryKey: ["dolores", "repair-workflow", querySubject(role), "ticket", ticketId],
    queryFn: ({ signal }) => machinesApi.getMaintenanceTicketById(ticketId, signal),
    enabled: validId && Boolean(ticketId),
    retry: false,
  });
  const repairCasesQuery = useQuery({
    queryKey: ["dolores", "repair-case-references", querySubject(role), requestId, request?.machineId],
    queryFn: ({ signal }) => repairCasesApi.findReferenceByMaintenanceRequestId(requestId, request!.machineId, signal),
    enabled: validId && Boolean(request?.machineId),
    retry: false,
  });
  const repairCase = repairCasesQuery.data;
  const replacementAlreadyPlanned = repairCase?.status === "REPLACEMENT_PLANNED";
  const replacementAlreadyAssigned = Boolean(request?.replacementAssignmentId) || replacementAlreadyPlanned;
  const machinesQuery = useQuery({
    queryKey: ["dolores", "machines", querySubject(role), "replacement-candidates"],
    queryFn: ({ signal }) => machinesApi.list(signal),
    enabled: validId && request?.status === "TRIAGED" && !replacementAlreadyAssigned,
    retry: false,
  });
  const techniciansQuery = useQuery({
    queryKey: ["dolores", "profiles", querySubject(role), "TECHNICIAN", "ACTIVE", technicianSearch, technicianPage, TECHNICIAN_PAGE_SIZE],
    queryFn: ({ signal }) => profilesApi.list(
      { role: "TECHNICIAN", status: "ACTIVE", q: technicianSearch || undefined, page: technicianPage, size: TECHNICIAN_PAGE_SIZE },
      signal,
    ),
    enabled: isAdmin && validId && Boolean(ticketId) && ticketQuery.isSuccess && !request?.technicianId && !ticketQuery.data?.assignedTechnicianId && request?.requestType === "REPAIR" && (request.status === "TRIAGED" || replacementAlreadyAssigned),
    retry: false,
  });
  const replacementMutation = useMutation({
    mutationFn: ({ caseId, replacementMachineId: machineId, ...body }: {
      caseId: string;
      replacementMachineId: string;
      startAt: string;
      endAt: string;
      reason: string;
      idempotencyKey: string;
      correlationId: string;
    }) => repairCasesApi.createReplacementAssignment(caseId, { replacementMachineId: machineId, ...body }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["dolores", "maintenance-requests"] }),
        queryClient.invalidateQueries({ queryKey: ["dolores", "repair-case-references"] }),
      ]);
    },
  });
  const ticketAssignmentMutation = useMutation({
    mutationFn: ({ ticketId, selectedTechnicianId, assignedTo }: {
      ticketId: string;
      selectedTechnicianId: string;
      assignedTo: string;
    }) => {
      if (!isAdmin) throw new Error(messages.TECHNICAL_ASSIGNMENT_ADMIN_REQUIRED);
      return machinesApi.assignMaintenanceTicket(ticketId, {
        technicianId: ProfileIdSchema.parse(selectedTechnicianId),
        assignedTo,
      });
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["dolores", "maintenance-requests"] }),
        queryClient.invalidateQueries({ queryKey: ["dolores", "maintenance-tickets"] }),
        queryClient.invalidateQueries({ queryKey: ["dolores", "repair-workflow", querySubject(role), "ticket", ticketId] }),
      ]);
    },
  });

  const eligibleTechnicians = techniciansQuery.data?.items.filter((profile) =>
    profile.status === "ACTIVE" && profile.emailVerified && profile.roles.includes("TECHNICIAN"),
  ) ?? [];
  const selectedTechnician = eligibleTechnicians.find((item) => item.idaasUserId === technicianId);
  const replacementMachines = (machinesQuery.data ?? []).filter((machine) =>
    machine.id !== request?.machineId &&
    (machine.status === "IN_WAREHOUSE" || machine.status === "AVAILABLE_FOR_RENT"),
  );
  const replacementStepComplete = replacementAlreadyAssigned || replacementMutation.isSuccess;
  const assignmentWorkflowReady = request?.requestType === "REPAIR" && (request.status === "TRIAGED" || replacementStepComplete);
  const assignmentComplete = Boolean(request?.technicianId || ticketQuery.data?.assignedTechnicianId) || ticketAssignmentMutation.isSuccess;
  const ticketAssignedTechnicianId = ticketQuery.data?.assignedTechnicianId ?? request?.technicianId ?? "";

  const resetIdempotencyKey = () => {
    const nextKey = createIdempotencyKey();
    idempotencyKeyRef.current = nextKey;
    setIdempotencyKey(nextKey);
  };

  const handleReplacementPayloadEdit = () => {
    resetIdempotencyKey();
    if (replacementMutation.isError) replacementMutation.reset();
  };

  const submitReplacementAssignment = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const currentIdempotencyKey = idempotencyKeyRef.current;
    if (!startAt || !endAt || Date.parse(endAt) < Date.parse(startAt)) return;
    if (
      !repairCase ||
      !replacementMachineId ||
      !reason.trim() ||
      !currentIdempotencyKey ||
      !correlationId ||
      replacementMutation.isPending ||
      !assignmentWorkflowReady ||
      replacementAlreadyAssigned
    ) return;
    replacementMutation.mutate({
      caseId: repairCase.id,
      replacementMachineId,
      startAt: new Date(startAt).toISOString(),
      endAt: new Date(endAt).toISOString(),
      reason: reason.trim(),
      idempotencyKey: currentIdempotencyKey,
      correlationId,
    });
  };

  const submitTicketAssignment = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (
      !isAdmin ||
      !ticketId ||
      ticketQuery.isPending ||
      ticketQuery.isError ||
      !ticketQuery.data ||
      Boolean(request?.technicianId) ||
      Boolean(ticketQuery.data.assignedTechnicianId) ||
      !selectedTechnician ||
      !replacementStepComplete ||
      ticketAssignmentMutation.isPending
    ) return;
    ticketAssignmentMutation.mutate({
      ticketId,
      selectedTechnicianId: selectedTechnician.idaasUserId,
      assignedTo: selectedTechnician.fullName || selectedTechnician.email || selectedTechnician.idaasUserId,
    });
  };

  return (
    <div className={styles.pageContent} data-screen="assignment">
      <BackButtonHeading
        title={messages.TECHNICAL_ASSIGNMENT_TITLE}
        titleId="maintenance-request-assignment-title"
        description={messages.TECHNICAL_ASSIGNMENT_DESCRIPTION}
        className={styles.pageHeading}
        back={{ label: "Quay lại danh sách yêu cầu", fallbackHref: listHref }}
      />
      {!validId && <p className={styles.pendingNotice} role="alert">{messages.TECHNICAL_DETAIL_UNAVAILABLE}</p>}
      {validId && requestsQuery.isPending && <p className={styles.pendingNotice} role="status">{messages.LOADING_MAINTENANCE_REQUESTS}</p>}
      {validId && requestsQuery.isError && <p className={styles.pendingNotice} role="alert">{getApiErrorMessage(requestsQuery.error)}</p>}
      {validId && requestsQuery.isSuccess && !request && <p className={styles.pendingNotice} role="status">{messages.TECHNICAL_DETAIL_UNAVAILABLE}</p>}
      {request && !assignmentComplete && !assignmentWorkflowReady && (
        <p className={styles.pendingNotice} role="status">{messages.TECHNICAL_ASSIGNMENT_NOT_READY}</p>
      )}
      {request && assignmentComplete && (
        <section className={styles.pendingNotice} role="status" aria-label={messages.TECHNICAL_ASSIGNMENT_SUCCESS}>
          <p>{ticketAssignmentMutation.isSuccess ? messages.TECHNICAL_ASSIGNMENT_SUCCESS : messages.TECHNICAL_ASSIGNMENT_ALREADY_ASSIGNED}</p>
          <dl className={styles.detailGrid}>
            <div className={styles.detailItem}>
              <dt>{messages.TECHNICAL_ASSIGNMENT_REQUEST_STATUS}</dt>
              <dd><span className={styles.requestStatus} data-status={request.status}>{maintenanceRequestStatusLabel(request.status)}</span></dd>
            </div>
            <div className={styles.detailItem}>
              <dt>{messages.TECHNICAL_ASSIGNMENT_CASE_STATUS}</dt>
              <dd>{repairCase?.status ?? "—"}</dd>
            </div>
            <div className={styles.detailItem}>
              <dt>{messages.TECHNICAL_ASSIGNMENT_REPLACEMENT_STATUS}</dt>
              <dd>{repairCasesQuery.isPending || repairCasesQuery.isError ? "—" : replacementAlreadyPlanned ? messages.TECHNICAL_ASSIGNMENT_REPLACEMENT_PLANNED : request.replacementAssignmentId ? messages.TECHNICAL_ASSIGNMENT_REPLACEMENT_ASSIGNED : messages.TECHNICAL_ASSIGNMENT_REPLACEMENT_NOT_ASSIGNED}</dd>
            </div>
            <div className={styles.detailItem}>
              <dt>{messages.TECHNICAL_ASSIGNMENT_TICKET_STATUS}</dt>
              <dd>{ticketQuery.data?.status
                ? <span className={styles.requestStatus} data-status={ticketQuery.data.status}>{maintenanceTicketStatusLabel(ticketQuery.data.status)}</span>
                : ticketQuery.isPending ? messages.TECHNICAL_ASSIGNMENT_TICKET_LOADING : "—"}</dd>
            </div>
            <div className={styles.detailItem}>
              <dt>{messages.TECHNICAL_ASSIGNMENT_ASSIGNEE}</dt>
              <dd className={styles.codeValue}>{ticketAssignedTechnicianId || "—"}</dd>
            </div>
          </dl>
        </section>
      )}

      {assignmentWorkflowReady && (
        <>
          <details className={styles.technicalDetails}><summary>Thông tin yêu cầu &amp; mã liên kết</summary>
          <dl className={styles.detailGrid}>
            <div className={styles.detailItem}>
              <dt>{messages.TECHNICAL_ID}</dt>
              <dd className={styles.codeValue}>{request.id}</dd>
            </div>
            <div className={styles.detailItem}>
              <dt>{messages.TECHNICAL_MACHINE_ID}</dt>
              <dd className={styles.codeValue}>{request.machineId}</dd>
            </div>
            <div className={styles.detailItem}>
              <dt>{messages.TECHNICAL_ASSIGNMENT_TICKET_ID}</dt>
              <dd className={styles.codeValue}>{ticketId || "—"}</dd>
            </div>
            <div className={styles.detailItem}>
              <dt>{messages.TECHNICAL_ASSIGNMENT_CASE_ID}</dt>
              <dd className={styles.codeValue}>{repairCase?.id ?? "—"}</dd>
            </div>
            <div className={styles.detailItem}>
              <dt>{messages.TECHNICAL_ASSIGNMENT_CASE_STATUS}</dt>
              <dd>{repairCase?.status ?? "—"}</dd>
            </div>
          </dl></details>


          <dl className={styles.detailGrid}>
            <div className={styles.detailItem}>
              <dt>{messages.TECHNICAL_ASSIGNMENT_REQUEST_STATUS}</dt>
              <dd><span className={styles.requestStatus} data-status={request.status}>{maintenanceRequestStatusLabel(request.status)}</span></dd>
            </div>
            <div className={styles.detailItem}>
              <dt>{messages.TECHNICAL_ASSIGNMENT_REPLACEMENT_STATUS}</dt>
              <dd>{repairCasesQuery.isPending || repairCasesQuery.isError ? "—" : replacementAlreadyPlanned ? messages.TECHNICAL_ASSIGNMENT_REPLACEMENT_PLANNED : request.replacementAssignmentId ? messages.TECHNICAL_ASSIGNMENT_REPLACEMENT_ASSIGNED : messages.TECHNICAL_ASSIGNMENT_REPLACEMENT_NOT_ASSIGNED}</dd>
            </div>
            <div className={styles.detailItem}>
              <dt>{messages.TECHNICAL_ASSIGNMENT_TICKET_STATUS}</dt>
              <dd>{ticketQuery.data?.status
                ? <span className={styles.requestStatus} data-status={ticketQuery.data.status}>{maintenanceTicketStatusLabel(ticketQuery.data.status)}</span>
                : ticketQuery.isPending ? messages.TECHNICAL_ASSIGNMENT_TICKET_LOADING : "—"}</dd>
            </div>
            <div className={styles.detailItem}>
              <dt>{messages.TECHNICAL_ASSIGNMENT_ASSIGNEE}</dt>
              <dd className={styles.codeValue}>{ticketAssignedTechnicianId || "—"}</dd>
            </div>
          </dl>

          {repairCasesQuery.isPending && <p className={styles.pendingNotice} role="status">{messages.TECHNICAL_ASSIGNMENT_CASES_LOADING}</p>}
          {repairCasesQuery.isError && <p className={styles.pendingNotice} role="alert">{getApiErrorMessage(repairCasesQuery.error)}</p>}
          {repairCasesQuery.isSuccess && !repairCase && <p className={styles.pendingNotice} role="alert">{messages.TECHNICAL_ASSIGNMENT_NO_CASE}</p>}
          {ticketQuery.isError && (
            <div className={styles.pendingNotice} role="alert">
              <p>{getApiErrorMessage(ticketQuery.error)}</p>
              <button className={styles.retryButton} type="button" onClick={() => void ticketQuery.refetch()}>{messages.RETRY}</button>
            </div>
          )}
          {machinesQuery.isError && <p className={styles.pendingNotice} role="alert">{getApiErrorMessage(machinesQuery.error)}</p>}
          {techniciansQuery.isError && <p className={styles.pendingNotice} role="alert">{getApiErrorMessage(techniciansQuery.error)}</p>}
          {replacementMutation.isError && <p className={styles.pendingNotice} role="alert">{getApiErrorMessage(replacementMutation.error)}</p>}
          {ticketAssignmentMutation.isError && <p className={styles.pendingNotice} role="alert">{getApiErrorMessage(ticketAssignmentMutation.error)}</p>}
          {replacementMutation.isSuccess && <p className={styles.pendingNotice} role="status">{messages.TECHNICAL_ASSIGNMENT_MACHINE_SUCCESS}</p>}
          {ticketAssignmentMutation.isSuccess && <p className={styles.pendingNotice} role="status">{messages.TECHNICAL_ASSIGNMENT_SUCCESS}</p>}

          <div className={styles.assignmentColumns}>
          <section className={styles.formPanel} aria-labelledby="replacement-assignment-step-title">
            <h2 className={styles.sectionTitle} id="replacement-assignment-step-title">{messages.TECHNICAL_ASSIGNMENT_MACHINE_STEP}</h2>
            {replacementAlreadyAssigned ? (
              <p className={styles.pendingNotice} role="status">
                {replacementAlreadyPlanned ? messages.TECHNICAL_ASSIGNMENT_MACHINE_ALREADY_PLANNED : messages.TECHNICAL_ASSIGNMENT_MACHINE_SUCCESS}
              </p>
            ) : replacementMutation.isSuccess ? null : (
              <form className={styles.assignmentForm} onSubmit={submitReplacementAssignment}>
                <label className={styles.formField} htmlFor="replacement-machine-id">
                  <span>{messages.TECHNICAL_ASSIGNMENT_MACHINE}</span>
                  <select
                    id="replacement-machine-id"
                    disabled={machinesQuery.isPending || machinesQuery.isError || replacementMachines.length === 0 || replacementMutation.isPending}
                    onChange={(event) => {
                      handleReplacementPayloadEdit();
                      setReplacementMachineId(event.target.value);
                    }}
                    required
                    value={replacementMachineId}
                  >
                    <option value="">{machinesQuery.isPending ? messages.TECHNICAL_ASSIGNMENT_MACHINES_LOADING : messages.TECHNICAL_ASSIGNMENT_MACHINE}</option>
                    {replacementMachines.slice(machinePage * 10, (machinePage + 1) * 10).map((machine) => (
                      <option key={machine.id} value={machine.id}>
                        {[machine.serialNumber, machine.machineType, machine.id].filter(Boolean).join(" · ")}
                      </option>
                    ))}
                  </select>
                </label>
                <RepairWorkflowPagination page={machinePage} hasNext={(machinePage + 1) * 10 < replacementMachines.length}
                  isFetching={machinesQuery.isFetching || replacementMutation.isPending} ariaLabel="Phân trang máy thay thế"
                  onPageChange={(page) => { setMachinePage(page); handleReplacementPayloadEdit(); setReplacementMachineId(""); }} />
                <label className={styles.formField} htmlFor="replacement-start-at">
                  <span>{messages.TECHNICAL_ASSIGNMENT_START_AT}</span>
                  <input
                    id="replacement-start-at"
                    disabled={replacementMutation.isPending}
                    onChange={(event) => {
                      handleReplacementPayloadEdit();
                      setStartAt(event.target.value);
                    }}
                    required
                    type="datetime-local"
                    value={startAt}
                  />
                </label>
                <label className={styles.formField} htmlFor="replacement-end-at">
                  <span>{messages.TECHNICAL_ASSIGNMENT_END_AT}</span>
                  <input
                    id="replacement-end-at"
                    disabled={replacementMutation.isPending}
                    min={startAt || undefined}
                    onChange={(event) => {
                      handleReplacementPayloadEdit();
                      setEndAt(event.target.value);
                    }}
                    required
                    type="datetime-local"
                    value={endAt}
                  />
                </label>
                {startAt && endAt && Date.parse(endAt) < Date.parse(startAt) && (
                  <p className={styles.pendingNotice} role="alert">{messages.TECHNICAL_ASSIGNMENT_INVALID_WINDOW}</p>
                )}
                <label className={styles.formField} htmlFor="replacement-reason">
                  <span>{messages.TECHNICAL_ASSIGNMENT_REASON}</span>
                  <textarea
                    id="replacement-reason"
                    disabled={replacementMutation.isPending}
                    onChange={(event) => {
                      handleReplacementPayloadEdit();
                      setReason(event.target.value);
                    }}
                    required
                    value={reason}
                  />
                </label>
                <details className={styles.technicalDetails}><summary>Mã đối chiếu</summary>                <label className={styles.formField} htmlFor="replacement-idempotency-key">
                  <span>{messages.TECHNICAL_ASSIGNMENT_IDEMPOTENCY_KEY}</span>
                  <input id="replacement-idempotency-key" readOnly value={idempotencyKey} />
                </label>
                <label className={styles.formField} htmlFor="replacement-correlation-id">
                  <span>{messages.TECHNICAL_ASSIGNMENT_CORRELATION_ID}</span>
                  <input id="replacement-correlation-id" readOnly value={correlationId} />
                </label>
</details>
                {machinesQuery.isSuccess && replacementMachines.length === 0 && (
                  <p className={styles.pendingNotice} role="status">{messages.TECHNICAL_ASSIGNMENT_NO_MACHINE}</p>
                )}
                <button
                  className={styles.retryButton}
                  disabled={!repairCase || !replacementMachineId || !startAt || !endAt || !reason.trim() || !idempotencyKey || !correlationId || Date.parse(endAt) < Date.parse(startAt) || replacementMutation.isPending || replacementAlreadyAssigned}
                  type="submit"
                >
                  {replacementMutation.isPending ? messages.TECHNICAL_ASSIGNMENT_SUBMITTING : messages.TECHNICAL_ASSIGNMENT_MACHINE_SUBMIT}
                </button>
              </form>
            )}
          </section>

          <section className={styles.formPanel} aria-labelledby="ticket-assignment-step-title">
            <h2 className={styles.sectionTitle} id="ticket-assignment-step-title">{messages.TECHNICAL_ASSIGNMENT_TECHNICIAN_STEP}</h2>
            {!ticketId ? (
              <p className={styles.pendingNotice} role="alert">{messages.TECHNICAL_ASSIGNMENT_NO_TICKET}</p>
            ) : assignmentComplete ? (
              <p className={styles.pendingNotice} role="status">{messages.TECHNICAL_ASSIGNMENT_ALREADY_ASSIGNED}: {ticketAssignedTechnicianId || "—"}</p>
            ) : !isAdmin ? (
              <p className={styles.pendingNotice} role="status">{messages.TECHNICAL_ASSIGNMENT_ADMIN_REQUIRED}</p>
            ) : ticketQuery.isPending ? (
              <p className={styles.pendingNotice} role="status">{messages.TECHNICAL_ASSIGNMENT_TICKET_LOADING}</p>
            ) : ticketQuery.isError ? null : ticketQuery.data?.assignedTechnicianId ? (
              <p className={styles.pendingNotice} role="status">{messages.TECHNICAL_ASSIGNMENT_ALREADY_ASSIGNED}: {ticketQuery.data.assignedTechnicianId}</p>
            ) : (
              <>
                <label className={styles.formField} htmlFor="maintenance-technician-search">
                  <span>{messages.TECHNICAL_ASSIGNMENT_SEARCH_TECHNICIANS}</span>
                  <input
                    id="maintenance-technician-search"
                    onChange={(event) => {
                      setTechnicianId("");
                      setTechnicianSearchInput(event.target.value);
                    }}
                    placeholder={messages.TECHNICAL_ASSIGNMENT_SEARCH_PLACEHOLDER}
                    type="search"
                    value={technicianSearchInput}
                  />
                </label>
                {techniciansQuery.isSuccess && eligibleTechnicians.length === 0 && (
                  <p className={styles.pendingNotice} role="status">{messages.TECHNICAL_ASSIGNMENT_NO_ELIGIBLE_TECHNICIANS}</p>
                )}
                <form className={styles.assignmentForm} onSubmit={submitTicketAssignment}>
                  <label className={styles.formField} htmlFor="maintenance-technician-id">
                    <span>{messages.TECHNICAL_ASSIGNMENT_TECHNICIAN}</span>
                    <select
                      id="maintenance-technician-id"
                      disabled={!replacementStepComplete || !ticketId || techniciansQuery.isPending || techniciansQuery.isError || eligibleTechnicians.length === 0 || ticketAssignmentMutation.isPending}
                      onChange={(event) => setTechnicianId(event.target.value)}
                      required
                      value={technicianId}
                    >
                      <option value="">{techniciansQuery.isPending ? messages.TECHNICAL_ASSIGNMENT_TECHNICIANS_LOADING : messages.TECHNICAL_ASSIGNMENT_TECHNICIAN}</option>
                      {eligibleTechnicians.map((technician) => (
                        <option key={technician.idaasUserId} value={technician.idaasUserId}>
                          {technician.fullName || technician.email || technician.idaasUserId}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button
                    className={styles.retryButton}
                    disabled={!ticketId || !replacementStepComplete || !selectedTechnician || ticketAssignmentMutation.isPending}
                    type="submit"
                  >
                    {ticketAssignmentMutation.isPending ? messages.TECHNICAL_ASSIGNMENT_SUBMITTING : messages.TECHNICAL_ASSIGN}
                  </button>
                </form>
                {techniciansQuery.data && (
                  <RepairWorkflowPagination
                    page={techniciansQuery.data.page}
                    hasNext={techniciansQuery.data.page < techniciansQuery.data.totalPages - 1}
                    isFetching={techniciansQuery.isFetching}
                    ariaLabel={messages.TECHNICAL_ASSIGNMENT_TECHNICIAN_PAGINATION}
                    onPageChange={(page) => {
                      setTechnicianId("");
                      setTechnicianPage(page);
                    }}
                  />
                )}
              </>
            )}
          </section>
          </div>
        </>
      )}
    </div>
  );
}
