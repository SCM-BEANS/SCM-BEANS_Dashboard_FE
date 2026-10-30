import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useState } from "react";

import Link from "next/link";

import { installationWorkOrdersApi } from "@/apis/installation-work-orders.api";

import { machinesApi } from "@/apis/machines.api";

import { repairCasesApi } from "@/apis/repair-cases.api";

import { dashboardApi } from "@/apis/dashboard.api";

import { profilesApi } from "@/apis/profiles.api";

import { PATH_MODERATOR } from "@/routes/path";

import { MachineIdSchema, type MaintenanceTicket, type RepairCase, type RepairCaseSummary } from "@/schema/machines.schema";

import { InstallationWorkOrderIdSchema, type InstallationWorkOrderDetails } from "@/schema/installation-work-orders.schema";

import { MODERATOR_MESSAGES } from "@/text/moderator/moderator-messages";

import { getApiErrorMessage } from "@/lib/api-errors";

import { DataTable } from "@/components/table/data-table";

import { moderatorStyles as styles } from "../moderator-shell";
import { ModeratorPageHeading } from "../moderator-page-heading";

const messages = MODERATOR_MESSAGES.READ_SCREENS;

const numberFormat = new Intl.NumberFormat("vi-VN");

async function listActiveTechnicians(signal: AbortSignal) {
  const firstPage = await profilesApi.list({ role: "TECHNICIAN", status: "ACTIVE", page: 0, size: 100 }, signal);
  const pages = [firstPage];
  for (let page = 1; page < firstPage.totalPages; page += 5) {
    const pageNumbers = Array.from({ length: Math.min(5, firstPage.totalPages - page) }, (_, offset) => page + offset);
    pages.push(...await Promise.all(pageNumbers.map((pageNumber) =>
      profilesApi.list({ role: "TECHNICIAN", status: "ACTIVE", page: pageNumber, size: 100 }, signal),
    )));
  }
  return pages.flatMap((page) => page.items).filter((profile) => profile.emailVerified);
}

function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  const timestamp = Date.parse(value);
  return Number.isNaN(timestamp)
    ? value
    : new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium", timeStyle: "short" }).format(timestamp);
}

function ticketDate(ticket: MaintenanceTicket): string | null | undefined {
  return ticket.scheduledDueAt ?? ticket.maintenanceWindowDeadline ?? ticket.startedAt ?? ticket.acknowledgedAt ?? ticket.completedAt;
}

function ticketNotes(ticket: MaintenanceTicket): string | null | undefined {
  return ticket.notes ?? ticket.diagnosis ?? ticket.resolutionResult;
}

const repairCaseStatusLabels: Record<RepairCase["status"], string> = {
  REPORTED: "Đã báo lỗi",
  TRIAGE: "Đang phân loại",
  WAITING_REPLACEMENT: "Chờ máy thay thế",
  WAITING_OWNER_DECISION: "Chờ cửa hàng xác nhận",
  REPLACEMENT_PLANNED: "Đã lên kế hoạch thay máy",
  PRIMARY_COLLECTED: "Đã nhận máy cần sửa",
  REPLACEMENT_DELIVERED: "Đã giao máy thay thế",
  DIAGNOSIS: "Đang chẩn đoán",
  REPAIR_IN_PROGRESS: "Đang sửa chữa",
  REPAIR_COMPLETED: "Đã sửa xong",
  REPLACEMENT_COLLECTED: "Đã thu hồi máy thay thế",
  PRIMARY_RETURNED: "Đã trả máy chính",
  OWNER_ACKNOWLEDGED: "Đã xác nhận bàn giao",
  CLOSED: "Đã đóng",
  REJECTED: "Đã từ chối",
  CANCELLED: "Đã hủy",
};

function QueryFeedback({
  query,
  loadingMessage,
  errorMessage,
}: {
  query: { isPending: boolean; isError: boolean; error: unknown; refetch: () => unknown };
  loadingMessage: string;
  errorMessage?: string;
}) {
  if (query.isPending) return <p className={styles.pendingNotice} role="status">{loadingMessage}</p>;
  if (query.isError) {
    return (
      <div className={styles.pendingNotice} role="alert">
        <p>{errorMessage ?? getApiErrorMessage(query.error)}</p>
        <button className={styles.retryButton} type="button" onClick={() => void query.refetch()}>{messages.RETRY}</button>
      </div>
    );
  }
  return null;
}

