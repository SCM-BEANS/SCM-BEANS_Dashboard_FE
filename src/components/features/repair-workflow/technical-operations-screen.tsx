import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";

import Link from "next/link";

import { ProgressDownloadButton } from "@/components/button/button-bar";
import { TextLinkButton } from "@/components/button/text-link-button";
import { StatusBadge } from "@/components/status-badge/status-badge";
import { TruncatedId } from "@/components/truncated-id/truncated-id";

import { installationWorkOrdersApi } from "@/apis/installation-work-orders.api";
import { profilesApi } from "@/apis/profiles.api";
import { InstallationWorkOrderRecords } from "@/components/features/installation/installation-work-order-records";

import { machinesApi } from "@/apis/machines.api";

import { maintenanceRequestsApi } from "@/apis/maintenance-requests.api";

import { repairCasesApi } from "@/apis/repair-cases.api";
import { BackButtonHeading } from "@/components/navigation/back-button-heading";
import { RepairCaseDetailScreen } from "@/components/features/repair-workflow/repair-case-detail-screen";
import { RepairCaseListPanel } from "@/components/features/repair-workflow/repair-case-list-panel";
import { querySubject, type RepairWorkflowRole } from "./repair-workflow-query-identity";
import { RepairWorkflowPagination } from "@/components/features/repair-workflow/repair-workflow-pagination";
import { MaintenanceRequestDetailScreen } from "./maintenance-request-detail-screen";
import { MaintenanceRequestAssignmentScreen } from "./maintenance-request-assignment-screen";
import { RepairCostReviewScreen } from "@/components/features/maintenance-workflow/repair-cost-review-screen";
import { MachineIdSchema, type MaintenanceRequest, type MaintenanceTicket } from "@/schema/machines.schema";
import { maintenanceRequestStatusLabel, maintenanceTicketStatusLabel } from "@/components/features/maintenance-workflow/maintenance-status-labels";

import { InstallationWorkOrderIdSchema, type InstallationWorkOrderDetails } from "@/schema/installation-work-orders.schema";
import { ProfileIdSchema } from "@/schema/profiles.schema";

import { MODERATOR_MESSAGES } from "@/text/moderator/moderator-messages";

import { getApiErrorMessage } from "@/lib/api-errors";

import { DataTable, type DataTableColumn } from "@/components/table/data-table";
import { TableFilters } from "@/components/table/table-filters";
import type { MaintenanceRequestListParams } from "@/apis/maintenance-requests.api";

import styles from "./repair-workflow.module.css";

const messages = MODERATOR_MESSAGES.READ_SCREENS;

const numberFormat = new Intl.NumberFormat("vi-VN");

type TriageInput = { requestId: string; accepted: boolean };

export type TechnicalScreenRoutes = {
  role: Extract<RepairWorkflowRole, "admin" | "moderator">;
  requests: string;
  requestDetail: (id: string) => string;
  requestAssign: (id: string) => string;
  contractDetail: (id: string) => string;
  repairCaseDetail: (id: string) => string;
  machineDetail: (id: string) => string;
};

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

function requestTypeLabel(requestType: MaintenanceRequest["requestType"]): string {
  return requestType === "REPAIR" ? "Sửa chữa" : "Bảo trì định kỳ";
}

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
  return <BackButtonHeading title={title} titleId="technical-operations-heading" description={description} className={styles.pageHeading} back={null} />;
}

function ActionLink({ href, children }: { href: string; children: ReactNode }) {
  return <Link className={styles.tableLink} href={href}>{children}</Link>;
}

function DetailValue({ label, value, code = false }: { label: string; value: ReactNode; code?: boolean }) {
  return (
    <div className={styles.detailItem}>
      <dt>{label}</dt>
      <dd className={code ? styles.codeValue : undefined}>{value}</dd>
    </div>
  );
}

const workOrderStatusLabels = {
  PENDING: "Chờ phân công",
  ASSIGNED: "Đã phân công",
  IN_PROGRESS: "Đang lắp đặt",
  COMPLETED: "Đã bàn giao",
  FAILED: "Thất bại",
  CANCELLED: "Đã hủy",
} as const;

const workOrderProgressSteps = [
  "Tạo lệnh",
  "Đã phân công",
  "Đang lắp đặt",
  "Hoàn tất bàn giao",
] as const;

const workOrderProgressIndex = {
  PENDING: 0,
  ASSIGNED: 1,
  IN_PROGRESS: 2,
  COMPLETED: 3,
} as const;

function localDateTimeValue(value: string | null | undefined): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

