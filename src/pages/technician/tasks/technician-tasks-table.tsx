import axios from "axios";
import { useQuery } from "@tanstack/react-query";
import Cookies from "js-cookie";
import { useEffect, useState } from "react";
import { buybacksApi } from "@/apis/buybacks.api";
import { installationWorkOrdersApi } from "@/apis/installation-work-orders.api";
import { machinesApi } from "@/apis/machines.api";
import { repairCasesApi } from "@/apis/repair-cases.api";
import { recallWorkOrdersApi } from "@/apis/recall-work-orders.api";
import { ActionBar } from "@/components/action-bar/action-bar";
import { ButtonBar } from "@/components/button/button-bar";
import { TextLinkButton } from "@/components/button/text-link-button";
import { getApiErrorMessage } from "@/lib/api-errors";
import { getAccessTokenSubject } from "@/lib/auth-role";
import { PATH_TECHNICIAN } from "@/routes/path";
import type { AssignedInstallationWorkOrderSummary } from "@/schema/installation-work-orders.schema";
import { ProfileIdSchema } from "@/schema/profiles.schema";
import type { MaintenanceTicket, RepairCase, RepairCaseSummary } from "@/schema/machines.schema";
import type { BuybackCaseSummary, BuybackStatus } from "@/schema/buybacks.schema";
import type { RecallWorkOrderStatus, RecallWorkOrderSummary } from "@/schema/recall-work-orders.schema";
import { TECHNICIAN_MESSAGES as T } from "@/text/technician/technician-messages";
import shellStyles from "../technician-shell.module.css";
import styles from "./technician-tasks-table.module.css";

type TaskCategory = "installation" | "maintenance" | "repair" | "recall" | "buyback";
type TaskFilter = "all" | TaskCategory;
type AssignedTask = {
  key: string;
  category: TaskCategory;
  id: string;
  machineId: string;
  status: string;
  dateLabel: string;
  date: string | null;
  href?: string;
};

const messages = T.WORKFLOWS;
const categoryLabels: Record<TaskCategory, string> = {
  installation: messages.FILTER_INSTALLATION,
  maintenance: "Bảo trì",
  repair: messages.FILTER_REPAIR,
  recall: "Thu hồi máy",
  buyback: "Thu mua máy cũ",
};
const filters: Array<{ id: TaskFilter; label: string }> = [
  { id: "all", label: messages.FILTER_ALL },
  { id: "installation", label: categoryLabels.installation },
  { id: "maintenance", label: categoryLabels.maintenance },
  { id: "repair", label: categoryLabels.repair },
  { id: "recall", label: categoryLabels.recall },
  { id: "buyback", label: categoryLabels.buyback },
];

