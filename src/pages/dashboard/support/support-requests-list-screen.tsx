import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { DataTable, type DataTableColumn } from "@/components/table/data-table";
import { ButtonBar } from "@/components/button/button-bar";
import { TruncatedId } from "@/components/truncated-id/truncated-id";
import { maintenanceRequestStatusLabel } from "@/components/features/maintenance-workflow/maintenance-status-labels";
import repairStyles from "@/components/features/repair-workflow/repair-workflow.module.css";
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

const PAGE_SIZE = 10;

export function SupportRequestsListScreen() {
  const [page, setPage] = useState(0);
  const list = useQuery({
    queryKey: ["dolores", "maintenance-requests", querySubject("owner"), page, PAGE_SIZE, "REPAIR"],
    queryFn: ({ signal }) => maintenanceRequestsApi.listPage({ page, size: PAGE_SIZE, requestType: "REPAIR" }, signal),
  });
  const machines = useQuery({
    queryKey: ["owner-machines", querySubject("owner")],
    queryFn: ({ signal }) => machinesApi.list(signal),
  });
  const requests = list.data?.items ?? [];
  const isListLoading = list.isPending;
  const machineLabels = new Map((machines.data ?? []).map((machine) => [machine.id, machine.serialNumber] as const));
  const columns: readonly DataTableColumn<MaintenanceRequest>[] = [
    {
      key: "request-id",
      header: messages.SUPPORT_TABLE_REQUEST_ID,
      render: (request) => <TruncatedId value={request.id} />,
    },
    {
      key: "machine",
      header: messages.SUPPORT_TABLE_MACHINE,
      render: (request) => machineLabels.get(request.machineId) || <TruncatedId value={request.machineId} />,
    },
    {
      key: "status",
      header: messages.SUPPORT_TABLE_STATUS,
      render: (request) => <span className={repairStyles.requestStatus} data-status={request.status}>{maintenanceRequestStatusLabel(request.status, request.requestType)}</span>,
    },
    {
      key: "actions",
      header: "",
      render: (request) => <ButtonBar rollingLabel href={PATH_CUSTOMER.SUPPORT_DETAIL(request.id)}>Xem yêu cầu</ButtonBar>,
    },
  ];

  return (
    <div className={repairStyles.operatorWorkspace}>
      <section className={repairStyles.pageContent} aria-labelledby="customer-support-title">
        <header className={repairStyles.casePageHeader}>
          <div className={repairStyles.pageHeading}>
            <h1 id="customer-support-title">{messages.SUPPORT_TITLE}</h1>
            <p>{messages.SUPPORT_DESCRIPTION}</p>
          </div>
          <ButtonBar href={PATH_CUSTOMER.SUPPORT_NEW} variant="primary">Gửi yêu cầu mới</ButtonBar>
        </header>
        <section className={repairStyles.panel} aria-labelledby="customer-support-list-heading">
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
              variant="accounts"
              headerVariant="admin"
              emptyMessage={messages.SUPPORT_LIST_EMPTY}
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
        </section>
        <RepairCaseListPanel
          role="owner"
          detailHref={PATH_CUSTOMER.SUPPORT_REPAIR_CASE_DETAIL}
          title="Hồ sơ sửa chữa"
          description=""
          showOwner={false}
        />
        <div><ButtonBar href={PATH_CUSTOMER.SUPPORT_MENU}>Hỗ trợ công thức</ButtonBar></div>
      </section>
    </div>
  );
}