function PageHeading({ title, description }: { title: string; description: string }) {
  return <ModeratorPageHeading title={title} description={description} />;
}

function ActionLink({ href, children }: { href: string; children: string }) {
  return <Link className={styles.tableLink} href={href}>{children}</Link>;
}

function DetailValue({ label, value, code = false }: { label: string; value: string | number; code?: boolean }) {
  return (
    <div className={styles.detailItem}>
      <dt>{label}</dt>
      <dd className={code ? styles.codeValue : undefined}>{value}</dd>
    </div>
  );
}

function MaintenanceTicketTable({ tickets, machineId }: { tickets: MaintenanceTicket[]; machineId?: string }) {
  const visibleTickets = machineId ? tickets.filter((ticket) => ticket.machineId === machineId) : tickets;
  return (
    <DataTable
      variant="moderator"
      headers={[messages.TECHNICAL_ID, messages.TECHNICAL_MACHINE_ID, messages.TECHNICAL_STATUS, messages.TECHNICAL_DATE, messages.TECHNICAL_NOTES]}
      emptyMessage={visibleTickets.length === 0 ? messages.MACHINE_HISTORY_EMPTY : undefined}
      minWidth={760}
    >
      {visibleTickets.map((ticket, index) => (
        <tr key={ticket.id ?? `${ticket.machineId ?? "ticket"}-${index}`}>
          <td className={styles.codeValue}>{ticket.id ?? "—"}</td>
          <td>{ticket.machineId
            ? <ActionLink href={PATH_MODERATOR.MACHINE_DETAIL(ticket.machineId)}>{ticket.machineId}</ActionLink>
            : "—"}</td>
          <td>{ticket.status ?? "—"}</td>
          <td>{formatDate(ticketDate(ticket))}</td>
          <td>{ticketNotes(ticket) ?? "—"}</td>
        </tr>
      ))}
    </DataTable>
  );
}

function RepairCaseRows({ repairCases }: { repairCases: RepairCaseSummary[] }) {
  return <>
    {repairCases.map((repairCase) => {
      return (
        <tr key={repairCase.id}>
          <td><ActionLink href={PATH_MODERATOR.TECHNICAL_REPAIR_DETAIL(repairCase.id)}>{repairCase.id}</ActionLink></td>
          <td className={styles.codeValue}>{repairCase.ownerId}</td>
          <td><ActionLink href={PATH_MODERATOR.MACHINE_DETAIL(repairCase.primaryMachineId)}>{repairCase.primaryMachineId}</ActionLink></td>
          <td>{formatDate(repairCase.updatedAt)}</td>
          <td>{repairCaseStatusLabels[repairCase.status]}</td>
        </tr>
      );
    })}
  </>;
}

