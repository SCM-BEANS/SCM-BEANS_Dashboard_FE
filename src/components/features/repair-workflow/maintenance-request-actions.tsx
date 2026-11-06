import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { useState, type FormEvent } from "react";
import { machinesApi } from "@/apis/machines.api";
import { maintenanceRequestsApi } from "@/apis/maintenance-requests.api";
import { replacementAssignmentsApi } from "@/apis/replacement-assignments.api";
import { ButtonBar } from "@/components/button/button-bar";
import { NotificationDialog } from "@/components/notification-dialog/notification-dialog";
import { ReasonDialog } from "@/components/reason-dialog/reason-dialog";
import { getApiErrorMessage } from "@/lib/api-errors";
import {
  ReplacementAssignmentIdSchema,
  type MaintenanceRequestDetails,
} from "@/schema/machines.schema";
import { MaintenanceTicketDetailsPanel } from "@/components/features/maintenance-workflow/maintenance-ticket-actions";
import { StatusBadge } from "@/components/status-badge/status-badge";
import { maintenanceAssignmentStatusLabel } from "@/components/features/maintenance-workflow/maintenance-status-labels";
import { maintenanceCustodyEventsQueryKey, maintenanceRequestDetailQueryKey } from "./maintenance-request-query-keys";
import type { RepairWorkflowRole } from "./repair-workflow-query-identity";
import styles from "./repair-workflow.module.css";

function errorMessage(error: unknown): string {
  if (!axios.isAxiosError(error) && error instanceof Error && error.name !== "ZodError") return error.message;
  return getApiErrorMessage(error, "mutation");
}

