import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { DataTable, type DataTableColumn } from "@/components/table/data-table";
import { Panel } from "@/components/panel/panel";
import { StatusBadge } from "@/components/status-badge/status-badge";
import { BackButtonHeading } from "@/components/navigation/back-button-heading";
import { ButtonBar } from "@/components/button/button-bar";
import { TextLinkButton } from "@/components/button/text-link-button";
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
      kind: "code",
      noWrap: true,
      render: (request) => <TextLinkButton href={PATH_CUSTOMER.SUPPORT_DETAIL(request.id)}><TruncatedId value={request.id} /></TextLinkButton>,
    },
    {
      key: "machine",
      header: messages.SUPPORT_TABLE_MACHINE,
      kind: "code",
      noWrap: true,
      render: (request) => machineLabels.get(request.machineId) || <TruncatedId value={request.machineId} />,
    },
    {
      key: "status",
      header: messages.SUPPORT_TABLE_STATUS,
      kind: "status",
      render: (request) => <StatusBadge status={request.status}>{maintenanceRequestStatusLabel(request.status, request.requestType)}</StatusBadge>,
    },
  ];

  return (
    <div className={repairStyles.operatorWorkspace}>
      <section className={repairStyles.pageContent} aria-labelledby="customer-support-title">
        <div className={repairStyles.supportListHeading}>
          <BackButtonHeading back={null} className={repairStyles.pageHeading} title={messages.SUPPORT_TITLE} titleId="customer-support-title" />
          <ButtonBar href={PATH_CUSTOMER.SUPPORT_NEW} variant="primary">Gửi yêu cầu mới</ButtonBar>
        </div>
        <Panel aria-labelledby="customer-support-list-heading">
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
        </Panel>
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
