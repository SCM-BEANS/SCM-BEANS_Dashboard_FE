import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { TECHNICIAN_WORK_ITEMS_QUERY_KEY, technicianWorkItemsApi } from "@/apis/technician-work-items.api";
import { ButtonBar } from "@/components/button/button-bar";
import { TextLinkButton } from "@/components/button/text-link-button";
import { DataTable } from "@/components/table/data-table";
import { getApiErrorMessage } from "@/lib/api-errors";
import { PATH_TECHNICIAN } from "@/routes/path";
import type { TechnicianWorkItem, TechnicianWorkType } from "@/schema/technician-work-items.schema";
import { TECHNICIAN_MESSAGES as T } from "@/text/technician/technician-messages";
import shellStyles from "../technician-shell.module.css";
import styles from "./technician-tasks-table.module.css";

type TaskCategory = "installation" | "maintenance" | "repair" | "recall";
type TaskFilter = "all" | TaskCategory;
type AssignedTask = {
  key: string;
  category: TaskCategory;
  id: string;
  machineId: string;
  machineType: string | null;
  serialNumber: string | null;
  modelName: string | null;
  ownerName: string | null;
  locationName: string | null;
  locationAddress: string | null;
  summary: string | null;
  status: string;
  dateLabel: string;
  date: string | null;
  href?: string;
};

const PAGE_SIZE = 50;
const messages = T.WORKFLOWS;
const categoryLabels: Record<TaskCategory, string> = {
  installation: messages.FILTER_INSTALLATION,
  maintenance: "Bảo trì",
  repair: messages.FILTER_REPAIR,
  recall: "Thu hồi máy",
};
const workTypeByCategory: Record<TaskCategory, TechnicianWorkType> = {
  installation: "INSTALLATION",
  maintenance: "MAINTENANCE",
  repair: "REPAIR",
  recall: "RECALL",
};
const categoryByWorkType: Record<TechnicianWorkType, TaskCategory> = {
  INSTALLATION: "installation",
  MAINTENANCE: "maintenance",
  REPAIR: "repair",
  RECALL: "recall",
};
const filters: Array<{ id: TaskFilter; label: string }> = [
  { id: "all", label: messages.FILTER_ALL },
  { id: "installation", label: categoryLabels.installation },
  { id: "maintenance", label: categoryLabels.maintenance },
  { id: "repair", label: categoryLabels.repair },
  { id: "recall", label: categoryLabels.recall },
];

const statusLabels: Record<string, string> = {
  PENDING: "Chờ xử lý",
  UNASSIGNED: "Chưa phân công",
  ASSIGNED: "Đã phân công",
  SCHEDULED: "Đã lên lịch",
  IN_PROGRESS: "Đang thực hiện",
  PICKUP_IN_PROGRESS: "Đang nhận máy",
  OWNER_ACK_PENDING: "Chờ Owner xác nhận",
  CUSTODY_VERIFICATION_PENDING: "Chờ xác nhận tại kho",
  RECEIPT_REVIEW_PENDING: "Chờ duyệt biên nhận",
  RECEIVED_AT_DEPOT: "Đã nhận tại kho",
  COMPLETED: "Đã hoàn tất",
  RESOLVED: "Đã hoàn tất",
  FAILED: "Không hoàn tất",
  CANCELLED: "Đã hủy",
  REPORTED: "Đã báo sự cố",
  TRIAGE: "Đang phân loại",
  WAITING_REPLACEMENT: "Chờ máy thay thế",
  WAITING_OWNER_DECISION: "Chờ Owner xác nhận",
  REPLACEMENT_PLANNED: "Đã lên lịch thay máy",
  PRIMARY_COLLECTED: "Đã nhận máy cần sửa",
  REPLACEMENT_DELIVERED: "Đã giao máy thay thế",
  DIAGNOSIS: "Đang chẩn đoán",
  REPAIR_IN_PROGRESS: "Đang sửa chữa",
  REPAIR_COMPLETED: "Đã sửa xong",
  REPLACEMENT_COLLECTED: "Đã thu hồi máy thay thế",
  PRIMARY_RETURNED: "Đã trả máy chính",
  OWNER_ACKNOWLEDGED: "Owner đã xác nhận",
  CLOSED: "Đã đóng",
  REJECTED: "Đã từ chối",
  LEGACY_REVIEW_REQUIRED: "Cần rà soát hồ sơ cũ",
};

function shortReference(value: string): string {
  return value.replace(/-/g, "").slice(0, 8).toUpperCase();
}

