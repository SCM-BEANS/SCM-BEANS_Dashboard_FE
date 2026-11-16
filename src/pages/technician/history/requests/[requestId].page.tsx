import type { GetServerSideProps } from "next";
import { useQuery } from "@tanstack/react-query";
import { maintenanceRequestsApi } from "@/apis/maintenance-requests.api";
import { BackButtonHeading } from "@/components/navigation/back-button-heading";
import { ButtonBar } from "@/components/button/button-bar";
import { StatusBadge } from "@/components/status-badge/status-badge";
import { getApiErrorMessage } from "@/lib/api-errors";
import { authScopedQuerySubject } from "@/lib/query-subject";
import { MaintenanceRequestIdSchema } from "@/schema/machines.schema";
import { PATH_TECHNICIAN } from "@/routes/path";
import { TechnicianShell } from "@/pages/technician/technician-shell";
import styles from "@/components/features/maintenance-workflow/technician-maintenance-ticket-screen.module.css";

export const getServerSideProps: GetServerSideProps<{ requestId: string }> = async ({ params }) => {
  const requestId = typeof params?.requestId === "string" ? params.requestId : "";
  return MaintenanceRequestIdSchema.safeParse(requestId).success ? { props: { requestId } } : { notFound: true };
};

export default function TechnicianRequestPage({ requestId }: { requestId: string }) {
  const query = useQuery({
    queryKey: ["dolores", "technician", authScopedQuerySubject("TECHNICIAN"), "maintenance-request", requestId],
    queryFn: ({ signal }) => maintenanceRequestsApi.getById(requestId, signal),
    retry: false,
  });
  const request = query.data;
  return <TechnicianShell pageTitle="Chi tiết yêu cầu kỹ thuật">
    <section className={styles.pageContent}>
      <div className={styles.pageHeader}>
        <BackButtonHeading back={{ label: "Lịch sử máy", fallbackHref: PATH_TECHNICIAN.HISTORY }} title="Chi tiết yêu cầu kỹ thuật" titleId="technician-request-title" className={styles.pageHeading} />
        {request?.maintenanceTicketId ? <ButtonBar rollingLabel href={PATH_TECHNICIAN.TASK_MAINTENANCE_TICKET_DETAIL(request.maintenanceTicketId)}>Xem phiếu bảo trì</ButtonBar> : null}
      </div>
      {query.isPending ? <p role="status">Đang tải yêu cầu…</p> : null}
      {query.isError ? <div className={styles.notice} role="alert"><p>{getApiErrorMessage(query.error)}</p><ButtonBar onClick={() => void query.refetch()}>Thử lại</ButtonBar></div> : null}
      {request ? <section className={styles.panel}>
        <h2>Thông tin yêu cầu</h2>
        <dl className={styles.detailGrid}>
          <div><dt>Mã yêu cầu</dt><dd>{request.id}</dd></div>
          <div><dt>Máy</dt><dd>{request.machineId}</dd></div>
          <div><dt>Loại yêu cầu</dt><dd>{request.requestType === "REPAIR" ? "Sửa chữa" : "Bảo trì định kỳ"}</dd></div>
          <div><dt>Trạng thái</dt><dd><StatusBadge variant="dot" status={request.status}>{({ REQUESTED: "Đã gửi", TRIAGED: "Đang xem xét", RESCHEDULE_REQUESTED: "Đề nghị đổi lịch", CONFIRMED: "Đã xác nhận", IN_PROGRESS: "Đang xử lý", COMPLETED: "Đã hoàn tất", CLOSED: "Đã đóng", OVERDUE_REVIEW: "Chờ xem xét quá hạn", CANCELLED: "Đã hủy" })[request.status]}</StatusBadge></dd></div>
        </dl>
        <h2>Nội dung yêu cầu</h2><p>{request.issueDescription?.trim() || "Chưa có mô tả."}</p>
      </section> : null}
    </section>
  </TechnicianShell>;
}
