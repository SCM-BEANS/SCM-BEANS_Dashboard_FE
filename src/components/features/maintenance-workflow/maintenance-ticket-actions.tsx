import axios from "axios";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useId, useState, type FormEvent } from "react";
import { machinesApi } from "@/apis/machines.api";
import { ButtonBar } from "@/components/button/button-bar";
import { PageActions } from "@/components/action-bar/page-actions";
import { buildMaintenanceTicketCreatePageActions, buildMaintenanceTicketDetailActions, type MaintenanceActionRole } from "@/components/action-bar/entity-page-actions";
import { NotificationDialog } from "@/components/notification-dialog/notification-dialog";
import { ReasonDialog } from "@/components/reason-dialog/reason-dialog";
import { StatusBadge } from "@/components/status-badge/status-badge";
import { getApiErrorMessage } from "@/lib/api-errors";
import { maintenanceAlertLevelLabel, maintenanceTicketStatusLabel, maintenanceTicketOriginLabel } from "./maintenance-status-labels";
import {
  MaintenanceTicketDetailsPatchRequestSchema,
  type MaintenanceTicket,
  type MaintenanceTicketDetailsPatchRequest,
} from "@/schema/machines.schema";
import styles from "./maintenance-ticket-actions.module.css";

export type MaintenanceTicketActionRole = MaintenanceActionRole;

export const maintenanceTicketDetailQueryKey = (ticketId: string) =>
  ["dolores", "maintenance-tickets", "detail", ticketId] as const;

function ticketErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    if (error.response?.status === 409) {
      return "Máy chưa có đúng một hợp đồng đang hiệu lực nên chưa thể tạo phiếu bảo trì.";
    }
    if (error.response?.status === 403) return "Bạn không có quyền tạo phiếu bảo trì cho máy này.";
    if (error.response?.status === 404) return "Không tìm thấy máy cần tạo phiếu bảo trì.";
    if (error.response?.status === 400) return "Thông tin tạo phiếu bảo trì chưa hợp lệ.";
  }
  return getApiErrorMessage(error, "mutation");
}

function patchErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error) && error.response?.status === 409) {
    return "Phiếu đã được cập nhật bởi người khác, hãy tải lại.";
  }
  return getApiErrorMessage(error, "mutation");
}

function formatDate(value: string | null | undefined): string {
  if (!value) return "Chưa đặt lịch";
  const time = Date.parse(value);
  return Number.isNaN(time)
    ? value
    : new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium", timeStyle: "short" }).format(time);
}

function toLocalDateTime(value: string | null | undefined): string {
  if (!value) return "";
  if (!/(?:Z|[+-]\d{2}:\d{2})$/i.test(value)) return value.slice(0, 16);
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60_000).toISOString().slice(0, 16);
}

function MaintenanceTicketDetailsForm({
  ticket,
  pending,
  error,
  onSubmit,
  formId,
  onDirtyChange,
}: {
  ticket: MaintenanceTicket;
  pending: boolean;
  error: string;
  onSubmit: (input: MaintenanceTicketDetailsPatchRequest) => void;
  formId: string;
  onDirtyChange: (dirty: boolean) => void;
}) {
  const dueId = useId();
  const alertId = useId();
  const instructionsId = useId();
  const initialDue = toLocalDateTime(ticket.scheduledDueAt);
  const initialAlert = ticket.alertLevel ?? "Warning";
  const initialInstructions = ticket.actionableInstructions ?? "";
  const [dueAt, setDueAt] = useState(initialDue);
  const [alertLevel, setAlertLevel] = useState(initialAlert);
  const [instructions, setInstructions] = useState(initialInstructions);
  const dueChanged = dueAt !== initialDue;
  const alertChanged = alertLevel !== initialAlert;
  const instructionsChanged = instructions !== initialInstructions;
  const hasChanges = dueChanged || alertChanged || instructionsChanged;
  const hasVersion = typeof ticket.version === "number" && Number.isInteger(ticket.version) && ticket.version >= 0;
  useEffect(() => onDirtyChange(hasChanges), [hasChanges, onDirtyChange]);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!hasChanges || !hasVersion) return;
    const input: MaintenanceTicketDetailsPatchRequest = { expectedVersion: ticket.version! };
    if (dueChanged) input.scheduledDueAt = dueAt ? `${dueAt}:00` : null;
    if (alertChanged) input.alertLevel = alertLevel;
    if (instructionsChanged) input.actionableInstructions = instructions.trim() || null;
    onSubmit(MaintenanceTicketDetailsPatchRequestSchema.parse(input));
  };

  return (
    <form id={formId} className={styles.form} onSubmit={submit}>
      <div className={styles.formGrid}>
        <div className={styles.field}>
          <label htmlFor={dueId}>Lịch bảo trì dự kiến</label>
          <input id={dueId} type="datetime-local" value={dueAt} onChange={(event) => setDueAt(event.target.value)} />
        </div>
        <div className={styles.field}>
          <label htmlFor={alertId}>Mức cảnh báo</label>
          <select id={alertId} value={alertLevel} onChange={(event) => setAlertLevel(event.target.value)}>
            <option value="Info">{maintenanceAlertLevelLabel("Info")}</option>
            <option value="Warning">{maintenanceAlertLevelLabel("Warning")}</option>
            <option value="Critical">{maintenanceAlertLevelLabel("Critical")}</option>
          </select>
        </div>
      </div>
      <div className={styles.field}>
        <label htmlFor={instructionsId}>Hướng dẫn xử lý</label>
        <textarea id={instructionsId} rows={4} maxLength={4000} value={instructions} onChange={(event) => setInstructions(event.target.value)} />
        <span className={styles.counter}>{instructions.length}/4000</span>
      </div>
      {!hasVersion && <p className={styles.notice} role="status">Phiếu chưa có phiên bản dữ liệu để cập nhật an toàn.</p>}
      {error && <p className={styles.error} role="alert">{error}</p>}
    </form>
  );
}

