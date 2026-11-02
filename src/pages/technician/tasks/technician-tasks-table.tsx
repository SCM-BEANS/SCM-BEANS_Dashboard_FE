import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ActionItemsPanel } from "@/components/features/operations/action-items-panel";
import { installationWorkOrdersApi } from "@/apis/installation-work-orders.api";
import { machinesApi } from "@/apis/machines.api";
import { ActionBarConfig } from "@/components/action-bar/action-bar";
import { ButtonBar } from "@/components/button/button-bar";
import { TextLinkButton } from "@/components/button/text-link-button";
import { DataTable } from "@/components/table/data-table";
import { RepairCaseListPanel } from "@/components/features/repair-workflow/repair-case-list-panel";
import { querySubject, querySubjectId } from "@/components/features/repair-workflow/repair-workflow-query-identity";
import { RepairWorkflowPagination } from "@/components/features/repair-workflow/repair-workflow-pagination";
import { getApiErrorMessage } from "@/lib/api-errors";
import type { MaintenanceTicket } from "@/schema/machines.schema";
import { PATH_TECHNICIAN } from "@/routes/path";
import type { AssignedInstallationWorkOrderSummary } from "@/schema/installation-work-orders.schema";
import { TECHNICIAN_MESSAGES as T } from "@/text/technician/technician-messages";
import shellStyles from "../technician-shell.module.css";
import styles from "./technician-tasks-table.module.css";

const messages = T.WORKFLOWS;

const STATUS_LABELS: Record<AssignedInstallationWorkOrderSummary["status"], string> = {
  PENDING: messages.TASKS_STATUS_PENDING,
  ASSIGNED: messages.TASKS_STATUS_ASSIGNED,
  IN_PROGRESS: messages.TASKS_STATUS_IN_PROGRESS,
  COMPLETED: messages.TASKS_STATUS_COMPLETED,
  FAILED: messages.TASKS_STATUS_FAILED,
  CANCELLED: messages.TASKS_STATUS_CANCELLED,
};

const MAINTENANCE_TICKET_STATUS_LABELS: Record<NonNullable<MaintenanceTicket["status"]>, string> = {
  PENDING: messages.TASKS_STATUS_PENDING,
  ASSIGNED: messages.TASKS_STATUS_ASSIGNED,
  IN_PROGRESS: messages.TASKS_STATUS_IN_PROGRESS,
  RESOLVED: messages.TASKS_STATUS_RESOLVED,
};

function formatDateTime(value: string | null | undefined): string {
  if (!value) return "—";
  const timestamp = Date.parse(value);
  return Number.isNaN(timestamp)
    ? value
    : new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium", timeStyle: "short" }).format(timestamp);
}

function getMachineTypeLabel(machineType: AssignedInstallationWorkOrderSummary["machineType"]): string {
  return machineType === "SMART_IOT"
    ? messages.TASKS_MACHINE_TYPE_SMART_IOT
    : messages.TASKS_MACHINE_TYPE_CONVENTIONAL;
}

