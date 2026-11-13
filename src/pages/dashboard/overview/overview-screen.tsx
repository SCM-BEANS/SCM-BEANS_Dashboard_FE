import Link from "next/link";
import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { billingApi } from "@/apis/billing.api";
import { dashboardApi } from "@/apis/dashboard.api";
import { ActionItemsPanel } from "@/components/features/operations/action-items-panel";
import { StatusBadge } from "@/components/status-badge/status-badge";
import { getApiErrorMessage } from "@/lib/api-errors";
import { authScopedQuerySubject } from "@/lib/query-subject";
import { PATH_CUSTOMER } from "@/routes/path";
import type { Invoice } from "@/schema/billing.schema";
import type { TDashboardOverview } from "@/schema/dashboard.schema";
import { CUSTOMER_MESSAGES } from "@/text/customer/customer-messages";
import { formatDate, formatMoney, QueryFeedback } from "../shared/customer-screen-common";
import commonStyles from "../customer-shell.module.css";
import styles from "./overview-screen.module.css";

const messages = CUSTOMER_MESSAGES.READ_SCREENS;
const numberFormat = new Intl.NumberFormat("vi-VN");
const openInvoiceStatuses = new Set(["OVERDUE", "UNPAID", "PENDING"]);
const invoiceStatusLabels: Record<string, string> = {
  OVERDUE: "Quá hạn",
  UNPAID: "Chưa thanh toán",
  PENDING: "Chờ xử lý",
};

type OwnerInvoiceOverviewData = {
  invoices: Invoice[];
  overdueCount: number;
  waitingCount: number;
  hasMoreOverdue: boolean;
  hasMoreWaiting: boolean;
};

function invoiceDueDate(value?: string | null) {
  if (!value) return "Chưa có hạn";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Chưa có hạn"
    : new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium", timeZone: "Asia/Ho_Chi_Minh" }).format(date);
}

function dueTimestamp(value?: string | null) {
  if (!value) return Number.POSITIVE_INFINITY;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : Number.POSITIVE_INFINITY;
}

function dayLabel(value: string) {
  const match = /^\d{4}-(\d{2})-(\d{2})$/.exec(value);
  return match ? Number(match[2]) + "/" + Number(match[1]) : "—";
}

function contractLabel(status: string) {
  if (status === "ACTIVE") return "Đang hiệu lực";
  if (status === "DRAFT") return "Bản nháp";
  if (status === "TERMINATED") return "Đã chấm dứt";
  return status;
}

function contractTone(status: string) {
  if (status === "ACTIVE") return "active";
  if (status === "DRAFT") return "draft";
  return "ended";
}