function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  const normalized = value.replace(/(\.\d{3})\d+(?=Z|[+-]\d{2}:\d{2}|$)/, "$1");
  const timestamp = Date.parse(normalized);
  return Number.isNaN(timestamp)
    ? value
    : new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium", timeStyle: "short" }).format(timestamp);
}

function formatStatus(status: string): string {
  return statusLabels[status] ?? status.replaceAll("_", " ");
}

function taskDetailPath(item: TechnicianWorkItem): string {
  switch (item.workType) {
    case "INSTALLATION":
      return PATH_TECHNICIAN.TASK_DETAIL(item.id);
    case "MAINTENANCE":
      return PATH_TECHNICIAN.TASK_MAINTENANCE_TICKET_DETAIL(item.id);
    case "REPAIR":
      return PATH_TECHNICIAN.TASK_REPAIR_CASE_DETAIL(item.id);
    case "RECALL":
      return PATH_TECHNICIAN.TASK_RETRIEVAL_DETAIL(item.id);
  }
}

function createTasks(items: TechnicianWorkItem[]): AssignedTask[] {
  return items.map((item): AssignedTask => {
    const category = categoryByWorkType[item.workType];
    return {
      key: item.workType.toLowerCase() + "-" + item.id,
      category,
      id: item.id,
      machineId: item.machineId,
      machineType: item.machineType ?? null,
      serialNumber: item.serialNumber ?? null,
      modelName: item.modelName ?? null,
      ownerName: item.ownerName ?? null,
      locationName: item.locationName ?? null,
      locationAddress: item.locationAddress ?? null,
      summary: item.summary ?? null,
      status: formatStatus(item.status),
      dateLabel: item.scheduledAt ? (category === "recall" ? "Lịch nhận" : "Dự kiến") : "Cập nhật",
      date: item.scheduledAt ?? item.createdAt ?? null,
      href: taskDetailPath(item),
    };
  }).sort((first, second) => Date.parse(second.date ?? "") - Date.parse(first.date ?? ""));
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
          Máy <code title={task.machineId}>{task.serialNumber || shortReference(task.machineId)}</code>
          {task.modelName ? <span> · {task.modelName}</span> : null}
        </p>
        {task.summary ? <p className={styles.taskSummary}>{task.summary}</p> : null}
        {!compact && (task.ownerName || task.locationName || task.locationAddress) ? (
          <p className={styles.taskMeta}>
            {task.ownerName ? <span>Owner: {task.ownerName}</span> : null}
            {task.locationName ? <span>{task.locationName}</span> : null}
            {task.locationAddress ? <span>{task.locationAddress}</span> : null}
          </p>
        ) : null}
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
      {task.href ? <TextLinkButton href={task.href}>Mở việc</TextLinkButton> : null}
    </article>
  );
}

