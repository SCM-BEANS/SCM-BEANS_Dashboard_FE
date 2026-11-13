import Link from "next/link";
import { useRouter } from "next/router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { billingApi } from "@/apis/billing.api";
import { CalendarDays } from "lucide-react";
import { ActionItemsPanel } from "@/components/features/operations/action-items-panel";
import { dashboardApi } from "@/apis/dashboard.api";
import { PageActions } from "@/components/action-bar/page-actions";
import { authScopedQuerySubject } from "@/lib/query-subject";
import { getApiErrorMessage } from "@/lib/api-errors";
import { StatusBadge } from "@/components/status-badge/status-badge";
import { DataTable } from "@/components/table/data-table";
import { DashboardDateRangeSchema, DASHBOARD_BUSINESS_TIME_ZONE } from "@/schema/dashboard.schema";
import { PATH_ADMIN, PATH_MODERATOR } from "@/routes/path";
import { ADMIN_MESSAGES } from "@/text/admin/admin-messages";
import { AdminShell, adminStyles as styles } from "../admin-shell";

const number = new Intl.NumberFormat("vi-VN");
const money = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});
const invoiceGroups = [
  { key: "overdue", label: "Quá hạn", statuses: ["OVERDUE"] },
  { key: "waiting", label: "Chờ thanh toán / đối soát", statuses: ["UNPAID", "PENDING"] },
  { key: "paid", label: "Đã thanh toán", statuses: ["PAID"] },
  { key: "other", label: "Trạng thái khác", statuses: [] },
];
const invoiceLabels: Record<string, string> = {
  PAID: "Đã thanh toán", UNPAID: "Chưa thanh toán", OVERDUE: "Quá hạn",
  CANCELLED: "Đã hủy", DRAFT: "Bản nháp", PENDING: "Chờ xử lý",
};
const invoiceGroup = (status: string) => {
  const index = invoiceGroups.findIndex(group => group.statuses.includes(status));
  return index < 0 ? invoiceGroups.length - 1 : index;
};
const DAY_MS = 24 * 60 * 60 * 1000;

type DateRange = { fromDate: string; toDate: string };
type QuickRange = "TODAY" | "YESTERDAY" | "THIS_WEEK" | "LAST_WEEK" | "LAST_30_DAYS" | "LAST_MONTH" | "LAST_7_DAYS";

const quickRanges: { key: QuickRange; label: string }[] = [
  { key: "TODAY", label: "Hôm nay" },
  { key: "YESTERDAY", label: "Hôm qua" },
  { key: "THIS_WEEK", label: "Tuần này" },
  { key: "LAST_WEEK", label: "Tuần trước" },
  { key: "LAST_30_DAYS", label: "30 ngày" },
  { key: "LAST_MONTH", label: "1 tháng" },
  { key: "LAST_7_DAYS", label: "7 ngày" },
];

function count(value: number | null | undefined): string {
  return value == null ? "—" : number.format(value);
}

function amount(value: number | null | undefined): string {
  return value == null ? "—" : money.format(value);
}

function formatDateOnly(value: string | null | undefined): string {
  if (!value) return "—";
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return "—";

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== value) return "—";
  return date.toLocaleDateString("vi-VN", { timeZone: "UTC" });
}