function CreateMaintenanceTicketDialog({
  machineId,
  onClose,
  onCreated,
  onPendingChange,
}: {
  machineId: string;
  onClose: () => void;
  onCreated: (ticket: MaintenanceTicket) => void;
  onPendingChange: (pending: boolean) => void;
}) {
  const [alertLevel, setAlertLevel] = useState("Warning");
  const [error, setError] = useState("");
  const queryClient = useQueryClient();
  const create = useMutation({
    mutationFn: () => machinesApi.createMaintenanceTicket(machineId, { alertLevel }),
    onMutate: () => { onPendingChange(true); setError(""); },
    onSuccess: async (ticket) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["dolores", "maintenance-tickets"] }),
        queryClient.invalidateQueries({ queryKey: ["dolores", "machines"] }),
        queryClient.invalidateQueries({ queryKey: ["owner-machine-maintenance-tickets"] }),
      ]);
      onCreated(ticket);
    },
    onError: (cause: unknown) => setError(ticketErrorMessage(cause)),
    onSettled: () => onPendingChange(false),
  });

  return (
    <NotificationDialog
      variant="confirm"
      title="Tạo phiếu bảo trì"
      description="Tạo phiếu bảo trì theo yêu cầu cho máy này."
      onClose={onClose}
      primaryAction={{
        label: "Tạo phiếu",
        pending: create.isPending,
        pendingLabel: "Đang tạo phiếu…",
        onClick: () => create.mutate(),
      }}
      secondaryAction={{ label: "Hủy", disabled: create.isPending, onClick: onClose }}
    >
      <div className={styles.field}>
        <label htmlFor="on-demand-ticket-alert-level">Mức cảnh báo</label>
        <select id="on-demand-ticket-alert-level" value={alertLevel} onChange={(event) => setAlertLevel(event.target.value)}>
          <option value="Info">{maintenanceAlertLevelLabel("Info")}</option>
          <option value="Warning">{maintenanceAlertLevelLabel("Warning")}</option>
          <option value="Critical">{maintenanceAlertLevelLabel("Critical")}</option>
        </select>
      </div>
      {error && <p className={styles.error} role="alert">{error}</p>}
    </NotificationDialog>
  );
}

