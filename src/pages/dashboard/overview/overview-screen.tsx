import { useQuery } from "@tanstack/react-query";
import { dashboardApi } from "@/apis/dashboard.api";
import { CUSTOMER_MESSAGES } from "@/text/customer/customer-messages";
import { formatDate, formatMoney, MetricCard, QueryFeedback } from "../shared/customer-screen-common";
import styles from "../customer-shell.module.css";

const messages = CUSTOMER_MESSAGES.READ_SCREENS;

export function OverviewScreen() {
  const query = useQuery({
    queryKey: ["owner-dashboard-overview"],
    queryFn: ({ signal }) => dashboardApi.getOverview(signal),
  });
  const overview = query.data;
  const operations = overview?.operationalMetrics;
  const finances = overview?.financialMetrics ?? [];
  const metrics = [
    { label: messages.OVERVIEW_CONTRACTS, value: operations?.contractsByStatus ? Object.values(operations.contractsByStatus).reduce((a, b) => a + b, 0) : null },
    { label: messages.OVERVIEW_MACHINES, value: operations?.machinesByTypeAndStatus ? Object.values(operations.machinesByTypeAndStatus).reduce((sum, statuses) => sum + Object.values(statuses).reduce((a, b) => a + b, 0), 0) : null },
    { label: messages.OVERVIEW_CUPS, value: operations?.cupsInSelectedPeriod ?? null },
    { label: messages.OVERVIEW_OPEN_REPAIRS, value: operations?.openMaintenanceTickets ?? null },
  ];

  return (
    <section className={styles.pageContent} aria-labelledby="customer-screen-title">
      <header className={styles.pageHeading}>
        <h1 id="customer-screen-title">{messages.OVERVIEW_TITLE}</h1>
        <p>{messages.OVERVIEW_DESCRIPTION}</p>
      </header>
      {query.isPending || query.isError ? (
        <QueryFeedback loading={query.isPending} failed={query.isError} empty={false} emptyText="" />
      ) : (
        <>
          <div className={styles.metricGrid}>
            {metrics.map((metric) => (
              <MetricCard
                key={metric.label}
                label={metric.label}
                value={metric.value === null ? "—" : metric.value.toLocaleString("vi-VN")}
              />
            ))}
          </div>
          {finances.length ? (
            <section className={styles.dataPanel} aria-labelledby="owner-financial-summary">
              <h2 id="owner-financial-summary">{messages.OVERVIEW_FINANCIAL}</h2>
              <div className={styles.metricGrid}>
                {finances.map((finance, index) => (
                  <MetricCard
                    key={finance.currency ?? String(index)}
                    label={finance.currency ?? "VND"}
                    value={formatMoney(finance.outstandingBalance, finance.currency ?? "VND")}
                  />
                ))}
              </div>
            </section>
          ) : null}
          <p className={styles.dataFootnote}>
            {messages.OVERVIEW_PERIOD}: {formatDate(overview?.usagePeriodStart)} – {formatDate(overview?.usagePeriodEnd)}
          </p>
        </>
      )}
    </section>
  );
}
