import { useEffect, useState } from "react";
import { TextLinkButton } from "@/components/button/text-link-button";
import { StatusBadge } from "@/components/status-badge/status-badge";
import { TruncatedId } from "@/components/truncated-id/truncated-id";
import { machineStatusLabel } from "@/components/machines/machine-status-labels";
import { Panel } from "@/components/panel/panel";
import { Pagination } from "@/components/pagination/pagination";
import { PATH_TECHNICIAN } from "@/routes/path";
import type { ActionBarAction } from "@/components/action-bar/action-bar-actions";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { PageActionsRenderer } from "@/components/action-bar/page-actions-renderer";

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
  const queryClient = useQueryClient();
  const machineId = technicianMachineId(sectionPath);
  const [ticketPage, setTicketPage] = useState(0);
  const [requestPage, setRequestPage] = useState(0);
  useEffect(() => { setTicketPage(0); setRequestPage(0); }, [machineId]);
  const tickets = useQuery({
    queryKey: ["dolores", "technician", "maintenance-tickets", machineId, ticketPage],
    queryFn: ({ signal }) => machinesApi.listMaintenanceTicketsPage({
      ...(machineId ? { machineId } : {}),
      page: ticketPage,
      size: 10,
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
  const filteredTickets = (tickets.data?.items ?? []).filter((ticket) => !machineId || ticket.machineId === machineId);
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
          className={shellStyles.pageHeading}
        />
        <PageActionsRenderer actions={[{ id: "refresh", label: "Làm mới", onClick: () => void queryClient.refetchQueries({ type: "active", queryKey: ["dolores", "technician"] }) }]} />
        {isLoading ? <p className={shellStyles.pendingNotice} role="status">Đang tải lịch sử…</p> : null}
        {tickets.isError ? <p className={tableStyles.error} role="alert">{getApiErrorMessage(tickets.error)}</p> : null}
        {requests.isError ? <p className={tableStyles.error} role="alert">Không tải được danh sách yêu cầu bảo trì.</p> : null}
        {machine.isError ? <p className={tableStyles.error} role="alert">Không tải được máy này. Có thể máy không thuộc phân công của bạn.</p> : null}
        {schedule.isError ? <p className={tableStyles.error} role="alert">Không tải được lịch bảo trì của máy.</p> : null}
        {machineId && machine.data ? (
          <Panel title={machine.data.serialNumber ?? machine.data.id} aria-label="Tổng quan máy">
            <p>Trạng thái máy: {machineStatusLabel(machine.data.status)}</p>
            <p>Lịch bảo trì tiếp theo: {formatDate(schedule.data?.nextPreventiveMaintenanceAt)}</p>
            {typeof schedule.data?.cupsServedSinceLastDescale === "number" ? (
              <p>Số ly từ lần vệ sinh gần nhất: {schedule.data.cupsServedSinceLastDescale.toLocaleString("vi-VN")}</p>
            ) : null}
          </Panel>
        ) : null}
        <Panel title="Phiếu bảo trì" aria-label="Phiếu bảo trì">
          {tickets.isSuccess ? (
            <DataTable
              rows={filteredTickets}
              rowKey={(ticket) => ticket.id ?? `${ticket.machineId}-${ticket.status}-${ticket.scheduledDueAt}`}
              emptyMessage="Chưa có phiếu bảo trì trong phạm vi được giao."
              columns={[
                { key: "ticket", header: "Phiếu bảo trì / máy", render: (ticket) => <div className={tableStyles.tableCellStack}><strong>{ticket.id ? <TextLinkButton href={PATH_TECHNICIAN.TASK_MAINTENANCE_TICKET_DETAIL(ticket.id)}>Phiếu {<TruncatedId value={ticket.id} />}</TextLinkButton> : "Phiếu chưa có mã"}</strong><span className={tableStyles.tableSubtext}>{ticket.machineId ? <TruncatedId value={ticket.machineId} /> : "Chưa có mã máy"}</span></div> },
                { key: "status", header: "Trạng thái", render: (ticket) => <StatusBadge variant="dot" status={ticket.status} tone={ticket.status === "RESOLVED" ? "success" : undefined}>{ticket.status ? maintenanceStatusLabels[ticket.status] : "—"}</StatusBadge> },
                { key: "date", header: "Lịch / hoàn tất", render: (ticket) => formatDate(ticket.scheduledDueAt ?? ticket.completedAt) },
              ]}
            />
          ) : null}
          <Pagination page={ticketPage} hasNext={Boolean(tickets.data?.hasNext)} isFetching={tickets.isFetching} ariaLabel={messages.HISTORY_TICKETS_PAGINATION} onPageChange={setTicketPage} hideWhenSinglePage={false} />
        </Panel>
        <Panel title="Yêu cầu bảo trì và sửa chữa" aria-label="Yêu cầu bảo trì và sửa chữa">
          {requests.isSuccess ? (
            <DataTable
              rows={filteredRequests.slice(requestPage * 10, (requestPage + 1) * 10)}
              rowKey={(request) => request.id}
              emptyMessage="Chưa có yêu cầu liên quan trong phạm vi được giao."
              columns={[
                { key: "id", header: "Mã yêu cầu", render: (request) => <TextLinkButton href={`/technician/history/requests/${request.id}`}><TruncatedId value={request.id} /></TextLinkButton> },
                { key: "machine", header: "Mã máy", render: (request) => <TruncatedId value={request.machineId} /> },
                { key: "type", header: "Loại", render: (request) => request.requestType === "REPAIR" ? "Sửa chữa" : "Bảo trì định kỳ" },
                { key: "status", header: "Trạng thái", render: (request) => <StatusBadge variant="dot" status={request.status}>{requestStatusLabels[request.status]}</StatusBadge> },
                { key: "description", header: "Mô tả", render: (request) => request.issueDescription?.trim() || "—" },
              ]}
            />
          ) : null}
          <Pagination page={requestPage} hasNext={(requestPage + 1) * 10 < filteredRequests.length} totalPages={Math.max(1, Math.ceil(filteredRequests.length / 10))} ariaLabel={messages.HISTORY_REQUESTS_PAGINATION} onPageChange={setRequestPage} hideWhenSinglePage={false} />
        </Panel>
      </section>
    </TechnicianShell>
  );
}