export function TechnicianTasksTable({ display = "page" }: { display?: "page" | "notifications" }) {
  const [filter, setFilter] = useState<TaskFilter>("all");
  const [page, setPage] = useState(0);
  const tasksQuery = useQuery({
    queryKey: [...TECHNICIAN_WORK_ITEMS_QUERY_KEY, page, PAGE_SIZE, filter],
    queryFn: ({ signal }) => technicianWorkItemsApi.list({
      page,
      size: PAGE_SIZE,
      ...(filter === "all" ? {} : { workType: workTypeByCategory[filter] }),
    }, signal),
  });
  const tasks = createTasks(tasksQuery.data?.items ?? []);
  const counts: Record<TaskFilter, number | string> = {
    all: filter === "all" && tasksQuery.data ? tasksQuery.data.items.length : "—",
    installation: filter === "all" ? tasks.filter((task) => task.category === "installation").length : filter === "installation" && tasksQuery.data ? tasks.length : "—",
    maintenance: filter === "all" ? tasks.filter((task) => task.category === "maintenance").length : filter === "maintenance" && tasksQuery.data ? tasks.length : "—",
    repair: filter === "all" ? tasks.filter((task) => task.category === "repair").length : filter === "repair" && tasksQuery.data ? tasks.length : "—",
    recall: filter === "all" ? tasks.filter((task) => task.category === "recall").length : filter === "recall" && tasksQuery.data ? tasks.length : "—",
  };
  const isLoading = tasksQuery.isPending;
  const isFetching = tasksQuery.isFetching;
  const refreshTasks = () => tasksQuery.refetch();

  if (display === "notifications") {
    const recentTasks = tasks.slice(0, 5);

    return (
      <section className={styles.panel} aria-labelledby="technician-work-updates-title">
        <div className={styles.panelHeading}>
          <div>
            <h2 id="technician-work-updates-title">Công việc được giao cập nhật</h2>
            <p className={styles.helperText}>Công việc đang được giao trực tiếp cho tài khoản kỹ thuật viên.</p>
          </div>
          <TextLinkButton href={PATH_TECHNICIAN.TASKS}>Xem tất cả</TextLinkButton>
        </div>
        {tasksQuery.isError ? <div className={styles.queryNotice} role="alert">{getApiErrorMessage(tasksQuery.error)} <ButtonBar type="button" onClick={() => void refreshTasks()}>{messages.TASKS_RETRY}</ButtonBar></div> : null}
        {isLoading ? <p className={styles.loading} role="status">Đang tải công việc được giao…</p> : null}
        {recentTasks.length > 0 ? (
          <div className={styles.taskList}>{recentTasks.map((task) => <TaskCard key={task.key} task={task} compact />)}</div>
        ) : !isLoading && !tasksQuery.isError ? (
          <p className={styles.emptyState}>Chưa có công việc được giao.</p>
        ) : null}
        {tasksQuery.data?.hasNext ? <p className={styles.helperText}>Danh sách còn công việc ở các trang tiếp theo.</p> : null}
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
            onClick={() => { setFilter(item.id); setPage(0); }}
          >
            {item.label}<span className={styles.filterCount}>{counts[item.id]}</span>
          </button>
        ))}
      </div>

      <section className={styles.panel} aria-labelledby="technician-task-list-title">
        <div className={styles.panelHeading}>
          <h2 id="technician-task-list-title">{filter === "all" ? "Danh sách công việc" : categoryLabels[filter]}</h2>
          <span className={styles.totalCount}>{tasksQuery.data ? tasksQuery.data.items.length : "—"}</span>
        </div>
        {tasksQuery.isError ? <div className={styles.queryNotice} role="alert">{getApiErrorMessage(tasksQuery.error)} <ButtonBar type="button" onClick={() => void refreshTasks()}>{messages.TASKS_RETRY}</ButtonBar></div> : null}
        {isLoading ? <p className={styles.loading} role="status">Đang tải công việc…</p> : null}
        {tasksQuery.data ? (
          <DataTable
            variant="standard"
            rows={tasks}
            rowKey={(task) => task.key}
            emptyMessage={tasksQuery.isError ? undefined : "Không có việc trong mục này."}
            columns={[
              {
                key: "type",
                header: "Loại việc",
                render: (task) => <span className={styles.categoryBadge}>{categoryLabels[task.category]}</span>,
              },
              {
                key: "machine",
                header: "Máy",
                render: (task) => (
                  <div className={styles.tableCellStack}>
                    <strong>{task.serialNumber || shortReference(task.machineId)}</strong>
                    {task.machineType ? <span>{task.machineType === "SMART_IOT" ? "Smart IoT" : task.machineType}</span> : null}
                  </div>
                ),
              },
              {
                key: "work",
                header: "Công việc",
                render: (task) => task.summary || "—",
              },
              {
                key: "owner",
                header: "Khách hàng",
                render: (task) => task.ownerName || "—",
              },
              {
                key: "status",
                header: "Trạng thái",
                render: (task) => <span className={styles.statusBadge}>{task.status}</span>,
              },
              {
                key: "schedule",
                header: "Thời gian",
                render: (task) => (
                  <div className={styles.tableCellStack}>
                    <span>{task.dateLabel}</span>
                    <span>{formatDate(task.date)}</span>
                  </div>
                ),
              },
              {
                key: "action",
                header: "",
                align: "right",
                render: (task) => task.href ? <TextLinkButton href={task.href}>Mở việc</TextLinkButton> : "—",
              },
            ]}
          />
        ) : null}
        {tasksQuery.data ? (
          <p className={styles.helperText}>
            Trang {tasksQuery.data.page + 1} · {tasksQuery.data.items.length} công việc trong trang
            {tasksQuery.data.hasNext ? " · còn trang tiếp theo" : ""}
          </p>
        ) : null}
      </section>

      <div className={styles.panel}>
        <ButtonBar type="button" disabled={page === 0 || isFetching} onClick={() => setPage((current) => Math.max(0, current - 1))}>
          Trang trước
        </ButtonBar>
        <ButtonBar type="button" disabled={!tasksQuery.data?.hasNext || isFetching} onClick={() => setPage((current) => current + 1)}>
          Trang sau
        </ButtonBar>
      </div>
    </section>
  );
}
