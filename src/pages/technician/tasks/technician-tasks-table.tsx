import { useQuery } from "@tanstack/react-query";
import { installationWorkOrdersApi } from "@/apis/installation-work-orders.api";
import { ActionBar } from "@/components/action-bar/action-bar";
import { ButtonBar } from "@/components/button/button-bar";
import { TextLinkButton } from "@/components/button/text-link-button";
import { DataTable } from "@/components/table/data-table";
import { getApiErrorMessage } from "@/lib/api-errors";
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
  const workOrders = useQuery({
    queryKey: ["dolores", "technician", "installation-work-orders", "assigned"],
    queryFn: ({ signal }) => installationWorkOrdersApi.listAssigned(signal),
  });

  return (
    <section className={shellStyles.pageContent} aria-labelledby="technician-tasks-title">
      <header className={shellStyles.pageHeading}>
        <h1 id="technician-tasks-title">{T.NAVIGATION.TASKS}</h1>
        <p>{messages.TASKS_DESCRIPTION}</p>
      </header>

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

      <ActionBar label={messages.TASKS_PANEL_TITLE}>
        <ButtonBar disabled={workOrders.isFetching} onClick={() => void workOrders.refetch()}>
          {workOrders.isFetching ? messages.TASKS_RELOADING : messages.TASKS_RETRY}
        </ButtonBar>
      </ActionBar>
    </section>
  );
}