function WorkOrderDetail({ details }: { details: InstallationWorkOrderDetails }) {
  const queryClient = useQueryClient();
  const workOrder = details.workOrder;
  const canModerate = workOrder.status === "PENDING" || workOrder.status === "ASSIGNED";
  const [technicianId, setTechnicianId] = useState(workOrder.assignedTechnicianId ?? "");
  const [scheduledFor, setScheduledFor] = useState("");
  const [cancelReason, setCancelReason] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);
  const technicians = useQuery({
    queryKey: ["dolores", "profiles", "technicians", "ACTIVE"],
    queryFn: ({ signal }) => listActiveTechnicians(signal),
    enabled: canModerate,
    retry: false,
  });
  const refresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["dolores", "installation-work-orders"] }),
      queryClient.invalidateQueries({ queryKey: ["dolores", "contracts"] }),
    ]);
  };
  const assign = useMutation({
    mutationFn: () => installationWorkOrdersApi.assign(workOrder.id, { technicianId }),
    onMutate: () => setActionError(null),
    onSuccess: refresh,
    onError: (error) => setActionError(getApiErrorMessage(error)),
  });
  const reschedule = useMutation({
    mutationFn: () => {
      if (!scheduledFor || Number.isNaN(Date.parse(scheduledFor)) || Date.parse(scheduledFor) <= Date.now()) {
        throw new Error("Chọn thời điểm trong tương lai để đổi lịch.");
      }
      return installationWorkOrdersApi.reschedule(workOrder.id, { scheduledFor: new Date(scheduledFor).toISOString() });
    },
    onMutate: () => setActionError(null),
    onSuccess: refresh,
    onError: (error) => setActionError(getApiErrorMessage(error)),
  });
  const cancel = useMutation({
    mutationFn: () => installationWorkOrdersApi.cancel(workOrder.id, { reason: cancelReason }),
    onMutate: () => setActionError(null),
    onSuccess: refresh,
    onError: (error) => setActionError(getApiErrorMessage(error)),
  });
  const actionsPending = assign.isPending || reschedule.isPending || cancel.isPending;
  return <>
    <dl className={styles.detailGrid}>
      <DetailValue label={messages.TECHNICAL_ID} value={workOrder.id} code />
      <DetailValue label={messages.TECHNICAL_STATUS} value={workOrder.status} />
      <DetailValue label={messages.TECHNICAL_OWNER} value={workOrder.ownerId} code />
      <DetailValue label={messages.TECHNICAL_CONTRACT_ID} value={workOrder.contractId} code />
      <DetailValue label={messages.TECHNICAL_MACHINE_ID} value={workOrder.machineId} code />
      <DetailValue label={messages.MACHINE_TYPE} value={workOrder.machineType} />
      <DetailValue label={messages.TECHNICAL_ASSIGNEE} value={workOrder.assignedTechnicianId ?? "—"} code />
      <DetailValue label={messages.TECHNICAL_SCHEDULED} value={formatDate(workOrder.scheduledFor)} />
      <DetailValue label={messages.TECHNICAL_STARTED} value={formatDate(workOrder.startedAt)} />
      <DetailValue label={messages.TECHNICAL_COMPLETED} value={formatDate(workOrder.completedAt)} />
      <DetailValue label={messages.TECHNICAL_RECIPIENT} value={workOrder.handoverRecipient ?? "—"} />
      <DetailValue label={messages.TECHNICAL_FAILURE_REASON} value={workOrder.failureReason ?? "—"} />
    </dl>
    {canModerate && (
      <section className={styles.pendingNotice} aria-labelledby="moderator-installation-work-order-actions">
        <h2 id="moderator-installation-work-order-actions" className={styles.sectionTitle}>{messages.WORK_ORDER_ACTIONS}</h2>
        <QueryFeedback query={technicians} loadingMessage={messages.WORK_ORDER_LOADING_TECHNICIANS} />
        {technicians.data?.length === 0 && !technicians.isError && <p role="status">{messages.WORK_ORDER_NO_TECHNICIANS}</p>}
        <form onSubmit={(event) => { event.preventDefault(); assign.mutate(); }} style={{ display: "grid", gap: 8, marginBottom: 16 }}>
          <label htmlFor="moderator-installation-technician">{messages.WORK_ORDER_TECHNICIAN}</label>
          <select
            id="moderator-installation-technician"
            value={technicianId}
            disabled={actionsPending || technicians.isPending}
            onChange={(event) => setTechnicianId(event.target.value)}
          >
            <option value="">Chọn kỹ thuật viên</option>
            {technicians.data?.map((technician) => (
              <option key={technician.idaasUserId} value={technician.idaasUserId}>
                {technician.fullName || technician.email || technician.idaasUserId}
              </option>
            ))}
          </select>
          <button className={styles.retryButton} type="submit" disabled={!technicianId || actionsPending}>
            {assign.isPending ? messages.TECHNICAL_TRIAGE_PENDING : messages.WORK_ORDER_ASSIGN}
          </button>
        </form>
        <form onSubmit={(event) => { event.preventDefault(); reschedule.mutate(); }} style={{ display: "grid", gap: 8, marginBottom: 16 }}>
          <label htmlFor="moderator-installation-schedule">{messages.WORK_ORDER_SCHEDULED_FOR}</label>
          <input
            id="moderator-installation-schedule"
            type="datetime-local"
            value={scheduledFor}
            disabled={actionsPending}
            onChange={(event) => setScheduledFor(event.target.value)}
          />
          <button className={styles.retryButton} type="submit" disabled={!scheduledFor || actionsPending}>
            {reschedule.isPending ? messages.TECHNICAL_TRIAGE_PENDING : messages.WORK_ORDER_RESCHEDULE}
          </button>
        </form>
        <form onSubmit={(event) => { event.preventDefault(); cancel.mutate(); }} style={{ display: "grid", gap: 8 }}>
          <label htmlFor="moderator-installation-cancel-reason">{messages.WORK_ORDER_CANCEL_REASON}</label>
          <textarea
            id="moderator-installation-cancel-reason"
            value={cancelReason}
            maxLength={4000}
            required
            rows={2}
            disabled={actionsPending}
            onChange={(event) => setCancelReason(event.target.value)}
          />
          <button className={styles.retryButton} type="submit" disabled={!cancelReason.trim() || actionsPending}>
            {cancel.isPending ? messages.TECHNICAL_TRIAGE_PENDING : messages.WORK_ORDER_CANCEL}
          </button>
        </form>
        {actionError && <p role="alert">{actionError}</p>}
      </section>
    )}
    <section>
      <h2 className={styles.sectionTitle}>{messages.TECHNICAL_CHECKLIST} ({details.checklistItems.length})</h2>
      <DataTable variant="moderator" headers={[messages.TECHNICAL_ITEM_CODE, messages.TECHNICAL_ITEM_LABEL, messages.TECHNICAL_REQUIRED, messages.TECHNICAL_RESULT, messages.TECHNICAL_NOTES_LABEL]} emptyMessage={details.checklistItems.length === 0 ? messages.TECHNICAL_CHECKLIST_EMPTY : undefined}>
        {details.checklistItems.map((item) => <tr key={item.id}><td>{item.itemCode}</td><td>{item.label}</td><td>{item.required ? "Có" : "Không"}</td><td>{item.result}</td><td>{item.notes ?? "—"}</td></tr>)}
      </DataTable>
    </section>
    <section>
      <h2 className={styles.sectionTitle}>{messages.TECHNICAL_ACCESSORIES} ({details.accessories.length})</h2>
      <DataTable variant="moderator" headers={[messages.TECHNICAL_ACCESSORY_NAME, messages.TECHNICAL_QUANTITY, messages.TECHNICAL_SERIAL, messages.TECHNICAL_NOTES_LABEL]} emptyMessage={details.accessories.length === 0 ? messages.TECHNICAL_ACCESSORIES_EMPTY : undefined}>
        {details.accessories.map((item) => <tr key={item.id}><td>{item.accessoryName}</td><td>{item.quantity}</td><td>{item.serialNumber ?? "—"}</td><td>{item.notes ?? "—"}</td></tr>)}
      </DataTable>
    </section>
    <section>
      <h2 className={styles.sectionTitle}>{messages.TECHNICAL_EVIDENCE} ({details.evidence.length})</h2>
      <DataTable variant="moderator" headers={[messages.TECHNICAL_FILENAME, messages.TECHNICAL_CONTENT_TYPE, messages.TECHNICAL_SIZE, messages.TECHNICAL_SHA256, messages.TECHNICAL_UPLOADED_AT]} emptyMessage={details.evidence.length === 0 ? messages.TECHNICAL_EVIDENCE_EMPTY : undefined} minWidth={760}>
        {details.evidence.map((item) => <tr key={item.id}><td>{item.originalFilename}</td><td>{item.contentType ?? "—"}</td><td>{numberFormat.format(item.sizeBytes)} bytes</td><td className={styles.codeValue}>{item.sha256 ?? "—"}</td><td>{formatDate(item.uploadedAt)}</td></tr>)}
      </DataTable>
    </section>
  </>;
}

