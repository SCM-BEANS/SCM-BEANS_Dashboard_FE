import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { DataTable, type DataTableColumn } from "@/components/table/data-table";
import { TextLinkButton } from "@/components/button/text-link-button";
import { RepairCaseListPanel } from "@/components/features/repair-workflow/repair-case-list-panel";
import { querySubject } from "@/components/features/repair-workflow/repair-workflow-query-identity";
import { RepairWorkflowPagination } from "@/components/features/repair-workflow/repair-workflow-pagination";
import { machinesApi } from "@/apis/machines.api";
import { maintenanceRequestsApi } from "@/apis/maintenance-requests.api";
import type { MaintenanceRequest } from "@/schema/machines.schema";
import { CUSTOMER_MESSAGES } from "@/text/customer/customer-messages";
import { PATH_CUSTOMER } from "@/routes/path";
import styles from "../customer-shell.module.css";

const messages = CUSTOMER_MESSAGES.WORKFLOWS;

const requestStatusLabels: Record<MaintenanceRequest["status"], string> = {
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

export function SupportRequestsListScreen() {
  const [page, setPage] = useState(0);
  const list = useQuery({
    queryKey: ["dolores", "maintenance-requests", querySubject("owner"), page, 50],
    queryFn: ({ signal }) => maintenanceRequestsApi.listPage({ page, size: 50, requestType: "REPAIR" }, signal),
  });
  const machines = useQuery({
    queryKey: ["owner-machines", querySubject("owner")],
    queryFn: ({ signal }) => machinesApi.list(signal),
  });
  const requests = list.data?.items ?? [];
  const isListLoading = !list.isError && (list.isPending || machines.isPending);
  const machineLabels = new Map((machines.data ?? []).map((machine) => [machine.id, machine.serialNumber] as const));
  const columns: readonly DataTableColumn<MaintenanceRequest>[] = [
    {
      key: "request-id",
      header: messages.SUPPORT_TABLE_REQUEST_ID,
      render: (request) => <TextLinkButton href={PATH_CUSTOMER.SUPPORT_DETAIL(request.id)}>{request.id}</TextLinkButton>,
    },
    {
      key: "machine",
      header: messages.SUPPORT_TABLE_MACHINE,
      render: (request) => machineLabels.get(request.machineId) || request.machineId,
    },
    {
      key: "content",
      header: messages.SUPPORT_TABLE_CONTENT,
      render: (request) => request.issueDescription?.trim() || "—",
    },
    {
      key: "status",
      header: messages.SUPPORT_TABLE_STATUS,
      render: (request) => requestStatusLabels[request.status],
    },
  ];

  return (
    <section className={styles.pageContent} aria-labelledby="customer-support-title">
      <header className={styles.pageHeading}>
        <h1 id="customer-support-title">{messages.SUPPORT_TITLE}</h1>
        <p>{messages.SUPPORT_DESCRIPTION}</p>
      </header>
      <section className={styles.dataPanel} aria-labelledby="customer-support-list-heading">
        <h2 id="customer-support-list-heading">{messages.SUPPORT_LIST_TITLE}</h2>
        {isListLoading ? (
          <p className={styles.loadingNotice} role="status">{CUSTOMER_MESSAGES.READ_SCREENS.LOADING}</p>
        ) : null}
        {list.isError ? (
          <div className={styles.errorNotice} role="alert">
            <p>{CUSTOMER_MESSAGES.READ_SCREENS.LOAD_ERROR}</p>
            <button className={styles.secondaryButton} type="button" onClick={() => void list.refetch()}>
              {messages.SUPPORT_RETRY}
            </button>
          </div>
        ) : null}
        {machines.isError ? (
          <div className={styles.errorNotice} role="alert">
            <p>Không tải được tên máy; danh sách vẫn hiển thị mã máy.</p>
            <button className={styles.secondaryButton} type="button" onClick={() => void machines.refetch()}>
              {messages.SUPPORT_RETRY}
            </button>
          </div>
        ) : null}
        {!isListLoading && !list.isError ? (
          <DataTable
            columns={columns}
            rows={requests}
            rowKey={(request) => request.id}
            variant="customer"
          />
        ) : null}
        {!isListLoading && !list.isError && list.data ? (
          <RepairWorkflowPagination
            page={list.data.page}
            hasNext={list.data.hasNext}
            isFetching={list.isFetching}
            ariaLabel="Phân trang yêu cầu hỗ trợ"
            onPageChange={setPage}
          />
        ) : null}
        {!isListLoading && !list.isError && requests.length === 0 ? (
          <p className={styles.emptyNotice} role="status">{messages.SUPPORT_LIST_EMPTY}</p>
        ) : null}
      </section>
      <RepairCaseListPanel
        role="owner"
        detailHref={PATH_CUSTOMER.SUPPORT_REPAIR_CASE_DETAIL}
        title="Hồ sơ sửa chữa"
        description="Xem trạng thái, lịch sử bàn giao và tiến độ sửa máy."
        showOwner={false}
      />
    </section>
  );
}
