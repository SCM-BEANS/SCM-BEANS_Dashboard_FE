import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { repairCasesApi } from "@/apis/repair-cases.api";
import { DataTable, type DataTableColumn } from "@/components/table/data-table";
import { TruncatedId } from "@/components/truncated-id/truncated-id";
import { TextLinkButton } from "@/components/button/text-link-button";
import { getApiErrorMessage } from "@/lib/api-errors";
import type { RepairCaseSummary } from "@/schema/machines.schema";
import { REPAIR_WORKFLOW_MESSAGES as M } from "@/text/repair-workflow/repair-workflow-messages";
import { querySubject, type RepairWorkflowRole } from "./repair-workflow-query-identity";
import { RepairWorkflowPagination } from "./repair-workflow-pagination";
import { useOwnerNames } from "@/hooks/use-owner-names";
import styles from "./repair-workflow.module.css";

function formatDateTime(value: string | null | undefined): string {
  if (!value) return "—";
  const timestamp = Date.parse(value);
  return Number.isNaN(timestamp)
    ? value
    : new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium", timeStyle: "short" }).format(timestamp);
}

function statusLabel(status: string): string {
  return M.STATUS_LABELS[status as keyof typeof M.STATUS_LABELS] ?? status;
}

function tableVariant(role: RepairWorkflowRole): "operations" | "moderator" | "standard" | "customer" {
  if (role === "owner") return "customer";
  if (role === "technician") return "standard";
  if (role === "moderator") return "moderator";
  return "operations";
}

export function RepairCaseListPanel({
  role,
  detailHref,
  title = M.CASE_LIST_TITLE,
  description = M.CASE_LIST_DESCRIPTION,
  showOwner = role === "admin" || role === "moderator",
}: {
  role: RepairWorkflowRole;
  detailHref: (caseId: string) => string;
  title?: string;
  description?: string;
  showOwner?: boolean;
}) {
  const [page, setPage] = useState(0);
  const subject = querySubject(role);
  const cases = useQuery({
    queryKey: ["dolores", "repair-workflow", subject, "case-list", page, 50],
    queryFn: ({ signal }) => repairCasesApi.listPage({ page, size: 50 }, signal),
    retry: false,
  });
  const ownerNames = useOwnerNames(showOwner ? (cases.data?.items.map((repairCase) => (
    repairCase.ownerName?.trim() ? null : repairCase.ownerId
  )) ?? []) : []);

  const columns: readonly DataTableColumn<RepairCaseSummary>[] = [
    {
      key: "case-id",
      header: M.CASE_ID,
      render: (repairCase) => (
        <TextLinkButton href={detailHref(repairCase.id)}><TruncatedId value={repairCase.id} /></TextLinkButton>
      ),
    },
    { key: "request-id", header: M.REQUEST_ID, render: (repairCase) => <TruncatedId value={repairCase.maintenanceRequestId} /> },
    ...(showOwner ? [{
      key: "owner",
      header: "Khách hàng",
      render: (repairCase: RepairCaseSummary) => (
        (repairCase.ownerName?.trim() || ownerNames.data?.[repairCase.ownerId]) || "—"
      ),
    }] : []),
    { key: "machine", header: M.MACHINE, render: (repairCase) => <TruncatedId value={repairCase.primaryMachineId} /> },
    { key: "status", header: M.STATUS, render: (repairCase) => statusLabel(repairCase.status) },
    { key: "updated-at", header: M.UPDATED_AT, render: (repairCase) => formatDateTime(repairCase.updatedAt) },
  ];

  return (
    <section className={styles.panel} aria-labelledby="repair-case-list-title">
      <header className={styles.panelHeading}>
        <div>
          <h2 id="repair-case-list-title">{title}</h2>
          {description ? <p>{description}</p> : null}
        </div>
        <button type="button" className={styles.inlineButton} disabled={cases.isFetching} onClick={() => void cases.refetch()}>
          {cases.isFetching ? M.CASE_REFRESHING : M.CASE_REFRESH}
        </button>
      </header>
      {cases.isPending ? <p className={styles.notice} role="status">{M.CASE_LIST_LOADING}</p> : null}
      {cases.isError ? (
        <div className={`${styles.notice} ${styles.error}`} role="alert">
          <p>{getApiErrorMessage(cases.error)}</p>
          <button type="button" className={styles.inlineButton} onClick={() => void cases.refetch()}>
            {M.CASE_RETRY}
          </button>
        </div>
      ) : null}
      {cases.data ? (
        <>
          <DataTable
            variant={tableVariant(role)}
            rows={cases.data.items}
            rowKey={(repairCase) => repairCase.id}
            columns={columns}
            emptyMessage={M.CASE_LIST_EMPTY}
          />
          <RepairWorkflowPagination
            page={cases.data.page}
            hasNext={cases.data.hasNext}
            isFetching={cases.isFetching}
            ariaLabel="Phân trang hồ sơ sửa chữa"
            onPageChange={setPage}
          />
        </>
      ) : null}
    </section>
  );
}