export function ModeratorTechnicalScreen({ path }: { path: string }) {
  const queryClient = useQueryClient();
  const [triageReasons, setTriageReasons] = useState<Record<string, string>>({});
  const [triageError, setTriageError] = useState<string | null>(null);
  const [repairIntakePage, setRepairIntakePage] = useState(0);
  const [repairTimelinePage, setRepairTimelinePage] = useState(0);
  const isMachineHistory = path === "machine-history" || path.startsWith("machine-history/");
  const isRepairCaseList = path === "technical-requests" || path === "technical-requests/list";
  const repairCaseMatch = /^technical-requests\/repair\/([^/]+)$/.exec(path);
  const repairCaseId = repairCaseMatch?.[1] ?? "";
  const validRepairCaseId = Boolean(repairCaseId) && RepairCaseSchema.shape.id.safeParse(repairCaseId).success;
  const isUnsupportedWrite = path === "technical-requests/new" || path.startsWith("technical-requests/new/");
  const workOrderId = path.startsWith("technical-requests/") ? path.slice("technical-requests/".length) : "";
  const isDetail = Boolean(workOrderId) && !workOrderId.includes("/") && !["list", "new"].includes(workOrderId) && !isUnsupportedWrite;
  const validWorkOrderId = InstallationWorkOrderIdSchema.safeParse(workOrderId).success;
  const historyMachineId = path.startsWith("machine-history/") ? path.slice("machine-history/".length) : "";
  const validHistoryMachineId = MachineIdSchema.safeParse(historyMachineId).success;
  const shouldLoadHistory = isMachineHistory && (!historyMachineId || validHistoryMachineId);
  const tickets = useQuery({
    queryKey: ["dolores", "maintenance-tickets"],
    queryFn: ({ signal }) => machinesApi.listMaintenanceTickets({}, signal),
    enabled: shouldLoadHistory,
    retry: false,
  });
  const repairCases = useQuery({
    queryKey: ["dolores", "repair-cases"],
    queryFn: ({ signal }) => repairCasesApi.list(signal),
    enabled: isRepairCaseList,
    retry: false,
  });
  const repairCaseDetail = useQuery({
    queryKey: ["dolores", "repair-cases", "id", repairCaseId],
    queryFn: ({ signal }) => repairCasesApi.getById(repairCaseId, signal),
    enabled: validRepairCaseId,
    retry: false,
  });
  const repairTimeline = useQuery({
    queryKey: ["dolores", "repair-cases", "id", repairCaseId, "timeline", repairTimelinePage],
    queryFn: ({ signal }) => repairCasesApi.getTimeline(repairCaseId, repairTimelinePage, 20, signal),
    enabled: validRepairCaseId,
    retry: false,
  });
  const repairIntakes = useQuery({
    queryKey: ["dolores", "dashboard", "action-items", "REPAIR_TRIAGE", repairIntakePage],
    queryFn: ({ signal }) => dashboardApi.listActionItems({ actionType: "REPAIR_TRIAGE", page: repairIntakePage, size: 100 }, signal),
    enabled: isRepairCaseList,
    retry: false,
  });
  const triage = useMutation({
    mutationFn: (input: { requestId: string; accepted: boolean; reason: string }) =>
      repairCasesApi.triage(input.requestId, { accepted: input.accepted, reason: input.reason }),
    onMutate: () => setTriageError(null),
    onSuccess: async () => {
      setRepairIntakePage(0);
      setTriageReasons({});
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["dolores", "dashboard", "action-items", "REPAIR_TRIAGE"] }),
        queryClient.invalidateQueries({ queryKey: ["dolores", "repair-cases"] }),
      ]);
    },
    onError: (error) => setTriageError(getApiErrorMessage(error)),
  });
  const detail = useQuery({
    queryKey: ["dolores", "installation-work-orders", "id", workOrderId],
    queryFn: ({ signal }) => installationWorkOrdersApi.getById(workOrderId, signal),
    enabled: isDetail && validWorkOrderId,
    retry: false,
  });

  if (isUnsupportedWrite) {
    return <div className={styles.pageContent}><PageHeading title={messages.TECHNICAL_TITLE} description={messages.TECHNICAL_DESCRIPTION_OWNER} /><p className={styles.pendingNotice} role="note">{messages.TECHNICAL_CREATE_OWNER_ONLY}</p></div>;
  }

  if (repairCaseMatch) {
    if (!validRepairCaseId) return <div className={styles.pageContent}><PageHeading title="Chi tiết yêu cầu sửa chữa" description={messages.TECHNICAL_DESCRIPTION_OWNER} /><p className={styles.pendingNotice} role="status">{messages.TECHNICAL_LEGACY_ID}</p></div>;
    return (
      <div className={styles.pageContent}>
        <PageHeading title="Chi tiết yêu cầu sửa chữa" description={messages.TECHNICAL_DESCRIPTION_OWNER} />
        <ActionLink href={PATH_MODERATOR.TECHNICAL_REQUESTS}>← {messages.BACK_TO_TECHNICAL}</ActionLink>
        <QueryFeedback query={repairCaseDetail} loadingMessage={messages.LOADING_REPAIR_CASES} />
        {repairCaseDetail.data && !repairCaseDetail.isError && <>
          <dl className={styles.detailGrid}>
            <DetailValue label={messages.TECHNICAL_ID} value={repairCaseDetail.data.id} code />
            <DetailValue label={messages.TECHNICAL_OWNER} value={repairCaseDetail.data.ownerId} code />
            <DetailValue label={messages.TECHNICAL_CONTRACT_ID} value={repairCaseDetail.data.contractId} code />
            <DetailValue label={messages.TECHNICAL_MACHINE_ID} value={repairCaseDetail.data.primaryMachineId} code />
            <DetailValue label={messages.TECHNICAL_STATUS} value={repairCaseStatusLabels[repairCaseDetail.data.status]} />
            <DetailValue label={messages.TECHNICAL_DATE} value={formatDate(repairCaseDetail.data.updatedAt)} />
          </dl>
          <section>
            <h2 className={styles.sectionTitle}>Lịch sử xử lý ({repairTimeline.data?.totalElements ?? repairCaseDetail.data.timelineCount ?? repairCaseDetail.data.timeline.length})</h2>
            <QueryFeedback query={repairTimeline} loadingMessage={messages.LOADING_REPAIR_CASES} />
            {repairTimeline.data && !repairTimeline.isError && <>
              <DataTable variant="moderator" headers={["Thời điểm", "Trạng thái", "Người thực hiện", "Lý do", "Máy liên quan"]} minWidth={800}>
                {repairTimeline.data.content.map((event) => (
                  <tr key={event.id}>
                    <td>{formatDate(event.occurredAt)}</td>
                    <td>{event.toStatus ?? event.eventType}</td>
                    <td>{event.actorRole}{event.actorId ? ` · ${event.actorId}` : ""}</td>
                    <td>{event.reason ?? "—"}</td>
                    <td>{event.relatedMachineId ?? "—"}</td>
                  </tr>
                ))}
              </DataTable>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 12 }}>
                <button className={styles.retryButton} type="button" disabled={repairTimelinePage <= 0} onClick={() => setRepairTimelinePage((page) => page - 1)}>Trang trước</button>
                <span className={styles.formHint}>Trang {repairTimelinePage + 1}/{Math.max(1, repairTimeline.data.totalPages)}</span>
                <button className={styles.retryButton} type="button" disabled={repairTimelinePage + 1 >= repairTimeline.data.totalPages} onClick={() => setRepairTimelinePage((page) => page + 1)}>Trang sau</button>
              </div>
            </>}
          </section>
        </>}
      </div>
    );
  }

  if (isDetail) {
    if (!validWorkOrderId) return <div className={styles.pageContent}><PageHeading title={messages.TECHNICAL_WORK_ORDER_DETAIL} description={messages.TECHNICAL_DESCRIPTION} /><p className={styles.pendingNotice} role="status">{workOrderId}: {messages.TECHNICAL_LEGACY_ID}</p></div>;
    return <div className={styles.pageContent}><PageHeading title={messages.TECHNICAL_WORK_ORDER_DETAIL} description={messages.TECHNICAL_DESCRIPTION} /><QueryFeedback query={detail} loadingMessage={messages.LOADING_WORK_ORDER} />{detail.data && !detail.isError && <WorkOrderDetail details={detail.data} />}</div>;
  }

  if (isMachineHistory) {
    if (historyMachineId && !validHistoryMachineId) return <div className={styles.pageContent}><PageHeading title={messages.MACHINE_TICKETS} description={messages.MACHINE_HISTORY_SCOPE} /><p className={styles.pendingNotice} role="status">{historyMachineId}: {messages.MACHINE_LEGACY_ID}</p></div>;
    return <div className={styles.pageContent}><PageHeading title={historyMachineId ? "Lịch sử ticket của máy" : messages.MACHINE_TICKETS} description={messages.MACHINE_HISTORY_SCOPE} /><QueryFeedback query={tickets} loadingMessage={messages.LOADING_TICKETS} />{tickets.data && !tickets.isError && <MaintenanceTicketTable tickets={tickets.data} machineId={historyMachineId || undefined} />}</div>;
  }

  if (!isRepairCaseList) return <div className={styles.pageContent}><PageHeading title={messages.TECHNICAL_TITLE} description={messages.TECHNICAL_DESCRIPTION} /><p className={styles.pendingNotice} role="status">{messages.TECHNICAL_DETAIL_UNAVAILABLE}</p></div>;

  const listReady = !repairCases.isPending;
  return (
    <div className={styles.pageContent}>
      <PageHeading title={messages.TECHNICAL_TITLE} description={messages.TECHNICAL_DESCRIPTION_OWNER} />
      <section className={styles.pendingNotice} aria-labelledby="moderator-repair-intake-title">
        <h2 id="moderator-repair-intake-title" className={styles.sectionTitle}>{messages.TECHNICAL_TRIAGE_TITLE}</h2>
        <QueryFeedback query={repairIntakes} loadingMessage={messages.LOADING_REPAIR_CASES} />
        {repairIntakes.data?.items.length === 0 && !repairIntakes.isError && (
          <p role="status">{messages.TECHNICAL_TRIAGE_EMPTY}</p>
        )}
        {repairIntakes.data && repairIntakes.data.items.length > 0 && (
          <DataTable variant="moderator" headers={[
            messages.TECHNICAL_OWNER,
            messages.TECHNICAL_MACHINE,
            messages.TECHNICAL_DATE,
            messages.TECHNICAL_STATUS,
            messages.TECHNICAL_TRIAGE_REASON,
            messages.TECHNICAL_TYPE,
          ]} minWidth={980}>
            {repairIntakes.data.items.map((item) => {
              const reason = triageReasons[item.resourceId] ?? "";
              const isSubmitting = triage.isPending && triage.variables?.requestId === item.resourceId;
              return (
                <tr key={item.actionKey ?? item.resourceId}>
                  <td>{item.ownerName ?? item.ownerId ?? "—"}</td>
                  <td>{item.machineSerialNumber ?? item.machineId ?? "—"}</td>
                  <td>{formatDate(item.createdAt)}</td>
                  <td>{item.status ?? "—"}</td>
                  <td>
                    <label className={styles.formHint} htmlFor={`repair-triage-reason-${item.resourceId}`}>
                      {messages.TECHNICAL_TRIAGE_REASON}
                    </label>
                    <textarea
                      id={`repair-triage-reason-${item.resourceId}`}
                      maxLength={1000}
                      required
                      rows={2}
                      value={reason}
                      disabled={triage.isPending}
                      onChange={(event) => setTriageReasons((current) => ({ ...current, [item.resourceId]: event.target.value }))}
                    />
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                      <button
                        className={styles.retryButton}
                        type="button"
                        disabled={!reason.trim() || triage.isPending}
                        onClick={() => triage.mutate({ requestId: item.resourceId, accepted: true, reason: reason.trim() })}
                      >
                        {isSubmitting ? messages.TECHNICAL_TRIAGE_PENDING : messages.TECHNICAL_TRIAGE_ACCEPT}
                      </button>
                      <button
                        className={styles.retryButton}
                        type="button"
                        disabled={!reason.trim() || triage.isPending}
                        onClick={() => triage.mutate({ requestId: item.resourceId, accepted: false, reason: reason.trim() })}
                      >
                        {messages.TECHNICAL_TRIAGE_REJECT}
                      </button>
                    </div>
                  </td>
                  <td>{item.title ?? item.priorityReason ?? "Yêu cầu sửa chữa"}</td>
                </tr>
              );
            })}
          </DataTable>
        )}
        {repairIntakes.data && repairIntakes.data.items.length > 0 && (
          <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
            <button className={styles.retryButton} type="button" disabled={repairIntakePage <= 0} onClick={() => setRepairIntakePage((page) => page - 1)}>{messages.PROFILE_PREVIOUS}</button>
            <span className={styles.formHint}>Trang {repairIntakePage + 1}</span>
            <button className={styles.retryButton} type="button" disabled={!repairIntakes.data.hasMore} onClick={() => setRepairIntakePage((page) => page + 1)}>{messages.PROFILE_NEXT}</button>
          </div>
        )}
        {triageError && <p role="alert">{triageError}</p>}
      </section>
      <QueryFeedback query={repairCases} loadingMessage={messages.LOADING_REPAIR_CASES} />
      {listReady && !repairCases.isError && repairCases.data?.length === 0 && <p className={styles.pendingNotice} role="status">{messages.TECHNICAL_EMPTY}</p>}
      {listReady && !repairCases.isError && repairCases.data && repairCases.data.length > 0 && (
        <>
          <h2 className={styles.sectionTitle}>{messages.TECHNICAL_LIST_TITLE}</h2>
          <DataTable variant="moderator" headers={[messages.TECHNICAL_REQUEST, messages.TECHNICAL_OWNER, messages.TECHNICAL_MACHINE, messages.TECHNICAL_DATE, messages.TECHNICAL_STATUS]} minWidth={900}>
            <RepairCaseRows repairCases={repairCases.data ?? []} />
          </DataTable>
        </>
      )}
    </div>
  );
}