export function MaintenanceTicketDetailsPanel({
  ticketId,
  role,
  onClose,
  onRefresh,
}: {
  ticketId: string;
  role: MaintenanceTicketActionRole;
  onClose?: () => void;
  onRefresh?: () => unknown;
}) {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [showOverdueReview, setShowOverdueReview] = useState(false);
  const [showUnassign, setShowUnassign] = useState(false);
  const [actionError, setActionError] = useState("");
  const [feedback, setFeedback] = useState("");
  const [detailsDirty, setDetailsDirty] = useState(false);
  const formId = "maintenance-ticket-details-form";
  const ticketQuery = useQuery({
    queryKey: maintenanceTicketDetailQueryKey(ticketId),
    queryFn: ({ signal }) => machinesApi.getMaintenanceTicketById(ticketId, signal),
    enabled: Boolean(ticketId),
    retry: false,
  });
  const ticket = ticketQuery.data;
  const canManage = role === "ADMIN" || role === "MODERATOR";

  const refreshRelated = async (updated: MaintenanceTicket) => {
    if (updated.id) queryClient.setQueryData(maintenanceTicketDetailQueryKey(updated.id), updated);
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["dolores", "maintenance-tickets"] }),
      queryClient.invalidateQueries({ queryKey: ["dolores", "maintenance-requests"] }),
      queryClient.invalidateQueries({ queryKey: ["dolores", "repair-workflow"] }),
      Promise.resolve(onRefresh?.()),
    ]);
  };

  const updateDetails = useMutation({
    mutationFn: (input: MaintenanceTicketDetailsPatchRequest) => machinesApi.updateMaintenanceTicketDetails(ticketId, input),
    onMutate: () => {
      setActionError("");
      setFeedback("");
    },
    onSuccess: async (updated) => {
      await refreshRelated(updated);
      setEditing(false);
      setDetailsDirty(false);
      setFeedback("Đã cập nhật chi tiết phiếu bảo trì.");
    },
    onError: async (cause: unknown) => {
      setActionError(patchErrorMessage(cause));
      if (axios.isAxiosError(cause) && cause.response?.status === 409) await ticketQuery.refetch();
    },
  });
  const reviewOverdue = useMutation({
    mutationFn: (reason: string) => machinesApi.recordMaintenanceTicketOverdueReview(ticketId, { reason }),
    onMutate: () => {
      setActionError("");
      setFeedback("");
    },
    onSuccess: async (updated) => {
      await refreshRelated(updated);
      setShowOverdueReview(false);
      setFeedback("Đã ghi nhận đánh giá phiếu bảo trì quá hạn.");
    },
    onError: (cause: unknown) => setActionError(getApiErrorMessage(cause, "mutation")),
  });
  const unassign = useMutation({
    mutationFn: () => machinesApi.unassignMaintenanceTicket(ticketId),
    onMutate: () => {
      setActionError("");
      setFeedback("");
    },
    onSuccess: async (updated) => {
      await refreshRelated(updated);
      setShowUnassign(false);
      setFeedback("Đã hủy phân công. Phiếu đang chờ được giao lại.");
    },
    onError: (cause: unknown) => setActionError(getApiErrorMessage(cause, "mutation")),
  });

  return (
    <section className={styles.detailPanel} aria-labelledby="maintenance-ticket-detail-title">
      <div className={styles.panelHeading}>
        <h3 id="maintenance-ticket-detail-title">Chi tiết phiếu bảo trì</h3>
        {onClose && <ButtonBar type="button" onClick={onClose}>Đóng chi tiết</ButtonBar>}
      </div>
      {ticketQuery.isPending && <p className={styles.notice} role="status">Đang tải chi tiết phiếu…</p>}
      {ticketQuery.isError && (
        <div className={styles.errorBlock} role="alert">
          <p>{getApiErrorMessage(ticketQuery.error)}</p>
          <ButtonBar type="button" onClick={() => void ticketQuery.refetch()}>Thử lại</ButtonBar>
        </div>
      )}
      {ticket && !ticketQuery.isError && (
        <>
          {canManage && <PageActions actions={buildMaintenanceTicketDetailActions({
            role,
            ticket,
            editing,
            dirty: detailsDirty,
            pending: updateDetails.isPending,
            overduePending: reviewOverdue.isPending,
            unassignPending: unassign.isPending,
            hasVersion: typeof ticket.version === "number" && Number.isInteger(ticket.version) && ticket.version >= 0,
            formId,
            onEdit: () => { setActionError(""); setDetailsDirty(false); setEditing(true); },
            onCancelEdit: () => { setEditing(false); setDetailsDirty(false); },
            onOverdueReview: () => { setActionError(""); setShowOverdueReview(true); },
            onUnassign: () => { setActionError(""); setShowUnassign(true); },
          })} />}
          <dl className={styles.detailGrid}>
            <div><dt>Mã phiếu</dt><dd>{ticket.id}</dd></div>
            <div><dt>Trạng thái</dt><dd><StatusBadge status={ticket.status}>{maintenanceTicketStatusLabel(ticket.status)}</StatusBadge></dd></div>
            <div><dt>Mức cảnh báo</dt><dd><StatusBadge status={ticket.alertLevel} tone={ticket.alertLevel === "Critical" ? "danger" : ticket.alertLevel === "Warning" ? "warning" : "info"}>{maintenanceAlertLevelLabel(ticket.alertLevel)}</StatusBadge></dd></div>
            <div><dt>Lịch dự kiến</dt><dd>{formatDate(ticket.scheduledDueAt)}</dd></div>
            <div><dt>Kỹ thuật viên</dt><dd>{ticket.assignedTo ?? ticket.assignedTechnicianId ?? "Chưa phân công"}</dd></div>
            <div><dt>Hướng dẫn xử lý</dt><dd>{ticket.actionableInstructions || "Chưa có hướng dẫn"}</dd></div>
          </dl>
          {editing && canManage && (
            <MaintenanceTicketDetailsForm
              key={ticket.id}
              ticket={ticket}
              formId={formId}
              pending={updateDetails.isPending}
              error={actionError}
              onDirtyChange={setDetailsDirty}
              onSubmit={(input) => updateDetails.mutate(input)}
            />
          )}
          {feedback && <p className={styles.notice} role="status">{feedback}</p>}
          {actionError && !editing && <p className={styles.error} role="alert">{actionError}</p>}
        </>
      )}
      {showOverdueReview && (
        <ReasonDialog
          title="Đánh giá phiếu bảo trì quá hạn"
          description="Ghi rõ quyết định xử lý để lưu vào lịch sử phiếu."
          pending={reviewOverdue.isPending}
          error={reviewOverdue.isError ? getApiErrorMessage(reviewOverdue.error, "mutation") : undefined}
          onClose={() => setShowOverdueReview(false)}
          onConfirm={(reason) => reviewOverdue.mutate(reason)}
        />
      )}
      {showUnassign && (
        <NotificationDialog
          variant="confirm"
          title="Hủy phân công phiếu bảo trì?"
          description="Phiếu sẽ trở lại trạng thái chờ phân công và kỹ thuật viên hiện tại sẽ được thông báo."
          onClose={() => setShowUnassign(false)}
          primaryAction={{ label: "Hủy phân công", pending: unassign.isPending, pendingLabel: "Đang hủy…", onClick: () => unassign.mutate() }}
          secondaryAction={{ label: "Giữ phân công", disabled: unassign.isPending, onClick: () => setShowUnassign(false) }}
        >
          {unassign.isError && <p className={styles.error} role="alert">{getApiErrorMessage(unassign.error, "mutation")}</p>}
        </NotificationDialog>
      )}
    </section>
  );
}

