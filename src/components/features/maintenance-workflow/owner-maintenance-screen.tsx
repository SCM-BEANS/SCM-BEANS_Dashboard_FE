import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { BackButtonHeading } from "@/components/navigation/back-button-heading";
import { PageActions } from "@/components/action-bar/page-actions";
import { buildOwnerMaintenanceAppointmentActions } from "@/components/action-bar/entity-page-actions";
import { DataTable } from "@/components/table/data-table";
import { RepairWorkflowPagination } from "@/components/features/repair-workflow/repair-workflow-pagination";
import { maintenanceRequestsApi } from "@/apis/maintenance-requests.api";
import { MaintenanceCustodyStepper } from "@/components/features/repair-workflow/maintenance-custody-stepper";
import { getApiErrorMessage } from "@/lib/api-errors";
import { MaintenanceRequestIdSchema, type MaintenanceRequest } from "@/schema/machines.schema";
import { querySubject } from "@/components/features/repair-workflow/repair-workflow-query-identity";
import { maintenanceRequestDetailQueryKey } from "@/components/features/repair-workflow/maintenance-request-query-keys";
import { PATH_CUSTOMER } from "@/routes/path";
import { StatusBadge } from "@/components/status-badge/status-badge";
import { maintenanceRequestStatusLabel } from "./maintenance-status-labels";
import styles from "./owner-maintenance-screen.module.css";

const PAGE_SIZE = 50;

function formatDateTime(value: string | null | undefined) {
  if (!value) return "—";
  const timestamp = Date.parse(value);
  return Number.isNaN(timestamp)
    ? value
    : new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium", timeStyle: "short" }).format(timestamp);
}

function dateTimeInputValue(value: string | null | undefined) {
  return value ? value.slice(0, 16) : "";
}

function requestTypeLabel(request: MaintenanceRequest) {
  return request.requestType === "PREVENTIVE" ? "Bảo trì định kỳ" : "Sửa chữa";
}

function RequestDetail({ requestId, listHref }: { requestId: string; listHref: string }) {
  const queryClient = useQueryClient();
  const [appointmentAt, setAppointmentAt] = useState("");
  const [feedback, setFeedback] = useState<{ kind: "success" | "error"; text: string } | null>(null);
  const validId = MaintenanceRequestIdSchema.safeParse(requestId).success;
  const queryKey = maintenanceRequestDetailQueryKey("owner", requestId);
  const requestQuery = useQuery({
    queryKey,
    queryFn: ({ signal }) => maintenanceRequestsApi.getById(requestId, signal),
    enabled: validId,
    retry: false,
  });
  const request = requestQuery.data;

  useEffect(() => {
    if (request) setAppointmentAt(dateTimeInputValue(
      request.confirmedAppointmentAt ?? request.requestedAppointmentAt ?? request.windowStart ?? request.scheduledDueAt,
    ));
  }, [request]);

  const confirm = useMutation({
    mutationFn: () => maintenanceRequestsApi.confirm(requestId, { appointmentAt }),
    onMutate: () => setFeedback(null),
    onSuccess: async () => {
      setFeedback({ kind: "success", text: "Lịch bảo trì đã được xác nhận." });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey }),
        queryClient.invalidateQueries({ queryKey: ["dolores", "owner-maintenance", querySubject("owner"), "list"] }),
      ]);
    },
    onError: (error: unknown) => setFeedback({ kind: "error", text: getApiErrorMessage(error) }),
  });

  const canConfirm = request?.requestType === "PREVENTIVE"
    && (request.status === "REQUESTED" || request.status === "RESCHEDULE_REQUESTED");
  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (canConfirm && appointmentAt) confirm.mutate();
  };

  return (
    <section className={styles.pageContent} aria-labelledby="owner-maintenance-detail-title">
      <BackButtonHeading
        back={{ label: "Danh sách bảo trì", fallbackHref: listHref }}
        title="Chi tiết bảo trì"
        titleId="owner-maintenance-detail-title"
        description="Xem lịch và trạng thái bảo trì thiết bị của bạn."
        className={styles.pageHeading}
      />
      {!validId ? <p className={styles.notice} role="alert">Mã yêu cầu bảo trì không hợp lệ.</p> : null}
      {validId && requestQuery.isPending ? <p className={styles.notice} role="status">Đang tải yêu cầu bảo trì…</p> : null}
      {validId && requestQuery.isError ? (
        <div className={[styles.notice, styles.error].join(" ")} role="alert">
          <p>{getApiErrorMessage(requestQuery.error)}</p>
          <button className={styles.button} type="button" onClick={() => void requestQuery.refetch()}>Thử lại</button>
        </div>
      ) : null}
      {request ? (
        <>
          <dl className={styles.detailGrid}>
            <div><dt>Mã yêu cầu</dt><dd className={styles.code}>{request.id}</dd></div>
            <div><dt>Loại yêu cầu</dt><dd>{requestTypeLabel(request)}</dd></div>
            <div><dt>Thiết bị</dt><dd className={styles.code}>{request.machineId}</dd></div>
            <div><dt>Trạng thái</dt><dd><StatusBadge status={request.status}>{maintenanceRequestStatusLabel(request.status)}</StatusBadge></dd></div>
            <div><dt>Lịch bắt đầu</dt><dd>{formatDateTime(request.windowStart ?? request.scheduledDueAt)}</dd></div>
            <div><dt>Lịch kết thúc</dt><dd>{formatDateTime(request.windowEnd)}</dd></div>
            <div><dt>Lịch đã xác nhận</dt><dd>{formatDateTime(request.confirmedAppointmentAt)}</dd></div>
            <div><dt>Ticket bảo trì</dt><dd className={styles.code}>{request.maintenanceTicketId ?? "Chưa tạo"}</dd></div>
          </dl>
          {request.issueDescription ? <p className={styles.notice}>{request.issueDescription}</p> : null}
          {canConfirm ? (
            <>
            <PageActions actions={buildOwnerMaintenanceAppointmentActions({ role: "owner", request, appointmentAt, pending: confirm.isPending, formId: "maintenance-appointment-form" })} />
            <form id="maintenance-appointment-form" className={styles.form} onSubmit={onSubmit}>
              <label htmlFor="maintenance-appointment">Chọn thời gian hẹn</label>
              <input
                id="maintenance-appointment"
                type="datetime-local"
                value={appointmentAt}
                min={dateTimeInputValue(request.windowStart)}
                max={dateTimeInputValue(request.windowEnd)}
                onChange={(event) => setAppointmentAt(event.target.value)}
                required
              />
              <p className={styles.hint}>Thời gian phải nằm trong khung bảo trì của hợp đồng.</p>
            </form>
            </>
          ) : null}
          {request.requestType === "PREVENTIVE" ? (
            <MaintenanceCustodyStepper requestId={request.id} role="owner" initialRequest={request} />
          ) : null}
        </>
      ) : null}
      {feedback ? <p className={[styles.notice, feedback.kind === "error" ? styles.error : styles.success].join(" ")} role={feedback.kind === "error" ? "alert" : "status"}>{feedback.text}</p> : null}
      {requestQuery.isSuccess && !request ? <p className={styles.notice} role="status">Không tìm thấy yêu cầu bảo trì.</p> : null}
    </section>
  );
}

