import type { ActionBarAction } from "@/components/action-bar/action-bar-actions";
import { useQuery } from "@tanstack/react-query";
import { DataTable } from "@/components/table/data-table";
import { BackButtonHeading } from "@/components/navigation/back-button-heading";
import { machinesApi } from "@/apis/machines.api";
import { maintenanceRequestsApi } from "@/apis/maintenance-requests.api";
import { getApiErrorMessage } from "@/lib/api-errors";
import { MachineIdSchema, type MaintenanceRequest, type MaintenanceTicket } from "@/schema/machines.schema";
import { TechnicianShell } from "../technician-shell";
import shellStyles from "../technician-shell.module.css";
import tableStyles from "../tasks/technician-tasks-table.module.css";
import { TECHNICIAN_MESSAGES } from "@/text/technician/technician-messages";
import type { TechnicianScreenDescriptor } from "../technician-screen";

const messages = TECHNICIAN_MESSAGES.WORKFLOWS;
const link = (label: string, href: string, variant: "primary" | "secondary" = "primary"): ActionBarAction => ({
  label,
  href,
  variant,
});
const blocked = (label: string, variant: "primary" | "secondary" = "primary"): ActionBarAction => ({
  label,
  variant,
  disabled: true,
  describedBy: "technician-screen-reason",
});

const historyScreen: TechnicianScreenDescriptor = {
  title: messages.HISTORY_TITLE,
  description: messages.HISTORY_DESCRIPTION,
  reason: messages.HISTORY_REASON,
  panelTitle: messages.HISTORY_PANEL_TITLE,
  filters: [messages.FILTER_ALL, messages.FILTER_SMART, messages.FILTER_STANDARD],
  filterLabel: messages.FILTER_LABEL_HISTORY,
  actions: [blocked("Xem lịch sử chi tiết"), link("Ghi nhận bảo trì", "/technician/tasks/maintenance-history", "secondary")],
  back: null,
};

export function getTechnicianHistoryScreenDescriptor(sectionPath: string): TechnicianScreenDescriptor {
  if (sectionPath === "history") return historyScreen;
  if (/^history\/[^/]+$/.test(sectionPath)) {
    return {
      ...historyScreen,
      title: messages.HISTORY_DETAIL_TITLE,
      filters: undefined,
      filterLabel: undefined,
      actions: [
        link("Ghi nhận bảo trì", "/technician/tasks/maintenance-history"),
        link("Về danh sách lịch sử", "/technician/history", "secondary"),
      ],
      back: { label: "Lịch sử máy", fallbackHref: "/technician/history" },
    };
  }

  return {
    title: TECHNICIAN_MESSAGES.ROUTES.PENDING_TITLE,
    description: TECHNICIAN_MESSAGES.ROUTES.PAGE_DESCRIPTION,
    reason: TECHNICIAN_MESSAGES.ROUTES.PENDING,
    back: null,
  };
}

export function getTechnicianHistoryBackNavigation(sectionPath: string) {
  return getTechnicianHistoryScreenDescriptor(sectionPath).back ?? null;
}

function formatDate(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium", timeStyle: value.includes("T") ? "short" : undefined }).format(date);
}

const maintenanceStatusLabels: Record<NonNullable<MaintenanceTicket["status"]>, string> = {
  PENDING: "Đang chờ",
  ASSIGNED: "Đã phân công",
  IN_PROGRESS: "Đang xử lý",
  RESOLVED: "Đã xử lý",
};

const requestStatusLabels: Record<MaintenanceRequest["status"], string> = {
  REQUESTED: "Đã gửi",
  TRIAGED: "Đang xem xét",
  RESCHEDULE_REQUESTED: "Đề nghị đổi lịch",
  CONFIRMED: "Đã xác nhận",
  IN_PROGRESS: "Đang xử lý",
  COMPLETED: "Đã hoàn tất",
  CLOSED: "Đã đóng",
  OVERDUE_REVIEW: "Chờ xem xét quá hạn",
  CANCELLED: "Đã hủy",
};

function technicianMachineId(sectionPath: string) {
  const candidate = sectionPath.startsWith("history/") ? sectionPath.slice("history/".length) : "";
  return MachineIdSchema.safeParse(candidate).success ? candidate : null;
}