function WorkOrderDispatchPanel({ details, milestones }: { details: InstallationWorkOrderDetails; milestones?: ReactNode }) {
  const { workOrder } = details;
  const queryClient = useQueryClient();
  const detailQueryKey = ["dolores", "installation-work-orders", querySubject("moderator"), "id", workOrder.id];
  const [technicianId, setTechnicianId] = useState(workOrder.assignedTechnicianId ?? "");
  const [scheduledFor, setScheduledFor] = useState(() => localDateTimeValue(workOrder.scheduledFor));
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const canDispatch = workOrder.status === "PENDING" || workOrder.status === "ASSIGNED";
  const technicians = useQuery({
    queryKey: ["dolores", "profiles", querySubject("moderator"), "TECHNICIAN", "ACTIVE", "installation", workOrder.id],
    queryFn: ({ signal }) => profilesApi.list({ role: "TECHNICIAN", status: "ACTIVE", page: 0, size: 100 }, signal),
    enabled: canDispatch,
    retry: false,
  });
  const eligibleTechnicians = technicians.data?.items.filter((profile) =>
    profile.status === "ACTIVE" && profile.emailVerified && profile.roles.includes("TECHNICIAN"),
  ) ?? [];
  const currentTechnician = eligibleTechnicians.find((profile) => profile.idaasUserId === workOrder.assignedTechnicianId);
  const technicianName = currentTechnician?.fullName ?? workOrder.technicianName ?? (workOrder.assignedTechnicianId ? workOrder.assignedTechnicianId : "Chưa phân công");
  const initials = technicianName === "Chưa phân công"
    ? "?"
    : technicianName.trim().split(/\s+/).map((part) => part[0]).slice(-2).join("").toLocaleUpperCase("vi-VN");

  useEffect(() => {
    setTechnicianId(workOrder.assignedTechnicianId ?? "");
    setScheduledFor(localDateTimeValue(workOrder.scheduledFor));
  }, [workOrder.assignedTechnicianId, workOrder.scheduledFor]);

  const refreshWorkOrder = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: detailQueryKey }),
      queryClient.invalidateQueries({ queryKey: ["dolores", "installation-work-orders-by-owner", workOrder.ownerId] }),
    ]);
  };
  const assign = useMutation({
    mutationFn: (selectedId: string) => installationWorkOrdersApi.assign(workOrder.id, {
      technicianId: ProfileIdSchema.parse(selectedId),
    }),
    onMutate: () => setFeedback(null),
    onSuccess: async () => {
      setFeedback({ type: "success", message: "Đã giao lệnh cho kỹ thuật viên." });
      await refreshWorkOrder();
    },
    onError: (error: unknown) => setFeedback({ type: "error", message: getApiErrorMessage(error) }),
  });
  const reschedule = useMutation({
    mutationFn: (value: string) => {
      const timestamp = new Date(value);
      if (Number.isNaN(timestamp.getTime())) throw new Error("Hãy chọn thời gian lắp đặt hợp lệ.");
      return installationWorkOrdersApi.reschedule(workOrder.id, { scheduledFor: timestamp.toISOString() });
    },
    onMutate: () => setFeedback(null),
    onSuccess: async () => {
      setFeedback({ type: "success", message: "Đã cập nhật lịch lắp đặt." });
      await refreshWorkOrder();
    },
    onError: (error: unknown) => setFeedback({ type: "error", message: getApiErrorMessage(error) }),
  });

  const submitAssign = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!eligibleTechnicians.some((profile) => profile.idaasUserId === technicianId) || assign.isPending) return;
    assign.mutate(technicianId);
  };
  const submitSchedule = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!scheduledFor || Number.isNaN(new Date(scheduledFor).getTime()) || reschedule.isPending) return;
    reschedule.mutate(scheduledFor);
  };

  return (
    <section className={`${styles.panel} ${styles.workOrderDispatch}`} aria-labelledby="work-order-dispatch-title">
      <h2 id="work-order-dispatch-title">Kỹ thuật viên &amp; lịch hẹn</h2>
      <div className={styles.workOrderTechnician}>
        <span className={styles.workOrderTechnicianAvatar} aria-hidden="true">{initials}</span>
        <div className={styles.workOrderTechnicianName}>
          <strong>{technicianName}</strong>
          <small>Kỹ thuật viên</small>
        </div>
        <span className={`${styles.workOrderAssignmentState} ${workOrder.assignedTechnicianId ? styles.workOrderAssignmentActive : ""}`}>
          {workOrder.assignedTechnicianId ? "Đã phân công" : "Chưa phân công"}
        </span>
      </div>
      <div className={styles.workOrderSchedule}>
        <span>Lịch lắp đặt</span>
        <strong>{formatDate(workOrder.scheduledFor)}</strong>
      </div>
      {milestones}
      {canDispatch && <>
        <QueryFeedback query={technicians} loadingMessage="Đang tải danh sách kỹ thuật viên…" errorMessage="Không tải được danh sách kỹ thuật viên." />
        {technicians.data && eligibleTechnicians.length === 0 && <p className={styles.formHint} role="status">Chưa có kỹ thuật viên đang hoạt động và xác minh email.</p>}
        <div className={styles.workOrderEditActions}>
          <details className={styles.workOrderEditDisclosure}>
            <summary>{workOrder.assignedTechnicianId ? "Đổi kỹ thuật viên" : "Phân công kỹ thuật viên"}</summary>
            <form className={styles.workOrderDispatchForm} onSubmit={submitAssign}>
              <label className={styles.formField}>
                Kỹ thuật viên
                <select value={technicianId} onChange={(event) => setTechnicianId(event.currentTarget.value)} disabled={technicians.isPending || assign.isPending} required>
                  <option value="">Chọn kỹ thuật viên</option>
                  {workOrder.assignedTechnicianId && !eligibleTechnicians.some((profile) => profile.idaasUserId === workOrder.assignedTechnicianId) && (
                    <option value={workOrder.assignedTechnicianId}>{workOrder.technicianName ?? workOrder.assignedTechnicianId}</option>
                  )}
                  {eligibleTechnicians.map((profile) => <option key={profile.idaasUserId} value={profile.idaasUserId}>{profile.fullName} · {profile.email}</option>)}
                </select>
              </label>
              <button className={styles.inlineButton} type="submit" disabled={!technicianId || !eligibleTechnicians.some((profile) => profile.idaasUserId === technicianId) || assign.isPending}>
                {assign.isPending ? "Đang giao…" : workOrder.assignedTechnicianId ? "Cập nhật phân công" : "Giao kỹ thuật viên"}
              </button>
            </form>
          </details>
          <details className={styles.workOrderEditDisclosure}>
            <summary>{workOrder.scheduledFor ? "Đổi lịch hẹn" : "Đặt lịch hẹn"}</summary>
            <form className={styles.workOrderDispatchForm} onSubmit={submitSchedule}>
              <label className={styles.formField}>
                Lịch lắp đặt
                <input type="datetime-local" value={scheduledFor} onChange={(event) => setScheduledFor(event.currentTarget.value)} disabled={reschedule.isPending} required />
              </label>
              <button className={styles.inlineButton} type="submit" disabled={!scheduledFor || reschedule.isPending}>
                {reschedule.isPending ? "Đang lưu…" : "Lưu lịch hẹn"}
              </button>
            </form>
          </details>
        </div>
      </>}
      {feedback && <p className={`${styles.workOrderFeedback} ${feedback.type === "error" ? styles.workOrderFeedbackError : styles.workOrderFeedbackSuccess}`} role={feedback.type === "error" ? "alert" : "status"}>{feedback.message}</p>}
    </section>
  );
}
function MaintenanceTicketTable({ tickets, machineId, machineDetailHref, role, machineSerialNumbers }: {

  tickets: MaintenanceTicket[];
  machineId?: string;
  machineDetailHref: (id: string) => string;
  role: Extract<RepairWorkflowRole, "admin" | "moderator">;
  machineSerialNumbers?: ReadonlyMap<string, string | null | undefined>;
}) {
  const visibleTickets = machineId ? tickets.filter((ticket) => ticket.machineId === machineId) : tickets;
  return (
    <DataTable
      variant={role === "admin" ? "operations" : "moderator"}
      headers={[messages.TECHNICAL_ID, role === "moderator" ? "Serial number" : messages.TECHNICAL_MACHINE_ID, messages.TECHNICAL_STATUS, messages.TECHNICAL_DATE, messages.TECHNICAL_NOTES]}
      emptyMessage={visibleTickets.length === 0 ? messages.MACHINE_HISTORY_EMPTY : undefined}
      minWidth={760}
    >
      {visibleTickets.map((ticket, index) => {
        const serialNumber = ticket.machineId ? machineSerialNumbers?.get(ticket.machineId)?.trim() : undefined;
        const machineValue = ticket.machineId
          ? role === "moderator"
            ? serialNumber ? <ActionLink href={machineDetailHref(ticket.machineId)}>{serialNumber}</ActionLink> : "—"
            : <ActionLink href={machineDetailHref(ticket.machineId)}><TruncatedId value={ticket.machineId} /></ActionLink>
          : "—";
        return (
          <tr key={ticket.id ?? `${ticket.machineId ?? "ticket"}-${index}`}>
            <td className={styles.codeValue}>{ticket.id ? <TruncatedId value={ticket.id} /> : "—"}</td>
            <td>{machineValue}</td>
            <td>{ticket.status
              ? <StatusBadge status={ticket.status}>{maintenanceTicketStatusLabel(ticket.status)}</StatusBadge>
              : "—"}</td>
            <td>{formatDate(ticketDate(ticket))}</td>
            <td>{ticketNotes(ticket) ?? "—"}</td>
          </tr>
        );
      })}
    </DataTable>
  );
}

