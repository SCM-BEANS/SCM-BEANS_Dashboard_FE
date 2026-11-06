import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState, type FormEvent } from "react";
import { machinesApi } from "@/apis/machines.api";
import { maintenanceRequestsApi } from "@/apis/maintenance-requests.api";
import { replacementAssignmentsApi } from "@/apis/replacement-assignments.api";
import { ButtonBar } from "@/components/button/button-bar";
import { TruncatedId } from "@/components/truncated-id/truncated-id";
import { getApiErrorMessage } from "@/lib/api-errors";
import {
  type MaintenanceCustodyEventType,
  type MaintenanceRequestDetails,
  type MaintenanceTicket,
} from "@/schema/machines.schema";
import { maintenanceTicketDetailQueryKey } from "@/components/features/maintenance-workflow/maintenance-ticket-actions";
import { maintenanceCustodyEventsQueryKey, maintenanceRequestDetailQueryKey } from "./maintenance-request-query-keys";
import type { RepairWorkflowRole } from "./repair-workflow-query-identity";
import { maintenanceCustodyEventLabel } from "@/components/features/maintenance-workflow/maintenance-status-labels";
import styles from "./maintenance-custody-stepper.module.css";

const steps: ReadonlyArray<{ type: MaintenanceCustodyEventType; label: string }> = [
  { type: "PRIMARY_COLLECTED", label: maintenanceCustodyEventLabel("PRIMARY_COLLECTED") },
  { type: "REPLACEMENT_DELIVERED", label: maintenanceCustodyEventLabel("REPLACEMENT_DELIVERED") },
  { type: "REPLACEMENT_COLLECTED", label: maintenanceCustodyEventLabel("REPLACEMENT_COLLECTED") },
  { type: "PRIMARY_RETURNED", label: maintenanceCustodyEventLabel("PRIMARY_RETURNED") },
];

function dateLabel(value: string | null | undefined) {
  if (!value) return "Chưa ghi nhận";
  const time = Date.parse(value);
  return Number.isNaN(time)
    ? value
    : new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium", timeStyle: "short" }).format(time);
}

