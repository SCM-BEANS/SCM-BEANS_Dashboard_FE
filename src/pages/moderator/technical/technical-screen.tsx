import { useQuery } from "@tanstack/react-query";

import Link from "next/link";

import { installationWorkOrdersApi } from "@/apis/installation-work-orders.api";

import { machinesApi } from "@/apis/machines.api";

import { repairCasesApi } from "@/apis/repair-cases.api";

import { PATH_MODERATOR } from "@/routes/path";

import { MachineIdSchema, type MaintenanceTicket, type RepairCase } from "@/schema/machines.schema";

import { InstallationWorkOrderIdSchema, type InstallationWorkOrderDetails } from "@/schema/installation-work-orders.schema";

import { MODERATOR_MESSAGES } from "@/text/moderator/moderator-messages";

import { getApiErrorMessage } from "@/lib/api-errors";

import { DataTable } from "@/components/table/data-table";

import { moderatorStyles as styles } from "../moderator-shell";
import { ModeratorPageHeading } from "../moderator-page-heading";

const messages = MODERATOR_MESSAGES.READ_SCREENS;

const numberFormat = new Intl.NumberFormat("vi-VN");

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

function RepairCaseRows({ repairCases }: { repairCases: RepairCase[] }) {
  return <>
    {repairCases.map((repairCase) => {
      const latestEvent = repairCase.timeline[repairCase.timeline.length - 1];
      const workDescription = latestEvent?.reason ?? latestEvent?.details ?? latestEvent?.eventType ?? "—";
      const lastActor = latestEvent
        ? `${latestEvent.actorRole}${latestEvent.actorId ? ` · ${latestEvent.actorId}` : ""}`
        : "—";
      return (
        <tr key={repairCase.id}>
          <td className={styles.codeValue}>{repairCase.id}</td>
          <td><ActionLink href={PATH_MODERATOR.MACHINE_DETAIL(repairCase.primaryMachineId)}>{repairCase.primaryMachineId}</ActionLink></td>
          <td>{workDescription}</td>
          <td className={styles.codeValue}>{lastActor}</td>
          <td>{repairCaseStatusLabels[repairCase.status]}</td>
        </tr>
      );
    })}
  </>;
}

function WorkOrderDetail({ details }: { details: InstallationWorkOrderDetails }) {
  const workOrder = details.workOrder;
  return <>
    <dl className={styles.detailGrid}>
      <DetailValue label={messages.TECHNICAL_ID} value={workOrder.id} code />
      <DetailValue label={messages.TECHNICAL_STATUS} value={workOrder.status} />
      <DetailValue label={messages.TECHNICAL_TENANT} value={workOrder.tenantId} code />
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

export function ModeratorTechnicalScreen({ path }: { path: string }) {
  const isMachineHistory = path === "machine-history" || path.startsWith("machine-history/");
  const isRepairCaseList = path === "technical-requests" || path === "technical-requests/list";
  const isUnsupportedWrite = path === "technical-requests/new" || path.startsWith("technical-requests/new/");
  const workOrderId = path.startsWith("technical-requests/") ? path.slice("technical-requests/".length) : "";
  const isDetail = Boolean(workOrderId) && !workOrderId.includes("/") && !["list", "new"].includes(workOrderId) && !isUnsupportedWrite;
  const validWorkOrderId = InstallationWorkOrderIdSchema.safeParse(workOrderId).success;
  const historyMachineId = path.startsWith("machine-history/") ? path.slice("machine-history/".length) : "";
  const validHistoryMachineId = MachineIdSchema.safeParse(historyMachineId).success;
  const shouldLoadHistory = isMachineHistory && (!historyMachineId || validHistoryMachineId);
  const tickets = useQuery({
    queryKey: ["dolores", "maintenance-tickets"],
    queryFn: ({ signal }) => machinesApi.listMaintenanceTickets(signal),
    enabled: shouldLoadHistory,
    retry: false,
  });
  const repairCases = useQuery({
    queryKey: ["dolores", "repair-cases"],
    queryFn: ({ signal }) => repairCasesApi.list(signal),
    enabled: isRepairCaseList,
    retry: false,
  });
  const detail = useQuery({
    queryKey: ["dolores", "installation-work-orders", "id", workOrderId],
    queryFn: ({ signal }) => installationWorkOrdersApi.getById(workOrderId, signal),
    enabled: isDetail && validWorkOrderId,
    retry: false,
  });

  if (isUnsupportedWrite) {
    return <div className={styles.pageContent}><PageHeading title={messages.TECHNICAL_TITLE} description={messages.TECHNICAL_DESCRIPTION} /><button type="button" className={styles.disabledAction} disabled aria-describedby="moderator-create-work-order-reason">{messages.TECHNICAL_CREATE}</button><p className={styles.pendingNotice} id="moderator-create-work-order-reason" role="note">{messages.TECHNICAL_CREATE_DISABLED}</p></div>;
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
      <PageHeading title={messages.TECHNICAL_TITLE} description={messages.TECHNICAL_DESCRIPTION} />
      <button type="button" className={styles.disabledAction} disabled aria-describedby="moderator-create-work-order-reason">{messages.TECHNICAL_CREATE}</button>
      <p className={styles.formHint} id="moderator-create-work-order-reason" role="note">{messages.TECHNICAL_CREATE_DISABLED}</p>
      <QueryFeedback query={repairCases} loadingMessage={messages.LOADING_REPAIR_CASES} />
      {listReady && !repairCases.isError && repairCases.data?.length === 0 && <p className={styles.pendingNotice} role="status">{messages.TECHNICAL_EMPTY}</p>}
      {listReady && !repairCases.isError && repairCases.data && repairCases.data.length > 0 && (
        <>
          <h2 className={styles.sectionTitle}>{messages.TECHNICAL_LIST_TITLE}</h2>
          <DataTable variant="moderator" headers={[messages.TECHNICAL_REQUEST, messages.TECHNICAL_MACHINE, messages.TECHNICAL_WORK, messages.TECHNICAL_LAST_ACTOR, messages.TECHNICAL_STATUS]} minWidth={900}>
            <RepairCaseRows repairCases={repairCases.data ?? []} />
          </DataTable>
        </>
      )}
    </div>
  );
}