export function TechnicianTasksTable() {
  const [maintenanceTicketPage, setMaintenanceTicketPage] = useState(0);
  const workOrders = useQuery({
    queryKey: ["dolores", "technician", querySubject("technician"), "installation-work-orders", "assigned"],
    queryFn: ({ signal }) => installationWorkOrdersApi.listAssigned(signal),
  });
  const maintenanceTickets = useQuery({
    queryKey: ["dolores", "technician", querySubject("technician"), "maintenance-tickets", maintenanceTicketPage, 50],
    queryFn: ({ signal }) => machinesApi.listMaintenanceTicketsPage({ page: maintenanceTicketPage, size: 50 }, signal),
  });
  const technicianSubjectId = querySubjectId();
  const assignedTickets = (maintenanceTickets.data?.items ?? []).filter(
    (ticket) => ticket.assignedTechnicianId === technicianSubjectId,
  );

  return (
    <section className={shellStyles.pageContent} aria-labelledby="technician-tasks-title">
      <header className={shellStyles.pageHeading}>
        <h1 id="technician-tasks-title">{T.NAVIGATION.TASKS}</h1>
        <p>{messages.TASKS_DESCRIPTION}</p>
      </header>

      <ActionItemsPanel role="TECHNICIAN" />

      <section className={styles.panel} aria-labelledby="technician-tasks-panel-title">
        <h2 id="technician-tasks-panel-title">{messages.TASKS_PANEL_TITLE}</h2>
        {workOrders.isPending && (
          <p className={shellStyles.pendingNotice} role="status">{messages.TASKS_LOADING}</p>
        )}
        {workOrders.isError && (
          <div className={styles.error} role="alert">
            <p>{getApiErrorMessage(workOrders.error)}</p>
          </div>
        )}
        {workOrders.data && (
          <DataTable
            rows={workOrders.data}
            rowKey={(workOrder) => workOrder.id}
            emptyMessage={messages.TASKS_EMPTY}
            columns={[
              { key: "id", header: messages.TASKS_ID, render: (workOrder) => workOrder.id },
              { key: "machine-id", header: messages.TASKS_MACHINE_ID, render: (workOrder) => workOrder.machineId },
              { key: "contract-id", header: messages.TASKS_CONTRACT_ID, render: (workOrder) => workOrder.contractId },
              { key: "machine-type", header: messages.TASKS_MACHINE_TYPE, render: (workOrder) => getMachineTypeLabel(workOrder.machineType) },
              {
                key: "status",
                header: messages.TASKS_STATUS,
                render: (workOrder) => (
                  <TextLinkButton href={PATH_TECHNICIAN.TASK_DETAIL(workOrder.id)}>
                    {STATUS_LABELS[workOrder.status]}
                  </TextLinkButton>
                ),
              },
              { key: "scheduled-for", header: messages.TASKS_SCHEDULED_FOR, render: (workOrder) => formatDateTime(workOrder.scheduledFor) },
              { key: "created-at", header: messages.TASKS_CREATED_AT, render: (workOrder) => formatDateTime(workOrder.createdAt) },
            ]}
          />
        )}
      </section>

      <section className={styles.panel} aria-labelledby="technician-maintenance-tickets-title">
        <h2 id="technician-maintenance-tickets-title">{messages.TASKS_MAINTENANCE_PANEL_TITLE}</h2>
        {maintenanceTickets.isPending && (
          <p className={shellStyles.pendingNotice} role="status">{messages.TASKS_MAINTENANCE_LOADING}</p>
        )}
        {maintenanceTickets.isError && (
          <div className={styles.error} role="alert">
            <p>{getApiErrorMessage(maintenanceTickets.error)}</p>
          </div>
        )}
        {maintenanceTickets.data && (
          <DataTable
            rows={assignedTickets}
            rowKey={(ticket, index) => ticket.id ?? `${ticket.machineId ?? "ticket"}-${index}`}
            emptyMessage={messages.TASKS_MAINTENANCE_EMPTY}
            columns={[
              { key: "id", header: messages.TASKS_ID, render: (ticket) => ticket.id ?? "—" },
              { key: "machine-id", header: messages.TASKS_MACHINE_ID, render: (ticket) => ticket.machineId ?? "—" },
              { key: "source", header: messages.TASKS_SOURCE, render: (ticket) => ticket.source ?? "—" },
              {
                key: "status",
                header: messages.TASKS_STATUS,
                render: (ticket) => ticket.id
                  ? (
                    <TextLinkButton href={ticket.repairCaseId
                      ? PATH_TECHNICIAN.TASK_REPAIR_CASE_DETAIL(ticket.repairCaseId)
                      : PATH_TECHNICIAN.TASK_MAINTENANCE_TICKET_DETAIL(ticket.id)}>
                      {ticket.status ? MAINTENANCE_TICKET_STATUS_LABELS[ticket.status] : "—"}
                    </TextLinkButton>
                  )
                  : ticket.status ? MAINTENANCE_TICKET_STATUS_LABELS[ticket.status] : "—",
              },
              { key: "scheduled-for", header: messages.TASKS_SCHEDULED_FOR, render: (ticket) => formatDateTime(ticket.scheduledDueAt) },
              { key: "assigned-to", header: messages.TASKS_ASSIGNED_TO, render: (ticket) => ticket.assignedTo ?? "—" },
            ]}
          />
        )}
        {maintenanceTickets.data ? (
          <RepairWorkflowPagination
            page={maintenanceTickets.data.page}
            hasNext={maintenanceTickets.data.hasNext}
            isFetching={maintenanceTickets.isFetching}
            ariaLabel="Phân trang vé bảo trì"
            onPageChange={setMaintenanceTicketPage}
          />
        ) : null}
      </section>

      <RepairCaseListPanel
        role="technician"
        detailHref={PATH_TECHNICIAN.TASK_REPAIR_CASE_DETAIL}
        title="Hồ sơ sửa chữa được giao"
        description="Mở hồ sơ để theo dõi điều kiện, bàn giao và các bước công việc sửa chữa."
        showOwner={false}
      />

      <ActionBarConfig>
        <ButtonBar
          disabled={workOrders.isFetching || maintenanceTickets.isFetching}
          onClick={() => void Promise.all([workOrders.refetch(), maintenanceTickets.refetch()])}
        >
          {workOrders.isFetching || maintenanceTickets.isFetching ? messages.TASKS_RELOADING : messages.TASKS_RETRY}
        </ButtonBar>
      </ActionBarConfig>
    </section>
  );
}