const installationStatusLabels: Record<AssignedInstallationWorkOrderSummary["status"], string> = {
  PENDING: messages.TASKS_STATUS_PENDING,
  ASSIGNED: messages.TASKS_STATUS_ASSIGNED,
  IN_PROGRESS: messages.TASKS_STATUS_IN_PROGRESS,
  COMPLETED: messages.TASKS_STATUS_COMPLETED,
  FAILED: messages.TASKS_STATUS_FAILED,
  CANCELLED: messages.TASKS_STATUS_CANCELLED,
};
const repairStatusLabels: Record<RepairCase["status"], string> = {
  REPORTED: "Đã báo sự cố",
  TRIAGE: "Đang phân loại",
  WAITING_REPLACEMENT: "Chờ máy thay thế",
  WAITING_OWNER_DECISION: "Chờ Owner xác nhận",
  REPLACEMENT_PLANNED: "Đã lên lịch thay máy",
  PRIMARY_COLLECTED: "Đã nhận máy sửa",
  REPLACEMENT_DELIVERED: "Đã giao máy thay thế",
  DIAGNOSIS: "Đang chẩn đoán",
  REPAIR_IN_PROGRESS: "Đang sửa chữa",
  REPAIR_COMPLETED: "Đã sửa xong",
  REPLACEMENT_COLLECTED: "Đã thu hồi máy thay thế",
  PRIMARY_RETURNED: "Đã trả máy chính",
  OWNER_ACKNOWLEDGED: "Owner đã xác nhận",
  CLOSED: "Đã đóng",
  REJECTED: "Đã từ chối",
  CANCELLED: "Đã hủy",
};
const maintenanceStatusLabels: Record<NonNullable<MaintenanceTicket["status"]>, string> = {
  PENDING: "Chờ xử lý",
  ASSIGNED: "Đã phân công",
  IN_PROGRESS: "Đang bảo trì",
  RESOLVED: "Đã hoàn tất",
};
const buybackStatusLabels: Record<BuybackStatus, string> = {
  REQUESTED: "Đã gửi yêu cầu",
  INSPECTION_PENDING: "Chờ kiểm tra máy",
  VALUATION_PENDING: "Chờ định giá",
  APPROVED: "Đã duyệt giá",
  PAYMENT_PENDING: "Chờ thanh toán",
  PAID: "Đã thanh toán",
  COLLECTION_PENDING: "Chờ thu hồi máy",
  COLLECTED: "Đã thu hồi máy",
  REFURBISHING: "Đang tân trang",
  QA_PENDING: "Chờ kiểm định",
  AVAILABLE_FOR_RENT: "Sẵn sàng cho thuê",
  REJECTED: "Đã từ chối",
  CANCELLED: "Đã hủy",
};
const recallStatusLabels: Record<RecallWorkOrderStatus, string> = {
  UNASSIGNED: "Chưa phân công",
  ASSIGNED: "Đã phân công",
  SCHEDULED: "Đã lên lịch nhận máy",
  PICKUP_IN_PROGRESS: "Đang nhận máy",
  OWNER_ACK_PENDING: "Chờ Owner xác nhận bàn giao",
  CUSTODY_VERIFICATION_PENDING: "Chờ đưa máy về kho",
  RECEIPT_REVIEW_PENDING: "Chờ duyệt biên nhận kho",
  RECEIVED_AT_DEPOT: "Đã nhận tại kho",
  LEGACY_REVIEW_REQUIRED: "Cần rà soát hồ sơ cũ",
  CANCELLED: "Đã hủy",
};

function shortReference(value: string): string {
  return value.replace(/-/g, "").slice(0, 8).toUpperCase();
}

function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  const timestamp = Date.parse(value);
  return Number.isNaN(timestamp)
    ? value
    : new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium" }).format(timestamp);
}

function getBuybackError(error: Error): string {
  if (axios.isAxiosError(error) && error.response?.status === 403) {
    return "Chưa được cấp quyền xem hồ sơ thu hồi cho Technician. API hiện chỉ cấp quyền này cho Admin, Moderator và Owner.";
  }
  return getApiErrorMessage(error);
}