export function OwnerMaintenanceScreen({ requestId }: { requestId?: string }) {
  const [page, setPage] = useState(0);
  const isDetail = typeof requestId === "string";
  const requests = useQuery({
    queryKey: ["dolores", "owner-maintenance", querySubject("owner"), "list", page, PAGE_SIZE],
    queryFn: ({ signal }) => maintenanceRequestsApi.listPage({ requestType: "PREVENTIVE", page, size: PAGE_SIZE }, signal),
    enabled: !isDetail,
    retry: false,
  });

  if (isDetail) return <RequestDetail requestId={requestId} listHref={PATH_CUSTOMER.MAINTENANCE} />;

  return (
    <section className={styles.pageContent} aria-labelledby="owner-maintenance-title">
      <BackButtonHeading
        back={{ label: "Tổng quan", fallbackHref: PATH_CUSTOMER.ROOT }}
        title="Lịch bảo trì"
        titleId="owner-maintenance-title"
        description="Theo dõi yêu cầu bảo trì định kỳ và xác nhận lịch hẹn."
        className={styles.pageHeading}
      />
      {requests.isPending ? <p className={styles.notice} role="status">Đang tải lịch bảo trì…</p> : null}
      {requests.isError ? (
        <div className={[styles.notice, styles.error].join(" ")} role="alert">
          <p>{getApiErrorMessage(requests.error)}</p>
          <button className={styles.button} type="button" onClick={() => void requests.refetch()}>Thử lại</button>
        </div>
      ) : null}
      {requests.data ? (
        <>
          <DataTable
            rows={requests.data.items}
            rowKey={(request) => request.id}
            emptyMessage="Chưa có yêu cầu bảo trì định kỳ."
            columns={[
              { key: "id", header: "Mã yêu cầu", render: (request) => <Link className={styles.link} href={PATH_CUSTOMER.MAINTENANCE_DETAIL(request.id)}>{request.id}</Link> },
              { key: "machine", header: "Thiết bị", render: (request) => <span className={styles.code}>{request.machineId}</span> },
              { key: "status", header: "Trạng thái", render: (request) => <StatusBadge status={request.status}>{maintenanceRequestStatusLabel(request.status)}</StatusBadge> },
              { key: "appointment", header: "Lịch hẹn", render: (request) => formatDateTime(request.confirmedAppointmentAt ?? request.requestedAppointmentAt ?? request.scheduledDueAt) },
              { key: "updated", header: "Cập nhật", render: (request) => formatDateTime(request.updatedAt ?? request.createdAt) },
            ]}
          />
          <RepairWorkflowPagination
            page={requests.data.page}
            hasNext={requests.data.hasNext}
            isFetching={requests.isFetching}
            ariaLabel="Phân trang lịch bảo trì"
            onPageChange={setPage}
          />
        </>
      ) : null}
    </section>
  );
}