function InvoiceOverview({ invoices, balances }: {
  invoices: UseQueryResult<OwnerInvoiceOverviewData>;
  balances: NonNullable<TDashboardOverview["financialMetrics"]>;
}) {
  const openInvoices = invoices.data?.invoices ?? [];
  const invoiceGroups = [
    { key: "overdue", label: "Quá hạn", total: invoices.data?.overdueCount ?? 0, hasMore: invoices.data?.hasMoreOverdue ?? false },
    { key: "waiting", label: "Chờ thanh toán / đối soát", total: invoices.data?.waitingCount ?? 0, hasMore: invoices.data?.hasMoreWaiting ?? false },
  ];
  const hasMoreInvoices = invoiceGroups.some((group) => group.hasMore);
  const openInvoiceCount = invoiceGroups.reduce((total, group) => total + group.total, 0);
  const outstanding = balances.map((balance, index) => (
    <strong key={(balance.currency ?? "VND") + index}>{formatMoney(balance.outstandingBalance, balance.currency ?? "VND")}</strong>
  ));

  return (
    <section className={styles.invoicePanel} aria-labelledby="owner-invoices-title">
      <header className={styles.panelHeading}>
        <div>
          <h2 id="owner-invoices-title">Hóa đơn cần thanh toán</h2>
          <p>Các khoản đến hạn gần nhất</p>
        </div>
        <Link className={styles.panelLink} href={PATH_CUSTOMER.INVOICES}>Xem tất cả hóa đơn</Link>
      </header>

      <div className={styles.invoiceSnapshot}>
        <div>
          <p className={styles.invoiceSnapshotTitle}>Phân bổ trạng thái</p>
          <p className={styles.invoiceSnapshotCaption}>
            {invoices.data
              ? hasMoreInvoices ? `Ít nhất ${openInvoiceCount} hóa đơn đang mở` : `${openInvoiceCount} hóa đơn đang mở`
              : invoices.isPending ? "Đang tải trạng thái hóa đơn…" : "Chưa tải được trạng thái hóa đơn."}
          </p>
          <div className={styles.invoiceBalances}>
            <span>Còn phải thanh toán</span>
            <div>{outstanding.length ? outstanding : <strong>—</strong>}</div>
          </div>
          {invoices.data && openInvoiceCount > 0 ? (
            <>
              <div className={styles.invoiceSnapshotBar} aria-hidden="true">
                {invoiceGroups.filter((group) => group.total > 0).map((group) => (
                  <span key={group.key} data-group={group.key} style={{ flex: group.total }} />
                ))}
              </div>
              <ul className={styles.invoiceSnapshotLegend}>
                {invoiceGroups.map((group) => (
                  <li key={group.key}>
                    <span data-group={group.key} aria-hidden="true" />
                    <span>{group.label}</span>
                    <strong>{group.total.toLocaleString("vi-VN")}{group.hasMore ? "+" : ""}</strong>
                  </li>
                ))}
              </ul>
            </>
          ) : invoices.data ? (
            <p className={styles.panelNotice}>Không có hóa đơn đang mở.</p>
          ) : null}
        </div>
        <div>
          <p className={styles.invoiceSnapshotTitle}>Hóa đơn sắp đến hạn</p>
          {invoices.isPending ? (
            <p className={styles.panelNotice} role="status">Đang tải hóa đơn…</p>
          ) : invoices.isError ? (
            <div className={styles.panelError} role="alert">
              <span>{getApiErrorMessage(invoices.error)}</span>
              <button type="button" onClick={() => void invoices.refetch()}>Thử lại</button>
            </div>
          ) : openInvoices.length ? (
            <ul className={styles.invoiceSnapshotList}>
              {openInvoices.map((invoice) => <InvoiceRow invoice={invoice} key={invoice.id} />)}
            </ul>
          ) : (
            <p className={styles.panelNotice}>Hiện không có hóa đơn cần thanh toán.</p>
          )}
        </div>
      </div>
    </section>
  );
}

function InvoiceRow({ invoice }: { invoice: Invoice }) {
  const status = invoice.status.toUpperCase();
  return (
    <li>
      <div className={styles.invoiceIdentity}>
        <Link href={PATH_CUSTOMER.INVOICE_DETAIL(invoice.id)}>
          Hóa đơn {invoice.id.slice(0, 8).toUpperCase()}
        </Link>
        <small>Kỳ {invoice.period || "—"} · Hạn {invoiceDueDate(invoice.dueDate)}</small>
      </div>
      <StatusBadge status={status} variant="dot">
        {invoiceStatusLabels[status] ?? status}
      </StatusBadge>
      <strong className={styles.invoiceAmount}>{formatMoney(invoice.amount, invoice.currency || "VND")}</strong>
    </li>
  );
}

