import { TableFilters } from "@/components/table/table-filters";
import { Panel } from "@/components/panel/panel";
import { ButtonBar } from "@/components/button/button-bar";
import { TextLinkButton } from "@/components/button/text-link-button";
import { TruncatedId } from "@/components/truncated-id/truncated-id";
import { repairCasesApi } from "@/apis/repair-cases.api";
import { machinesApi } from "@/apis/machines.api";
import repairStyles from "@/components/features/repair-workflow/repair-workflow.module.css";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState, type FormEvent } from "react";
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

const PAGE_SIZE = 10;

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

export function OwnerMaintenanceRequestDetail({ requestId, listHref, support = false }: { requestId: string; listHref: string; support?: boolean }) {
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
  const repairRequest = support && request?.requestType === "REPAIR" ? request : undefined;
  const machines = useQuery({
    queryKey: ["owner-machines", querySubject("owner")],
    queryFn: ({ signal }) => machinesApi.list(signal),
    enabled: Boolean(request),
  });
  const machineId = repairRequest?.machineId;
  const caseReference = useQuery({
    queryKey: ["dolores", "repair-workflow", querySubject("owner"), "support-case", requestId, machineId],
    queryFn: ({ signal }) => repairCasesApi.findReferenceByMaintenanceRequestId(requestId, machineId ?? "", signal),
    enabled: Boolean(machineId && repairRequest?.maintenanceTicketId),
    retry: false,
  });

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

  if (support) {
    const serial = machines.data?.find((machine) => machine.id === machineId)?.serialNumber;
    return (
      <div className={repairStyles.operatorWorkspace}>
        <section className={repairStyles.pageContent} aria-labelledby="owner-support-detail-title">
          <BackButtonHeading
            back={{ label: "Danh sách yêu cầu", fallbackHref: listHref }}
            title="Chi tiết yêu cầu hỗ trợ"
            titleId="owner-support-detail-title"
            className={repairStyles.pageHeading}
          />
          {!validId || (requestQuery.isSuccess && !repairRequest) ? (
            <p className={repairStyles.notice} role="status">Không tìm thấy yêu cầu hỗ trợ.</p>
          ) : requestQuery.isPending ? (
            <p className={repairStyles.notice} role="status">Đang tải yêu cầu…</p>
          ) : requestQuery.isError ? (
            <div className={repairStyles.notice} role="alert">
              <p>{getApiErrorMessage(requestQuery.error)}</p>
              <ButtonBar onClick={() => void requestQuery.refetch()}>Thử lại</ButtonBar>
            </div>
          ) : repairRequest && (
            <div className={repairStyles.requestOverview}>
              <Panel className={repairStyles.panel}>
                <h2>Thông tin yêu cầu</h2>
                <dl className={repairStyles.detailGrid}>
                  <div className={repairStyles.detailItem}><dt>Mã yêu cầu</dt><dd><TruncatedId value={repairRequest.id} /></dd></div>
                  <div className={repairStyles.detailItem}><dt>Máy</dt><dd>{serial || <TruncatedId value={repairRequest.machineId} />}</dd></div>
                </dl>
                <div className={repairStyles.issueDescription}>
                  <h3>Nội dung yêu cầu</h3>
                  <p>{repairRequest.issueDescription?.trim() || "Chưa ghi nhận nội dung."}</p>
                </div>
              </Panel>
              <aside className={repairStyles.panel}>
                <h2>Tình trạng xử lý</h2>
                <span className={repairStyles.requestStatus} data-status={repairRequest.status}>
                  {maintenanceRequestStatusLabel(repairRequest.status, repairRequest.requestType)}
                </span>
                <dl className={repairStyles.detailGrid}>
                  <div className={repairStyles.detailItem}><dt>Ngày gửi</dt><dd>{formatDateTime(repairRequest.createdAt ?? repairRequest.reportedAt)}</dd></div>
                  <div className={repairStyles.detailItem}><dt>Cập nhật</dt><dd>{formatDateTime(repairRequest.updatedAt)}</dd></div>
                </dl>
                {caseReference.data && <TextLinkButton href={PATH_CUSTOMER.SUPPORT_REPAIR_CASE_DETAIL(caseReference.data.id)}>Hồ sơ sửa chữa</TextLinkButton>}
                {caseReference.isError && <ButtonBar onClick={() => void caseReference.refetch()}>Tải lại hồ sơ liên quan</ButtonBar>}
              </aside>
            </div>
          )}
        </section>
      </div>
    );
  }

  return (
    <section className={styles.pageContent} aria-labelledby="owner-maintenance-detail-title">
      <BackButtonHeading
        back={{ label: "Danh sách bảo trì", fallbackHref: listHref }}
        title="Chi tiết bảo trì"
        titleId="owner-maintenance-detail-title"
        className={styles.pageHeading}
      />
      {!validId ? <p className={styles.notice} role="alert">Mã yêu cầu bảo trì không hợp lệ.</p> : null}
      {validId && requestQuery.isPending ? <p className={styles.notice} role="status">Đang tải yêu cầu bảo trì…</p> : null}
      {validId && requestQuery.isError ? (
        <div className={[styles.notice, styles.error].join(" ")} role="alert">
          <p>{getApiErrorMessage(requestQuery.error)}</p>
          <ButtonBar className={styles.button} type="button" onClick={() => void requestQuery.refetch()}>Thử lại</ButtonBar>
        </div>
      ) : null}
      {request ? (
        <>
          <div className={styles.overview}>
          <Panel className={styles.panel}>
          <h2>Thông tin bảo trì</h2>
          <dl className={styles.detailGrid}>
            <div><dt>Mã yêu cầu</dt><dd><TruncatedId value={request.id} /></dd></div>
            <div><dt>Loại yêu cầu</dt><dd>{requestTypeLabel(request)}</dd></div>
            <div><dt>Máy</dt><dd>{machines.data?.find(machine => machine.id === request.machineId)?.serialNumber || <TruncatedId value={request.machineId} />}</dd></div>
            <div><dt>Trạng thái</dt><dd><StatusBadge variant="dot" status={request.status}>{maintenanceRequestStatusLabel(request.status)}</StatusBadge></dd></div>
          </dl>
          {request.issueDescription ? <div className={styles.description}><h3>Nội dung yêu cầu</h3><p>{request.issueDescription}</p></div> : null}
          <details className={styles.references}><summary>Mã liên kết</summary><p>Phiếu bảo trì: {request.maintenanceTicketId ? <TruncatedId value={request.maintenanceTicketId} /> : "Chưa tạo"}</p></details>
          </Panel>
          <Panel className={styles.panel}>
          <h2>Lịch hẹn bảo trì</h2>
          <dl className={styles.detailGrid}>
            <div><dt>Lịch bắt đầu</dt><dd>{formatDateTime(request.windowStart ?? request.scheduledDueAt)}</dd></div>
            <div><dt>Lịch kết thúc</dt><dd>{formatDateTime(request.windowEnd)}</dd></div>
            <div><dt>Lịch đã xác nhận</dt><dd>{formatDateTime(request.confirmedAppointmentAt)}</dd></div>
          </dl>
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
          </Panel>
          </div>
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
  const [draft, setDraft] = useState({ machineId: "", status: "" });
  const [filters, setFilters] = useState(draft);
  const isDetail = typeof requestId === "string";
  const requests = useQuery({
    queryKey: ["dolores", "owner-maintenance", querySubject("owner"), "list", page, PAGE_SIZE, filters],
    queryFn: ({ signal }) => maintenanceRequestsApi.listPage({ requestType: "PREVENTIVE", page, size: PAGE_SIZE, ...(filters.machineId ? { machineId: filters.machineId } : {}), ...(filters.status ? { status: filters.status as MaintenanceRequest["status"] } : {}) }, signal),
    enabled: !isDetail,
    retry: false,
  });
  const machines = useQuery({ queryKey: ["owner-machines", querySubject("owner")], queryFn: ({ signal }) => machinesApi.list(signal), enabled: !isDetail });

  if (isDetail) return <OwnerMaintenanceRequestDetail requestId={requestId} listHref={PATH_CUSTOMER.MAINTENANCE} />;

  return (
    <section className={styles.pageContent} aria-labelledby="owner-maintenance-title">
      <BackButtonHeading
        back={null}
        title="Lịch bảo trì"
        titleId="owner-maintenance-title"
        className={styles.pageHeading}
      />
      <Panel className={styles.panel} aria-labelledby="maintenance-list-title">
      <div className={styles.panelHeading}><h2 id="maintenance-list-title">Danh sách bảo trì</h2></div>
      <TableFilters className={styles.filters} onSubmit={event => { event.preventDefault(); setFilters(draft); setPage(0); }}>
        <select aria-label="Máy bảo trì" value={draft.machineId} onChange={event => setDraft(value => ({ ...value, machineId: event.target.value }))}><option value="">Tất cả máy</option>{machines.data?.map(machine => <option key={machine.id} value={machine.id}>{machine.serialNumber || machine.id}</option>)}</select>
        <select aria-label="Trạng thái bảo trì" value={draft.status} onChange={event => setDraft(value => ({ ...value, status: event.target.value }))}><option value="">Tất cả trạng thái</option>{(["REQUESTED", "TRIAGED", "RESCHEDULE_REQUESTED", "CONFIRMED", "IN_PROGRESS", "COMPLETED", "CLOSED", "OVERDUE_REVIEW", "CANCELLED"] as const).map(status => <option key={status} value={status}>{maintenanceRequestStatusLabel(status)}</option>)}</select>
        <ButtonBar type="submit" disabled={requests.isFetching}>Tìm kiếm</ButtonBar>
      </TableFilters>
      {requests.isPending ? <p className={styles.notice} role="status">Đang tải lịch bảo trì…</p> : null}
      {requests.isError ? (
        <div className={[styles.notice, styles.error].join(" ")} role="alert">
          <p>{getApiErrorMessage(requests.error)}</p>
          <ButtonBar className={styles.button} type="button" onClick={() => void requests.refetch()}>Thử lại</ButtonBar>
        </div>
      ) : null}
      {requests.data ? (
        <>
          <DataTable
            rows={requests.data.items}
            rowKey={(request) => request.id}
            emptyMessage="Chưa có yêu cầu bảo trì định kỳ."
            columns={[
              { key: "machine", header: "Máy / yêu cầu", render: (request) => <div className={styles.identity}><strong>{machines.data?.find(machine => machine.id === request.machineId)?.serialNumber || <TruncatedId value={request.machineId} />}</strong><span><TextLinkButton href={PATH_CUSTOMER.MAINTENANCE_DETAIL(request.id)}>Yêu cầu <TruncatedId value={request.id} /></TextLinkButton></span></div> },
              { key: "status", header: "Trạng thái", render: (request) => <StatusBadge variant="dot" status={request.status}>{maintenanceRequestStatusLabel(request.status)}</StatusBadge> },
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
      </Panel>
    </section>
  );
}
