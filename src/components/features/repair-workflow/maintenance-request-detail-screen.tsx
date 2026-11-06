import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState, type ReactNode } from "react";
import { TextLinkButton } from "@/components/button/text-link-button";
import { BackButtonHeading } from "@/components/navigation/back-button-heading";
import { TruncatedId } from "@/components/truncated-id/truncated-id";
import { machinesApi } from "@/apis/machines.api";
import { maintenanceRequestsApi } from "@/apis/maintenance-requests.api";
import { profilesApi } from "@/apis/profiles.api";
import { getApiErrorMessage } from "@/lib/api-errors";
import { MaintenanceRequestIdSchema, type MaintenanceRequest } from "@/schema/machines.schema";
import { ProfileIdSchema } from "@/schema/profiles.schema";
import { querySubject, type RepairWorkflowRole } from "./repair-workflow-query-identity";
import { MODERATOR_MESSAGES } from "@/text/moderator/moderator-messages";
import { RepairWorkflowPagination } from "@/components/features/repair-workflow/repair-workflow-pagination";
import styles from "./repair-workflow.module.css";

const messages = MODERATOR_MESSAGES.READ_SCREENS;

const statusLabels: Record<MaintenanceRequest["status"], string> = {
  REQUESTED: "Đã gửi",
  TRIAGED: "Đang xem xét",
  RESCHEDULE_REQUESTED: "Đã yêu cầu đổi lịch",
  CONFIRMED: "Đã xác nhận",
  IN_PROGRESS: "Đang xử lý",
  COMPLETED: "Đã hoàn tất",
  CLOSED: "Đã đóng",
  OVERDUE_REVIEW: "Chờ xem xét quá hạn",
  CANCELLED: "Đã hủy",
};

function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  const timestamp = Date.parse(value);
  return Number.isNaN(timestamp)
    ? value
    : new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium", timeStyle: "short" }).format(timestamp);
}

function typeLabel(request: MaintenanceRequest): string {
  return request.requestType === "REPAIR" ? "Sửa chữa" : "Bảo trì định kỳ";
}

function scheduleLabel(request: MaintenanceRequest): string {
  if (request.confirmedAppointmentAt) return `Đã xác nhận: ${formatDate(request.confirmedAppointmentAt)}`;
  if (request.requestedAppointmentAt) return `Đề nghị: ${formatDate(request.requestedAppointmentAt)}`;
  if (request.windowStart || request.windowEnd) {
    return `${formatDate(request.windowStart)} – ${formatDate(request.windowEnd)}`;
  }
  return formatDate(request.scheduledDueAt);
}

function DetailValue({ label, value, code = false }: { label: string; value: ReactNode; code?: boolean }) {
  return (
    <div className={styles.detailItem}>
      <dt>{label}</dt>
      <dd className={code ? styles.codeValue : undefined}>{value}</dd>
    </div>
  );
}

function MaintenanceRequestDetails({ request }: { request: MaintenanceRequest }) {
  return (
    <>
      <dl className={styles.detailGrid}>
        <DetailValue label={messages.TECHNICAL_ID} value={<TruncatedId value={request.id} />} code />
        <DetailValue label={messages.TECHNICAL_TYPE} value={typeLabel(request)} />
        <DetailValue label={messages.TECHNICAL_OWNER} value={<TruncatedId value={request.ownerId} />} code />
        <DetailValue label={messages.TECHNICAL_CONTRACT_ID} value={<TruncatedId value={request.contractId} />} code />
        <DetailValue label={messages.TECHNICAL_MACHINE_ID} value={<TruncatedId value={request.machineId} />} code />
        <DetailValue label={messages.TECHNICAL_SCHEDULED} value={scheduleLabel(request)} />
        <DetailValue label={messages.TECHNICAL_STATUS} value={statusLabels[request.status]} />
        <DetailValue label={messages.TECHNICAL_TICKET} value={request.maintenanceTicketId ?? "—"} code />
        <DetailValue label="Mã phân công máy thay thế" value={request.replacementAssignmentId ?? "—"} code />
        <DetailValue label={messages.TECHNICAL_DATE} value={formatDate(request.createdAt)} />
        <DetailValue label={messages.TECHNICAL_UPDATED} value={formatDate(request.updatedAt)} />
      </dl>
      {request.issueDescription && (
        <section className={styles.pendingNotice}>
          <h2 className={styles.sectionTitle}>{messages.TECHNICAL_NOTES}</h2>
          <p>{request.issueDescription}</p>
        </section>
      )}
    </>
  );
}