function parseLocalizedDate(value: string): string | undefined {
  const match = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(value.trim());
  if (!match) return undefined;
  const [, day, month, year] = match;
  const normalized = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  const parsed = new Date(`${normalized}T00:00:00Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === normalized
    ? normalized
    : undefined;
}

function formatDateRange(start: string | null | undefined, end: string | null | undefined): string {
  if (!start && !end) return "Chưa có kỳ dữ liệu";
  const formattedStart = start ? formatDateOnly(start) : undefined;
  const formattedEnd = end ? formatDateOnly(end) : undefined;
  if ((start && formattedStart === "—") || (end && formattedEnd === "—")) return "Chưa có kỳ dữ liệu";
  if (!formattedStart) return `Đến ${formattedEnd ?? "—"}`;
  if (!formattedEnd) return `Từ ${formattedStart}`;
  return `${formattedStart} – ${formattedEnd}`;
}

function businessToday(): string {
  const parts = new Intl.DateTimeFormat("en", {
    timeZone: DASHBOARD_BUSINESS_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((item) => item.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}

function addDays(date: string, amount: number): string {
  const timestamp = Date.parse(`${date}T00:00:00Z`) + amount * DAY_MS;
  return new Date(timestamp).toISOString().slice(0, 10);
}

function previousMonthSameDay(date: string): string {
  const [year, month, day] = date.split("-").map(Number);
  const daysInPreviousMonth = new Date(Date.UTC(year, month - 1, 0)).getUTCDate();
  return new Date(Date.UTC(year, month - 2, Math.min(day, daysInPreviousMonth)))
    .toISOString().slice(0, 10);
}

function quickRange(key: QuickRange, today: string): DateRange {
  const weekday = new Date(`${today}T00:00:00Z`).getUTCDay();
  const daysSinceMonday = weekday === 0 ? 6 : weekday - 1;
  const thisMonday = addDays(today, -daysSinceMonday);

  switch (key) {
    case "TODAY": return { fromDate: today, toDate: today };
    case "YESTERDAY": {
      const yesterday = addDays(today, -1);
      return { fromDate: yesterday, toDate: yesterday };
    }
    case "THIS_WEEK": return { fromDate: thisMonday, toDate: today };
    case "LAST_WEEK": return { fromDate: addDays(thisMonday, -7), toDate: addDays(thisMonday, -1) };
    case "LAST_30_DAYS": return { fromDate: addDays(today, -29), toDate: today };
    case "LAST_MONTH": return { fromDate: previousMonthSameDay(today), toDate: today };
    case "LAST_7_DAYS": return { fromDate: addDays(today, -6), toDate: today };
  }
}

function queryValue(value: string | string[] | undefined): string | undefined {
  return typeof value === "string" ? value : undefined;
}

export function OperationsOverview({ role }: { role: "ADMIN" | "MODERATOR" }) {
  const moderator = role === "MODERATOR";
  const subject = authScopedQuerySubject(role);
  const router = useRouter();
  const filterRef = useRef<HTMLDetailsElement>(null);
  const [today, setToday] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [fromDateInput, setFromDateInput] = useState("");
  const [toDateInput, setToDateInput] = useState("");
  const [appliedRange, setAppliedRange] = useState<DateRange | null>(null);
  const [activeQuickRange, setActiveQuickRange] = useState<QuickRange | null>(null);
  const [rangeError, setRangeError] = useState("");
  const [financeExpanded, setFinanceExpanded] = useState(false);

  useEffect(() => {
    const closeFilter = (event: PointerEvent) => {
      if (filterRef.current && !filterRef.current.contains(event.target as Node)) filterRef.current.open = false;
    };
    document.addEventListener("pointerdown", closeFilter);
    return () => document.removeEventListener("pointerdown", closeFilter);
  }, []);

  useEffect(() => {
    if (!router.isReady) return;

    const currentDate = businessToday();
    const queryRange = DashboardDateRangeSchema.safeParse({
      fromDate: queryValue(router.query.fromDate),
      toDate: queryValue(router.query.toDate),
    });
    const initialRange = queryRange.success
      ? queryRange.data
      : quickRange("LAST_7_DAYS", currentDate);

    setToday(currentDate);
    setFromDate(initialRange.fromDate);
    setToDate(initialRange.toDate);
    setFromDateInput(formatDateOnly(initialRange.fromDate));
    setToDateInput(formatDateOnly(initialRange.toDate));
    setAppliedRange(initialRange);
    setActiveQuickRange(quickRanges.find(({ key }) => {
      const range = quickRange(key, currentDate);
      return range.fromDate === initialRange.fromDate && range.toDate === initialRange.toDate;
    })?.key ?? null);
  }, [router.isReady, router.query.fromDate, router.query.toDate]);

  const overview = useQuery({
    queryKey: ["dolores", "dashboard", "overview", subject, appliedRange],
    queryFn: ({ signal }) => {
      if (!appliedRange) throw new Error("Chưa chọn kỳ dữ liệu.");
      return dashboardApi.getOverview(signal, appliedRange.fromDate, appliedRange.toDate);
    },
    enabled: Boolean(appliedRange),
  });
  const invoices = useQuery({
    queryKey: ["dolores", "dashboard", "overview-invoices", subject],
    queryFn: ({ signal }) => moderator
      ? billingApi.listOperatorInvoicesPage({ page: 0, size: 5 }, signal)
      : billingApi.listInvoicesPage({ page: 0, size: 5 }, signal),
  });
  const metrics = overview.data?.operationalMetrics;
  const hasFinance = Boolean(overview.data?.financialMetrics?.length);
  const hasPeriodFinance = Boolean(overview.data?.periodFinancialMetrics?.length);
  const revenue = useQuery({
    queryKey: ["dolores", "dashboard", "revenue-trend", subject, appliedRange],
    enabled: Boolean(appliedRange && overview.data && (!moderator || hasPeriodFinance)),
    retry: false,
    staleTime: 60_000,
    queryFn: async ({ signal }) => {
      if (!appliedRange) throw new Error("Chưa chọn kỳ dữ liệu.");
      const length = Math.round((Date.parse(appliedRange.toDate) - Date.parse(appliedRange.fromDate)) / DAY_MS) + 1;
      const bucketDays = Math.ceil(length / 10);
      const ranges = Array.from({ length: Math.ceil(length / bucketDays) }, (_, index) => ({
        fromDate: addDays(appliedRange.fromDate, index * bucketDays),
        toDate: addDays(appliedRange.fromDate, Math.min(length - 1, (index + 1) * bucketDays - 1)),
      }));
      const points = [];
      // Dashboard exposes period totals; use at most ten disjoint periods, three requests at a time.
      for (let index = 0; index < ranges.length; index += 3) {
        const batch = await Promise.all(ranges.slice(index, index + 3).map(async range => {
          const result = ranges.length === 1 && overview.data
            ? overview.data
            : await dashboardApi.getOverview(signal, range.fromDate, range.toDate);
          const metric = result.periodFinancialMetrics?.find(item => item.currency?.toUpperCase() === "VND");
          return { ...range, label: formatDateRange(range.fromDate, range.toDate),
            amount: metric?.collectionQuality?.status === "UNAVAILABLE" ? null : metric?.amountCollectedInPeriod ?? null,
            partial: metric?.collectionQuality?.status === "PARTIAL",
          };
        }));
        points.push(...batch);
      }
      return points;
    },
  });
  const machineGroups = metrics?.machinesByTypeAndStatus;
  const machineCounts = machineGroups ? Object.values(machineGroups).flatMap(group => Object.entries(group)) : null;
  const totalMachines = machineCounts?.reduce((total, [, value]) => total + value, 0);
  const rentedMachines = machineCounts?.reduce((total, [status, value]) => total + (status === "DEPLOYED_CONTRACT_OWNER" ? value : 0), 0);
  const rentalRate = totalMachines && rentedMachines != null ? rentedMachines / totalMachines : 0;
  const days = metrics?.dailyAcceptedCupUsage ?? [];
  const vnd = overview.data?.financialMetrics?.find(
    (item) => item.currency?.toUpperCase() === "VND",
  );
  const periodVnd = overview.data?.periodFinancialMetrics?.find(item => item.currency?.toUpperCase() === "VND");
  const usagePeriod = appliedRange
    ? formatDateRange(appliedRange.fromDate, appliedRange.toDate)
    : "Đang tải kỳ dữ liệu";

  const persistRange = (range: DateRange) => {
    void router.push({ pathname: router.pathname, query: { ...router.query, ...range } }, undefined, { shallow: true, scroll: false }).catch(() => {
      setRangeError("Chưa lưu được kỳ báo cáo vào liên kết. Vui lòng thử lại.");
      if (filterRef.current) filterRef.current.open = true;
    });
  };

  const applyQuickRange = (key: QuickRange) => {
    if (!today) return;
    const range = quickRange(key, today);
    setFromDate(range.fromDate);
    setToDate(range.toDate);
    setFromDateInput(formatDateOnly(range.fromDate));
    setToDateInput(formatDateOnly(range.toDate));
    setAppliedRange(range);
    setActiveQuickRange(key);
    setRangeError("");
    if (filterRef.current) filterRef.current.open = false;
    persistRange(range);
  };

  const applyCustomRange = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalizedFromDate = parseLocalizedDate(fromDateInput);
    const normalizedToDate = parseLocalizedDate(toDateInput);
    const parsed = normalizedFromDate && normalizedToDate
      ? DashboardDateRangeSchema.safeParse({ fromDate: normalizedFromDate, toDate: normalizedToDate })
      : null;
    if (!parsed?.success) {
      setRangeError(
        fromDateInput.trim() === "" || toDateInput.trim() === ""
          ? "Vui lòng chọn đầy đủ ngày bắt đầu và ngày kết thúc."
          : !normalizedFromDate || !normalizedToDate
            ? "Nhập ngày hợp lệ theo định dạng ngày/tháng/năm, ví dụ 23/10/2026."
          : "Khoảng ngày không hợp lệ. Hãy chọn ngày kết thúc không trước ngày bắt đầu, không sau hôm nay và tối đa 90 ngày.",
      );
      return;
    }

    setRangeError("");
    setAppliedRange(parsed.data);
    setFromDate(parsed.data.fromDate);
    setToDate(parsed.data.toDate);
    setFromDateInput(formatDateOnly(parsed.data.fromDate));
    setToDateInput(formatDateOnly(parsed.data.toDate));
    setActiveQuickRange(null);
    if (filterRef.current) filterRef.current.open = false;
    persistRange(parsed.data);
  };

  const revenuePanel = (
    <section className={`${styles.panel} ${styles.summaryProfit}`}>
      <div className={styles.summarySectionHeading}><h2>Doanh thu đã thu</h2><span>{usagePeriod}</span></div>
      <strong className={styles.summaryValue}>{amount(periodVnd?.collectionQuality?.status === "UNAVAILABLE" ? null : periodVnd?.amountCollectedInPeriod)}</strong>
      {periodVnd?.collectionQuality?.status === "PARTIAL" && <p className={styles.summaryQuality} role="status">Số liệu thu tiền chưa đầy đủ</p>}
      {periodVnd?.collectionQuality?.status === "UNAVAILABLE" && <p className={styles.summaryQuality} role="status">Chưa có số liệu thu tiền cho kỳ này</p>}
      {revenue.isPending && <div className={`${styles.summaryRevenueChart} ${styles.summaryLoading}`} role="status">Đang tải biểu đồ doanh thu…</div>}
      {revenue.isError && <div className={`${styles.summaryRevenueChart} ${styles.summaryLoading}`} role="alert"><p>{getApiErrorMessage(revenue.error)}</p><button type="button" onClick={() => void revenue.refetch()}>Thử lại</button></div>}
      {revenue.data && (revenue.data.some(point => point.amount != null) ? <>
        <div className={styles.summaryRevenueChart} role="img" aria-label="Biểu đồ tiền đã thu theo kỳ">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={revenue.data} margin={{ top: 16, right: 12, left: 10, bottom: 4 }}>
              <CartesianGrid vertical={false} stroke="#eee8e3" strokeDasharray="3 4" />
              <XAxis dataKey="fromDate" tickFormatter={value => formatDateOnly(value)} tickLine={false} axisLine={false} minTickGap={35} tick={{ fontSize: 11 }} />
              <YAxis width={65} tickFormatter={value => new Intl.NumberFormat("vi-VN", { notation: "compact", maximumFractionDigits: 1 }).format(value)} tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
              <Tooltip labelFormatter={(_, entries) => `${entries[0]?.payload?.label ?? ""}${entries[0]?.payload?.partial ? " · Chưa đầy đủ" : ""}`} formatter={value => [amount(Number(value)), "Tiền đã thu"]} />
              <Area type="linear" dataKey="amount" stroke="#b81724" fill="#b81724" fillOpacity={0.08} strokeWidth={2} dot={{ r: 3 }} connectNulls={false} isAnimationActive={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <p className={styles.summaryChartCaption}>{revenue.data.some(point => point.fromDate !== point.toDate) ? "Tổng theo khoảng ngày · Xem kỳ cụ thể trong biểu đồ" : "Tiền đã thu theo ngày"}{revenue.data.some(point => point.partial || point.amount == null) ? " · Có kỳ chưa đủ dữ liệu" : ""}</p>
      </> : <div className={`${styles.summaryRevenueChart} ${styles.summaryLoading}`}>Chưa có dữ liệu doanh thu cho biểu đồ.</div>)}
      {!moderator && <div className={styles.summaryRevenueCollected}><span>Giá trị hóa đơn phát hành trong kỳ{periodVnd?.issuanceQuality?.status === "PARTIAL" ? " · Chưa đầy đủ" : ""}</span><strong>{amount(periodVnd?.issuanceQuality?.status === "UNAVAILABLE" ? null : periodVnd?.amountIssuedInPeriod)}</strong></div>}
    </section>
  );

  const cupsPanel = (
    <section className={styles.panel}>
      <div className={styles.summarySectionHeading}><h2>Số ly ghi nhận</h2><span>{usagePeriod}</span></div>
      <strong className={styles.summaryValue}>{count(metrics?.cupsInSelectedPeriod)} {(!moderator || metrics?.cupsInSelectedPeriod != null) && <small>ly</small>}</strong>
      {days.some(day => day.cups != null) ? <>
        <div className={styles.summaryChart} role="img" aria-label="Biểu đồ số ly ghi nhận theo ngày">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={days} margin={{ top: 12, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke="#eee8e3" strokeDasharray="3 4" />
              <XAxis dataKey="date" tickFormatter={value => { const parts = String(value).split("-"); return parts.length === 3 ? `${Number(parts[2])}/${Number(parts[1])}` : "—"; }} tickLine={false} axisLine={false} tick={{ fontSize: 12 }} minTickGap={24} />
              <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={48} tick={{ fontSize: 12 }} />
              <Tooltip labelFormatter={value => formatDateOnly(String(value))} formatter={value => [count(Number(value)), "Ly ghi nhận"]} />
              <Bar dataKey="cups" fill="#b81724" radius={[5, 5, 0, 0]} maxBarSize={36} isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <details className={styles.summaryDetails}><summary>Xem số liệu theo ngày</summary>
          <DataTable headerVariant="admin" variant="standard" className={`${styles.adminTable} ${styles.overviewDailyTable}`} headers={["Ngày", "Số ly hợp lệ"]}>
            {days.map((day, index) => <tr key={`${day.date}-${index}`}><td>{formatDateOnly(day.date)}</td><td>{count(day.cups)}</td></tr>)}
          </DataTable>
        </details>
      </> : <p className={styles.emptyText}>{ADMIN_MESSAGES.OVERVIEW.NO_DAILY_DATA}</p>}
    </section>
  );

  const rentalPanel = (
    <section className={styles.panel}>
      <div className={styles.summarySectionHeading}><h2>Máy đang cho thuê</h2><Link href={moderator ? PATH_MODERATOR.MACHINES_LIST : PATH_ADMIN.MACHINES}>{moderator ? "Xem danh sách máy" : "Xem kho máy"}</Link></div>
      {machineCounts ? <>
        <div className={styles.summaryGauge}>
          <svg viewBox="0 0 240 140" role="img" aria-label={`${count(rentedMachines)} trên ${count(totalMachines)} máy đang cho thuê`}>
            <path d="M 25 120 A 95 95 0 0 1 215 120" fill="none" stroke="#eee8e3" strokeWidth="16" strokeDasharray="3 3" pathLength="100" />
            <path d="M 25 120 A 95 95 0 0 1 215 120" fill="none" stroke="#36866a" strokeWidth="16" strokeDasharray={`${rentalRate * 100} 100`} pathLength="100" />
            <text x="120" y="99" textAnchor="middle" className={styles.summaryGaugeValue}>{count(rentedMachines)}</text>
            <text x="120" y="124" textAnchor="middle" className={styles.summaryGaugeLabel}>trên {count(totalMachines)} máy</text>
          </svg>
        </div>
        <p className={styles.summaryGaugeCaption}>{moderator ? "Trong phạm vi hợp đồng bạn quản lý" : "Máy đang triển khai theo hợp đồng thuê"}</p>
      </> : <p className={styles.emptyText}>Chưa có dữ liệu trạng thái máy.</p>}
    </section>
  );

  const invoiceRows = invoices.data?.items ?? [];
  const invoiceBreakdown = invoiceGroups.map((group, index) => ({
    ...group, total: invoiceRows.filter(invoice => invoiceGroup(invoice.status) === index).length,
  }));
  const spotlightInvoices = [...invoiceRows].sort((a, b) => invoiceGroup(a.status) - invoiceGroup(b.status)).slice(0, 3);

  const invoicePanel = (
    <section className={`${styles.panel} ${styles.invoiceOverview}`} aria-labelledby="overview-invoices-title">
      <div className={styles.summarySectionHeading}><h2 id="overview-invoices-title">Hóa đơn</h2><Link href={moderator ? PATH_MODERATOR.INVOICES_LIST : PATH_ADMIN.INVOICES}>Xem tất cả hóa đơn</Link></div>
      {invoices.isPending && <p role="status">Đang tải hóa đơn…</p>}
      {invoices.isError && <div role="alert"><p>{getApiErrorMessage(invoices.error)}</p><button type="button" onClick={() => void invoices.refetch()}>Thử lại</button></div>}
      {invoices.data && (invoiceRows.length ? (
        <div className={styles.invoiceSnapshot}>
          <div>
            <p className={styles.invoiceSnapshotTitle}>Phân bố trạng thái</p>
            <p className={styles.invoiceSnapshotCaption}>
              {invoices.data.hasNext ? `${invoiceRows.length} hóa đơn trong nhóm đang xem` : `${invoiceRows.length} hóa đơn`}
            </p>
            <div className={styles.invoiceSnapshotBar} aria-hidden="true">
              {invoiceBreakdown.filter(group => group.total > 0).map(group => (
                <span key={group.key} data-group={group.key} style={{ flex: group.total }} />
              ))}
            </div>
            <ul className={styles.invoiceSnapshotLegend}>
              {invoiceBreakdown.filter(group => group.key !== "other" || group.total > 0).map(group => (
                <li key={group.key}><span data-group={group.key} aria-hidden="true" /><span>{group.label}</span><strong>{group.total}</strong></li>
              ))}
            </ul>
          </div>
          <div>
            <p className={styles.invoiceSnapshotTitle}>Hóa đơn nổi bật</p>
            <ul className={styles.invoiceSnapshotList}>
              {spotlightInvoices.map(invoice => (
                <li key={invoice.id}>
                  <Link href={moderator ? PATH_MODERATOR.INVOICE_DETAIL(invoice.id) : PATH_ADMIN.INVOICE_DETAIL(invoice.id)}>{invoice.id.slice(0, 8).toUpperCase()}</Link>
                  <StatusBadge variant="dot" status={invoice.status}>{invoiceLabels[invoice.status] ?? invoice.status}</StatusBadge>
                  <strong>{invoice.currency.toUpperCase() === "VND" ? amount(invoice.amount) : `${number.format(invoice.amount)} ${invoice.currency}`}</strong>
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : <p className={styles.emptyText}>Chưa có hóa đơn.</p>)}
    </section>
  );

  return (
    <div className={moderator ? `${styles.pageContent} ${styles.moderatorOverview}` : styles.pageContent}>
      <div className={`${styles.pageHeading} ${styles.summaryHeading}`}>
        <div>
          <h1>{ADMIN_MESSAGES.OVERVIEW.TITLE}</h1>
          {moderator && <p>Theo dõi hoạt động của máy, hóa đơn và công việc cần xử lý.</p>}
        </div>
        <details ref={filterRef} className={styles.summaryFilters} onKeyDown={event => { if (event.key === "Escape" && filterRef.current) { filterRef.current.open = false; filterRef.current.querySelector("summary")?.focus(); } }}>
          <summary aria-label="Chọn kỳ báo cáo"><CalendarDays size={15} aria-hidden="true" />{usagePeriod}</summary>
          <div className={styles.summaryFilterPopover}>
            <p className={styles.summaryChartCaption}>{moderator && !hasPeriodFinance ? "Áp dụng cho số ly ghi nhận." : "Áp dụng cho doanh thu và sản lượng."}</p>
            <div className={styles.overviewRangeControls}>
              <div className={styles.overviewQuickRanges} role="group" aria-label="Chọn nhanh kỳ dữ liệu">
                {quickRanges.map(({ key, label }) => (
                  <button
                    key={key}
                    type="button"
                    aria-pressed={activeQuickRange === key}
                    className={activeQuickRange === key ? styles.overviewQuickRangeActive : undefined}
                    disabled={!today}
                    onClick={() => applyQuickRange(key)}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <form className={styles.overviewRangeForm} onSubmit={applyCustomRange}>
                <div className={styles.overviewRangeField}>
                  <label htmlFor="overview-from-date">Từ ngày</label>
                  <div className={styles.overviewDateControl}>
                    <input
                      id="overview-from-date"
                      type="text"
                      inputMode="numeric"
                      placeholder="dd/mm/yyyy"
                      value={fromDateInput}
                      aria-invalid={fromDateInput !== "" && !parseLocalizedDate(fromDateInput)}
                      required
                      disabled={!today}
                      onChange={(event) => {
                        const inputValue = event.target.value;
                        setFromDateInput(inputValue);
                        setFromDate(parseLocalizedDate(inputValue) ?? "");
                        setActiveQuickRange(null);
                        setRangeError("");
                      }}
                    />
                    <label className={styles.overviewCalendarPicker}>
                      <CalendarDays size={18} aria-hidden="true" />
                      <input
                        type="date"
                        lang="vi"
                        value={fromDate}
                        max={toDate || today || undefined}
                        aria-label="Mở lịch chọn ngày bắt đầu"
                        disabled={!today}
                        onChange={(event) => {
                          setFromDate(event.target.value);
                          setFromDateInput(formatDateOnly(event.target.value));
                          setActiveQuickRange(null);
                          setRangeError("");
                        }}
                      />
                    </label>
                  </div>
                </div>
                <div className={styles.overviewRangeField}>
                  <label htmlFor="overview-to-date">Đến ngày</label>
                  <div className={styles.overviewDateControl}>
                    <input
                      id="overview-to-date"
                      type="text"
                      inputMode="numeric"
                      placeholder="dd/mm/yyyy"
                      value={toDateInput}
                      aria-invalid={toDateInput !== "" && !parseLocalizedDate(toDateInput)}
                      required
                      disabled={!today}
                      onChange={(event) => {
                        const inputValue = event.target.value;
                        setToDateInput(inputValue);
                        setToDate(parseLocalizedDate(inputValue) ?? "");
                        setActiveQuickRange(null);
                        setRangeError("");
                      }}
                    />
                    <label className={styles.overviewCalendarPicker}>
                      <CalendarDays size={18} aria-hidden="true" />
                      <input
                        type="date"
                        lang="vi"
                        value={toDate}
                        min={fromDate || undefined}
                        max={today || undefined}
                        aria-label="Mở lịch chọn ngày kết thúc"
                        disabled={!today}
                        onChange={(event) => {
                          setToDate(event.target.value);
                          setToDateInput(formatDateOnly(event.target.value));
                          setActiveQuickRange(null);
                          setRangeError("");
                        }}
                      />
                    </label>
                  </div>
                </div>
                <button className={styles.overviewApplyRange} type="submit" disabled={!today}>
                  Áp dụng kỳ
                </button>
              </form>
              {rangeError && <p className={styles.accountInlineWarning} role="alert">{rangeError}</p>}
              {appliedRange && (
                <p className={styles.overviewAppliedRange}>
                  Đang áp dụng: <strong>{formatDateOnly(appliedRange.fromDate)} – {formatDateOnly(appliedRange.toDate)}</strong>
                </p>
              )}
            </div>

          </div>
        </details>
      </div>



      {overview.isPending && (
        <div className={styles.notice} role="status">
          {ADMIN_MESSAGES.OVERVIEW.LOADING}
        </div>
      )}

      {overview.isError && (
        <div className={`${styles.notice} ${styles.errorNotice}`} role="alert">
          <p>{getApiErrorMessage(overview.error)}</p>
          <button type="button" onClick={() => void overview.refetch()}>
            {ADMIN_MESSAGES.OVERVIEW.RETRY}
          </button>
        </div>
      )}

      {!moderator && overview.data && !metrics && (
        <div className={styles.notice}>{ADMIN_MESSAGES.OVERVIEW.EMPTY}</div>
      )}

      {overview.data && (
        <>
          {(!moderator || hasFinance) && <section className={styles.summaryCumulative} data-expanded={moderator || financeExpanded} aria-labelledby="overview-finance-title">
            <h2 id="overview-finance-title" className={styles.summaryTitle}><span>Tài chính lũy kế</span>{!moderator && <button type="button" aria-expanded={financeExpanded} aria-controls="overview-finance-values" onClick={() => setFinanceExpanded(value => !value)}>Tài chính lũy kế · {financeExpanded ? "Thu gọn" : "Xem số liệu"}</button>}</h2>
            <div id="overview-finance-values" className={styles.summaryFinance}>
              {([
                { label: ADMIN_MESSAGES.OVERVIEW.ISSUED, field: "amountIssued" },
                { label: "Đã thu lũy kế", field: "amountCollected" },
                { label: ADMIN_MESSAGES.OVERVIEW.OUTSTANDING, field: "outstandingBalance" },
                { label: ADMIN_MESSAGES.OVERVIEW.OVERDUE, field: "overdueBalance" },
              ] as const).map(item => <div className={styles.summaryFinanceCard} key={item.label}>
                <span>{item.label}</span><strong>{amount(vnd?.[item.field])}</strong>
                {moderator && overview.data?.financialMetrics?.filter(metric => metric.currency?.toUpperCase() !== "VND" && metric.currency && metric[item.field] != null).map((metric, index) => (
                  <small key={index}>{count(metric[item.field])} {metric.currency}</small>
                ))}
              </div>)}
            </div>
          </section>}

          {moderator ? <>
            <div className={styles.moderatorOverviewCharts}>
              {hasPeriodFinance && revenuePanel}
              {cupsPanel}
              {!hasPeriodFinance && rentalPanel}
            </div>
            {hasPeriodFinance && rentalPanel}
            {invoicePanel}
            <section className={styles.panel} aria-labelledby="moderator-operations-title">
              <h2 id="moderator-operations-title" className={styles.summaryTitle}>Chỉ số vận hành</h2>
              <dl className={styles.moderatorOverviewStats}>
                {[
                  { label: "Khách hàng", value: metrics?.totalOwners },
                  { label: "Số ly trong kỳ", value: metrics?.cupsInSelectedPeriod },
                  { label: "Lệnh lắp đặt đang mở", value: metrics?.openInstallationWorkOrders },
                  { label: "Phiếu bảo trì đang mở", value: metrics?.openMaintenanceTickets },
                ].map(item => <div key={item.label}><dt>{item.label}</dt><dd>{count(item.value)}</dd></div>)}
              </dl>
            </section>
          </> : <div className={styles.summaryGrid}>
            <div className={styles.summaryColumn}>
              {revenuePanel}
              {invoicePanel}
            </div>
            <div className={styles.summaryColumn}>
              {cupsPanel}
              {rentalPanel}
              <ActionItemsPanel role="ADMIN" compact />
            </div>
          </div>}
        </>
      )}
      {moderator && !overview.data && invoicePanel}
      {moderator && <ActionItemsPanel role="MODERATOR" summary={overview.data?.actionSummary} />}
    </div>
  );
}

export default function AdminPage() {
  return (
    <AdminShell>
      <OperationsOverview role="ADMIN" />
      <PageActions actions={[
        { id: "admin-overview-iot", label: ADMIN_MESSAGES.NAVIGATION.IOT, variant: "secondary", priority: 0, href: PATH_ADMIN.IOT },
        { id: "admin-overview-machines", label: ADMIN_MESSAGES.NAVIGATION.MACHINES, variant: "secondary", priority: 0, href: PATH_ADMIN.MACHINES },
      ]} />
    </AdminShell>
  );
}