function createTasks(
  workOrders: AssignedInstallationWorkOrderSummary[] | undefined,
  maintenanceTickets: MaintenanceTicket[] | undefined,
  repairCases: RepairCaseSummary[] | undefined,
  recallOrders: RecallWorkOrderSummary[] | undefined,
  buybacks: BuybackCaseSummary[] | undefined,
  technicianId: string | null,
): AssignedTask[] {
  return [
    ...(workOrders ?? []).map((item): AssignedTask => ({
      key: "installation-" + item.id,
      category: "installation",
      id: item.id,
      machineId: item.machineId,
      status: installationStatusLabels[item.status],
      dateLabel: item.scheduledFor ? "Dự kiến" : "Cập nhật",
      date: item.scheduledFor ?? item.updatedAt,
      href: PATH_TECHNICIAN.TASK_DETAIL(item.id),
    })),
    ...(maintenanceTickets ?? []).flatMap((item): AssignedTask[] => {
      if (!technicianId || !item.id || !item.machineId || item.assignedTechnicianId !== technicianId) return [];
      return [{
        key: "maintenance-" + item.id,
        category: "maintenance",
        id: item.id,
        machineId: item.machineId,
        status: item.status ? maintenanceStatusLabels[item.status] : "Chưa cập nhật trạng thái",
        dateLabel: item.scheduledDueAt ? "Dự kiến" : item.completedAt || item.resolvedAt ? "Hoàn tất" : "Cập nhật",
        date: item.scheduledDueAt ?? item.completedAt ?? item.resolvedAt ?? item.startedAt ?? item.acknowledgedAt ?? null,
        href: PATH_TECHNICIAN.TASK_DETAIL(item.id),
      }];
    }),
    ...(repairCases ?? []).map((item): AssignedTask => ({
      key: "repair-" + item.id,
      category: "repair",
      id: item.id,
      machineId: item.primaryMachineId,
      status: repairStatusLabels[item.status],
      dateLabel: "Cập nhật",
      date: item.updatedAt,
      href: PATH_TECHNICIAN.TASK_DETAIL(item.id),
    })),
    ...(recallOrders ?? []).map((item): AssignedTask => ({
      key: "recall-" + item.id,
      category: "recall",
      id: item.id,
      machineId: item.machineId,
      status: recallStatusLabels[item.status],
      dateLabel: item.scheduledPickupAt ? "Lịch nhận" : "Cập nhật",
      date: item.scheduledPickupAt ?? item.updatedAt ?? item.createdAt ?? null,
      href: PATH_TECHNICIAN.TASK_DETAIL(item.id),
    })),
    ...(buybacks ?? []).map((item): AssignedTask => ({
      key: "buyback-" + item.id,
      category: "buyback",
      id: item.id,
      machineId: item.machineId,
      status: buybackStatusLabels[item.status],
      dateLabel: "Yêu cầu",
      date: item.requestedAt ?? item.updatedAt ?? null,
    })),
  ].sort((first, second) => Date.parse(second.date ?? "") - Date.parse(first.date ?? ""));
}

function TaskCard({ task, compact = false }: { task: AssignedTask; compact?: boolean }) {
  return (
    <article className={styles.taskCard}>
      <div className={styles.taskContent}>
        <div className={styles.taskLabels}>
          <span className={styles.categoryBadge}>{categoryLabels[task.category]}</span>
          <span className={styles.statusBadge}>{task.status}</span>
        </div>
        <p className={styles.taskMachine}>
          Máy <code title={task.machineId}>{shortReference(task.machineId)}</code>
        </p>
        <p className={styles.taskMeta}>
          {!compact ? (
            <>
              Mã việc <code title={task.id}>{shortReference(task.id)}</code>
              <span aria-hidden="true">·</span>
            </>
          ) : null}
          {task.dateLabel} {formatDate(task.date)}
        </p>
      </div>
      {task.href ? (
        <TextLinkButton href={task.href}>
          {compact && task.category === "maintenance" ? "Xem lịch sử máy" : "Mở việc"}
        </TextLinkButton>
      ) : null}
    </article>
  );
}