export function MachineMaintenanceTicketActions({
  machineId,
  tickets,
  role,
  onRefresh,
}: {
  machineId: string;
  tickets: MaintenanceTicket[];
  role: MaintenanceTicketActionRole;
  onRefresh?: () => unknown;
}) {
  const [creating, setCreating] = useState(false);
  const [createPending, setCreatePending] = useState(false);
  const [activeTicketId, setActiveTicketId] = useState("");

  return (
    <div className={styles.machineActions}>
      <PageActions actions={buildMaintenanceTicketCreatePageActions(role, () => setCreating(true), createPending)} />
      {tickets.length > 0 && (
        <div className={styles.ticketCards} aria-label="Phiếu bảo trì của máy">
          {tickets.map((ticket, index) => (
            <article className={styles.ticketCard} key={ticket.id ?? index}>
              <div><h3>Phiếu bảo trì</h3><StatusBadge status={ticket.status}>{maintenanceTicketStatusLabel(ticket.status)}</StatusBadge>
                <p>{formatDate(ticket.scheduledDueAt ?? ticket.completedAt)}</p>
                {ticket.preventiveSubtype || ticket.source ? <p>{maintenanceTicketOriginLabel((ticket.preventiveSubtype ?? ticket.source)!)}</p> : null}
              </div>
              {ticket.id && <button type="button" className={styles.ticketLink} aria-expanded={activeTicketId === ticket.id} onClick={() => setActiveTicketId((current) => current === ticket.id ? "" : ticket.id!)}>Xem chi tiết</button>}
            </article>
          ))}
        </div>
      )}
      {activeTicketId && (
        <MaintenanceTicketDetailsPanel
          ticketId={activeTicketId}
          role={role}
          onClose={() => setActiveTicketId("")}
          onRefresh={onRefresh}
        />
      )}
      {creating && (
        <CreateMaintenanceTicketDialog
          machineId={machineId}
          onClose={() => setCreating(false)}
          onPendingChange={setCreatePending}
          onCreated={(ticket) => {
            setCreating(false);
            if (ticket.id) setActiveTicketId(ticket.id);
            void onRefresh?.();
          }}
        />
      )}
    </div>
  );
}
