import Link from "next/link";
import { DataTable } from "@/components/table/data-table";
import { PATH_MODERATOR } from "@/routes/path";
import type { MaintenanceTicket } from "@/schema/machines.schema";
import { ADMIN_OPERATIONS_MESSAGES as T } from "@/text/admin/admin-operations-messages";
import { adminStyles } from "@/pages/admin/admin-shell";

function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  const timestamp = Date.parse(value);
  return Number.isNaN(timestamp)
    ? value
    : new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium", timeStyle: "short" }).format(timestamp);
}

export function MachineMaintenanceTicketTable({
  tickets,
  machineId,
}: {
  tickets: MaintenanceTicket[];
  machineId?: string;
}) {
  const visibleTickets = machineId ? tickets.filter((ticket) => ticket.machineId === machineId) : tickets;
  return (
    <DataTable
      headerVariant="admin"
      rows={visibleTickets}
      rowKey={(ticket, index) => ticket.id ?? `${ticket.machineId ?? "ticket"}-${index}`}
      columns={[
        { key: "ticket-id", header: T.MACHINES.TICKET_ID, render: (ticket) => ticket.id ?? "—" },
        {
          key: "machine-id",
          header: T.MACHINES.MACHINE_ID,
          render: (ticket) => ticket.machineId
            ? <Link className={adminStyles.machineInventoryLink} href={PATH_MODERATOR.MACHINE_DETAIL(ticket.machineId)}>{ticket.machineId}</Link>
            : "—",
        },
        { key: "status", header: T.MACHINES.STATUS, render: (ticket) => ticket.status ?? "—" },
        { key: "scheduled", header: T.MACHINES.SCHEDULED, render: (ticket) => formatDate(ticket.scheduledDueAt ?? ticket.maintenanceWindowDeadline) },
        { key: "technician", header: T.MACHINES.TECHNICIAN, render: (ticket) => ticket.assignedTechnicianId ?? ticket.assignedTo ?? "—" },
        { key: "result", header: T.MACHINES.DIAGNOSIS, render: (ticket) => ticket.resolutionResult ?? ticket.diagnosis ?? ticket.notes ?? "—" },
        { key: "completed", header: T.MACHINES.COMPLETED, render: (ticket) => formatDate(ticket.completedAt) },
      ]}
    />
  );
}
