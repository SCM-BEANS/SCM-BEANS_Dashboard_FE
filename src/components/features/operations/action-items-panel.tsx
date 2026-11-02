import Link from "next/link";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { dashboardApi } from "@/apis/dashboard.api";
import { getApiErrorMessage } from "@/lib/api-errors";
import { authScopedQuerySubject } from "@/lib/query-subject";
import { PATH_ADMIN, PATH_CUSTOMER, PATH_MODERATOR, PATH_TECHNICIAN } from "@/routes/path";
import { DashboardTimeBucketSchema, type TDashboardActionItem } from "@/schema/dashboard.schema";
import styles from "./action-items-panel.module.css";

type ActionItemsRole = "ADMIN" | "MODERATOR" | "OWNER" | "TECHNICIAN";
type TimeBucket = "ALL" | "TODAY" | "UPCOMING" | "OVERDUE" | "UNSCHEDULED";

const bucketOptions: { value: TimeBucket; label: string }[] = [
  { value: "ALL", label: "Tất cả thời hạn" },
  { value: "TODAY", label: "Hôm nay" },
  { value: "UPCOMING", label: "Sắp tới" },
  { value: "OVERDUE", label: "Quá hạn" },
  { value: "UNSCHEDULED", label: "Chưa xếp lịch" },
];

function roleRoot(role: ActionItemsRole) {
  return {
    ADMIN: "/admin/",
    MODERATOR: "/moderator/",
    OWNER: "/dashboard/",
    TECHNICIAN: "/technician/",
  }[role];
}

function mappedWorkflowPath(item: TDashboardActionItem, role: ActionItemsRole): string | undefined {
  if (role === "OWNER") {
    switch (item.resourceType) {
      case "BUYBACK_CASE": return PATH_CUSTOMER.BUYBACK;
      case "CONTRACT": return PATH_CUSTOMER.CONTRACTS;
      case "INVOICE": return PATH_CUSTOMER.INVOICES;
      case "MAINTENANCE_REQUEST": return PATH_CUSTOMER.MAINTENANCE_DETAIL(item.resourceId);
      case "REPAIR_CASE": return PATH_CUSTOMER.SUPPORT_REPAIR_CASE_DETAIL(item.resourceId);
      case "REPAIR_COST_REVIEW": return PATH_CUSTOMER.REPAIR_COST_REVIEW_DETAIL(item.resourceId);
      case "RECALL_WORK_ORDER": return PATH_CUSTOMER.RECALL_DETAIL(item.resourceId);
      default: return undefined;
    }
  }

  if (role === "TECHNICIAN") {
    switch (item.resourceType) {
      case "INSTALLATION_WORK_ORDER": return PATH_TECHNICIAN.TASK_DETAIL(item.resourceId);
      case "MAINTENANCE_TICKET": return PATH_TECHNICIAN.TASK_MAINTENANCE_TICKET_DETAIL(item.resourceId);
      case "REPAIR_CASE": return PATH_TECHNICIAN.TASK_REPAIR_CASE_DETAIL(item.resourceId);
      case "RECALL_WORK_ORDER": return PATH_TECHNICIAN.TASK_RETRIEVAL_DETAIL(item.resourceId);
      default: return undefined;
    }
  }

  if (role === "ADMIN") {
    switch (item.resourceType) {
      case "CONTRACT": return PATH_ADMIN.CONTRACTS;
      case "INVOICE": return PATH_ADMIN.INVOICES;
      case "REPAIR_CASE": return PATH_ADMIN.TECHNICAL_REPAIR_CASE_DETAIL(item.resourceId);
      case "REPAIR_COST_REVIEW": return PATH_ADMIN.TECHNICAL_COST_REVIEW_DETAIL(item.resourceId);
      case "BUYBACK_CASE":
      case "BUYBACK_PAYMENT_PROOF": return PATH_ADMIN.BUYBACKS;
      case "RECALL_WORK_ORDER": return PATH_ADMIN.CONTRACTS;
      case "MAINTENANCE_REQUEST":
      case "MAINTENANCE_TICKET":
      case "INSTALLATION_WORK_ORDER": return PATH_ADMIN.TECHNICAL_REQUESTS;
      default: return undefined;
    }
  }

  switch (item.resourceType) {
    case "CONTRACT": return PATH_MODERATOR.CONTRACTS_LIST;
    case "INVOICE": return PATH_MODERATOR.INVOICES_LIST;
    case "REPAIR_CASE": return PATH_MODERATOR.TECHNICAL_REPAIR_CASE_DETAIL(item.resourceId);
    case "REPAIR_COST_REVIEW": return PATH_MODERATOR.TECHNICAL_COST_REVIEW_DETAIL(item.resourceId);
    case "BUYBACK_CASE":
    case "BUYBACK_PAYMENT_PROOF": return PATH_MODERATOR.BUYBACK_LIST;
    case "RECALL_WORK_ORDER": return PATH_MODERATOR.CONTRACT_RETRIEVAL;
    case "MAINTENANCE_REQUEST":
    case "MAINTENANCE_TICKET":
    case "INSTALLATION_WORK_ORDER": return PATH_MODERATOR.TECHNICAL_REQUESTS;
    default: return undefined;
  }
}