export function OverviewScreen() {
  const subject = authScopedQuerySubject("OWNER");
  const overviewQuery = useQuery({
    queryKey: ["dolores", "dashboard", "overview", subject],
    queryFn: ({ signal }) => dashboardApi.getOverview(signal),
  });
  const invoicesQuery = useQuery({
    queryKey: ["dolores", "dashboard", "owner-overview-invoices", subject],
    queryFn: async ({ signal }) => {
      const [overdue, unpaid, pending] = await Promise.all([
        billingApi.listInvoicesPage({ status: "OVERDUE", page: 0, size: 10 }, signal),
        billingApi.listInvoicesPage({ status: "UNPAID", page: 0, size: 10 }, signal),
        billingApi.listInvoicesPage({ status: "PENDING", page: 0, size: 10 }, signal),
      ]);
      const openInvoices = [...overdue.items, ...unpaid.items, ...pending.items]
        .filter((invoice) => openInvoiceStatuses.has(invoice.status.toUpperCase()))
        .sort((left, right) => dueTimestamp(left.dueDate) - dueTimestamp(right.dueDate));
      return {
        invoices: openInvoices.slice(0, 3),
        overdueCount: overdue.items.length,
        waitingCount: unpaid.items.length + pending.items.length,
        hasMoreOverdue: overdue.hasNext,
        hasMoreWaiting: unpaid.hasNext || pending.hasNext,
      };
    },
  });

  const overview = overviewQuery.data;
  const operations = overview?.operationalMetrics;
  const machineGroups = operations?.machinesByTypeAndStatus;
  const machineStatuses = machineGroups
    ? Object.values(machineGroups).flatMap((statuses) => Object.entries(statuses))
    : [];
  const machineCount = machineStatuses.reduce((total, [, count]) => total + count, 0);
  const activeMachineCount = machineStatuses.reduce((total, [status, count]) => (
    total + (status === "DEPLOYED_CONTRACT_OWNER" || status === "DEPLOYED_STORE_OWNER" ? count : 0)
  ), 0);
  const machineDataAvailable = machineGroups != null;
  const rentalRate = machineCount > 0 ? activeMachineCount / machineCount : 0;
  const contractStatuses = operations?.contractsByStatus;
  const contractOrder = ["ACTIVE", "DRAFT", "TERMINATED"];
  const contracts = Object.entries(contractStatuses ?? {})
    .map(([status, count]) => ({ status, count }))
    .filter((item) => item.count > 0)
    .sort((left, right) => {
      const leftOrder = contractOrder.indexOf(left.status);
      const rightOrder = contractOrder.indexOf(right.status);
      return (leftOrder < 0 ? contractOrder.length : leftOrder) - (rightOrder < 0 ? contractOrder.length : rightOrder);
    });
  const contractCount = Object.values(contractStatuses ?? {}).reduce((total, count) => total + count, 0);
  const cupDays = [...(operations?.dailyAcceptedCupUsage ?? [])]
    .filter((day) => day.date != null)
    .sort((left, right) => String(left.date).localeCompare(String(right.date)));
  const hasCupTrend = cupDays.some((day) => day.cups != null);
  const balances = (overview?.financialMetrics ?? []).filter((item) => item.outstandingBalance != null);

  return (
    <section className={commonStyles.pageContent + " " + styles.ownerOverview} aria-labelledby="customer-screen-title">
      <header className={commonStyles.pageHeading}>
        <h1 id="customer-screen-title">{messages.OVERVIEW_TITLE}</h1>
        <p>{messages.OVERVIEW_DESCRIPTION}</p>
      </header>

      {overviewQuery.isPending || overviewQuery.isError ? (
        <QueryFeedback loading={overviewQuery.isPending} failed={overviewQuery.isError} empty={false} emptyText="" />
      ) : (
        <>
          <div className={styles.visualGrid}>
            <section className={styles.cupsPanel} aria-labelledby="owner-cups-title">
              <header className={styles.cupsHeading}>
                <div>
                  <h2 id="owner-cups-title">Ly đã ghi nhận</h2>
                  <p>{formatDate(overview?.usagePeriodStart)} – {formatDate(overview?.usagePeriodEnd)}</p>
                </div>
                <Link className={styles.panelLink} href={PATH_CUSTOMER.MACHINES}>Xem máy của tôi</Link>
              </header>
              <div className={styles.cupsTotal}>
                <strong>{operations?.cupsInSelectedPeriod == null ? "—" : numberFormat.format(operations.cupsInSelectedPeriod)}</strong>
                <span>ly trong kỳ</span>
              </div>
              {hasCupTrend ? (
                <div className={styles.cupChart} role="img" aria-label="Biểu đồ số ly ghi nhận theo ngày">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={cupDays} margin={{ top: 14, right: 10, left: 0, bottom: 0 }}>
                      <CartesianGrid vertical={false} stroke="#eee8e3" strokeDasharray="3 4" />
                      <XAxis dataKey="date" tickFormatter={(value) => dayLabel(String(value))} tickLine={false} axisLine={false} minTickGap={24} tick={{ fontSize: 12 }} />
                      <YAxis allowDecimals={false} width={42} tickLine={false} axisLine={false} tick={{ fontSize: 12 }} />
                      <Tooltip
                        labelFormatter={(value) => formatDate(String(value))}
                        formatter={(value) => [numberFormat.format(Number(value)), "Ly ghi nhận"]}
                      />
                      <Area type="monotone" dataKey="cups" stroke="#b81724" fill="#b81724" fillOpacity={0.1} strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} connectNulls={false} isAnimationActive={false} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className={styles.chartEmpty} role="status">Chưa có dữ liệu sản lượng theo ngày trong kỳ này.</div>
              )}
              <p className={styles.chartCaption}>Sản lượng được ghi nhận từ các máy trong kỳ thống kê.</p>
            </section>

            <div className={styles.sideColumn}>
              <section className={styles.machinePanel} aria-labelledby="owner-machines-title">
                <header className={styles.panelHeading}>
                  <h2 id="owner-machines-title">Máy đang hoạt động</h2>
                  <Link className={styles.panelLink} href={PATH_CUSTOMER.MACHINES}>Xem kho máy</Link>
                </header>
                {machineDataAvailable ? (
                  <>
                    <div className={styles.machineGauge}>
                      <svg viewBox="0 0 240 140" role="img" aria-label={numberFormat.format(activeMachineCount) + " trên " + numberFormat.format(machineCount) + " máy đang hoạt động"}>
                        <path d="M 25 120 A 95 95 0 0 1 215 120" fill="none" stroke="#eee8e3" strokeWidth="16" strokeDasharray="3 3" pathLength="100" />
                        <path d="M 25 120 A 95 95 0 0 1 215 120" fill="none" stroke="#36866a" strokeWidth="16" strokeDasharray={rentalRate * 100 + " 100"} pathLength="100" />
                        <text x="120" y="99" textAnchor="middle" className={styles.gaugeValue}>{numberFormat.format(activeMachineCount)}</text>
                        <text x="120" y="124" textAnchor="middle" className={styles.gaugeLabel}>trên {numberFormat.format(machineCount)} máy</text>
                      </svg>
                    </div>
                    <p className={styles.gaugeCaption}>Máy đang triển khai theo hợp đồng</p>
                  </>
                ) : (
                  <p className={styles.chartEmpty}>Chưa có dữ liệu trạng thái máy.</p>
                )}
              </section>

              <section className={styles.contractPanel} aria-labelledby="owner-contracts-title">
                <header className={styles.panelHeading}>
                  <div>
                    <h2 id="owner-contracts-title">Hợp đồng</h2>
                    <p>{numberFormat.format(contractCount)} hợp đồng</p>
                  </div>
                  <Link className={styles.panelLink} href={PATH_CUSTOMER.CONTRACTS}>Xem hợp đồng</Link>
                </header>
                {contractStatuses ? (
                  <>
                    <div
                      className={styles.contractBar}
                      role="img"
                      aria-label={contracts.map((item) => contractLabel(item.status) + ": " + numberFormat.format(item.count)).join(", ") || "Chưa có hợp đồng"}
                    >
                      {contracts.map((item) => (
                        <span key={item.status} data-tone={contractTone(item.status)} style={{ flexGrow: item.count }} />
                      ))}
                    </div>
                    {contracts.length ? (
                      <ul className={styles.contractLegend}>
                        {contracts.map((item) => (
                          <li key={item.status}>
                            <span data-tone={contractTone(item.status)} aria-hidden="true" />
                            <span>{contractLabel(item.status)}</span>
                            <strong>{numberFormat.format(item.count)}</strong>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className={styles.chartEmpty}>Chưa có hợp đồng.</p>
                    )}
                  </>
                ) : (
                  <p className={styles.chartEmpty}>Chưa có dữ liệu hợp đồng.</p>
                )}
              </section>
            </div>
          </div>

        </>
      )}

      <InvoiceOverview invoices={invoicesQuery} balances={balances} />
      <ActionItemsPanel role="OWNER" compact summary={overview?.actionSummary} />
    </section>
  );
}
