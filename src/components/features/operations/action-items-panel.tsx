import Link from "next/link";
import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { dashboardApi } from "@/apis/dashboard.api";
import { buybacksApi } from "@/apis/buybacks.api";
import { repairCasesApi } from "@/apis/repair-cases.api";
import { ButtonBar } from "@/components/button/button-bar";
import { NotificationDialog } from "@/components/notification-dialog/notification-dialog";
import { DataTable, type DataTableColumn } from "@/components/table/data-table";
import { getApiErrorMessage } from "@/lib/api-errors";
import { createIdempotencyKey } from "@/lib/idempotency-key";
import { authScopedQuerySubject } from "@/lib/query-subject";
import { PATH_ADMIN, PATH_CUSTOMER, PATH_MODERATOR, PATH_TECHNICIAN } from "@/routes/path";
import { DashboardTimeBucketSchema, type TDashboardActionItem } from "@/schema/dashboard.schema";
import styles from "./action-items-panel.module.css";

type ActionItemsRole = "ADMIN" | "MODERATOR" | "OWNER" | "TECHNICIAN";
type TimeBucket = "ALL" | "TODAY" | "UPCOMING" | "OVERDUE" | "UNSCHEDULED";
type OwnerPaymentReceiptDecision = {
  actionKey: string;
  caseId: string;
  proofId: string;
  received: boolean;
  idempotencyKey: string;
  correlationId: string;
};

function ownerCustodyAcknowledgementTarget(item: TDashboardActionItem): { caseId: string; eventId: string } | undefined {
  if (item.actionType !== "OWNER_HANDOVER_ACK" || item.resourceType !== "MAINTENANCE_CUSTODY_EVENT") return undefined;
  for (const candidate of [item.nextAction?.path, item.detailPath]) {
    if (!candidate) continue;
    let pathname = candidate;
    try {
      pathname = new URL(candidate, "http://dashboard.local").pathname;
    } catch {
      continue;
    }
    const match = /\/repair-cases\/([0-9a-f-]{36})(?:\/custody-events\/([0-9a-f-]{36})(?:\/acknowledge)?)?\/?$/i.exec(pathname);
    if (!match || (match[2] && match[2].toLowerCase() !== item.resourceId.toLowerCase())) continue;
    return { caseId: match[1], eventId: match[2] ?? item.resourceId };
  }
  return undefined;
}

function ownerPaymentReceiptTarget(item: TDashboardActionItem): { caseId: string; proofId: string; href: string } | undefined {
  if (item.actionType !== "BUYBACK_OWNER_RECEIPT" || item.resourceType !== "BUYBACK_PAYMENT_PROOF") return undefined;
  const action = item.availableActions.find((candidate) => candidate.code === "RESPOND_BUYBACK_PAYMENT_RECEIPT");
  const expectedActionPath = `/api/v1/buybacks/payment-proofs/${item.resourceId}/owner-receipt`;
  if (!action || action.method !== "POST" || action.path !== expectedActionPath) return undefined;
  try {
    const detailPath = new URL(item.detailPath, "http://dashboard.local").pathname;
    const match = /^\/api\/v1\/buybacks\/([0-9a-f-]{36})\/?$/i.exec(detailPath);
    if (!match) return undefined;
    return {
      caseId: match[1],
      proofId: item.resourceId,
      href: `${PATH_CUSTOMER.BUYBACK}?caseId=${encodeURIComponent(match[1])}`,
    };
  } catch {
    return undefined;
  }
}

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
      case "MAINTENANCE_CUSTODY_EVENT": {
        const target = ownerCustodyAcknowledgementTarget(item);
        return target ? PATH_CUSTOMER.SUPPORT_REPAIR_CASE_DETAIL(target.caseId) : undefined;
      }
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

function tableVariant(role: ActionItemsRole): "operations" | "moderator" | "customer" | "standard" {
  if (role === "OWNER") return "customer";
  if (role === "MODERATOR") return "moderator";
  if (role === "TECHNICIAN") return "standard";
  return "operations";
}

