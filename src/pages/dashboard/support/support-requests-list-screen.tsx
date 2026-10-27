import { useQuery } from "@tanstack/react-query";
import { DataTable, type DataTableColumn } from "@/components/table/data-table";
import { machinesApi } from "@/apis/machines.api";
import { maintenanceRequestsApi } from "@/apis/maintenance-requests.api";
import { repairCasesApi } from "@/apis/repair-cases.api";
import type { MaintenanceRequest, RepairCase } from "@/schema/machines.schema";
import { CUSTOMER_MESSAGES } from "@/text/customer/customer-messages";
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

const repairCaseStatusLabels: Record<RepairCase["status"], string> = {
  REPORTED: "Đã gửi",
  TRIAGE: "Đang xem xét",
  WAITING_REPLACEMENT: "Chờ máy thay thế",
  WAITING_OWNER_DECISION: "Chờ cửa hàng xác nhận",
  REPLACEMENT_PLANNED: "Đã lên kế hoạch thay máy",
  PRIMARY_COLLECTED: "Đã nhận máy cần sửa",
  REPLACEMENT_DELIVERED: "Đã giao máy thay thế",
  DIAGNOSIS: "Đang kiểm tra",
  REPAIR_IN_PROGRESS: "Đang sửa chữa",
  REPAIR_COMPLETED: "Đã sửa xong",
  REPLACEMENT_COLLECTED: "Đã thu hồi máy thay thế",
  PRIMARY_RETURNED: "Đã trả máy cho cửa hàng",
  OWNER_ACKNOWLEDGED: "Đã xác nhận bàn giao",
  CLOSED: "Đã đóng",
  REJECTED: "Đã từ chối",
  CANCELLED: "Đã hủy",
};

export function SupportRequestsListScreen() {
  const list = useQuery({
    queryKey: ["owner-maintenance-requests"],
    queryFn: ({ signal }) => maintenanceRequestsApi.list(signal),
  });
  const machines = useQuery({
    queryKey: ["owner-machines"],
    queryFn: ({ signal }) => machinesApi.list(signal),
  });
  const repairCases = useQuery({
    queryKey: ["owner-repair-cases"],
    queryFn: ({ signal }) => repairCasesApi.list(signal),
    enabled: list.isSuccess,
  });

  const requests = list.data?.filter((request) => request.requestType === "REPAIR") ?? [];
  const isListLoading = !list.isError && (
    list.isPending || machines.isPending || (list.isSuccess && repairCases.isPending)
  );
  const machineLabels = new Map((machines.data ?? []).map((machine) => [machine.id, machine.serialNumber] as const));
  const casesByRequestId = new Map((repairCases.data ?? []).map((repairCase) => [repairCase.maintenanceRequestId, repairCase] as const));
  const columns: readonly DataTableColumn<MaintenanceRequest>[] = [
    {
      key: "request-id",
      header: messages.SUPPORT_TABLE_REQUEST_ID,
      render: (request) => request.id,
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
      render: (request) => {
        const repairCase = casesByRequestId.get(request.id);
        return repairCase
          ? repairCaseStatusLabels[repairCase.status]
          : requestStatusLabels[request.status];
      },
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
          <p className={styles.errorNotice} role="alert">{CUSTOMER_MESSAGES.READ_SCREENS.LOAD_ERROR}</p>
        ) : null}
        {!isListLoading && !list.isError ? (
          <DataTable
            columns={columns}
            rows={requests}
            rowKey={(request) => request.id}
            variant="customer"
          />
        ) : null}
        {!isListLoading && !list.isError && requests.length === 0 ? (
          <p className={styles.emptyNotice} role="status">{messages.SUPPORT_LIST_EMPTY}</p>
        ) : null}
      </section>
    </section>
  );
}