function safeWorkflowHref(item: TDashboardActionItem, role: ActionItemsRole): string | undefined {
  const mappedPath = mappedWorkflowPath(item, role);
  const path = mappedPath ?? item.detailPath;
  const root = roleRoot(role);
  if (!path.startsWith(root) || path.startsWith("//") || path.includes("\\") || /[\u0000-\u001f]/.test(path)) return undefined;
  if (path.startsWith(`${root}api/`) || /^(?:[a-z][a-z\d+.-]*:|\/api\/)/i.test(path)) return undefined;
  return path;
}

function formatDate(value?: string | null) {
  if (!value) return "Chưa có hạn";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Chưa có hạn"
    : new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

export function ActionItemsPanel({ role }: { role: ActionItemsRole }) {
  const [bucket, setBucket] = useState<TimeBucket>("ALL");
  const [page, setPage] = useState(0);
  const parsedBucket = bucket === "ALL" ? undefined : DashboardTimeBucketSchema.parse(bucket);
  const items = useQuery({
    queryKey: ["dolores", "dashboard", "action-items", authScopedQuerySubject(role), parsedBucket ?? "ALL", page],
    queryFn: ({ signal }) => dashboardApi.getActionItems({ page, size: 20, ...(parsedBucket ? { timeBucket: parsedBucket } : {}) }, signal),
    retry: false,
  });

  return (
    <section className={styles.panel} aria-labelledby={`action-items-${role.toLowerCase()}`}>
      <header className={styles.header}>
        <div>
          <h2 id={`action-items-${role.toLowerCase()}`}>Công việc cần xử lý</h2>
          <p>Danh sách được giới hạn theo quyền đăng nhập. Mở danh sách nghiệp vụ để xem hoặc thực hiện bước kế tiếp.</p>
        </div>
        <label className={styles.filter}>
          <span>Thời hạn</span>
          <select value={bucket} onChange={(event) => { setBucket(event.target.value as TimeBucket); setPage(0); }}>
            {bucketOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </label>
      </header>

      {items.isPending && <p className={styles.notice} role="status">Đang tải công việc…</p>}
      {items.isError && (
        <div className={`${styles.notice} ${styles.error}`} role="alert">
          <p>{getApiErrorMessage(items.error)}</p>
          <button type="button" onClick={() => void items.refetch()}>Thử lại</button>
        </div>
      )}
      {items.data && !items.isError && items.data.items.length === 0 && (
        <p className={styles.notice} role="status">Không có công việc trong khoảng thời hạn này.</p>
      )}
      {items.data && items.data.items.length > 0 && (
        <div className={styles.list}>
          {items.data.items.map((item) => {
            const href = safeWorkflowHref(item, role);
            return (
              <article className={styles.item} key={item.actionKey}>
                <div className={styles.itemHeading}>
                  <div>
                    <h3>{item.title}</h3>
                    <p>{item.resourceType.replaceAll("_", " ")} · {item.status}</p>
                  </div>
                  <span className={item.overdue ? styles.overdue : styles.priority}>{item.overdue ? "Quá hạn" : item.priority}</span>
                </div>
                <dl className={styles.metadata}>
                  <div><dt>Hạn xử lý</dt><dd>{formatDate(item.dueAt ?? item.scheduledAt)}</dd></div>
                  {item.ownerName && <div><dt>Khách hàng</dt><dd>{item.ownerName}</dd></div>}
                  {item.machineSerialNumber && <div><dt>Máy</dt><dd>{item.machineSerialNumber}</dd></div>}
                </dl>
                {item.nextAction && item.nextAction.code !== "VIEW" && (
                  <p className={styles.nextAction}>Bước kế tiếp: {item.nextAction.code.replaceAll("_", " ")}</p>
                )}
                {href ? <Link className={styles.openLink} href={href}>Mở công việc</Link> : <span className={styles.unavailable}>Chưa có màn hình chi tiết cho vai trò này</span>}
              </article>
            );
          })}
        </div>
      )}

      <footer className={styles.pagination}>
        <span>Trang {page + 1}{items.data?.hasMore ? "+" : ""}</span>
        <div>
          <button type="button" disabled={page === 0 || items.isFetching} onClick={() => setPage((current) => Math.max(0, current - 1))}>Trước</button>
          <button type="button" disabled={!items.data?.hasMore || items.isFetching} onClick={() => setPage((current) => current + 1)}>Tiếp</button>
        </div>
      </footer>
      {items.data?.workflowAvailability.some((workflow) => !workflow.available) && (
        <details className={styles.availability}>
          <summary>Một số luồng hiện chưa khả dụng</summary>
          <ul>
            {items.data.workflowAvailability.filter((workflow) => !workflow.available).map((workflow) => (
              <li key={workflow.workflow}>{workflow.workflow}: {workflow.reason || "Chưa được máy chủ bật."}</li>
            ))}
          </ul>
        </details>
      )}
    </section>
  );
}
