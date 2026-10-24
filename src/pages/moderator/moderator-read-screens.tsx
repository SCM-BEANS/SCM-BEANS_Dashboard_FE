import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { lazy, Suspense } from "react";
import { dashboardApi } from "@/apis/dashboard.api";
import { contractsApi } from "@/apis/contracts.api";
import { notificationsApi } from "@/apis/notifications.api";
import { tenantsApi } from "@/apis/tenants.api";
import { PATH_MODERATOR } from "@/routes/path";
import { getApiErrorMessage } from "@/lib/api-errors";
import { ContractIdSchema, type ModeratorContract } from "@/schema/contracts.schema";
import { TenantIdSchema, type Tenant } from "@/schema/tenants.schema";
import { moderatorStyles as styles } from "./moderator-shell";
import { MODERATOR_MESSAGES } from "@/text/moderator/moderator-messages";

const ModeratorMachinesScreen = lazy(() => import("./moderator-operational-screens").then((module) => ({ default: module.ModeratorMachinesScreen })));
const ModeratorIoTScreen = lazy(() => import("./moderator-operational-screens").then((module) => ({ default: module.ModeratorIoTScreen })));
const ModeratorTechnicalScreen = lazy(() => import("./moderator-operational-screens").then((module) => ({ default: module.ModeratorTechnicalScreen })));
const ModeratorInvoicesScreen = lazy(() => import("./moderator-finance-catalog-screens").then((module) => ({ default: module.ModeratorInvoicesScreen })));
const ModeratorRecipesScreen = lazy(() => import("./moderator-finance-catalog-screens").then((module) => ({ default: module.ModeratorRecipesScreen })));
const ModeratorBuybackScreen = lazy(() => import("./moderator-finance-catalog-screens").then((module) => ({ default: module.ModeratorBuybackScreen })));

export function getOperationalScreenKind(sectionPath: string): "machines" | "iot" | "technical" | null {
  if (sectionPath === "machines" || sectionPath.startsWith("machines/")) return "machines";
  if (sectionPath === "iot" || sectionPath === "iot/customer" || sectionPath === "iot/machines") return "iot";
  if (sectionPath === "technical-requests" || sectionPath.startsWith("technical-requests/") ||
      sectionPath === "machine-history" || sectionPath.startsWith("machine-history/")) return "technical";
  return null;
}

function OperationalScreenLoading() {
  return <div className={styles.pageContent}><p className={styles.pendingNotice} role="status">{MODERATOR_MESSAGES.READ_SCREENS.LOADING_MACHINES}</p></div>;
}

const numberFormat = new Intl.NumberFormat("vi-VN");
function moneyFormat(currency: string, value: number | null | undefined): string {
  if (value == null) return "—";
  try {
    return new Intl.NumberFormat("vi-VN", { style: "currency", currency }).format(value);
  } catch {
    return numberFormat.format(value) + " " + currency;
  }
}
const countFormat = (value: number | null | undefined) =>
  value == null ? "—" : numberFormat.format(value);

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

