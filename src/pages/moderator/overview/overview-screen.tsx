import { useQuery } from "@tanstack/react-query";

import { DataTable } from "@/components/table/data-table";

import { dashboardApi } from "@/apis/dashboard.api";

import { getApiErrorMessage } from "@/lib/api-errors";

import { moderatorStyles as styles } from "../moderator-shell";

import { MODERATOR_MESSAGES } from "@/text/moderator/moderator-messages";

const numberFormat = new Intl.NumberFormat("vi-VN");

function moneyFormat(currency: string, value: number | null | undefined): string {
  if (value == null) return "â€”";
  try {
    return new Intl.NumberFormat("vi-VN", { style: "currency", currency }).format(value);
  } catch {
    return numberFormat.format(value) + " " + currency;
  }
}

const countFormat = (value: number | null | undefined) =>
  value == null ? "â€”" : numberFormat.format(value);

function QueryFeedback({
  query,
  loadingMessage,
  errorMessage,
}: {
  query: {
    isPending: boolean;
    isError: boolean;
    error: unknown;
    refetch: () => unknown;
  };
  loadingMessage: string;
  errorMessage?: string;
}) {
  if (query.isPending) {
    return <p className={styles.pendingNotice} role="status">{loadingMessage}</p>;
  }
  if (query.isError) {
    return (
      <div className={styles.pendingNotice} role="alert">
        <p>{errorMessage ?? getApiErrorMessage(query.error)}</p>
        <button className={styles.retryButton} type="button" onClick={() => void query.refetch()}>
          {MODERATOR_MESSAGES.READ_SCREENS.RETRY}
        </button>
      </div>
    );
  }
  return null;
}

function PageHeading({ title, description }: { title: string; description: string }) {
  return (
    <header className={styles.pageHeading}>
      <h1>{title}</h1>
      <p>{description}</p>
    </header>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <article className={styles.pendingNotice}>
      <p style={{ margin: 0, color: "#706561", fontSize: 14 }}>{label}</p>
      <strong style={{ display: "block", marginTop: 8, fontSize: 24 }}>{value}</strong>
    </article>
  );
}

export function OverviewScreen() {
  const overview = useQuery({
    queryKey: ["dolores", "dashboard", "overview"],
    queryFn: ({ signal }) => dashboardApi.getOverview(signal),
  });
  const metrics = overview.data?.operationalMetrics;
  const dailyUsage = metrics?.dailyAcceptedCupUsage ?? [];
  const financialMetrics = overview.data?.financialMetrics ?? [];

  return (
    <div className={styles.pageContent}>
      <PageHeading
        title={MODERATOR_MESSAGES.READ_SCREENS.OVERVIEW_TITLE}
      />
      <QueryFeedback
        query={overview}
        loadingMessage={MODERATOR_MESSAGES.READ_SCREENS.LOADING_OVERVIEW}
      />
      {overview.data && !overview.isError && !metrics && (
        <p className={styles.pendingNotice} role="status">
          {MODERATOR_MESSAGES.READ_SCREENS.EMPTY_OVERVIEW}
        </p>
      )}
      {metrics && (
        <>
          <section
            aria-label={MODERATOR_MESSAGES.READ_SCREENS.OVERVIEW_TITLE}
            style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 14 }}
          >
            <MetricCard label={MODERATOR_MESSAGES.READ_SCREENS.TOTAL_OWNERS} value={countFormat(metrics.totalOwners)} />
            <MetricCard label={MODERATOR_MESSAGES.READ_SCREENS.CUPS_IN_PERIOD} value={countFormat(metrics.cupsInSelectedPeriod)} />
            <MetricCard label={MODERATOR_MESSAGES.READ_SCREENS.OPEN_MAINTENANCE} value={countFormat(metrics.openMaintenanceTickets)} />
            <MetricCard label={MODERATOR_MESSAGES.READ_SCREENS.OPEN_INSTALLATIONS} value={countFormat(metrics.openInstallationWorkOrders)} />
          </section>
          <section className={styles.pendingNotice} aria-labelledby="moderator-daily-usage">
            <h2 id="moderator-daily-usage">{MODERATOR_MESSAGES.READ_SCREENS.DAILY_USAGE}</h2>
            {dailyUsage.length === 0 ? (
              <p>{MODERATOR_MESSAGES.READ_SCREENS.NO_DAILY_USAGE}</p>
            ) : (
              <DataTable
                variant="moderator"
                headers={[MODERATOR_MESSAGES.READ_SCREENS.DAILY_USAGE_DATE, MODERATOR_MESSAGES.READ_SCREENS.CUPS_IN_PERIOD]}
              >
                {dailyUsage.map((item, index) => (
                  <tr key={(item.date ?? "unknown") + "-" + index}>
                    <td>{item.date ?? "â€”"}</td>
                    <td>{countFormat(item.cups)}</td>
                  </tr>
                ))}
              </DataTable>
            )}
          </section>
          <section className={styles.pendingNotice} aria-labelledby="moderator-financial-overview">
            <h2 id="moderator-financial-overview">{MODERATOR_MESSAGES.READ_SCREENS.FINANCIAL}</h2>
            {financialMetrics.length === 0 ? (
              <p>{MODERATOR_MESSAGES.READ_SCREENS.NO_FINANCIAL}</p>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 14 }}>
                {financialMetrics.map((item, index) => (
                  <div key={(item.currency ?? "currency") + "-" + index}>
                    <strong>{item.currency ?? "â€”"}</strong>
                    <p>{MODERATOR_MESSAGES.READ_SCREENS.FINANCIAL_ISSUED}: {moneyFormat(item.currency ?? "VND", item.amountIssued)}</p>
                    <p>{MODERATOR_MESSAGES.READ_SCREENS.FINANCIAL_COLLECTED}: {moneyFormat(item.currency ?? "VND", item.amountCollected)}</p>
                    <p>{MODERATOR_MESSAGES.READ_SCREENS.FINANCIAL_OUTSTANDING}: {moneyFormat(item.currency ?? "VND", item.outstandingBalance)}</p>
                    <p>{MODERATOR_MESSAGES.READ_SCREENS.FINANCIAL_OVERDUE}: {moneyFormat(item.currency ?? "VND", item.overdueBalance)}</p>
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}