function MaintenanceRequestTable({
  requests,
  onTriage,
  isPending,
  pendingRequestId,
  pendingAccepted,
  routes,
  role,
}: {
  requests: MaintenanceRequest[];
  onTriage: (input: TriageInput) => void;
  isPending: boolean;
  pendingRequestId?: string;
  pendingAccepted?: boolean;
  routes: Pick<TechnicalScreenRoutes, "requestDetail" | "requestAssign">;
  role: TechnicalScreenRoutes["role"];
}) {
  const columns: readonly DataTableColumn<MaintenanceRequest>[] = [
    { key: "type", header: messages.TECHNICAL_TYPE, render: (request) => (
      <TextLinkButton href={routes.requestDetail(request.id)}>{requestTypeLabel(request.requestType)}</TextLinkButton>
    ) },
    ...(role === "admin" ? [{
      key: "status",
      header: messages.TECHNICAL_STATUS,
      render: (request: MaintenanceRequest) => <StatusBadge status={request.status}>{maintenanceRequestStatusLabel(request.status)}</StatusBadge>,
    }] : []),
    {
      key: "owner",
      header: "Khách hàng",
      render: (request) => (typeof request.ownerName === "string" ? request.ownerName : "—"),
    },
    { key: "updated", header: messages.TECHNICAL_UPDATED, render: (request) => formatDate(request.updatedAt ?? request.createdAt) },
    {
      key: "actions",
      header: messages.TECHNICAL_ACTIONS,
      render: (request) => {
        const isCurrentRequestPending = isPending && pendingRequestId === request.id;
        return request.status === "REQUESTED" && request.requestType === "REPAIR" ? (
          <div className={styles.technicalRequestActions}>
            <button
              className={styles.technicalRequestAccept}
              disabled={isPending}
              onClick={() => onTriage({ requestId: request.id, accepted: true })}
              type="button"
            >
              {isCurrentRequestPending && pendingAccepted
                ? messages.TECHNICAL_ACCEPTING
                : messages.TECHNICAL_ACCEPT}
            </button>
            <button
              className={styles.technicalRequestReject}
              disabled={isPending}
              onClick={() => onTriage({ requestId: request.id, accepted: false })}
              type="button"
            >
              {isCurrentRequestPending && pendingAccepted === false
                ? messages.TECHNICAL_REJECTING
                : messages.TECHNICAL_REJECT}
            </button>
          </div>
        ) : request.status === "TRIAGED" ? (
          request.technicianId === null || request.technicianId === undefined
            ? <Link className={styles.technicalRequestAssign} href={routes.requestAssign(request.id)}>{messages.TECHNICAL_ASSIGN}</Link>
            : <span className={styles.technicalRequestAssigned}>{messages.TECHNICAL_ASSIGNED}</span>
        ) : "—";
      },
    },
  ];

  return (
    <DataTable
      variant={role === "admin" ? "operations" : "moderator"}
      {...(role === "admin" ? { headerVariant: "admin" as const } : {})}
      style={{ minWidth: 980 }}
      rows={requests}
      rowKey={(request) => request.id}
      columns={columns}
    />
  );
}

