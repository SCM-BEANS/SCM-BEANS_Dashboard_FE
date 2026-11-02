import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import Link from "next/link";

import { TextLinkButton } from "@/components/button/text-link-button";

import { installationWorkOrdersApi } from "@/apis/installation-work-orders.api";

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

import { InstallationWorkOrderIdSchema, type InstallationWorkOrderDetails } from "@/schema/installation-work-orders.schema";

import { MODERATOR_MESSAGES } from "@/text/moderator/moderator-messages";

import { getApiErrorMessage } from "@/lib/api-errors";

import { DataTable, type DataTableColumn } from "@/components/table/data-table";

import styles from "./repair-workflow.module.css";

const messages = MODERATOR_MESSAGES.READ_SCREENS;

const numberFormat = new Intl.NumberFormat("vi-VN");

type TriageInput = { requestId: string; accepted: boolean };

export type TechnicalScreenRoutes = {
  role: Extract<RepairWorkflowRole, "admin" | "moderator">;
  requests: string;
  requestDetail: (id: string) => string;
  requestAssign: (id: string) => string;
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

function MaintenanceTicketTable({ tickets, machineId, machineDetailHref, role }: {
  tickets: MaintenanceTicket[];
  machineId?: string;
  machineDetailHref: (id: string) => string;
  role: Extract<RepairWorkflowRole, "admin" | "moderator">;
}) {
  const visibleTickets = machineId ? tickets.filter((ticket) => ticket.machineId === machineId) : tickets;
  return (
    <DataTable
      variant={role === "admin" ? "operations" : "moderator"}
      headers={[messages.TECHNICAL_ID, messages.TECHNICAL_MACHINE_ID, messages.TECHNICAL_STATUS, messages.TECHNICAL_DATE, messages.TECHNICAL_NOTES]}
      emptyMessage={visibleTickets.length === 0 ? messages.MACHINE_HISTORY_EMPTY : undefined}
      minWidth={760}
    >
      {visibleTickets.map((ticket, index) => (
        <tr key={ticket.id ?? `${ticket.machineId ?? "ticket"}-${index}`}>
          <td className={styles.codeValue}>{ticket.id ?? "—"}</td>
          <td>{ticket.machineId
            ? <ActionLink href={machineDetailHref(ticket.machineId)}>{ticket.machineId}</ActionLink>
            : "—"}</td>
          <td>{ticket.status ?? "—"}</td>
          <td>{formatDate(ticketDate(ticket))}</td>
          <td>{ticketNotes(ticket) ?? "—"}</td>
        </tr>
      ))}
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
    {
      key: "id",
      header: messages.TECHNICAL_ID,
      render: (request) => <TextLinkButton href={routes.requestDetail(request.id)}>{request.id}</TextLinkButton>,
    },
    { key: "type", header: messages.TECHNICAL_TYPE, render: (request) => requestTypeLabel(request.requestType) },
    {
      key: "owner",
      header: messages.TECHNICAL_OWNER,
      cellProps: () => ({ className: styles.codeValue }),
      render: (request) => request.ownerId ?? "—",
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

function WorkOrderDetail({ details }: { details: InstallationWorkOrderDetails }) {
  const workOrder = details.workOrder;
  return <>
    <dl className={styles.detailGrid}>
      <DetailValue label={messages.TECHNICAL_ID} value={workOrder.id} code />
      <DetailValue label={messages.TECHNICAL_STATUS} value={workOrder.status} />
      <DetailValue label={messages.TECHNICAL_TENANT} value={workOrder.ownerId} code />
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
  const maintenanceRequests = useQuery({
    queryKey: ["dolores", "maintenance-requests", querySubject(routes.role), requestPage, 50],
    queryFn: ({ signal }) => maintenanceRequestsApi.listPage({ page: requestPage, size: 50 }, signal),
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

  if (isUnsupportedWrite) {
    return <div className={styles.pageContent}><PageHeading title={messages.TECHNICAL_TITLE} description={messages.TECHNICAL_DESCRIPTION} /><button type="button" className={styles.disabledAction} disabled aria-describedby="moderator-create-work-order-reason">{messages.TECHNICAL_CREATE}</button><p className={styles.pendingNotice} id="moderator-create-work-order-reason" role="note">{messages.TECHNICAL_CREATE_DISABLED}</p></div>;
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
    return <div className={styles.pageContent}><PageHeading title={messages.TECHNICAL_WORK_ORDER_DETAIL} description={messages.TECHNICAL_DESCRIPTION} /><QueryFeedback query={detail} loadingMessage={messages.LOADING_WORK_ORDER} />{detail.data && !detail.isError && <WorkOrderDetail details={detail.data} />}</div>;
  }

  if (isMachineHistory) {
    if (historyMachineId && !validHistoryMachineId) return <div className={styles.pageContent}><PageHeading title={messages.MACHINE_TICKETS} description={messages.MACHINE_HISTORY_SCOPE} /><p className={styles.pendingNotice} role="status">{historyMachineId}: {messages.MACHINE_LEGACY_ID}</p></div>;
    return <div className={styles.pageContent}><PageHeading title={historyMachineId ? "Lịch sử ticket của máy" : messages.MACHINE_TICKETS} description={messages.MACHINE_HISTORY_SCOPE} /><QueryFeedback query={tickets} loadingMessage={messages.LOADING_TICKETS} />{tickets.data && !tickets.isError && <><MaintenanceTicketTable tickets={tickets.data.items} machineId={historyMachineId || undefined} machineDetailHref={routes.machineDetail} role={routes.role} /><RepairWorkflowPagination page={tickets.data.page} hasNext={tickets.data.hasNext} isFetching={tickets.isFetching} ariaLabel="Phân trang vé bảo trì" onPageChange={setTicketPage} /></>}</div>;
  }

  if (!isTechnicalRequestList) return <div className={styles.pageContent}><PageHeading title={messages.TECHNICAL_TITLE} description={messages.TECHNICAL_DESCRIPTION} /><p className={styles.pendingNotice} role="status">{messages.TECHNICAL_DETAIL_UNAVAILABLE}</p></div>;

  const listReady = !maintenanceRequests.isPending;
  const requestList = listReady && !maintenanceRequests.isError && maintenanceRequests.data && maintenanceRequests.data.items.length > 0 ? (
    <>
      <h2 className={styles.sectionTitle} id="technical-request-list-title">{messages.TECHNICAL_LIST_TITLE}</h2>
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
      <button type="button" className={styles.disabledAction} disabled aria-describedby="moderator-create-work-order-reason">{messages.TECHNICAL_CREATE}</button>
      <p className={styles.formHint} id="moderator-create-work-order-reason" role="note">{messages.TECHNICAL_CREATE_DISABLED}</p>
      {triageFeedback && (
        <p className={styles.pendingNotice} role={triageFeedback.type === "error" ? "alert" : "status"}>
          {triageFeedback.message}
        </p>
      )}
      <QueryFeedback query={maintenanceRequests} loadingMessage={messages.LOADING_MAINTENANCE_REQUESTS} />
      {listReady && !maintenanceRequests.isError && maintenanceRequests.data?.items.length === 0 && !maintenanceRequests.data.hasNext && <p className={styles.pendingNotice} role="status">{messages.TECHNICAL_EMPTY}</p>}
      {routes.role === "admin" && requestList ? (
        <section className={styles.panel} aria-labelledby="technical-request-list-title">{requestList}</section>
      ) : requestList}
      {listReady && !maintenanceRequests.isError && maintenanceRequests.data && maintenanceRequests.data.items.length === 0 && (maintenanceRequests.data.page > 0 || maintenanceRequests.data.hasNext) ? (
        <RepairWorkflowPagination page={maintenanceRequests.data.page} hasNext={maintenanceRequests.data.hasNext} isFetching={maintenanceRequests.isFetching} ariaLabel="Phân trang yêu cầu bảo trì" onPageChange={setRequestPage} />
      ) : null}
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