function OverviewScreen() {
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
        description={MODERATOR_MESSAGES.READ_SCREENS.OVERVIEW_DESCRIPTION}
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
          <p className={styles.pendingNotice}>
            {MODERATOR_MESSAGES.READ_SCREENS.OVERVIEW_SCOPE}: {overview.data?.scope ?? "—"}
            {overview.data?.asOfDate
              ? " · " + MODERATOR_MESSAGES.READ_SCREENS.AS_OF_DATE + ": " + overview.data.asOfDate
              : ""}
          </p>
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
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                  <thead>
                    <tr>
                      <th scope="col">{MODERATOR_MESSAGES.READ_SCREENS.DAILY_USAGE_DATE}</th>
                      <th scope="col">{MODERATOR_MESSAGES.READ_SCREENS.CUPS_IN_PERIOD}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dailyUsage.map((item, index) => (
                      <tr key={(item.date ?? "unknown") + "-" + index}>
                        <td>{item.date ?? "—"}</td>
                        <td>{countFormat(item.cups)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
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
                    <strong>{item.currency ?? "—"}</strong>
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

function NotificationsScreen() {
  const queryClient = useQueryClient();
  const notifications = useQuery({
    queryKey: ["dolores", "notifications"],
    queryFn: ({ signal }) => notificationsApi.list(signal),
  });
  const unreadCount = useQuery({
    queryKey: ["dolores", "notifications", "unread-count"],
    queryFn: ({ signal }) => notificationsApi.unreadCount(signal),
  });
  const markReadMutation = useMutation({
    mutationFn: (id: string) => notificationsApi.markAsRead(id),
    retry: false,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["dolores", "notifications"] });
    },
  });

  return (
    <div className={styles.pageContent}>
      <PageHeading
        title={MODERATOR_MESSAGES.READ_SCREENS.NOTIFICATIONS_TITLE}
        description={MODERATOR_MESSAGES.READ_SCREENS.NOTIFICATIONS_DESCRIPTION}
      />
      <section className={styles.pendingNotice} aria-label={MODERATOR_MESSAGES.READ_SCREENS.UNREAD_COUNT}>
        <strong>{MODERATOR_MESSAGES.READ_SCREENS.UNREAD_COUNT}</strong>
        <QueryFeedback
          query={unreadCount}
          loadingMessage={MODERATOR_MESSAGES.READ_SCREENS.LOADING_UNREAD_COUNT}
          errorMessage={MODERATOR_MESSAGES.READ_SCREENS.UNREAD_COUNT_UNAVAILABLE + " " + getApiErrorMessage(unreadCount.error)}
        />
        {!unreadCount.isPending && !unreadCount.isError && (
          <p style={{ marginBottom: 0, fontSize: 24 }}>
            {countFormat(unreadCount.data?.unreadCount)}
          </p>
        )}
      </section>
      <section className={styles.pendingNotice} aria-labelledby="moderator-notification-list">
        <h2 id="moderator-notification-list">{MODERATOR_MESSAGES.READ_SCREENS.NOTIFICATION_LIST}</h2>
        <Link href={PATH_MODERATOR.NOTIFICATION_ALERTS}>
          {MODERATOR_MESSAGES.READ_SCREENS.VIEW_ALERTS}
        </Link>
        <QueryFeedback
          query={notifications}
          loadingMessage={MODERATOR_MESSAGES.READ_SCREENS.LOADING_NOTIFICATIONS}
        />
        {markReadMutation.isError && (
          <p className={styles.partialNotice} role="alert" aria-live="assertive">
            {MODERATOR_MESSAGES.READ_SCREENS.MARK_READ_ERROR} {getApiErrorMessage(markReadMutation.error, "mutation")}
          </p>
        )}
        {notifications.data?.length === 0 && !notifications.isError && (
          <p role="status">{MODERATOR_MESSAGES.READ_SCREENS.EMPTY_NOTIFICATIONS}</p>
        )}
        {notifications.data && notifications.data.length > 0 && (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
              <thead>
                <tr>
                  <th scope="col">{MODERATOR_MESSAGES.READ_SCREENS.NOTIFICATION_TITLE}</th>
                  <th scope="col">{MODERATOR_MESSAGES.READ_SCREENS.NOTIFICATION_CONTENT}</th>
                  <th scope="col">{MODERATOR_MESSAGES.READ_SCREENS.NOTIFICATION_TYPE}</th>
                  <th scope="col">{MODERATOR_MESSAGES.READ_SCREENS.NOTIFICATION_TIME}</th>
                  <th scope="col">{MODERATOR_MESSAGES.READ_SCREENS.NOTIFICATION_STATUS}</th>
                </tr>
              </thead>
              <tbody>
                {notifications.data.map((item) => (
                  <tr key={item.id}>
                    <td>{item.title}</td>
                    <td>{item.message}</td>
                    <td>{item.type}</td>
                    <td>{item.createdAt ?? "—"}</td>
                    <td>
                      {item.read ? MODERATOR_MESSAGES.READ_SCREENS.READ : (
                        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                          <span>{MODERATOR_MESSAGES.READ_SCREENS.UNREAD}</span>
                          <button
                            className={styles.retryButton}
                            type="button"
                            disabled={markReadMutation.isPending}
                            onClick={() => markReadMutation.mutate(item.id)}
                          >
                            {markReadMutation.isPending && markReadMutation.variables === item.id
                              ? MODERATOR_MESSAGES.READ_SCREENS.MARKING_READ
                              : MODERATOR_MESSAGES.READ_SCREENS.MARK_READ}
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function AlertsScreen() {
  const alerts = useQuery({
    queryKey: ["dolores", "alerts"],
    queryFn: ({ signal }) => notificationsApi.listAlerts(signal),
  });

  return (
    <div className={styles.pageContent}>
      <PageHeading
        title={MODERATOR_MESSAGES.READ_SCREENS.ALERTS_TITLE}
        description={MODERATOR_MESSAGES.READ_SCREENS.ALERTS_DESCRIPTION}
      />
      <p className={styles.pendingNotice} role="note">
        {MODERATOR_MESSAGES.READ_SCREENS.ALERT_SCOPE_NOTICE}
      </p>
      <section className={styles.pendingNotice} aria-labelledby="moderator-alert-list">
        <h2 id="moderator-alert-list">{MODERATOR_MESSAGES.READ_SCREENS.ALERT_LIST}</h2>
        <Link href={PATH_MODERATOR.NOTIFICATIONS}>
          {MODERATOR_MESSAGES.READ_SCREENS.VIEW_NOTIFICATIONS}
        </Link>
        <QueryFeedback
          query={alerts}
          loadingMessage={MODERATOR_MESSAGES.READ_SCREENS.LOADING_ALERTS}
        />
        {alerts.data?.length === 0 && !alerts.isError && (
          <p role="status">{MODERATOR_MESSAGES.READ_SCREENS.EMPTY_ALERTS}</p>
        )}
        {alerts.data && alerts.data.length > 0 && (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
              <thead>
                <tr>
                  <th scope="col">{MODERATOR_MESSAGES.READ_SCREENS.ALERT_LEVEL}</th>
                  <th scope="col">{MODERATOR_MESSAGES.READ_SCREENS.MACHINE_ID}</th>
                  <th scope="col">{MODERATOR_MESSAGES.READ_SCREENS.ALERT_TIME}</th>
                  <th scope="col">{MODERATOR_MESSAGES.READ_SCREENS.ALERT_CONTENT}</th>
                  <th scope="col">{MODERATOR_MESSAGES.READ_SCREENS.ALERT_STATUS}</th>
                </tr>
              </thead>
              <tbody>
                {alerts.data.map((alert) => (
                  <tr key={alert.id}>
                    <td>{alert.level}</td>
                    <td>{alert.machineId ?? "—"}</td>
                    <td>{alert.ts}</td>
                    <td>{alert.message}</td>
                    <td>{alert.acknowledged
                      ? MODERATOR_MESSAGES.READ_SCREENS.ALERT_ACKNOWLEDGED
                      : MODERATOR_MESSAGES.READ_SCREENS.ALERT_ACTIVE}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function TenantListScreen() {
  const tenants = useQuery({
    queryKey: ["dolores", "tenants"],
    queryFn: ({ signal }) => tenantsApi.list(signal),
    retry: false,
  });

  return (
    <div className={styles.pageContent}>
      <PageHeading
        title={MODERATOR_MESSAGES.READ_SCREENS.TENANTS_TITLE}
        description={MODERATOR_MESSAGES.READ_SCREENS.TENANTS_DESCRIPTION}
      />
      <QueryFeedback query={tenants} loadingMessage={MODERATOR_MESSAGES.READ_SCREENS.LOADING_TENANTS} />
      {tenants.data?.length === 0 && !tenants.isError && (
        <p className={styles.pendingNotice} role="status">{MODERATOR_MESSAGES.READ_SCREENS.EMPTY_TENANTS}</p>
      )}
      {tenants.data && tenants.data.length > 0 && (
        <div className={styles.tableScroll}>
          <table className={styles.dataTable}>
            <thead>
              <tr>
                <th scope="col">{MODERATOR_MESSAGES.READ_SCREENS.TENANT_NAME}</th>
                <th scope="col">{MODERATOR_MESSAGES.READ_SCREENS.TENANT_ID}</th>
                <th scope="col">{MODERATOR_MESSAGES.READ_SCREENS.TENANT_TYPE}</th>
                <th scope="col">{MODERATOR_MESSAGES.READ_SCREENS.BILLING_EXEMPT}</th>
                <th scope="col">Hành động</th>
              </tr>
            </thead>
            <tbody>
              {tenants.data.map((tenant) => (
                <tr key={tenant.id}>
                  <td>{tenant.name}</td>
                  <td>{tenant.id}</td>
                  <td>{tenant.type ?? "—"}</td>
                  <td>{tenant.billingExempt == null
                    ? "—"
                    : tenant.billingExempt
                      ? MODERATOR_MESSAGES.READ_SCREENS.BILLING_EXEMPT_YES
                      : MODERATOR_MESSAGES.READ_SCREENS.BILLING_EXEMPT_NO}</td>
                  <td><Link className={styles.tableLink} href={PATH_MODERATOR.CUSTOMER_DETAIL(tenant.id)}>Chi tiết</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function TenantDetailScreen({ id }: { id: string }) {
  const validId = TenantIdSchema.safeParse(id).success;
  const tenant = useQuery({
    queryKey: ["dolores", "tenants", "id", id],
    queryFn: ({ signal }) => tenantsApi.getById(id, signal),
    enabled: validId,
    retry: false,
  });

  return (
    <div className={styles.pageContent}>
      <PageHeading
        title={MODERATOR_MESSAGES.READ_SCREENS.TENANT_DETAIL_TITLE}
        description={MODERATOR_MESSAGES.READ_SCREENS.TENANTS_DESCRIPTION}
      />
      {!validId && (
        <p className={styles.pendingNotice} role="status">{MODERATOR_MESSAGES.READ_SCREENS.TENANT_UNAVAILABLE}</p>
      )}
      {validId && <QueryFeedback query={tenant} loadingMessage={MODERATOR_MESSAGES.READ_SCREENS.LOADING_TENANT} />}
      {tenant.data && !tenant.isError && (
        <>
          <dl className={styles.detailGrid}>
            <div className={styles.detailItem}><dt>{MODERATOR_MESSAGES.READ_SCREENS.TENANT_NAME}</dt><dd>{tenant.data.name}</dd></div>
            <div className={styles.detailItem}><dt>{MODERATOR_MESSAGES.READ_SCREENS.TENANT_ID}</dt><dd>{tenant.data.id}</dd></div>
            <div className={styles.detailItem}><dt>{MODERATOR_MESSAGES.READ_SCREENS.TENANT_TYPE}</dt><dd>{tenant.data.type ?? "—"}</dd></div>
            <div className={styles.detailItem}><dt>{MODERATOR_MESSAGES.READ_SCREENS.BILLING_EXEMPT}</dt><dd>{tenant.data.billingExempt == null
              ? "—"
              : tenant.data.billingExempt
                ? MODERATOR_MESSAGES.READ_SCREENS.BILLING_EXEMPT_YES
                : MODERATOR_MESSAGES.READ_SCREENS.BILLING_EXEMPT_NO}</dd></div>
          </dl>
          <Link className={styles.tableLink} href={PATH_MODERATOR.CUSTOMERS}>Quay lại danh sách khách hàng</Link>
        </>
      )}
    </div>
  );
}

type TenantContractRead = { tenant: Tenant; contract: ModeratorContract };
type FailedTenantContractRead = { tenant: Tenant; error: unknown };
type TenantContractReads = { contracts: TenantContractRead[]; failedTenants: FailedTenantContractRead[] };

async function readTenantContracts(tenants: Tenant[], signal: AbortSignal): Promise<TenantContractReads> {
  const results: Array<{ tenant: Tenant; contracts: ModeratorContract[] } | FailedTenantContractRead | undefined> =
    new Array(tenants.length);
  let nextIndex = 0;
  const workerCount = Math.min(5, tenants.length);

  const worker = async () => {
    while (!signal.aborted) {
      const index = nextIndex;
      nextIndex += 1;
      if (index >= tenants.length) return;
      const tenant = tenants[index]!;
      try {
        results[index] = { tenant, contracts: await contractsApi.listByTenant(tenant.id, signal) };
      } catch (error) {
        if (signal.aborted) throw error;
        results[index] = { tenant, error };
      }
    }
  };

  await Promise.all(Array.from({ length: workerCount }, () => worker()));
  if (signal.aborted) throw new DOMException("The request was cancelled", "AbortError");

  const contracts: TenantContractRead[] = [];
  const failedTenants: FailedTenantContractRead[] = [];
  for (const result of results) {
    if (!result) continue;
    if ("error" in result) failedTenants.push(result);
    else for (const contract of result.contracts) contracts.push({ tenant: result.tenant, contract });
  }
  return { contracts, failedTenants };
}

function ContractListScreen() {
  const tenants = useQuery({
    queryKey: ["dolores", "tenants"],
    queryFn: ({ signal }) => tenantsApi.list(signal),
    retry: false,
  });
  const tenantIds = tenants.data?.map((tenant) => tenant.id) ?? [];
  const contractReads = useQuery({
    queryKey: ["dolores", "moderator", "contracts-by-tenant", tenantIds],
    queryFn: ({ signal }) => readTenantContracts(tenants.data ?? [], signal),
    enabled: !tenants.isPending && !tenants.isError && tenantIds.length > 0,
    retry: false,
  });
  const tenantById = new Map((tenants.data ?? []).map((tenant) => [tenant.id, tenant]));

  return (
    <div className={styles.pageContent}>
      <PageHeading
        title={MODERATOR_MESSAGES.READ_SCREENS.CONTRACTS_TITLE}
        description={MODERATOR_MESSAGES.READ_SCREENS.CONTRACTS_DESCRIPTION}
      />
      <QueryFeedback query={tenants} loadingMessage={MODERATOR_MESSAGES.READ_SCREENS.LOADING_TENANTS} />
      {tenants.data?.length === 0 && !tenants.isError && (
        <p className={styles.pendingNotice} role="status">{MODERATOR_MESSAGES.READ_SCREENS.NO_TENANTS_FOR_CONTRACTS}</p>
      )}
      {tenantIds.length > 0 && (
        <QueryFeedback query={contractReads} loadingMessage={MODERATOR_MESSAGES.READ_SCREENS.LOADING_CONTRACTS} />
      )}
      {contractReads.data?.failedTenants.length ? (
        <section className={styles.partialNotice} role="status">
          <p>{MODERATOR_MESSAGES.READ_SCREENS.PARTIAL_CONTRACT_FAILURE}</p>
          <ul>
            {contractReads.data.failedTenants.map(({ tenant, error }) => (
              <li key={tenant.id}>{MODERATOR_MESSAGES.READ_SCREENS.CONTRACT_TENANT_FAILURE} {tenant.name}: {getApiErrorMessage(error)}</li>
            ))}
          </ul>
          <button className={styles.retryButton} type="button" onClick={() => void contractReads.refetch()}>
            {MODERATOR_MESSAGES.READ_SCREENS.RETRY}
          </button>
        </section>
      ) : null}
      {contractReads.data?.contracts.length === 0 && contractReads.data.failedTenants.length === 0 && !contractReads.isError && (
        <p className={styles.pendingNotice} role="status">{MODERATOR_MESSAGES.READ_SCREENS.EMPTY_CONTRACTS}</p>
      )}
      {contractReads.data && contractReads.data.contracts.length > 0 && (
        <div className={styles.tableScroll}>
          <table className={styles.dataTable}>
            <thead>
              <tr>
                <th scope="col">{MODERATOR_MESSAGES.READ_SCREENS.CONTRACT_ID}</th>
                <th scope="col">{MODERATOR_MESSAGES.READ_SCREENS.TENANT_NAME}</th>
                <th scope="col">{MODERATOR_MESSAGES.READ_SCREENS.CONTRACT_PERIOD}</th>
                <th scope="col">{MODERATOR_MESSAGES.READ_SCREENS.CONTRACT_STATUS}</th>
                <th scope="col">{MODERATOR_MESSAGES.READ_SCREENS.CONTRACT_TYPE}</th>
              </tr>
            </thead>
            <tbody>
              {contractReads.data.contracts.map(({ tenant, contract }) => (
                <tr key={contract.id}>
                  <td><Link className={styles.tableLink} href={PATH_MODERATOR.CONTRACT_DETAIL(contract.id)}>{contract.id}</Link></td>
                  <td>{tenantById.get(tenant.id)?.name ?? tenant.name}<br /><small>{tenant.id}</small></td>
                  <td>{contract.startDate ?? "—"} – {contract.endDate ?? "—"}</td>
                  <td>{contract.status}</td>
                  <td>{contract.machineTypeSnapshot ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function ContractDetailScreen({ id }: { id: string }) {
  const validId = ContractIdSchema.safeParse(id).success;
  const contract = useQuery({
    queryKey: ["dolores", "moderator", "contracts", "id", id],
    queryFn: ({ signal }) => contractsApi.getModeratorById(id, signal),
    enabled: validId,
    retry: false,
  });
  const documents = useQuery({
    queryKey: ["dolores", "contract-documents", id],
    queryFn: ({ signal }) => contractsApi.getDocuments(id, signal),
    enabled: validId && Boolean(contract.data) && !contract.isError,
    retry: false,
  });

  return (
    <div className={styles.pageContent}>
      <PageHeading
        title={MODERATOR_MESSAGES.READ_SCREENS.CONTRACT_DETAIL_TITLE}
        description={MODERATOR_MESSAGES.READ_SCREENS.CONTRACTS_DESCRIPTION}
      />
      {!validId && (
        <p className={styles.pendingNotice} role="status">{MODERATOR_MESSAGES.READ_SCREENS.CONTRACT_UNAVAILABLE}</p>
      )}
      {validId && <QueryFeedback query={contract} loadingMessage={MODERATOR_MESSAGES.READ_SCREENS.LOADING_CONTRACT} />}
      {contract.data && !contract.isError && (
        <>
          <dl className={styles.detailGrid}>
            <div className={styles.detailItem}><dt>{MODERATOR_MESSAGES.READ_SCREENS.CONTRACT_ID}</dt><dd>{contract.data.id}</dd></div>
            <div className={styles.detailItem}><dt>{MODERATOR_MESSAGES.READ_SCREENS.CONTRACT_TENANT_ID}</dt><dd>{contract.data.tenantId}</dd></div>
            <div className={styles.detailItem}><dt>{MODERATOR_MESSAGES.READ_SCREENS.CONTRACT_MACHINE_ID}</dt><dd>{contract.data.machineId ?? "—"}</dd></div>
            <div className={styles.detailItem}><dt>{MODERATOR_MESSAGES.READ_SCREENS.CONTRACT_STATUS}</dt><dd>{contract.data.status}</dd></div>
            <div className={styles.detailItem}><dt>{MODERATOR_MESSAGES.READ_SCREENS.CONTRACT_PERIOD}</dt><dd>{contract.data.startDate ?? "—"} – {contract.data.endDate ?? "—"}</dd></div>
            <div className={styles.detailItem}><dt>{MODERATOR_MESSAGES.READ_SCREENS.CONTRACT_TYPE}</dt><dd>{contract.data.machineTypeSnapshot ?? "—"}</dd></div>
            <div className={styles.detailItem}><dt>{MODERATOR_MESSAGES.READ_SCREENS.CONTRACT_MONTHLY_FEE}</dt><dd>{contract.data.monthlyRentalFee ?? "—"}</dd></div>
            <div className={styles.detailItem}><dt>{MODERATOR_MESSAGES.READ_SCREENS.CONTRACT_DEPOSIT}</dt><dd>{contract.data.depositAmount ?? "—"}</dd></div>
            <div className={styles.detailItem}><dt>{MODERATOR_MESSAGES.READ_SCREENS.CONTRACT_INSTALLATION_FEE}</dt><dd>{contract.data.installationFee ?? "—"}</dd></div>
            <div className={styles.detailItem}><dt>{MODERATOR_MESSAGES.READ_SCREENS.CONTRACT_PAYG_PRICE}</dt><dd>{contract.data.paygUnitPrice ?? "—"}</dd></div>
            <div className={styles.detailItem}><dt>{MODERATOR_MESSAGES.READ_SCREENS.CONTRACT_OFFLINE_LIMIT}</dt><dd>{contract.data.offlineLimitMinutes == null ? "—" : `${contract.data.offlineLimitMinutes} phút`}</dd></div>
          </dl>
          {(contract.data.termsSnapshot ?? contract.data.terms) && (
            <section className={styles.pendingNotice}>
              <h2>{MODERATOR_MESSAGES.READ_SCREENS.CONTRACT_TERMS}</h2>
              <p>{contract.data.termsSnapshot ?? contract.data.terms}</p>
            </section>
          )}
          <section className={styles.pendingNotice} aria-labelledby="moderator-contract-documents">
            <h2 id="moderator-contract-documents">{MODERATOR_MESSAGES.READ_SCREENS.CONTRACT_DOCUMENTS}</h2>
            <QueryFeedback query={documents} loadingMessage={MODERATOR_MESSAGES.READ_SCREENS.LOADING_DOCUMENTS} />
            {documents.data?.length === 0 && !documents.isError && (
              <p role="status">{MODERATOR_MESSAGES.READ_SCREENS.EMPTY_DOCUMENTS}</p>
            )}
            {documents.data && documents.data.length > 0 && (
              <div className={styles.tableScroll}>
                <table className={styles.dataTable}>
                  <thead><tr><th scope="col">Tệp</th><th scope="col">Loại</th><th scope="col">Dung lượng</th><th scope="col">Ngày tải</th></tr></thead>
                  <tbody>{documents.data.map((document) => (
                    <tr key={document.id}>
                      <td>{document.originalFilename}</td>
                      <td>{document.documentType}</td>
                      <td>{document.sizeBytes} bytes · v{document.version}</td>
                      <td>{document.archivedAt ? "Đã lưu trữ" : document.uploadedAt ?? "—"}</td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            )}
          </section>
          <Link className={styles.tableLink} href={PATH_MODERATOR.CONTRACTS}>Quay lại danh sách hợp đồng</Link>
        </>
      )}
    </div>
  );
}

function UnavailableReadRoute({ message }: { message: string }) {
  return (
    <div className={styles.pageContent}>
      <p className={styles.pendingNotice} role="status">{message}</p>
    </div>
  );
}

export function ModeratorReadScreen({ sectionPath }: { sectionPath: string }) {
  const operationalKind = getOperationalScreenKind(sectionPath);
  if (operationalKind === "machines") {
    return <Suspense fallback={<OperationalScreenLoading />}><ModeratorMachinesScreen path={sectionPath} /></Suspense>;
  }
  if (operationalKind === "iot") {
    return <Suspense fallback={<OperationalScreenLoading />}><ModeratorIoTScreen path={sectionPath} /></Suspense>;
  }
  if (operationalKind === "technical") {
    return <Suspense fallback={<OperationalScreenLoading />}><ModeratorTechnicalScreen path={sectionPath} /></Suspense>;
  }
  if (sectionPath === "invoices" || sectionPath === "invoices/list" ||
      /^invoices\/[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(sectionPath)) {
    return <Suspense fallback={<OperationalScreenLoading />}><ModeratorInvoicesScreen sectionPath={sectionPath} /></Suspense>;
  }
  if (sectionPath === "menu" ||
      /^menu\/[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(sectionPath)) {
    return <Suspense fallback={<OperationalScreenLoading />}><ModeratorRecipesScreen sectionPath={sectionPath} /></Suspense>;
  }
  if (sectionPath === "buyback" || sectionPath === "buyback/list" ||
      /^buyback\/(?:[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}|MB-[A-Z0-9-]+)$/i.test(sectionPath)) {
    return <Suspense fallback={<OperationalScreenLoading />}><ModeratorBuybackScreen sectionPath={sectionPath} /></Suspense>;
  }
  if (sectionPath === "customers" || sectionPath === "customers/list") return <TenantListScreen />;
  if (sectionPath === "customers/new") {
    return <UnavailableReadRoute message={MODERATOR_MESSAGES.READ_SCREENS.NEW_TENANT_UNAVAILABLE} />;
  }
  if (sectionPath.startsWith("customers/")) {
    return <TenantDetailScreen id={sectionPath.slice("customers/".length)} />;
  }
  if (sectionPath === "contracts" || sectionPath === "contracts/list") return <ContractListScreen />;
  if (sectionPath === "contracts/new") {
    return <UnavailableReadRoute message={MODERATOR_MESSAGES.READ_SCREENS.NEW_CONTRACT_UNAVAILABLE} />;
  }
  if (sectionPath === "contracts/expiry") {
    return <UnavailableReadRoute message={MODERATOR_MESSAGES.READ_SCREENS.CONTRACT_EXPIRY_UNAVAILABLE} />;
  }
  if (sectionPath.startsWith("contracts/")) {
    return <ContractDetailScreen id={sectionPath.slice("contracts/".length)} />;
  }
  if (sectionPath === "notifications") return <NotificationsScreen />;
  if (sectionPath === "notifications/alerts") return <AlertsScreen />;
  return <OverviewScreen />;
}
