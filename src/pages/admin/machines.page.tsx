import axios from "axios";
import Link from "next/link";
import { useState } from "react";
import { z } from "zod";
import { useQuery } from "@tanstack/react-query";
import { machinesApi } from "@/apis/machines.api";
import { PATH_ADMIN } from "@/routes/path";
import { ButtonBar } from "@/components/button/button-bar";
import { MachineStatusSchema } from "@/schema/machines.schema";
import { ADMIN_OPERATIONS_MESSAGES as T } from "@/text/admin/admin-operations-messages";
import { AdminActionBar } from "@/components/action-bar/admin-action-bar";
import { AdminShell, adminStyles as styles } from "./admin-shell";

const STATUSES = MachineStatusSchema.options;
type MachineStatus = z.infer<typeof MachineStatusSchema>;
type StatusFilter = "ALL" | MachineStatus;

const STATUS_LABELS: Record<MachineStatus, string> = {
  IN_WAREHOUSE: "Trong kho",
  PENDING_ACTIVATION: "Chờ kích hoạt",
  DEPLOYED_CONTRACT_OWNER: "Đang triển khai · Owner hợp đồng",
  DEPLOYED_STORE_OWNER: "Đang triển khai · Owner cửa hàng",
  UNDER_MAINTENANCE: "Đang bảo trì",
  REFURBISHING: "Đang tân trang",
  PENDING_QA: "Chờ kiểm định",
  AVAILABLE_FOR_RENT: "Sẵn sàng cho thuê",
  RETIRED: "Đã ngừng sử dụng",
};

function errorText(error: unknown): string {
  if (error instanceof z.ZodError) return T.COMMON.INVALID;
  if (axios.isAxiosError(error)) {
    if (error.response?.status === 403) return T.COMMON.FORBIDDEN;
    if (error.response?.status === 404) return T.MACHINES.NOT_FOUND;
    if (error.response?.status === 502 || !error.response) return "Không kết nối được tới Dolores. Vui lòng thử lại sau.";
  }
  return T.COMMON.ERROR;
}

function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleDateString("vi-VN");
}

function formatPeriod(start: string | null | undefined, end: string | null | undefined): string {
  if (!start && !end) return "—";
  return `${formatDate(start)} – ${formatDate(end)}`;
}

function statusLabel(status: MachineStatus | null | undefined): string {
  return status ? STATUS_LABELS[status] : "Chưa có trạng thái";
}