export function TechnicianTasksTable({ display = "page" }: { display?: "page" | "notifications" }) {
  const [filter, setFilter] = useState<TaskFilter>("all");
  const [technicianId, setTechnicianId] = useState<string | null>(null);
  const [technicianIdentityReady, setTechnicianIdentityReady] = useState(false);
  useEffect(() => {
    const token = Cookies.get("access_token");
    const subject = token ? getAccessTokenSubject(token) : null;
    setTechnicianId(ProfileIdSchema.safeParse(subject).success ? subject : null);
    setTechnicianIdentityReady(true);
  }, []);

  const workOrders = useQuery({
    queryKey: ["dolores", "technician", "installation-work-orders", "assigned"],
    queryFn: ({ signal }) => installationWorkOrdersApi.listAssigned(signal),
  });
  const maintenanceTickets = useQuery({
    queryKey: ["dolores", "technician", "maintenance-tickets", "assigned", technicianId],
    queryFn: ({ signal }) => machinesApi.listMaintenanceTickets({ page: 0, size: 100 }, signal),
    enabled: technicianIdentityReady && Boolean(technicianId),
  });
  const repairCases = useQuery({
    queryKey: ["dolores", "technician", "repair-cases"],
    queryFn: ({ signal }) => repairCasesApi.list(signal),
  });
  const recallOrders = useQuery({
    queryKey: ["dolores", "technician", "recall-work-orders", technicianId, 0, 100],
    queryFn: async ({ signal }) => (await recallWorkOrdersApi.list({ technicianId: technicianId!, page: 0, size: 100 }, signal)).content,
    enabled: technicianIdentityReady && Boolean(technicianId),
    retry: false,
  });
  const buybacks = useQuery({
    queryKey: ["dolores", "technician", "buybacks", "assigned", 0, 100],
    queryFn: ({ signal }) => buybacksApi.list({ page: 0, size: 100 }, signal),
  });

  const tasks = createTasks(
    workOrders.data,
    maintenanceTickets.data,
    repairCases.data,
    recallOrders.data,
    buybacks.data?.items,
    technicianId,
  );
  const visibleTasks = filter === "all"
    ? tasks
    : tasks.filter((task) => task.category === filter);
  const queryGroups = [
    { category: "installation" as const, label: "Giao máy", hasError: workOrders.isError, isPending: workOrders.isPending, message: getApiErrorMessage(workOrders.error) },
    {
      category: "maintenance" as const,
      label: "Bảo trì",
      hasError: maintenanceTickets.isError || (technicianIdentityReady && !technicianId),
      isPending: Boolean(technicianId) && maintenanceTickets.isPending,
      message: !technicianId && technicianIdentityReady
        ? "Không xác định được tài khoản kỹ thuật viên để lọc phiếu được giao."
        : getApiErrorMessage(maintenanceTickets.error),
    },
    { category: "repair" as const, label: "Sửa chữa", hasError: repairCases.isError, isPending: repairCases.isPending, message: getApiErrorMessage(repairCases.error) },
    { category: "recall" as const, label: categoryLabels.recall, hasError: recallOrders.isError, isPending: Boolean(technicianId) && recallOrders.isPending, message: getApiErrorMessage(recallOrders.error) },
    { category: "buyback" as const, label: categoryLabels.buyback, hasError: buybacks.isError, isPending: buybacks.isPending, message: buybacks.error ? getBuybackError(buybacks.error) : "" },
  ];
  const activeQueries = queryGroups.filter((item) => filter === "all" || item.category === filter);
  const isLoading = activeQueries.some((item) => item.isPending) || !technicianIdentityReady;
  const hasActiveError = activeQueries.some((item) => item.hasError);
  const isFetching = workOrders.isFetching || maintenanceTickets.isFetching || repairCases.isFetching || recallOrders.isFetching || buybacks.isFetching;
  const allLoaded = workOrders.isSuccess && Boolean(technicianId) && maintenanceTickets.isSuccess && repairCases.isSuccess && recallOrders.isSuccess && buybacks.isSuccess;
  const refreshTasks = () => Promise.all([
    workOrders.refetch(),
    ...(technicianId ? [maintenanceTickets.refetch()] : []),
    repairCases.refetch(),
    ...(technicianId ? [recallOrders.refetch()] : []),
    buybacks.refetch(),
  ]);
  const counts: Record<TaskFilter, number | string> = {
    all: allLoaded ? tasks.length : tasks.length > 0 ? tasks.length + "+" : "—",
    installation: workOrders.isSuccess ? workOrders.data.length : "—",
    maintenance: maintenanceTickets.isSuccess ? tasks.filter((task) => task.category === "maintenance").length : "—",
    repair: repairCases.isSuccess ? repairCases.data.length : "—",
    recall: recallOrders.isSuccess ? recallOrders.data.length : "—",
    buyback: buybacks.isSuccess ? buybacks.data.items.length : "—",
  };

  if (display === "notifications") {
    const recentTasks = tasks.slice(0, 5);

    return (
      <section className={styles.panel} aria-labelledby="technician-work-updates-title">
        <div className={styles.panelHeading}>
          <div>
            <h2 id="technician-work-updates-title">Công việc được giao cập nhật</h2>
            <p className={styles.helperText}>Tổng hợp lệnh lắp đặt, phiếu bảo trì, sửa chữa và thu hồi được giao.</p>
          </div>
          <TextLinkButton href={PATH_TECHNICIAN.TASKS}>Xem tất cả</TextLinkButton>
        </div>

        {activeQueries.filter((item) => item.hasError).map((item) => (
          <p className={styles.queryNotice} role="alert" key={item.category}>
            <strong>{item.label}:</strong> {item.message}
          </p>
        ))}
        {isLoading ? <p className={styles.loading} role="status">Đang tải công việc được giao…</p> : null}
        {recentTasks.length > 0 ? (
          <div className={styles.taskList}>
            {recentTasks.map((task) => <TaskCard key={task.key} task={task} compact />)}
          </div>
        ) : !isLoading && !hasActiveError ? (
          <p className={styles.emptyState}>Chưa có công việc được giao.</p>
        ) : null}
        <p className={styles.helperText}>Trạng thái đã đọc/chưa đọc chỉ áp dụng cho thông báo ở phía trên.</p>
      </section>
    );
  }

  return (
    <section className={shellStyles.pageContent} aria-labelledby="technician-tasks-title">
      <header className={shellStyles.pageHeading}>
        <h1 id="technician-tasks-title">{T.NAVIGATION.TASKS}</h1>
        <p>Các công việc được phân công cho bạn.</p>
      </header>

      <div className={styles.filterBar} role="group" aria-label={messages.FILTER_LABEL_TASKS}>
        {filters.map((item) => (
          <button
            key={item.id}
            type="button"
            aria-pressed={filter === item.id}
            className={styles.filterButton}
            onClick={() => setFilter(item.id)}
          >
            {item.label}<span className={styles.filterCount}>{counts[item.id]}</span>
          </button>
        ))}
      </div>

      <section className={styles.panel} aria-labelledby="technician-task-list-title">
        <div className={styles.panelHeading}>
          <h2 id="technician-task-list-title">
            {filter === "all" ? "Danh sách công việc" : categoryLabels[filter]}
          </h2>
          <span className={styles.totalCount}>
            {hasActiveError && visibleTasks.length === 0 ? "—" : counts[filter]}
          </span>
        </div>

        {activeQueries.map(({ category, label, hasError, message }) => (
          hasError ? (
            <p className={styles.queryNotice} role="alert" key={category}>
              <strong>{label}:</strong> {message}
            </p>
          ) : null
        ))}

        {isLoading ? <p className={styles.loading} role="status">Đang tải công việc…</p> : null}

        {visibleTasks.length > 0 ? (
          <div className={styles.taskList}>
            {visibleTasks.map((task) => <TaskCard key={task.key} task={task} />)}
          </div>
        ) : !isLoading && activeQueries.every((item) => !item.hasError) ? (
          <p className={styles.emptyState}>Không có việc trong mục này.</p>
        ) : null}

        {filter === "all" && buybacks.data?.hasNext ? (
          <p className={styles.helperText}>Đang hiển thị tối đa 100 hồ sơ thu hồi.</p>
        ) : null}
      </section>

      <ActionBar label={messages.TASKS_PANEL_TITLE}>
        <ButtonBar
          disabled={isFetching}
          onClick={() => void refreshTasks()}
        >
          {isFetching ? messages.TASKS_RELOADING : messages.TASKS_RETRY}
        </ButtonBar>
      </ActionBar>
    </section>
  );
}
