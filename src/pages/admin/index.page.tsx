import axios from "axios";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { dashboardApi } from "@/apis/dashboard.api";
import { ButtonBar } from "@/components/button/button-bar";
import { PATH_ADMIN } from "@/routes/path";
import { ADMIN_MESSAGES } from "@/text/admin/admin-messages";
import { AdminShell, adminStyles as styles } from "./admin-shell";

const number = new Intl.NumberFormat("vi-VN");
const money = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
});

function count(value: number | null | undefined): string {
  return value == null ? "—" : number.format(value);
}

function amount(value: number | null | undefined): string {
  return value == null ? "—" : money.format(value);
}

function describeError(error: unknown): string {
  if (error instanceof z.ZodError) return ADMIN_MESSAGES.OVERVIEW.INVALID_RESPONSE;
  if (axios.isAxiosError(error)) {
    if (error.response?.status === 403) return ADMIN_MESSAGES.OVERVIEW.FORBIDDEN;
    if (error.response?.status === 502 || !error.response) {
      return ADMIN_MESSAGES.OVERVIEW.UNAVAILABLE;
    }
  }
  return ADMIN_MESSAGES.OVERVIEW.ERROR;
}

function AdminOverview() {
  const overview = useQuery({
    queryKey: ["dolores", "dashboard", "overview"],
    queryFn: ({ signal }) => dashboardApi.getOverview(signal),
  });
  const metrics = overview.data?.operationalMetrics;
  const days = metrics?.dailyAcceptedCupUsage ?? [];
  const vnd = overview.data?.financialMetrics?.find(
    (item) => item.currency?.toUpperCase() === "VND",
  );

  return (
    <div className={styles.pageContent}>
      <div className={styles.pageHeading}>
        <div>
          <h1>{ADMIN_MESSAGES.OVERVIEW.TITLE}</h1>
          <p>{ADMIN_MESSAGES.OVERVIEW.DESCRIPTION}</p>
        </div>
      </div>

      <p className={styles.pendingNotice}>{ADMIN_MESSAGES.NAVIGATION.PENDING}</p>

      {overview.isPending && (
        <div className={styles.notice} role="status">
          {ADMIN_MESSAGES.OVERVIEW.LOADING}
        </div>
      )}

      {overview.isError && (
        <div className={`${styles.notice} ${styles.errorNotice}`} role="alert">
          <p>{describeError(overview.error)}</p>
          <button type="button" onClick={() => void overview.refetch()}>
            {ADMIN_MESSAGES.OVERVIEW.RETRY}
          </button>
        </div>
      )}

      {overview.data && !metrics && (
        <div className={styles.notice}>{ADMIN_MESSAGES.OVERVIEW.EMPTY}</div>
      )}

      {overview.data && (
        <>
          {metrics && (
            <div className={styles.metricsGrid}>
              {[
                [ADMIN_MESSAGES.OVERVIEW.CUSTOMERS, count(metrics.totalOwners)],
                [ADMIN_MESSAGES.OVERVIEW.CUPS, count(metrics.cupsInSelectedPeriod)],
                [ADMIN_MESSAGES.OVERVIEW.MAINTENANCE, count(metrics.openMaintenanceTickets)],
                [ADMIN_MESSAGES.OVERVIEW.INSTALLATIONS, count(metrics.openInstallationWorkOrders)],
              ].map(([label, value]) => (
                <div className={styles.metricCard} key={label}>
                  <span>{label}</span>
                  <strong>{value}</strong>
                </div>
              ))}
            </div>
          )}

          <section className={styles.panel}>
            <h2>{ADMIN_MESSAGES.OVERVIEW.DAILY_CUPS}</h2>
            <p className={styles.panelSubtitle}>
              {ADMIN_MESSAGES.OVERVIEW.PERIOD}: {overview.data.usagePeriodStart ?? "—"} – {overview.data.usagePeriodEnd ?? "—"}
              {" · "}{ADMIN_MESSAGES.OVERVIEW.UPDATED} {overview.data.asOfDate ?? "—"}
            </p>
            {days.length ? (
              <div className={styles.tableScroll}>
                <table>
                  <thead>
                    <tr>
                      <th>{ADMIN_MESSAGES.OVERVIEW.DATE}</th>
                      <th>{ADMIN_MESSAGES.OVERVIEW.CUP_COUNT}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {days.map((day, index) => (
                      <tr key={`${day.date ?? "unknown"}-${index}`}>
                        <td>{day.date ?? "—"}</td>
                        <td>{count(day.cups)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className={styles.emptyText}>{ADMIN_MESSAGES.OVERVIEW.NO_DAILY_DATA}</p>
            )}
          </section>

          <section className={styles.panel}>
            <h2>{ADMIN_MESSAGES.OVERVIEW.FINANCIAL}</h2>
            {vnd ? (
              <div className={styles.financeGrid}>
                {[
                  [ADMIN_MESSAGES.OVERVIEW.ISSUED, amount(vnd.amountIssued)],
                  [ADMIN_MESSAGES.OVERVIEW.COLLECTED, amount(vnd.amountCollected)],
                  [ADMIN_MESSAGES.OVERVIEW.OUTSTANDING, amount(vnd.outstandingBalance)],
                  [ADMIN_MESSAGES.OVERVIEW.OVERDUE, amount(vnd.overdueBalance)],
                ].map(([label, value]) => (
                  <div key={label}>
                    <span>{label}</span>
                    <strong>{value}</strong>
                  </div>
                ))}
              </div>
            ) : (
              <p className={styles.emptyText}>{ADMIN_MESSAGES.OVERVIEW.NO_FINANCIAL_DATA}</p>
            )}
          </section>
        </>
      )}
    </div>
  );
}

export default function AdminPage() {
  return (
    <AdminShell actions={
      <>
        <ButtonBar href={PATH_ADMIN.REPORTS}>{ADMIN_MESSAGES.NAVIGATION.REPORTS}</ButtonBar>
        <ButtonBar href={PATH_ADMIN.IOT}>{ADMIN_MESSAGES.NAVIGATION.IOT}</ButtonBar>
        <ButtonBar href={PATH_ADMIN.MACHINES}>{ADMIN_MESSAGES.NAVIGATION.MACHINES}</ButtonBar>
      </>
    }>
      <AdminOverview />
    </AdminShell>
  );
}