function MachinesContent() {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const inventory = useQuery({
    queryKey: ["dolores", "machines", "inventory"],
    queryFn: ({ signal }) => machinesApi.list(signal),
  });
  const summary = useQuery({
    queryKey: ["dolores", "machines", "inventory-summary"],
    queryFn: ({ signal }) => machinesApi.getInventorySummary(signal),
  });

  const visibleMachines = (inventory.data ?? []).filter(
    (machine) => statusFilter === "ALL" || machine.status === statusFilter,
  );
  const countFor = (...statuses: MachineStatus[]) => {
    const counts = summary.data?.statusCounts;
    if (!counts) return "—";
    return statuses.reduce((sum, status) => sum + (counts[status] ?? 0), 0).toLocaleString("vi-VN");
  };

  return (
    <AdminShell>
      <div className={styles.pageContent}>
        <div className={styles.pageHeading}>
          <h1>{T.MACHINES.TITLE}</h1>
          <p>{T.MACHINES.DESCRIPTION}</p>
        </div>
        <div className={styles.metricsGrid}>
          <article className={styles.metricCard}><span>{T.MACHINES.TOTAL}</span><strong>{summary.data?.totalMachines?.toLocaleString("vi-VN") ?? "—"}</strong></article>
          <article className={styles.metricCard}><span>{T.MACHINES.WAREHOUSE}</span><strong>{countFor("IN_WAREHOUSE")}</strong></article>
          <article className={styles.metricCard}><span>{T.MACHINES.DEPLOYED}</span><strong>{countFor("DEPLOYED_CONTRACT_OWNER", "DEPLOYED_STORE_OWNER")}</strong></article>
          <article className={styles.metricCard}><span>{T.MACHINES.MAINTENANCE}</span><strong>{countFor("UNDER_MAINTENANCE", "REFURBISHING", "PENDING_QA")}</strong></article>
        </div>

        {summary.isPending && <section className={styles.panel} role="status">{T.COMMON.LOADING}</section>}
        {summary.isError && <div className={`${styles.notice} ${styles.errorNotice}`} role="alert"><p>{errorText(summary.error)}</p><button type="button" onClick={() => void summary.refetch()}>{T.COMMON.RETRY}</button></div>}

        <section className={styles.panel}>
          <h2>{T.MACHINES.TITLE}</h2>
          <div className={styles.operationsButtons} role="group" aria-label={T.MACHINES.STATUS}>
            <button className={statusFilter === "ALL" ? styles.accountPrimaryButton : styles.accountSecondaryButton} type="button" aria-pressed={statusFilter === "ALL"} onClick={() => setStatusFilter("ALL")}>{T.MACHINES.FILTER_ALL}</button>
            {STATUSES.map((status) => (
              <button className={statusFilter === status ? styles.accountPrimaryButton : styles.accountSecondaryButton} type="button" aria-pressed={statusFilter === status} key={status} onClick={() => setStatusFilter(status)}>{STATUS_LABELS[status]}</button>
            ))}
          </div>
          {inventory.isPending && <p className={styles.emptyText} role="status">{T.COMMON.LOADING}</p>}
          {inventory.isError && <div className={`${styles.notice} ${styles.errorNotice}`} role="alert"><p>{errorText(inventory.error)}</p><button type="button" onClick={() => void inventory.refetch()}>{T.COMMON.RETRY}</button></div>}
          {inventory.data && visibleMachines.length === 0 && <p className={styles.emptyText}>{inventory.data.length ? T.MACHINES.NO_MATCH : T.COMMON.EMPTY}</p>}
          {inventory.data && visibleMachines.length > 0 && <div className={styles.tableScroll}>
            <table className={styles.operationsTable}>
              <thead><tr><th>{T.MACHINES.MACHINE_ID}</th><th>{T.MACHINES.SERIAL}</th><th>{T.MACHINES.STATUS}</th><th>{T.MACHINES.OWNER_ID}</th><th>{T.MACHINES.REGION}</th><th>{T.MACHINES.CONTRACT_PERIOD}</th><th>{T.MACHINES.DEPLOYED_AT}</th></tr></thead>
              <tbody>{visibleMachines.map((machine) => <tr key={machine.id}>
                <td><Link className={styles.accountTextButton} href={PATH_ADMIN.MACHINE_DETAIL(machine.id)} title={machine.id}>{machine.id.slice(0, 8).toUpperCase()}</Link></td>
                <td>{machine.serialNumber ?? "—"}</td>
                <td>{statusLabel(machine.status)}</td>
                <td title={machine.ownerId ?? undefined}>{machine.ownerId ?? "—"}</td>
                <td>{machine.region ?? "—"}</td>
                <td>{formatPeriod(machine.contractStartDate, machine.contractEndDate)}</td>
                <td>{formatDate(machine.deployedAt)}</td>
              </tr>)}</tbody>
            </table>
          </div>}
        </section>
      </div>
      <AdminActionBar>
        <ButtonBar href={PATH_ADMIN.IOT}>{T.MACHINES.VIEW_IOT}</ButtonBar>
        <ButtonBar type="button" disabled={inventory.isFetching || summary.isFetching} onClick={() => { void Promise.all([inventory.refetch(), summary.refetch()]); }}>
          {T.COMMON.RETRY}
        </ButtonBar>
      </AdminActionBar>
    </AdminShell>
  );
}

export default function MachinesPage() {
  return <MachinesContent />;
}