export function MaintenanceRequestActions({
  request,
  role,
}: {
  request: MaintenanceRequestDetails;
  role: Extract<RepairWorkflowRole, "admin" | "moderator">;
}) {
  const queryClient = useQueryClient();
  const [showOverdueReview, setShowOverdueReview] = useState(false);
  const [showClosureException, setShowClosureException] = useState(false);
  const [showLinkConfirm, setShowLinkConfirm] = useState(false);
  const [candidateInput, setCandidateInput] = useState("");
  const [candidateId, setCandidateId] = useState("");
  const [candidateError, setCandidateError] = useState("");
  const [feedback, setFeedback] = useState("");
  const isAdmin = role === "admin";
  const eventsQuery = useQuery({
    queryKey: maintenanceCustodyEventsQueryKey(request.id),
    queryFn: ({ signal }) => maintenanceRequestsApi.getCustodyEvents(request.id, signal),
    enabled: Boolean(request.id),
    retry: false,
  });
  const replacementLookup = useQuery({
    queryKey: ["dolores", "maintenance-requests", "replacement-lookup", request.id, candidateId],
    queryFn: async ({ signal }) => {
      const assignmentId = ReplacementAssignmentIdSchema.parse(candidateId);
      const assignment = await replacementAssignmentsApi.getById(assignmentId, signal);
      if (assignment.status !== "ACTIVE") throw new Error("Chỉ có thể liên kết phân công máy thay thế đang ở trạng thái ACTIVE.");
      if (assignment.contractId !== request.contractId || assignment.ownerId !== request.ownerId
        || assignment.primaryMachineId !== request.machineId) {
        throw new Error("Phân công máy thay thế không thuộc cùng hợp đồng và máy chính của yêu cầu này.");
      }
      if (assignment.maintenanceRequestId && assignment.maintenanceRequestId !== request.id) {
        throw new Error("Phân công máy thay thế đã được liên kết với một yêu cầu khác.");
      }
      const [primary, replacement] = await Promise.all([
        machinesApi.getById(request.machineId, signal),
        machinesApi.getById(assignment.replacementMachineId, signal),
      ]);
      if (!primary.machineType || primary.machineType !== replacement.machineType) {
        throw new Error("Máy thay thế phải cùng loại với máy chính.");
      }
      return assignment;
    },
    enabled: Boolean(candidateId && !request.replacementAssignmentId),
    retry: false,
  });

  const refreshRelated = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: maintenanceRequestDetailQueryKey(role, request.id) }),
      queryClient.invalidateQueries({ queryKey: ["dolores", "maintenance-requests"] }),
      queryClient.invalidateQueries({ queryKey: ["dolores", "maintenance-tickets"] }),
      queryClient.invalidateQueries({ queryKey: ["dolores", "repair-workflow"] }),
      queryClient.invalidateQueries({ queryKey: maintenanceCustodyEventsQueryKey(request.id) }),
    ]);
  };
  const overdueReview = useMutation({
    mutationFn: (reason: string) => maintenanceRequestsApi.recordOverdueReview(request.id, { reason }),
    onMutate: () => setFeedback(""),
    onSuccess: async () => {
      setShowOverdueReview(false);
      setFeedback("Đã ghi nhận đánh giá quá hạn.");
      await refreshRelated();
    },
  });
  const linkReplacement = useMutation({
    mutationFn: (assignmentId: string) => maintenanceRequestsApi.linkReplacementAssignment(request.id, assignmentId),
    onMutate: () => setFeedback(""),
    onSuccess: async () => {
      setShowLinkConfirm(false);
      setCandidateId("");
      setCandidateInput("");
      setFeedback("Đã liên kết phân công máy thay thế.");
      await refreshRelated();
    },
  });
  const closureException = useMutation({
    mutationFn: (reason: string) => maintenanceRequestsApi.recordClosureException(request.id, { reason }),
    onMutate: () => setFeedback(""),
    onSuccess: async () => {
      setShowClosureException(false);
      setFeedback("Đã đóng yêu cầu và lưu ngoại lệ vào lịch sử kiểm toán.");
      await refreshRelated();
    },
  });

  const submitLookup = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const value = candidateInput.trim();
    if (!ReplacementAssignmentIdSchema.safeParse(value).success) {
      setCandidateError("Nhập mã phân công máy thay thế hợp lệ.");
      return;
    }
    setCandidateError("");
    setCandidateId(value);
  };

  const primaryReturned = eventsQuery.data?.some((event) => event.eventType === "PRIMARY_RETURNED") ?? false;
  const candidate = replacementLookup.data;

  return (
    <section className={styles.pendingNotice} aria-labelledby="maintenance-request-actions-title">
      <h2 className={styles.sectionTitle} id="maintenance-request-actions-title">Thao tác yêu cầu bảo trì</h2>
      {request.status === "OVERDUE_REVIEW" && !request.overdueReviewedAt && (
        <ButtonBar type="button" onClick={() => setShowOverdueReview(true)}>Ghi nhận đánh giá quá hạn</ButtonBar>
      )}
      {request.requestType === "PREVENTIVE" && !request.replacementAssignmentId && (
        <div className={styles.ticketAssignment}>
          <p>Kiểm tra một phân công ACTIVE theo mã để liên kết với yêu cầu này.</p>
          <form onSubmit={submitLookup}>
            <label htmlFor={`replacement-assignment-${request.id}`}>Mã phân công máy thay thế</label>
            <input
              id={`replacement-assignment-${request.id}`}
              value={candidateInput}
              maxLength={36}
              onChange={(event) => {
                setCandidateInput(event.target.value);
                setCandidateError("");
              }}
              aria-describedby={candidateError ? `replacement-assignment-error-${request.id}` : undefined}
            />
            <ButtonBar type="submit" disabled={!candidateInput.trim() || replacementLookup.isFetching}>Kiểm tra phân công</ButtonBar>
          </form>
          {candidateError && <p id={`replacement-assignment-error-${request.id}`} className={styles.errorText} role="alert">{candidateError}</p>}
          {replacementLookup.isPending && candidateId && <p role="status">Đang kiểm tra phân công…</p>}
          {replacementLookup.isError && <p className={styles.errorText} role="alert">{errorMessage(replacementLookup.error)}</p>}
          {candidate && (
            <div>
              <p>Máy thay thế: <code>{candidate.replacementMachineId}</code> · Trạng thái <StatusBadge status={candidate.status}>{maintenanceAssignmentStatusLabel(candidate.status)}</StatusBadge></p>
              <ButtonBar type="button" onClick={() => setShowLinkConfirm(true)}>Liên kết phân công này</ButtonBar>
            </div>
          )}
        </div>
      )}
      {primaryReturned && request.status !== "CLOSED" && (
        <ButtonBar type="button" onClick={() => setShowClosureException(true)}>Đóng yêu cầu (ngoại lệ)</ButtonBar>
      )}
      {eventsQuery.isError && <p className={styles.errorText} role="alert">{getApiErrorMessage(eventsQuery.error)}</p>}
      {feedback && <p role="status">{feedback}</p>}
      {showOverdueReview && (
        <ReasonDialog
          title="Ghi nhận đánh giá yêu cầu quá hạn"
          description="Ghi rõ cách xử lý yêu cầu bảo trì quá hạn."
          pending={overdueReview.isPending}
          error={overdueReview.isError ? getApiErrorMessage(overdueReview.error, "mutation") : undefined}
          onClose={() => setShowOverdueReview(false)}
          onConfirm={(reason) => overdueReview.mutate(reason)}
        />
      )}
      {showClosureException && (
        <ReasonDialog
          title="Đóng yêu cầu (ngoại lệ)"
          description="Thao tác này được lưu trong lịch sử kiểm toán. Hãy nêu lý do đóng yêu cầu sau khi máy chính đã được trả."
          confirmLabel="Đóng yêu cầu"
          pending={closureException.isPending}
          error={closureException.isError ? getApiErrorMessage(closureException.error, "mutation") : undefined}
          onClose={() => setShowClosureException(false)}
          onConfirm={(reason) => closureException.mutate(reason)}
        />
      )}
      {showLinkConfirm && candidate && (
        <NotificationDialog
          variant="confirm"
          title="Liên kết máy thay thế?"
          description={`Xác nhận liên kết máy ${candidate.replacementMachineId} với yêu cầu ${request.id}.`}
          onClose={() => setShowLinkConfirm(false)}
          primaryAction={{
            label: "Xác nhận liên kết",
            pending: linkReplacement.isPending,
            pendingLabel: "Đang liên kết…",
            onClick: () => linkReplacement.mutate(candidate.id),
          }}
          secondaryAction={{ label: "Hủy", disabled: linkReplacement.isPending, onClick: () => setShowLinkConfirm(false) }}
        >
          {linkReplacement.isError && <p className={styles.errorText} role="alert">{getApiErrorMessage(linkReplacement.error, "mutation")}</p>}
        </NotificationDialog>
      )}
    </section>
  );
}

export function MaintenanceRequestTicketDetail({
  ticketId,
  role,
}: {
  ticketId: string;
  role: Extract<RepairWorkflowRole, "admin" | "moderator">;
}) {
  return <MaintenanceTicketDetailsPanel ticketId={ticketId} role={role === "admin" ? "ADMIN" : "MODERATOR"} />;
}