export function ActionItemsPanel({ role }: { role: ActionItemsRole }) {
  const [bucket, setBucket] = useState<TimeBucket>("ALL");
  const [page, setPage] = useState(0);
  const [openAcknowledgement, setOpenAcknowledgement] = useState<Record<string, boolean>>({});
  const [acknowledgementTexts, setAcknowledgementTexts] = useState<Record<string, string>>({});
  const [paymentReceiptDecision, setPaymentReceiptDecision] = useState<OwnerPaymentReceiptDecision | null>(null);
  const queryClient = useQueryClient();
  const parsedBucket = bucket === "ALL" ? undefined : DashboardTimeBucketSchema.parse(bucket);
  const items = useQuery({
    queryKey: ["dolores", "dashboard", "action-items", authScopedQuerySubject(role), parsedBucket ?? "ALL", page],
    queryFn: ({ signal }) => dashboardApi.getActionItems({ page, size: 20, ...(parsedBucket ? { timeBucket: parsedBucket } : {}) }, signal),
    retry: false,
  });
  const acknowledgeCustodyEvent = useMutation({
    mutationFn: ({ caseId, eventId, acknowledgement }: { actionKey: string; caseId: string; eventId: string; acknowledgement: string }) => {
      if (role !== "OWNER") throw new Error("Chỉ khách hàng trong hồ sơ mới có thể xác nhận bàn giao.");
      return repairCasesApi.acknowledgeCustodyEvent(caseId, eventId, { acknowledgement });
    },
    onSuccess: (_event, variables) => {
      setOpenAcknowledgement((current) => ({ ...current, [variables.actionKey]: false }));
      setAcknowledgementTexts((current) => ({ ...current, [variables.actionKey]: "" }));
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: ["dolores", "dashboard", "action-items"] });
      await queryClient.invalidateQueries({ queryKey: ["dolores", "repair-workflow"] });
    },
  });
  const respondToOwnerPaymentReceipt = useMutation({
    mutationFn: (input: OwnerPaymentReceiptDecision) => {
      if (role !== "OWNER") throw new Error("Chỉ khách hàng trong hồ sơ mới có thể phản hồi khoản thanh toán thu mua máy.");
      return buybacksApi.respondToOwnerPaymentReceipt(input.proofId, {
        received: input.received,
        idempotencyKey: input.idempotencyKey,
        correlationId: input.correlationId,
      });
    },
    onSuccess: () => setPaymentReceiptDecision(null),
    onSettled: async (_proof, _error, input) => {
      const subject = authScopedQuerySubject("OWNER");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["dolores", "dashboard", "action-items"] }),
        queryClient.invalidateQueries({ queryKey: ["dolores", "owner", "buyback", subject, input.caseId] }),
        queryClient.invalidateQueries({ queryKey: ["dolores", "owner", "buyback-payment-proofs", subject, input.caseId] }),
        queryClient.invalidateQueries({ queryKey: ["dolores", "owner", "buybacks", subject] }),
      ]);
    },
  });
  const openPaymentReceiptDialog = (actionKey: string, caseId: string, proofId: string, received: boolean) => {
    respondToOwnerPaymentReceipt.reset();
    const key = createIdempotencyKey();
    setPaymentReceiptDecision({ actionKey, caseId, proofId, received, idempotencyKey: key, correlationId: key });
  };
  const columns: readonly DataTableColumn<TDashboardActionItem>[] = [
    {
      key: "work",
      header: "Công việc",
      render: (item) => <strong className={styles.workTitle}>{item.title}</strong>,
    },
    {
      key: "priority",
      header: "Ưu tiên",
      render: (item) => <span className={item.overdue ? styles.overdue : styles.priority}>{item.overdue ? "Quá hạn" : item.priority}</span>,
    },
    { key: "due-date", header: "Hạn xử lý", render: (item) => formatDate(item.dueAt ?? item.scheduledAt) },
    { key: "owner", header: "Khách hàng", render: (item) => item.ownerName || "—" },
    { key: "machine", header: "Máy", render: (item) => item.machineSerialNumber || "—" },
    {
      key: "action",
      header: "Thao tác",
      render: (item) => {
        const paymentReceiptTarget = role === "OWNER" ? ownerPaymentReceiptTarget(item) : undefined;
        if (paymentReceiptTarget) {
          return (
            <div className={styles.acknowledgementForm}>
              <Link className={styles.openLink} href={paymentReceiptTarget.href}>Xem hồ sơ và chứng từ</Link>
              <div className={styles.acknowledgementActions}>
                <ButtonBar
                  type="button"
                  disabled={respondToOwnerPaymentReceipt.isPending}
                  onClick={() => openPaymentReceiptDialog(item.actionKey, paymentReceiptTarget.caseId, paymentReceiptTarget.proofId, true)}
                >Đã nhận tiền</ButtonBar>
                <ButtonBar
                  type="button"
                  disabled={respondToOwnerPaymentReceipt.isPending}
                  onClick={() => openPaymentReceiptDialog(item.actionKey, paymentReceiptTarget.caseId, paymentReceiptTarget.proofId, false)}
                >Chưa nhận được tiền</ButtonBar>
              </div>
            </div>
          );
        }
        const acknowledgementTarget = role === "OWNER" ? ownerCustodyAcknowledgementTarget(item) : undefined;
        if (acknowledgementTarget) {
          const acknowledgement = acknowledgementTexts[item.actionKey] ?? "";
          const acknowledgementError = acknowledgeCustodyEvent.isError && acknowledgeCustodyEvent.variables?.actionKey === item.actionKey;
          const isAcknowledging = acknowledgeCustodyEvent.isPending && acknowledgeCustodyEvent.variables?.actionKey === item.actionKey;
          const submitAcknowledgement = (event: FormEvent<HTMLFormElement>) => {
            event.preventDefault();
            const value = acknowledgement.trim();
            if (!value || value.length > 1000 || acknowledgeCustodyEvent.isPending) return;
            acknowledgeCustodyEvent.mutate({
              actionKey: item.actionKey,
              ...acknowledgementTarget,
              acknowledgement: value,
            });
          };

          return openAcknowledgement[item.actionKey] ? (
            <form className={styles.acknowledgementForm} onSubmit={submitAcknowledgement}>
              <label className={styles.acknowledgementField}>
                <span>Nội dung xác nhận</span>
                <textarea
                  maxLength={1000}
                  onChange={(event) => setAcknowledgementTexts((current) => ({ ...current, [item.actionKey]: event.target.value }))}
                  required
                  value={acknowledgement}
                />
              </label>
              {acknowledgementError ? <p className={`${styles.notice} ${styles.error}`} role="alert">{getApiErrorMessage(acknowledgeCustodyEvent.error)}</p> : null}
              <div className={styles.acknowledgementActions}>
                <ButtonBar type="submit" disabled={!acknowledgement.trim() || acknowledgeCustodyEvent.isPending}>
                  {isAcknowledging ? "Đang xác nhận…" : "Gửi xác nhận"}
                </ButtonBar>
                <ButtonBar type="button" disabled={acknowledgeCustodyEvent.isPending} onClick={() => setOpenAcknowledgement((current) => ({ ...current, [item.actionKey]: false }))}>
                  Hủy
                </ButtonBar>
              </div>
            </form>
          ) : (
            <ButtonBar type="button" onClick={() => setOpenAcknowledgement((current) => ({ ...current, [item.actionKey]: true }))}>
              Xác nhận bàn giao
            </ButtonBar>
          );
        }
        const href = safeWorkflowHref(item, role);
        return href
          ? <Link className={styles.openLink} href={href}>Mở công việc</Link>
          : <span className={styles.unavailable}>Chưa có màn hình chi tiết cho vai trò này</span>;
      },
    },
  ];

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
      {items.data && (
        <DataTable
          variant={tableVariant(role)}
          {...(role === "ADMIN" ? { headerVariant: "admin" as const } : {})}
          rows={items.data.items}
          rowKey={(item) => item.actionKey}
          columns={columns}
          style={{ minWidth: 1040 }}
          emptyMessage="Không có công việc trong khoảng thời hạn này."
        />
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
              <li key={workflow.workflow}>{workflow.workflow}: {workflow.reason || "Chức năng này hiện chưa khả dụng."}</li>
            ))}
          </ul>
        </details>
      )}
      {paymentReceiptDecision ? (
        <NotificationDialog
          variant="confirm"
          eyebrow="Xác nhận thanh toán thu mua"
          title={paymentReceiptDecision.received ? "Bạn đã nhận được tiền?" : "Bạn chưa nhận được tiền?"}
          description={paymentReceiptDecision.received
            ? "Xác nhận để ghi nhận khoản thanh toán đã nhận. Hồ sơ sẽ chuyển sang bước tân trang."
            : "Gửi phản hồi để Moderator kiểm tra giao dịch và cập nhật chứng từ. Hồ sơ sẽ tiếp tục chờ xử lý thanh toán."
          }
          primaryAction={{
            label: paymentReceiptDecision.received ? "Xác nhận đã nhận tiền" : "Gửi báo chưa nhận tiền",
            pending: respondToOwnerPaymentReceipt.isPending,
            pendingLabel: "Đang gửi phản hồi…",
            disabled: respondToOwnerPaymentReceipt.isPending,
            onClick: () => respondToOwnerPaymentReceipt.mutate(paymentReceiptDecision),
          }}
          secondaryAction={{
            label: "Quay lại",
            disabled: respondToOwnerPaymentReceipt.isPending,
            onClick: () => { setPaymentReceiptDecision(null); respondToOwnerPaymentReceipt.reset(); },
          }}
          onClose={() => { if (!respondToOwnerPaymentReceipt.isPending) { setPaymentReceiptDecision(null); respondToOwnerPaymentReceipt.reset(); } }}
          closeOnEscape={!respondToOwnerPaymentReceipt.isPending}
        >
          {respondToOwnerPaymentReceipt.isError ? <p className={`${styles.notice} ${styles.error}`} role="alert">{getApiErrorMessage(respondToOwnerPaymentReceipt.error)}</p> : null}
        </NotificationDialog>
      ) : null}
    </section>
  );
}