export function TechnicianMachineHistoryScreen({ sectionPath }: { sectionPath: string }) {
  const machineId = technicianMachineId(sectionPath);
  const tickets = useQuery({
    queryKey: ["dolores", "technician", "maintenance-tickets", machineId],
    queryFn: ({ signal }) => machinesApi.listMaintenanceTickets({
      ...(machineId ? { machineId } : {}),
      page: 0,
      size: 100,
    }, signal),
  });
  const requests = useQuery({
    queryKey: ["dolores", "technician", "maintenance-requests", machineId],
    queryFn: ({ signal }) => maintenanceRequestsApi.list(signal),
  });
  const machine = useQuery({
    queryKey: ["dolores", "technician", "machine-history", "machine", machineId],
    queryFn: ({ signal }) => machinesApi.getById(machineId!, signal),
    enabled: Boolean(machineId),
  });
  const schedule = useQuery({
    queryKey: ["dolores", "technician", "machine-history", "schedule", machineId],
    queryFn: ({ signal }) => machinesApi.getMaintenanceSchedule(machineId!, signal),
    enabled: Boolean(machineId),
  });
  const filteredTickets = (tickets.data ?? []).filter((ticket) => !machineId || ticket.machineId === machineId);
  const filteredRequests = (requests.data ?? []).filter((request) => !machineId || request.machineId === machineId);
  const title = machineId ? TECHNICIAN_MESSAGES.WORKFLOWS.HISTORY_DETAIL_TITLE : TECHNICIAN_MESSAGES.WORKFLOWS.HISTORY_TITLE;
  const isLoading = tickets.isPending || requests.isPending || (machineId && (machine.isPending || schedule.isPending));

  return (
    <TechnicianShell pageTitle={title}>
      <section className={shellStyles.pageContent} aria-labelledby="technician-machine-history-title">
        <BackButtonHeading
          back={machineId ? { label: "Lịch sử máy", fallbackHref: "/technician/history" } : null}
          title={title}
          titleId="technician-machine-history-title"
          description={machineId ? "Lịch sử bảo trì và yêu cầu trên máy được giao cho bạn." : "Theo dõi các phiếu bảo trì và yêu cầu kỹ thuật trong phạm vi được giao."}
          className={shellStyles.pageHeading}
        />
        {isLoading ? <p className={shellStyles.pendingNotice} role="status">Đang tải lịch sử…</p> : null}
        {tickets.isError ? <p className={tableStyles.error} role="alert">{getApiErrorMessage(tickets.error)}</p> : null}
        {requests.isError ? <p className={tableStyles.error} role="alert">Không tải được danh sách yêu cầu bảo trì.</p> : null}
        {machine.isError ? <p className={tableStyles.error} role="alert">Không tải được máy này. Có thể máy không thuộc phân công của bạn.</p> : null}
        {schedule.isError ? <p className={tableStyles.error} role="alert">Không tải được lịch bảo trì của máy.</p> : null}
        {machineId && machine.data ? (
          <section className={tableStyles.panel} aria-labelledby="technician-machine-history-summary">
            <h2 id="technician-machine-history-summary">{machine.data.serialNumber ?? machine.data.id}</h2>
            <p>Trạng thái máy: {machine.data.status ?? "—"}</p>
            <p>Lịch bảo trì tiếp theo: {formatDate(schedule.data?.nextPreventiveMaintenanceAt)}</p>
            {typeof schedule.data?.cupsServedSinceLastDescale === "number" ? (
              <p>Số ly từ lần vệ sinh gần nhất: {schedule.data.cupsServedSinceLastDescale.toLocaleString("vi-VN")}</p>
            ) : null}
          </section>
        ) : null}
        <section className={tableStyles.panel} aria-labelledby="technician-maintenance-tickets-title">
          <h2 id="technician-maintenance-tickets-title">Phiếu bảo trì</h2>
          {tickets.isSuccess ? (
            <DataTable
              rows={filteredTickets}
              rowKey={(ticket) => ticket.id ?? `${ticket.machineId}-${ticket.status}-${ticket.scheduledDueAt}`}
              emptyMessage="Chưa có phiếu bảo trì trong phạm vi được giao."
              columns={[
                { key: "machine", header: "Mã máy", render: (ticket) => ticket.machineId ?? "—" },
                { key: "status", header: "Trạng thái", render: (ticket) => ticket.status ? maintenanceStatusLabels[ticket.status] : "—" },
                { key: "type", header: "Nguồn", render: (ticket) => ticket.preventiveSubtype ?? ticket.source ?? "—" },
                { key: "date", header: "Lịch / hoàn tất", render: (ticket) => formatDate(ticket.scheduledDueAt ?? ticket.completedAt) },
              ]}
              variant="moderator"
            />
          ) : null}
        </section>
        <section className={tableStyles.panel} aria-labelledby="technician-maintenance-requests-title">
          <h2 id="technician-maintenance-requests-title">Yêu cầu bảo trì và sửa chữa</h2>
          {requests.isSuccess ? (
            <DataTable
              rows={filteredRequests}
              rowKey={(request) => request.id}
              emptyMessage="Chưa có yêu cầu liên quan trong phạm vi được giao."
              columns={[
                { key: "id", header: "Mã yêu cầu", render: (request) => request.id },
                { key: "machine", header: "Mã máy", render: (request) => request.machineId },
                { key: "type", header: "Loại", render: (request) => request.requestType === "REPAIR" ? "Sửa chữa" : "Bảo trì định kỳ" },
                { key: "status", header: "Trạng thái", render: (request) => requestStatusLabels[request.status] },
                { key: "description", header: "Mô tả", render: (request) => request.issueDescription?.trim() || "—" },
              ]}
              variant="moderator"
            />
          ) : null}
        </section>
      </section>
    </TechnicianShell>
  );
}
