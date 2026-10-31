import axios from "axios";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { buybacksApi } from "@/apis/buybacks.api";
import { installationWorkOrdersApi } from "@/apis/installation-work-orders.api";
import { repairCasesApi } from "@/apis/repair-cases.api";
import { ActionBar } from "@/components/action-bar/action-bar";
import { ButtonBar } from "@/components/button/button-bar";
import { TextLinkButton } from "@/components/button/text-link-button";
import { getApiErrorMessage } from "@/lib/api-errors";
import { PATH_TECHNICIAN } from "@/routes/path";
import type { AssignedInstallationWorkOrderSummary } from "@/schema/installation-work-orders.schema";
import type { RepairCase, RepairCaseSummary } from "@/schema/machines.schema";
import type { BuybackCaseSummary, BuybackStatus } from "@/schema/buybacks.schema";
import { TECHNICIAN_MESSAGES as T } from "@/text/technician/technician-messages";
import shellStyles from "../technician-shell.module.css";
import styles from "./technician-tasks-table.module.css";

type TaskCategory = "installation" | "repair" | "buyback";
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
  repair: messages.FILTER_REPAIR,
  buyback: messages.FILTER_RETRIEVAL,
};
const filters: Array<{ id: TaskFilter; label: string }> = [
  { id: "all", label: messages.FILTER_ALL },
  { id: "installation", label: categoryLabels.installation },
  { id: "repair", label: categoryLabels.repair },
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
  repairCases: RepairCaseSummary[] | undefined,
  buybacks: BuybackCaseSummary[] | undefined,
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

function TaskCard({ task }: { task: AssignedTask }) {
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
          Mã việc <code title={task.id}>{shortReference(task.id)}</code>
          <span aria-hidden="true">·</span>
          {task.dateLabel} {formatDate(task.date)}
        </p>
      </div>
      {task.href ? (
        <TextLinkButton href={task.href}>Mở việc</TextLinkButton>
      ) : null}
    </article>
  );
}

export function TechnicianTasksTable() {
  const [filter, setFilter] = useState<TaskFilter>("all");
  const workOrders = useQuery({
    queryKey: ["dolores", "technician", "installation-work-orders", "assigned"],
    queryFn: ({ signal }) => installationWorkOrdersApi.listAssigned(signal),
  });
  const repairCases = useQuery({
    queryKey: ["dolores", "technician", "repair-cases"],
    queryFn: ({ signal }) => repairCasesApi.list(signal),
  });
  const buybacks = useQuery({
    queryKey: ["dolores", "technician", "buybacks", "assigned", 0, 100],
    queryFn: ({ signal }) => buybacksApi.list({ page: 0, size: 100 }, signal),
  });

  const tasks = createTasks(workOrders.data, repairCases.data, buybacks.data?.items);
  const visibleTasks = filter === "all"
    ? tasks
    : tasks.filter((task) => task.category === filter);
  const queryGroups = [
    { category: "installation" as const, label: "Giao máy", query: workOrders, message: getApiErrorMessage(workOrders.error) },
    { category: "repair" as const, label: "Sửa chữa", query: repairCases, message: getApiErrorMessage(repairCases.error) },
    { category: "buyback" as const, label: "Thu hồi", query: buybacks, message: buybacks.error ? getBuybackError(buybacks.error) : "" },
  ];
  const activeQueries = queryGroups.filter((item) => filter === "all" || item.category === filter);
  const isLoading = activeQueries.some((item) => item.query.isPending);
  const hasActiveError = activeQueries.some((item) => item.query.isError);
  const isFetching = workOrders.isFetching || repairCases.isFetching || buybacks.isFetching;
  const allLoaded = workOrders.isSuccess && repairCases.isSuccess && buybacks.isSuccess;
  const counts: Record<TaskFilter, number | string> = {
    all: allLoaded ? tasks.length : tasks.length > 0 ? tasks.length + "+" : "—",
    installation: workOrders.isSuccess ? workOrders.data.length : "—",
    repair: repairCases.isSuccess ? repairCases.data.length : "—",
    buyback: buybacks.isSuccess ? buybacks.data.items.length : "—",
  };

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

        {activeQueries.map(({ category, label, query, message }) => (
          query.isError ? (
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
        ) : !isLoading && activeQueries.every((item) => !item.query.isError) ? (
          <p className={styles.emptyState}>Không có việc trong mục này.</p>
        ) : null}

        {filter === "all" && buybacks.data?.hasNext ? (
          <p className={styles.helperText}>Đang hiển thị tối đa 100 hồ sơ thu hồi.</p>
        ) : null}
      </section>

      <ActionBar label={messages.TASKS_PANEL_TITLE}>
        <ButtonBar
          disabled={isFetching}
          onClick={() => void Promise.all([workOrders.refetch(), repairCases.refetch(), buybacks.refetch()])}
        >
          {isFetching ? messages.TASKS_RELOADING : messages.TASKS_RETRY}
        </ButtonBar>
      </ActionBar>
    </section>
  );
}