function WorkOrderDetail({ details, role, contractHref, onRefresh, isRefreshing }: {
  details: InstallationWorkOrderDetails;
  role: TechnicalScreenRoutes["role"];
  contractHref: string;
  onRefresh: () => void;
  isRefreshing: boolean;
}) {
  const workOrder = details.workOrder;
  const [evidenceError, setEvidenceError] = useState("");
  const activeStep = workOrderProgressIndex[workOrder.status as keyof typeof workOrderProgressIndex] ?? -1;
  const terminalIssue = workOrder.status === "FAILED" || workOrder.status === "CANCELLED";
  const renderEvidenceActions = (item: InstallationWorkOrderDetails["evidence"][number]) => (
    <ProgressDownloadButton
      filename={item.originalFilename}
      download={(signal) => {
        setEvidenceError("");
        return installationWorkOrdersApi.downloadEvidence(workOrder.id, item.id, signal);
      }}
      onError={(error) => setEvidenceError(getApiErrorMessage(error))}
    >
      Tải xuống
    </ProgressDownloadButton>
  );
  const milestones = (workOrder.startedAt || workOrder.completedAt || workOrder.handoverRecipient) && (
    <dl className={styles.workOrderMilestones}>
      {workOrder.startedAt && <div><dt>Bắt đầu</dt><dd>{formatDate(workOrder.startedAt)}</dd></div>}
      {workOrder.completedAt && <div><dt>Hoàn tất</dt><dd>{formatDate(workOrder.completedAt)}</dd></div>}
      {workOrder.handoverRecipient && <div><dt>Người nhận bàn giao</dt><dd>{workOrder.handoverRecipient}</dd></div>}
    </dl>
  );

  return <div className={styles.workOrderDetail} data-role={role}>
    {role === "moderator" && <header className={styles.workOrderPageHeading}>
      <div>
        <p>Moderator / Yêu cầu kỹ thuật / Lắp đặt</p>
        <h1>Lệnh lắp đặt · <TruncatedId value={workOrder.id} /></h1>
      </div>
      <div className={styles.workOrderPageActions}>
        <Link className={styles.workOrderContractLink} href={contractHref}>Về hợp đồng</Link>
        <button className={styles.workOrderRefreshButton} type="button" onClick={onRefresh} disabled={isRefreshing}>
          {isRefreshing ? "Đang tải…" : "Làm mới"}
        </button>
      </div>
    </header>}
    <section
      className={`${styles.workOrderSummary} ${role === "moderator" ? styles.workOrderProgressPanel : ""}`}
      aria-label={role === "moderator" ? "Tiến độ lắp đặt" : undefined}
      aria-labelledby={role === "admin" ? "work-order-summary-title" : undefined}
    >
      {role === "moderator" ? (
        <div className={styles.workOrderProgressStatus} data-tone={workOrder.status === "COMPLETED" ? "success" : terminalIssue ? "danger" : "warning"}>
          {workOrderStatusLabels[workOrder.status]}
        </div>
      ) : (
        <div className={styles.workOrderSummaryHeading}>
          <div>
            <p>LỆNH LẮP ĐẶT</p>
            <h2 id="work-order-summary-title"><TruncatedId value={workOrder.id} /></h2>
          </div>
          <StatusBadge status={workOrder.status}>{workOrderStatusLabels[workOrder.status]}</StatusBadge>
        </div>
      )}
      <ol className={styles.workOrderProgress} aria-label="Tiến độ lắp đặt">
        {workOrderProgressSteps.map((label, index) => {
          const isComplete = workOrder.status === "COMPLETED" || index < activeStep;
          const isCurrent = index === activeStep && workOrder.status !== "COMPLETED";
          return (
            <li key={label} className={[
              styles.workOrderProgressStep,
              isComplete ? styles.workOrderProgressComplete : "",
              isCurrent ? styles.workOrderProgressCurrent : "",
            ].filter(Boolean).join(" ")} aria-current={isCurrent ? "step" : undefined}>
              <span aria-hidden="true">{isComplete ? "✓" : index + 1}</span>
              <small>{label}</small>
            </li>
          );
        })}
      </ol>
      {terminalIssue && <p className={styles.workOrderTerminalNotice} role="status">{workOrder.failureReason || workOrderStatusLabels[workOrder.status]}</p>}
      {role !== "moderator" && <>
        <dl className={styles.workOrderFacts}>
          <div><dt>Máy</dt><dd>{workOrder.machineSerialNumber || <TruncatedId value={workOrder.machineId} />}</dd><small>{workOrder.machineModelName || workOrder.machineType}</small></div>
          <div><dt>Khách hàng</dt><dd>{workOrder.ownerName || <TruncatedId value={workOrder.ownerId} />}</dd></div>
          <div><dt>Hợp đồng</dt><dd><TruncatedId value={workOrder.contractId} /></dd></div>
          <div><dt>Kỹ thuật viên</dt><dd>{workOrder.technicianName || (workOrder.assignedTechnicianId ? <TruncatedId value={workOrder.assignedTechnicianId} /> : "Chưa phân công")}</dd></div>
          <div><dt>Lịch hẹn</dt><dd>{formatDate(workOrder.scheduledFor)}</dd></div>
          {workOrder.locationName && <div><dt>Địa điểm</dt><dd>{workOrder.locationName}</dd></div>}
        </dl>
        {milestones}
      </>}
    </section>
    {role === "moderator" && <div className={styles.workOrderOverviewGrid}>
      <section className={`${styles.panel} ${styles.workOrderInfoPanel}`} aria-labelledby="work-order-info-title">
        <h2 id="work-order-info-title">Thông tin lắp đặt</h2>
        <dl className={styles.workOrderInfoFacts}>
          <div><dt>Khách hàng</dt><dd>{workOrder.ownerName || <TruncatedId value={workOrder.ownerId} />}</dd></div>
          <div><dt>Hợp đồng</dt><dd><Link className={styles.tableLink} href={contractHref}><TruncatedId value={workOrder.contractId} /></Link></dd></div>
          <div><dt>Máy</dt><dd>{workOrder.machineSerialNumber || <TruncatedId value={workOrder.machineId} />}</dd></div>
          <div><dt>Loại máy</dt><dd>{workOrder.machineModelName || workOrder.machineType || "—"}</dd></div>
          <div><dt>Trạng thái</dt><dd>{workOrderStatusLabels[workOrder.status]}</dd></div>
          {workOrder.locationName && <div><dt>Địa điểm</dt><dd>{workOrder.locationName}</dd></div>}
        </dl>
      </section>
      <WorkOrderDispatchPanel details={details} milestones={milestones} />
    </div>}
    {role === "moderator" && <InstallationWorkOrderRecords
      workOrderId={workOrder.id}
      renderEvidenceActions={renderEvidenceActions}
      evidenceMessage={evidenceError ? <p className={styles.workOrderFeedbackError} role="alert">{evidenceError}</p> : null}
    />}
  </div>;
}
export function TechnicalOperationsScreen({
  path,
  routes,
}: {
  path: string;
  routes: TechnicalScreenRoutes;
}) {
  const isMachineHistory = path === "machine-history" || path.startsWith("machine-history/");
  const isTechnicalRequestList = path === "technical-requests" || path === "technical-requests/list";
  const maintenanceRequestAssignment = /^technical-requests\/requests\/([^/]+)\/assign$/.exec(path);
  const maintenanceRequestDetail = /^technical-requests\/requests\/([^/]+)$/.exec(path);
  const repairCaseDetail = /^technical-requests\/cases\/([^/]+)$/.exec(path);
  const repairCostReviewDetail = /^technical-requests\/cost-reviews\/([^/]+)$/.exec(path);
  const maintenanceRequestId = maintenanceRequestAssignment?.[1] ?? maintenanceRequestDetail?.[1] ?? "";
  const isMaintenanceRequestDetail = Boolean(maintenanceRequestDetail);
  const isMaintenanceRequestAssignment = Boolean(maintenanceRequestAssignment);
  const isUnsupportedWrite = path === "technical-requests/new" || path.startsWith("technical-requests/new/");
  const workOrderId = path.startsWith("technical-requests/") ? path.slice("technical-requests/".length) : "";
  const isDetail = Boolean(workOrderId) && !workOrderId.includes("/") && !["list", "new"].includes(workOrderId) && !isUnsupportedWrite;
  const validWorkOrderId = InstallationWorkOrderIdSchema.safeParse(workOrderId).success;
  const historyMachineId = path.startsWith("machine-history/") ? path.slice("machine-history/".length) : "";
  const validHistoryMachineId = MachineIdSchema.safeParse(historyMachineId).success;
  const shouldLoadHistory = isMachineHistory && (!historyMachineId || validHistoryMachineId);
  const [ticketPage, setTicketPage] = useState(0);
  const [requestPage, setRequestPage] = useState(0);
  const [requestSearchDraft, setRequestSearchDraft] = useState("");
  const [requestStatusDraft, setRequestStatusDraft] = useState<MaintenanceRequest["status"] | "">("");
  const [requestTypeDraft, setRequestTypeDraft] = useState<MaintenanceRequest["requestType"] | "">("");
  const [requestFilters, setRequestFilters] = useState<MaintenanceRequestListParams>({});
  const tickets = useQuery({
    queryKey: ["dolores", "maintenance-tickets", querySubject(routes.role), historyMachineId, ticketPage, 50],
    queryFn: ({ signal }) => machinesApi.listMaintenanceTicketsPage({
      page: ticketPage,
      size: 50,
      ...(validHistoryMachineId ? { machineId: historyMachineId } : {}),
    }, signal),
    enabled: shouldLoadHistory,
    retry: false,
  });
  const shouldLoadMachineSerials = shouldLoadHistory && routes.role === "moderator" && Boolean(tickets.data?.items.some((ticket) => ticket.machineId));
  const historyMachines = useQuery({
    queryKey: ["dolores", "machine-history", "serial-numbers", querySubject(routes.role), historyMachineId || "all"],
    queryFn: async ({ signal }) => validHistoryMachineId
      ? [await machinesApi.getById(historyMachineId, signal)]
      : machinesApi.list(signal),
    enabled: shouldLoadMachineSerials,
    retry: false,
  });
  const machineSerialNumbers = new Map((historyMachines.data ?? []).map((machine) => [machine.id, machine.serialNumber] as const));
  const maintenanceRequests = useQuery({
    queryKey: ["dolores", "maintenance-requests", querySubject(routes.role), requestFilters, requestPage, 50],
    queryFn: ({ signal }) => maintenanceRequestsApi.listPage({ page: requestPage, size: 50, ...requestFilters }, signal),
    enabled: isTechnicalRequestList,
    retry: false,
  });
  const detail = useQuery({
    queryKey: ["dolores", "installation-work-orders", querySubject(routes.role), "id", workOrderId],
    queryFn: ({ signal }) => installationWorkOrdersApi.getById(workOrderId, signal),
    enabled: isDetail && validWorkOrderId,
    retry: false,
  });
  const queryClient = useQueryClient();
  const [triageFeedback, setTriageFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const triage = useMutation({
    mutationFn: ({ requestId, accepted }: TriageInput) => repairCasesApi.triageIntake(requestId, {
      accepted,
      reason: accepted ? messages.TECHNICAL_TRIAGE_ACCEPTED : messages.TECHNICAL_TRIAGE_REJECTED,
    }),
    onMutate: () => setTriageFeedback(null),
    onSuccess: async (_, input) => {
      setTriageFeedback({
        type: "success",
        message: input.accepted ? messages.TECHNICAL_TRIAGE_ACCEPTED : messages.TECHNICAL_TRIAGE_REJECTED,
      });
      await queryClient.invalidateQueries({ queryKey: ["dolores", "maintenance-requests"] });
    },
    onError: (error: unknown) => {
      setTriageFeedback({ type: "error", message: getApiErrorMessage(error) });
    },
  });
  const submitRequestFilters = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const ownerId = requestSearchDraft.trim();
    setRequestFilters({
      ...(ownerId ? { ownerId } : {}),
      ...(requestStatusDraft ? { status: requestStatusDraft } : {}),
      ...(requestTypeDraft ? { requestType: requestTypeDraft } : {}),
    });
    setRequestPage(0);
  };

  if (isUnsupportedWrite) {
    return (
      <div className={styles.pageContent}>
        <PageHeading title={messages.TECHNICAL_TITLE} description={messages.TECHNICAL_DESCRIPTION} />
        {routes.role === "moderator" && <>
          <button type="button" className={styles.disabledAction} disabled aria-describedby="moderator-create-work-order-reason">{messages.TECHNICAL_CREATE}</button>
          <p className={styles.pendingNotice} id="moderator-create-work-order-reason" role="note">{messages.TECHNICAL_CREATE_DISABLED}</p>
        </>}
      </div>
    );
  }

  if (isMaintenanceRequestAssignment) {
    return <MaintenanceRequestAssignmentScreen requestId={maintenanceRequestId} listHref={routes.requests} role={routes.role} />;
  }

  if (isMaintenanceRequestDetail) {
    return <MaintenanceRequestDetailScreen
      id={maintenanceRequestId}
      listHref={routes.requests}
      caseDetailHref={routes.repairCaseDetail}
      role={routes.role}
    />;
  }

  if (repairCaseDetail) {
    return <RepairCaseDetailScreen caseId={repairCaseDetail[1]} role={routes.role} listHref={routes.requests} />;
  }

  if (repairCostReviewDetail) {
    return <RepairCostReviewScreen reviewId={repairCostReviewDetail[1]} role={routes.role} listHref={routes.requests} />;
  }

  if (isDetail) {
    if (!validWorkOrderId) return <div className={styles.pageContent}><PageHeading title={messages.TECHNICAL_WORK_ORDER_DETAIL} description={messages.TECHNICAL_DESCRIPTION} /><p className={styles.pendingNotice} role="status">{workOrderId}: {messages.TECHNICAL_LEGACY_ID}</p></div>;
    return (
      <div className={styles.pageContent}>
        {routes.role === "admin" && <PageHeading title={messages.TECHNICAL_WORK_ORDER_DETAIL} description={messages.TECHNICAL_DESCRIPTION} />}
        <QueryFeedback query={detail} loadingMessage={messages.LOADING_WORK_ORDER} />
        {detail.data && !detail.isError && <WorkOrderDetail
          details={detail.data}
          role={routes.role}
          contractHref={routes.contractDetail(detail.data.workOrder.contractId)}
          onRefresh={() => void detail.refetch()}
          isRefreshing={detail.isFetching}
        />}
      </div>
    );
  }

  if (isMachineHistory) {
    if (historyMachineId && !validHistoryMachineId) return <div className={styles.pageContent}><PageHeading title={messages.MACHINE_TICKETS} description={messages.MACHINE_HISTORY_SCOPE} /><p className={styles.pendingNotice} role="status">{historyMachineId}: {messages.MACHINE_LEGACY_ID}</p></div>;
    return <div className={styles.pageContent}><PageHeading title={historyMachineId ? "Lịch sử phiếu của máy" : messages.MACHINE_TICKETS} description={messages.MACHINE_HISTORY_SCOPE} /><QueryFeedback query={tickets} loadingMessage={messages.LOADING_TICKETS} />{shouldLoadMachineSerials && <QueryFeedback query={historyMachines} loadingMessage={messages.LOADING_MACHINES} />}{tickets.data && !tickets.isError && <><MaintenanceTicketTable tickets={tickets.data.items} machineId={historyMachineId || undefined} machineDetailHref={routes.machineDetail} role={routes.role} machineSerialNumbers={machineSerialNumbers} /><RepairWorkflowPagination page={tickets.data.page} hasNext={tickets.data.hasNext} isFetching={tickets.isFetching} ariaLabel="Phân trang phiếu bảo trì" onPageChange={setTicketPage} /></>}</div>;
  }

  if (!isTechnicalRequestList) return <div className={styles.pageContent}><PageHeading title={messages.TECHNICAL_TITLE} description={messages.TECHNICAL_DESCRIPTION} /><p className={styles.pendingNotice} role="status">{messages.TECHNICAL_DETAIL_UNAVAILABLE}</p></div>;

  const listReady = !maintenanceRequests.isPending;
  const requestList = listReady && !maintenanceRequests.isError && maintenanceRequests.data && maintenanceRequests.data.items.length > 0 ? (
    <>
      {routes.role === "moderator" && <h2 className={styles.sectionTitle} id="technical-request-list-title">{messages.TECHNICAL_LIST_TITLE}</h2>}
      <MaintenanceRequestTable
        requests={maintenanceRequests.data.items}
        onTriage={triage.mutate}
        isPending={triage.isPending}
        pendingRequestId={triage.variables?.requestId}
        pendingAccepted={triage.variables?.accepted}
        routes={routes}
        role={routes.role}
      />
      <RepairWorkflowPagination page={maintenanceRequests.data.page} hasNext={maintenanceRequests.data.hasNext} isFetching={maintenanceRequests.isFetching} ariaLabel="Phân trang yêu cầu bảo trì" onPageChange={setRequestPage} />
    </>
  ) : null;
  return (
    <div className={styles.pageContent}>
      <PageHeading title={messages.TECHNICAL_TITLE} description={messages.TECHNICAL_DESCRIPTION} />
      {triageFeedback && (
        <p className={styles.pendingNotice} role={triageFeedback.type === "error" ? "alert" : "status"}>
          {triageFeedback.message}
        </p>
      )}
      {routes.role === "admin" ? (
        <section className={styles.panel} aria-labelledby="technical-request-list-title">
          <h2 className={styles.sectionTitle} id="technical-request-list-title">{messages.TECHNICAL_LIST_TITLE}</h2>
          <TableFilters
            search={{
              ariaLabel: "Tìm theo Owner ID",
              maxLength: 36,
              placeholder: "Tìm Owner ID",
              value: requestSearchDraft,
              onChange: setRequestSearchDraft,
            }}
            selects={[
              {
                id: "technical-request-type-filter",
                ariaLabel: "Lọc yêu cầu theo loại",
                value: requestTypeDraft,
                options: [
                  { value: "", label: "Tất cả loại yêu cầu" },
                  { value: "REPAIR", label: "Sửa chữa" },
                  { value: "PREVENTIVE", label: "Bảo trì định kỳ" },
                ],
                onChange: (value) => setRequestTypeDraft(value as MaintenanceRequest["requestType"] | ""),
              },
              {
                id: "technical-request-status-filter",
                ariaLabel: "Lọc yêu cầu theo trạng thái",
                value: requestStatusDraft,
                options: [
                  { value: "", label: "Tất cả trạng thái" },
                  ...([
                    "REQUESTED", "TRIAGED", "RESCHEDULE_REQUESTED", "CONFIRMED", "IN_PROGRESS",
                    "COMPLETED", "CLOSED", "OVERDUE_REVIEW", "CANCELLED",
                  ] as const).map((status) => ({ value: status, label: maintenanceRequestStatusLabel(status) })),
                ],
                onChange: (value) => setRequestStatusDraft(value as MaintenanceRequest["status"] | ""),
              },
            ]}
            submitLabel="Tìm kiếm"
            onSubmit={submitRequestFilters}
          />
          <QueryFeedback query={maintenanceRequests} loadingMessage={messages.LOADING_MAINTENANCE_REQUESTS} />
          {requestList}
          {listReady && !maintenanceRequests.isError && maintenanceRequests.data?.items.length === 0 && !maintenanceRequests.data.hasNext && <p className={styles.pendingNotice} role="status">{messages.TECHNICAL_EMPTY}</p>}
          {listReady && !maintenanceRequests.isError && maintenanceRequests.data && maintenanceRequests.data.items.length === 0 && (maintenanceRequests.data.page > 0 || maintenanceRequests.data.hasNext) ? (
            <RepairWorkflowPagination page={maintenanceRequests.data.page} hasNext={maintenanceRequests.data.hasNext} isFetching={maintenanceRequests.isFetching} ariaLabel="Phân trang yêu cầu bảo trì" onPageChange={setRequestPage} />
          ) : null}
        </section>
      ) : (
        <>
          <QueryFeedback query={maintenanceRequests} loadingMessage={messages.LOADING_MAINTENANCE_REQUESTS} />
          {listReady && !maintenanceRequests.isError && maintenanceRequests.data?.items.length === 0 && !maintenanceRequests.data.hasNext && <p className={styles.pendingNotice} role="status">{messages.TECHNICAL_EMPTY}</p>}
          {requestList}
          {listReady && !maintenanceRequests.isError && maintenanceRequests.data && maintenanceRequests.data.items.length === 0 && (maintenanceRequests.data.page > 0 || maintenanceRequests.data.hasNext) ? (
            <RepairWorkflowPagination page={maintenanceRequests.data.page} hasNext={maintenanceRequests.data.hasNext} isFetching={maintenanceRequests.isFetching} ariaLabel="Phân trang yêu cầu bảo trì" onPageChange={setRequestPage} />
          ) : null}
        </>
      )}
      {routes.role === "moderator" ? (
        <RepairCaseListPanel
          role={routes.role}
          detailHref={routes.repairCaseDetail}
          title="Hồ sơ sửa chữa"
          description="Mở hồ sơ để xem trạng thái, vé bảo trì, phương án máy thay thế và dòng thời gian."
        />
      ) : null}
    </div>
  );
}