export function MaintenanceRequestDetailScreen({
  id,
  listHref,
  caseDetailHref,
  role,
}: {
  id: string;
  listHref: string;
  caseDetailHref: (caseId: string) => string;
  role: Extract<RepairWorkflowRole, "admin" | "moderator">;
}) {
  const validId = MaintenanceRequestIdSchema.safeParse(id).success;
  const queryClient = useQueryClient();
  const [technicianId, setTechnicianId] = useState("");
  const [technicianSearchInput, setTechnicianSearchInput] = useState("");
  const [technicianSearch, setTechnicianSearch] = useState("");
  const [technicianPage, setTechnicianPage] = useState(0);
  const [operatorFeedback, setOperatorFeedback] = useState<{ kind: "success" | "error"; text: string } | null>(null);
  const requestQuery = useQuery({
    queryKey: ["dolores", "repair-workflow", querySubject(role), "request", id],
    queryFn: ({ signal }) => maintenanceRequestsApi.getById(id, signal),
    enabled: validId,
    retry: false,
  });
  const request = requestQuery.data;
  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setTechnicianSearch(technicianSearchInput.trim());
      setTechnicianPage(0);
    }, 250);
    return () => window.clearTimeout(timeoutId);
  }, [technicianSearchInput]);
  const ticketQuery = useQuery({
    queryKey: ["dolores", "repair-workflow", querySubject(role), "ticket", request?.maintenanceTicketId],
    queryFn: ({ signal }) => machinesApi.getMaintenanceTicketById(request!.maintenanceTicketId!, signal),
    enabled: Boolean(request?.maintenanceTicketId),
    retry: false,
  });
  const isAdmin = role === "admin";
  const techniciansQuery = useQuery({
    queryKey: ["dolores", "profiles", querySubject(role), "TECHNICIAN", "ACTIVE", "maintenance-assignment", ticketQuery.data?.id, technicianSearch, technicianPage],
    queryFn: ({ signal }) => profilesApi.list({ role: "TECHNICIAN", status: "ACTIVE", q: technicianSearch || undefined, page: technicianPage, size: 20 }, signal),
    enabled: isAdmin && request?.requestType === "PREVENTIVE" && Boolean(ticketQuery.data?.id) && !ticketQuery.data?.assignedTechnicianId,
    retry: false,
  });
  const createWorkOrder = useMutation({
    mutationFn: () => maintenanceRequestsApi.createWorkOrder(id),
    onMutate: () => setOperatorFeedback(null),
    onSuccess: async (ticket) => {
      setOperatorFeedback({ kind: "success", text: "Đã tạo phiếu bảo trì. Mã ticket: " + ticket.id });
      await Promise.all([
        queryClient.setQueryData(["dolores", "repair-workflow", querySubject(role), "ticket", ticket.id], ticket),
        queryClient.invalidateQueries({ queryKey: ["dolores", "repair-workflow", querySubject(role), "request", id] }),
        queryClient.invalidateQueries({ queryKey: ["dolores", "maintenance-requests"] }),
        queryClient.invalidateQueries({ queryKey: ["dolores", "maintenance-tickets"] }),
      ]);
    },
    onError: async (error: unknown) => {
      setOperatorFeedback({ kind: "error", text: getApiErrorMessage(error) });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["dolores", "repair-workflow", querySubject(role), "request", id] }),
        queryClient.invalidateQueries({ queryKey: ["dolores", "maintenance-requests"] }),
        queryClient.invalidateQueries({ queryKey: ["dolores", "maintenance-tickets"] }),
      ]);
    },
  });
  const assignTechnician = useMutation({
    mutationFn: () => {
      if (!isAdmin) throw new Error(messages.TECHNICAL_ASSIGNMENT_ADMIN_REQUIRED);
      const selected = ProfileIdSchema.parse(technicianId);
      const profile = techniciansQuery.data?.items.find((item) => item.idaasUserId === selected);
      if (!profile || profile.status !== "ACTIVE" || !profile.emailVerified || !profile.roles.includes("TECHNICIAN")) {
        throw new Error("Chỉ có thể giao việc cho hồ sơ kỹ thuật viên đang hoạt động và đã xác minh email.");
      }
      return machinesApi.assignMaintenanceTicket(ticketQuery.data!.id!, {
        technicianId: selected,
        assignedTo: profile.fullName.trim() || profile.email,
      });
    },
    onMutate: () => setOperatorFeedback(null),
    onSuccess: async () => {
      setOperatorFeedback({ kind: "success", text: "Đã giao ticket cho kỹ thuật viên." });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["dolores", "repair-workflow", querySubject(role), "ticket", ticketQuery.data?.id] }),
        queryClient.invalidateQueries({ queryKey: ["dolores", "maintenance-requests"] }),
        queryClient.invalidateQueries({ queryKey: ["dolores", "maintenance-tickets"] }),
      ]);
    },
    onError: async (error: unknown) => {
      setOperatorFeedback({ kind: "error", text: getApiErrorMessage(error) });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["dolores", "repair-workflow", querySubject(role), "ticket", ticketQuery.data?.id] }),
        queryClient.invalidateQueries({ queryKey: ["dolores", "maintenance-requests"] }),
        queryClient.invalidateQueries({ queryKey: ["dolores", "maintenance-tickets"] }),
      ]);
    },
  });
  const eligibleTechnicians = (techniciansQuery.data?.items ?? []).filter((profile) =>
    profile.status === "ACTIVE" && profile.emailVerified && profile.roles.includes("TECHNICIAN"),
  );

  return (
    <div className={styles.pageContent}>
      <BackButtonHeading title={messages.TECHNICAL_REQUEST_DETAIL} titleId="maintenance-request-detail-title" description={messages.TECHNICAL_DESCRIPTION} className={styles.pageHeading} back={{ label: "Quay lại danh sách yêu cầu", fallbackHref: listHref }} />
      {!validId && <p className={styles.pendingNotice} role="status">{id || "—"}: Mã yêu cầu bảo trì không hợp lệ.</p>}
      {validId && requestQuery.isPending && <p className={styles.pendingNotice} role="status">{messages.LOADING_MAINTENANCE_REQUESTS}</p>}
      {validId && requestQuery.isError && (
        <div className={styles.pendingNotice} role="alert">
          <p>{getApiErrorMessage(requestQuery.error)}</p>
          <button className={styles.retryButton} type="button" onClick={() => void requestQuery.refetch()}>{messages.RETRY}</button>
        </div>
      )}
      {request && !requestQuery.isError && <MaintenanceRequestDetails request={request} />}
      {request?.requestType === "PREVENTIVE" && !request.maintenanceTicketId && (
        <section className={styles.pendingNotice} aria-labelledby="preventive-work-order-title">
          <h2 className={styles.sectionTitle} id="preventive-work-order-title">Lệnh bảo trì định kỳ</h2>
          {request.status === "CONFIRMED" && request.confirmedAppointmentAt ? (
            <button
              className={styles.inlineButton}
              type="button"
              disabled={createWorkOrder.isPending}
              onClick={() => createWorkOrder.mutate()}
            >
              {createWorkOrder.isPending ? "Đang tạo phiếu…" : "Tạo phiếu bảo trì"}
            </button>
          ) : (
            <p>Chờ Owner xác nhận lịch hẹn trước khi tạo phiếu công việc.</p>
          )}
        </section>
      )}
      {ticketQuery.data && request?.requestType === "PREVENTIVE" ? (
        <section className={styles.pendingNotice} aria-labelledby="preventive-ticket-title">
          <h2 className={styles.sectionTitle} id="preventive-ticket-title">Phiếu bảo trì</h2>
          <p>Mã ticket: <span className={styles.codeValue}>{ticketQuery.data.id}</span></p>
          <p>Trạng thái: {ticketQuery.data.status ?? "—"}</p>
          <p>Kỹ thuật viên: {ticketQuery.data.assignedTo ?? ticketQuery.data.assignedTechnicianId ?? "Chưa được giao"}</p>
          {!ticketQuery.data.assignedTechnicianId ? isAdmin ? (
            <>
              {techniciansQuery.isPending ? <p role="status">Đang tải kỹ thuật viên đủ điều kiện…</p> : null}
              {techniciansQuery.isError ? <p role="alert">{getApiErrorMessage(techniciansQuery.error)}</p> : null}
              {techniciansQuery.data ? (
                <div className={styles.ticketAssignment}>
                  <label htmlFor="preventive-technician-search">Tìm kỹ thuật viên</label>
                  <input
                    id="preventive-technician-search"
                    type="search"
                    value={technicianSearchInput}
                    onChange={(event) => setTechnicianSearchInput(event.target.value)}
                    placeholder="Tên hoặc email"
                  />
                  <label htmlFor="preventive-technician">Kỹ thuật viên</label>
                  <select
                    id="preventive-technician"
                    value={technicianId}
                    disabled={eligibleTechnicians.length === 0}
                    onChange={(event) => setTechnicianId(event.target.value)}
                  >
                    <option value="">Chọn kỹ thuật viên</option>
                    {eligibleTechnicians.map((profile) => (
                      <option key={profile.idaasUserId} value={profile.idaasUserId}>
                        {profile.fullName || profile.email}
                      </option>
                    ))}
                  </select>
                  {eligibleTechnicians.length === 0 ? <p>Không có hồ sơ kỹ thuật viên đủ điều kiện trên trang này.</p> : null}
                  <button
                    className={styles.inlineButton}
                    type="button"
                    disabled={!technicianId || assignTechnician.isPending}
                    onClick={() => assignTechnician.mutate()}
                  >
                    {assignTechnician.isPending ? "Đang giao việc…" : "Giao cho kỹ thuật viên"}
                  </button>
                  <RepairWorkflowPagination
                    page={techniciansQuery.data.page}
                    hasNext={techniciansQuery.data.page + 1 < techniciansQuery.data.totalPages}
                    isFetching={techniciansQuery.isFetching}
                    ariaLabel="Phân trang kỹ thuật viên"
                    onPageChange={setTechnicianPage}
                  />
                </div>
              ) : null}
            </>
          ) : <p>{messages.TECHNICAL_ASSIGNMENT_ADMIN_REQUIRED}</p> : null}
        </section>
      ) : null}
      {ticketQuery.isSuccess && !ticketQuery.data && request?.maintenanceTicketId ? (
        <p className={styles.pendingNotice} role="status">Ticket liên kết chưa có phản hồi chi tiết.</p>
      ) : null}
      {operatorFeedback ? (
        <p className={styles.pendingNotice} role={operatorFeedback.kind === "error" ? "alert" : "status"}>{operatorFeedback.text}</p>
      ) : null}
      {ticketQuery.isError ? <p className={styles.pendingNotice} role="alert">{getApiErrorMessage(ticketQuery.error)}</p> : null}
      {ticketQuery.data?.repairCaseId ? (
        <section className={styles.pendingNotice} aria-label="Hồ sơ sửa chữa liên quan">
          <h2 className={styles.sectionTitle}>Hồ sơ sửa chữa</h2>
          <TextLinkButton href={caseDetailHref(ticketQuery.data.repairCaseId)}>
            Mở dòng thời gian hồ sơ sửa chữa {ticketQuery.data.repairCaseId}
          </TextLinkButton>
        </section>
      ) : null}
      {request?.requestType === "REPAIR" && request.status === "TRIAGED" && !request.maintenanceTicketId && (
        <p className={styles.pendingNotice} role="status">Hồ sơ sửa chữa đang được khởi tạo sau khi phân loại yêu cầu.</p>
      )}
      {requestQuery.isSuccess && !request && <p className={styles.pendingNotice} role="status">Không tìm thấy yêu cầu bảo trì này trong danh sách Dolores.</p>}
    </div>
  );
}