export function MaintenanceCustodyStepper({
  requestId,
  role,
  initialRequest,
  initialTicket,
}: {
  requestId: string;
  role: RepairWorkflowRole;
  initialRequest?: MaintenanceRequestDetails;
  initialTicket?: MaintenanceTicket;
}) {
  const queryClient = useQueryClient();
  const [conditionNotes, setConditionNotes] = useState("");
  const [evidenceReference, setEvidenceReference] = useState("");
  const [acknowledgementUnavailableReason, setAcknowledgementUnavailableReason] = useState("");
  const [acknowledgements, setAcknowledgements] = useState<Record<string, string>>({});
  const [feedback, setFeedback] = useState("");
  const [actionError, setActionError] = useState("");
  const requestQuery = useQuery({
    queryKey: maintenanceRequestDetailQueryKey(role, requestId),
    queryFn: ({ signal }) => maintenanceRequestsApi.getById(requestId, signal),
    enabled: Boolean(requestId),
    retry: false,
    staleTime: initialRequest ? 15_000 : 0,
    ...(initialRequest ? { initialData: initialRequest } : {}),
  });
  const request = requestQuery.data;
  const ticketId = request?.maintenanceTicketId ?? "";
  const ticketQuery = useQuery({
    queryKey: maintenanceTicketDetailQueryKey(ticketId),
    queryFn: ({ signal }) => machinesApi.getMaintenanceTicketById(ticketId, signal),
    enabled: Boolean(ticketId),
    retry: false,
    staleTime: initialTicket ? 15_000 : 0,
    ...(initialTicket ? { initialData: initialTicket } : {}),
  });
  const eventsQuery = useQuery({
    queryKey: maintenanceCustodyEventsQueryKey(requestId),
    queryFn: ({ signal }) => maintenanceRequestsApi.getCustodyEvents(requestId, signal),
    enabled: Boolean(requestId),
    retry: false,
  });
  const assignmentId = request?.replacementAssignmentId ?? "";
  const assignmentQuery = useQuery({
    queryKey: ["dolores", "replacement-assignment", assignmentId],
    queryFn: ({ signal }) => replacementAssignmentsApi.getById(assignmentId, signal),
    enabled: Boolean(assignmentId),
    retry: false,
  });
  const events = eventsQuery.data ?? [];
  const eventByType = new Map(events.map((event) => [event.eventType, event]));
  const nextStep = steps.find((step) => !eventByType.has(step.type));
  const stepIndex = nextStep ? steps.findIndex((step) => step.type === nextStep.type) : steps.length;
  const previousStep = stepIndex > 0 ? steps[stepIndex - 1] : undefined;
  const previousEvent = previousStep ? eventByType.get(previousStep.type) : undefined;
  const waitingForOwnerAcknowledgement = Boolean(previousEvent
    && !previousEvent.ownerAcknowledgedAt
    && !previousEvent.acknowledgementUnavailableReason);
  const replacementMachineId = assignmentQuery.data?.replacementMachineId ?? "";
  const eventMachineId = nextStep?.type === "PRIMARY_COLLECTED" || nextStep?.type === "PRIMARY_RETURNED"
    ? request?.machineId ?? ""
    : replacementMachineId;
  const isOperator = role === "admin" || role === "moderator";
  const canRecordAsActor = role === "technician" || isOperator;
  const localToday = new Date();
  const today = `${localToday.getFullYear()}-${String(localToday.getMonth() + 1).padStart(2, "0")}-${String(localToday.getDate()).padStart(2, "0")}`;
  const insideMaintenanceWindow = Boolean(request?.windowStart && request?.windowEnd
    && today >= request.windowStart && today <= request.windowEnd);

  useEffect(() => {
    setConditionNotes("");
    setEvidenceReference("");
    setAcknowledgementUnavailableReason("");
  }, [nextStep?.type]);

  let blockedReason = "";
  if (request?.requestType !== "PREVENTIVE") blockedReason = "Bàn giao máy chỉ áp dụng cho yêu cầu bảo trì định kỳ.";
  else if (request.status !== "CONFIRMED" && request.status !== "IN_PROGRESS") blockedReason = "Yêu cầu cần ở trạng thái đã xác nhận hoặc đang thực hiện.";
  else if (!assignmentId) blockedReason = "Cần liên kết một phân công máy thay thế ACTIVE trước khi ghi nhận bàn giao.";
  else if (assignmentQuery.isError) blockedReason = getApiErrorMessage(assignmentQuery.error);
  else if (!ticketId) blockedReason = "Cần có phiếu công việc liên kết trước khi ghi nhận bàn giao.";
  else if (ticketQuery.isError) blockedReason = getApiErrorMessage(ticketQuery.error);
  else if (waitingForOwnerAcknowledgement) blockedReason = "Đang chờ Owner xác nhận bước bàn giao trước đó.";
  else if (nextStep?.type === "PRIMARY_COLLECTED" && ticketQuery.data?.status !== "ASSIGNED") blockedReason = "Phiếu công việc cần được phân công cho kỹ thuật viên trước khi nhận máy chính.";
  else if (nextStep?.type === "PRIMARY_COLLECTED" && !insideMaintenanceWindow) blockedReason = "Chỉ nhận máy chính trong khung bảo trì của hợp đồng.";
  else if (nextStep?.type === "REPLACEMENT_COLLECTED" && ticketQuery.data?.status !== "RESOLVED") blockedReason = "Chỉ thu hồi máy thay thế sau khi phiếu công việc đã được xử lý.";
  else if (!eventMachineId && nextStep) blockedReason = "Chưa tải được thông tin máy dùng cho bước bàn giao tiếp theo.";
  const canRecord = Boolean(nextStep && !blockedReason && canRecordAsActor && !eventsQuery.isFetching);

  const invalidateCustody = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: maintenanceCustodyEventsQueryKey(requestId) }),
      queryClient.invalidateQueries({ queryKey: maintenanceRequestDetailQueryKey(role, requestId) }),
      queryClient.invalidateQueries({ queryKey: ["dolores", "maintenance-requests"] }),
      queryClient.invalidateQueries({ queryKey: ["dolores", "maintenance-tickets"] }),
      ...(role === "technician" ? [queryClient.invalidateQueries({ queryKey: ["dolores", "technician"] })] : []),
    ]);
  };
  const recordEvent = useMutation({
    mutationFn: (input: {
      eventType: MaintenanceCustodyEventType;
      machineId: string;
      conditionNotes: string;
      evidenceReference: string;
      acknowledgementUnavailableReason?: string;
    }) => maintenanceRequestsApi.recordCustodyEvent(requestId, input),
    onMutate: () => {
      setActionError("");
      setFeedback("");
    },
    onSuccess: async () => {
      setConditionNotes("");
      setEvidenceReference("");
      setAcknowledgementUnavailableReason("");
      setFeedback("Đã ghi nhận bước bàn giao máy.");
      await invalidateCustody();
    },
    onError: (error: unknown) => setActionError(getApiErrorMessage(error, "mutation")),
  });
  const acknowledge = useMutation({
    mutationFn: ({ eventId, acknowledgement }: { eventId: string; acknowledgement: string }) =>
      maintenanceRequestsApi.acknowledgeCustodyEvent(eventId, { acknowledgement }),
    onMutate: () => {
      setActionError("");
      setFeedback("");
    },
    onSuccess: async (_event, input) => {
      setAcknowledgements((current) => ({ ...current, [input.eventId]: "" }));
      setFeedback("Đã xác nhận bước bàn giao.");
      await invalidateCustody();
    },
    onError: (error: unknown) => setActionError(getApiErrorMessage(error, "mutation")),
  });

  const submitEvent = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!nextStep || !canRecord || !eventMachineId) return;
    recordEvent.mutate({
      eventType: nextStep.type,
      machineId: eventMachineId,
      conditionNotes: conditionNotes.trim(),
      evidenceReference: evidenceReference.trim(),
      ...(isOperator && acknowledgementUnavailableReason.trim()
        ? { acknowledgementUnavailableReason: acknowledgementUnavailableReason.trim() }
        : {}),
    });
  };

  const submitAcknowledgement = (event: FormEvent<HTMLFormElement>, eventId: string) => {
    event.preventDefault();
    const acknowledgement = acknowledgements[eventId]?.trim();
    const custodyEvent = events.find((item) => item.id === eventId);
    if (!acknowledgement || !custodyEvent) return;
    acknowledge.mutate({ eventId, acknowledgement });
  };

  return (
    <section className={styles.stepper} aria-labelledby={`maintenance-custody-title-${requestId}`}>
      <div className={styles.heading}>
        <h2 id={`maintenance-custody-title-${requestId}`}>Bàn giao máy</h2>
        <p>Theo dõi 4 bước bàn giao, mã máy được điền từ yêu cầu và phân công thay thế.</p>
      </div>
      {requestQuery.isPending || eventsQuery.isPending ? <p className={styles.notice} role="status">Đang tải lịch sử bàn giao…</p> : null}
      {(requestQuery.isError || eventsQuery.isError) ? (
        <div className={styles.errorNotice} role="alert">
          <p>{getApiErrorMessage(requestQuery.error ?? eventsQuery.error)}</p>
          <ButtonBar type="button" onClick={() => { void requestQuery.refetch(); void eventsQuery.refetch(); }}>Thử lại</ButtonBar>
        </div>
      ) : null}
      {assignmentQuery.isPending && assignmentId ? <p className={styles.notice} role="status">Đang tải phân công máy thay thế…</p> : null}
      {ticketQuery.isPending && ticketId ? <p className={styles.notice} role="status">Đang tải phiếu công việc…</p> : null}
      {request?.requestType === "PREVENTIVE" && (
        <ol className={styles.steps}>
          {steps.map((step, index) => {
            const recorded = eventByType.get(step.type);
            return (
              <li className={recorded ? styles.recordedStep : index === stepIndex ? styles.currentStep : undefined} key={step.type}>
                <div className={styles.stepHeading}>
                  <span className={styles.stepNumber} aria-hidden="true">{recorded ? "✓" : index + 1}</span>
                  <div>
                    <h3>{step.label}</h3>
                    {recorded ? (
                      <p>Đã ghi nhận · {dateLabel(recorded.occurredAt)} · Máy <TruncatedId value={recorded.machineId} /></p>
                    ) : <p>Chưa ghi nhận</p>}
                    {recorded && (recorded.ownerAcknowledgedAt || recorded.acknowledgementUnavailableReason) && (
                      <p>{recorded.ownerAcknowledgedAt ? `Owner đã xác nhận lúc ${dateLabel(recorded.ownerAcknowledgedAt)}` : `Đã ghi nhận ngoại lệ: ${recorded.acknowledgementUnavailableReason}`}</p>
                    )}
                  </div>
                </div>
                {recorded && role === "owner" && !recorded.ownerAcknowledgedAt && !recorded.acknowledgementUnavailableReason && (
                  <form className={styles.ackForm} onSubmit={(event) => submitAcknowledgement(event, recorded.id)}>
                    <label htmlFor={`custody-ack-${recorded.id}`}>Xác nhận đã nhận thông tin bàn giao</label>
                    <textarea
                      id={`custody-ack-${recorded.id}`}
                      rows={2}
                      maxLength={1000}
                      required
                      value={acknowledgements[recorded.id] ?? ""}
                      onChange={(event) => setAcknowledgements((current) => ({ ...current, [recorded.id]: event.target.value }))}
                    />
                    <ButtonBar type="submit" disabled={!acknowledgements[recorded.id]?.trim() || acknowledge.isPending}>
                      {acknowledge.isPending && acknowledge.variables?.eventId === recorded.id ? "Đang xác nhận…" : "Xác nhận bàn giao"}
                    </ButtonBar>
                  </form>
                )}
              </li>
            );
          })}
        </ol>
      )}
      {nextStep && canRecordAsActor && (
        <form className={styles.eventForm} onSubmit={submitEvent}>
          <h3>Bước tiếp theo: {nextStep.label}</h3>
          {eventMachineId ? <p>Máy được ghi nhận: <TruncatedId value={eventMachineId} /></p> : null}
          {blockedReason && <p className={styles.notice} role="status">{blockedReason}</p>}
          <label htmlFor={`custody-condition-${requestId}`}>Tình trạng máy <span aria-hidden="true">*</span></label>
          <textarea
            id={`custody-condition-${requestId}`}
            rows={3}
            maxLength={2000}
            required
            value={conditionNotes}
            onChange={(event) => setConditionNotes(event.target.value)}
          />
          <label htmlFor={`custody-evidence-${requestId}`}>Mã tham chiếu chứng từ <span aria-hidden="true">*</span></label>
          <input
            id={`custody-evidence-${requestId}`}
            value={evidenceReference}
            maxLength={512}
            required
            aria-describedby={`custody-evidence-hint-${requestId}`}
            onChange={(event) => setEvidenceReference(event.target.value)}
          />
          <p className={styles.hint} id={`custody-evidence-hint-${requestId}`}>Nhập mã tham chiếu lưu trữ riêng tư; không nhập đường dẫn URL.</p>
          {isOperator && (
            <>
              <label htmlFor={`custody-no-ack-${requestId}`}>Lý do chưa thể lấy xác nhận của Owner (nếu có)</label>
              <textarea
                id={`custody-no-ack-${requestId}`}
                rows={2}
                maxLength={1000}
                value={acknowledgementUnavailableReason}
                onChange={(event) => setAcknowledgementUnavailableReason(event.target.value)}
              />
            </>
          )}
          {actionError && <p className={styles.errorNotice} role="alert">{actionError}</p>}
          <ButtonBar type="submit" disabled={!canRecord || !conditionNotes.trim() || !evidenceReference.trim() || recordEvent.isPending}>
            {recordEvent.isPending ? "Đang ghi nhận…" : "Ghi nhận bước bàn giao"}
          </ButtonBar>
        </form>
      )}
      {role === "owner" && nextStep && waitingForOwnerAcknowledgement && <p className={styles.notice} role="status">Đã xác nhận bước trước đó để kỹ thuật viên tiếp tục.</p>}
      {!nextStep && <p className={styles.complete} role="status">Đã ghi nhận đủ bốn bước bàn giao.</p>}
      {feedback && <p className={styles.complete} role="status">{feedback}</p>}
      {actionError && !nextStep && <p className={styles.errorNotice} role="alert">{actionError}</p>}
    </section>
  );
}
