import { useQuery } from "@tanstack/react-query";
import { machinesApi } from "@/apis/machines.api";
import { MachineStatusSchema } from "@/schema/machines.schema";
import { getApiErrorMessage } from "@/lib/api-errors";
import { ADMIN_OPERATIONS_MESSAGES as T } from "@/text/admin/admin-operations-messages";
import { adminStyles as styles } from "../admin-shell";

type MachineStatus = (typeof MachineStatusSchema.options)[number];

export function MachineInventorySummary() {
  const summary = useQuery({
    queryKey: ["dolores", "machines", "inventory-summary"],
    queryFn: ({ signal }) => machinesApi.getInventorySummary(signal),
  });
  const countFor = (...statuses: MachineStatus[]) => {
    const counts = summary.data?.statusCounts;
    if (!counts) return "—";
    return statuses.reduce((sum, status) => sum + (counts[status] ?? 0), 0).toLocaleString("vi-VN");
  };

  return (
    <>
      <div className={styles.metricsGrid}>
        <article className={`${styles.metricCard} ${styles.metricCardCentered}`}><span>{T.MACHINES.TOTAL}</span><strong>{summary.data?.totalMachines?.toLocaleString("vi-VN") ?? "—"}</strong></article>
        <article className={`${styles.metricCard} ${styles.metricCardCentered}`}><span>{T.MACHINES.WAREHOUSE}</span><strong>{countFor("IN_WAREHOUSE")}</strong></article>
        <article className={`${styles.metricCard} ${styles.metricCardCentered}`}><span>{T.MACHINES.DEPLOYED}</span><strong>{countFor("DEPLOYED_CONTRACT_OWNER", "DEPLOYED_STORE_OWNER")}</strong></article>
        <article className={`${styles.metricCard} ${styles.metricCardCentered}`}><span>{T.MACHINES.MAINTENANCE}</span><strong>{countFor("UNDER_MAINTENANCE", "REFURBISHING", "PENDING_QA")}</strong></article>
      </div>
      {summary.isPending && <section className={styles.panel} role="status">{T.COMMON.LOADING}</section>}
      {summary.isError && (
        <div className={`${styles.notice} ${styles.errorNotice}`} role="alert">
          <p>{getApiErrorMessage(summary.error)}</p>
          <button type="button" onClick={() => void summary.refetch()}>{T.COMMON.RETRY}</button>
        </div>
      )}
    </>
  );
}
