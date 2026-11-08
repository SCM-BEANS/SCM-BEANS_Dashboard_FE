import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { machinesApi } from "@/apis/machines.api";
import { ButtonBar } from "@/components/button/button-bar";
import { DataTable } from "@/components/table/data-table";
import { getApiErrorMessage } from "@/lib/api-errors";
import { OwnerAnalyticsCalendarRangeSchema } from "@/schema/owner-analytics.schema";
import {
  DASHBOARD_BUSINESS_TIME_ZONE,
  DashboardDateRangeSchema,
  type TDashboardOverview,
} from "@/schema/dashboard.schema";
import styles from "./machines.module.css";

export type OperationalDateRange = { fromDate: string; toDate: string };

export function MachineMonitoringHeader({ machineLabel, machineId, backHref, tabs, activeTab, onTabChange, idPrefix = "monitoring" }: {
  machineLabel?: string; machineId: string; backHref: string;
  tabs: readonly { value: string; label: string }[]; activeTab: string;
  onTabChange: (tab: string) => void; idPrefix?: string;
}) {
  return <>
    <div className={styles.operationalOverviewBack}><Link href={backHref}>← Về hồ sơ máy</Link></div>
    <header className={styles.operationalOverviewHeading}>
      <h1 id="machine-operational-overview-title">Giám sát vận hành</h1>
      <p className={styles.monitoringIdentity}><strong>{machineLabel ?? "Máy đang xem"}</strong><span title={machineId}>{machineId.slice(0, 8).toUpperCase()}</span></p>
    </header>
    <div className={styles.ownerOperationsTabs} role="tablist" aria-label="Dữ liệu vận hành máy">
      {tabs.map((tab, index) => <button key={tab.value} id={`${idPrefix}-tab-${tab.value}`} role="tab" type="button" tabIndex={activeTab === tab.value ? 0 : -1} aria-selected={activeTab === tab.value} aria-controls={`${idPrefix}-content`} onClick={() => onTabChange(tab.value)} onKeyDown={(event) => {
        if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
        event.preventDefault();
        const next = event.key === "Home" ? 0 : event.key === "End" ? tabs.length - 1 : (index + (event.key === "ArrowRight" ? 1 : tabs.length - 1)) % tabs.length;
        onTabChange(tabs[next].value); document.getElementById(`${idPrefix}-tab-${tabs[next].value}`)?.focus();
      }}>{tab.label}</button>)}
    </div>
  </>;
}
type CalendarPreset = "TODAY" | "YESTERDAY" | "THIS_WEEK" | "LAST_WEEK" | "LAST_30_DAYS" | "THIS_MONTH";

const calendarPresets: { key: CalendarPreset; label: string }[] = [
  { key: "TODAY", label: "Hôm nay" },
  { key: "YESTERDAY", label: "Hôm qua" },
  { key: "THIS_WEEK", label: "Tuần này" },
  { key: "LAST_WEEK", label: "Tuần trước" },
  { key: "LAST_30_DAYS", label: "30 ngày" },
  { key: "THIS_MONTH", label: "Tháng này" },
];

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

function shiftDate(date: string, amount: number): string {
  const value = new Date(`${date}T00:00:00Z`);
  value.setUTCDate(value.getUTCDate() + amount);
  return value.toISOString().slice(0, 10);
}

function makePresetRange(preset: CalendarPreset, today: string): OperationalDateRange {
  const date = new Date(`${today}T00:00:00Z`);
  const mondayOffset = (date.getUTCDay() + 6) % 7;
  const monday = shiftDate(today, -mondayOffset);
  switch (preset) {
    case "TODAY": return { fromDate: today, toDate: today };
    case "YESTERDAY": {
      const yesterday = shiftDate(today, -1);
      return { fromDate: yesterday, toDate: yesterday };
    }
    case "THIS_WEEK": return { fromDate: monday, toDate: today };
    case "LAST_WEEK": return { fromDate: shiftDate(monday, -7), toDate: shiftDate(monday, -1) };
    case "LAST_30_DAYS": return { fromDate: shiftDate(today, -29), toDate: today };
    case "THIS_MONTH": return { fromDate: `${today.slice(0, 7)}-01`, toDate: today };
  }
}

export function getDefaultOperationalRange(): OperationalDateRange {
  const today = businessToday();
  // Default to a 7-day calendar range, including today.
  return { fromDate: shiftDate(today, -6), toDate: today };
}

export function MachineRecordsSection({ subject, machineId, kind, query, onNavigate }: {
  subject: string; machineId: string; kind: "production" | "history" | "cleaning";
  query: Record<string, string | string[] | undefined>;
  onNavigate: (patch: Record<string, string | undefined>) => void;
}) {
  const [defaultRange] = useState(getDefaultOperationalRange);
  const fromDate = query.fromDate ?? defaultRange.fromDate, toDate = query.toDate ?? defaultRange.toDate;
  const calendar = DashboardDateRangeSchema.safeParse({ fromDate, toDate });
  const range = calendar.success ? OwnerAnalyticsCalendarRangeSchema.parse(calendar.data) : null;
  const pageInput = query.recordPage;
  const page = pageInput === undefined ? 0 : typeof pageInput === "string" && /^\d+$/.test(pageInput) ? Number(pageInput) : NaN;
  const valid = Boolean(range) && Number.isSafeInteger(page) && page >= 0 && page <= 2_147_483_647;
  const [draft, setDraft] = useState({ fromDate: typeof fromDate === "string" ? fromDate : "", toDate: typeof toDate === "string" ? toDate : "" });
  const [dateError, setDateError] = useState("");
  useEffect(() => setDraft({ fromDate: typeof fromDate === "string" ? fromDate : "", toDate: typeof toDate === "string" ? toDate : "" }), [fromDate, toDate]);
  const brew = useQuery({
    queryKey: ["machine-brew-records", subject, machineId, range?.from, range?.to, page],
    queryFn: ({ signal }) => machinesApi.listBrewRecords(machineId, { ...range!, page }, signal),
    enabled: valid && kind === "history", retry: false, refetchOnWindowFocus: false,
  });
  const cleaning = useQuery({
    queryKey: ["machine-cleaning-records", subject, machineId, range?.from, range?.to, page],
    queryFn: ({ signal }) => machinesApi.listCleaningRecords(machineId, { ...range!, page }, signal),
    enabled: valid && kind === "cleaning", retry: false, refetchOnWindowFocus: false,
  });
  const production = useInfiniteQuery({
    queryKey: ["machine-brew-production", subject, machineId, range?.from, range?.to],
    queryFn: ({ signal, pageParam }) => machinesApi.listBrewRecords(machineId, { ...range!, page: pageParam, size: 100 }, signal),
    enabled: valid && kind === "production", initialPageParam: 0,
    // shortcut: cap explicit loading at 10,000 records; use an operator aggregate API when available.
    getNextPageParam: (lastPage, pages) => !lastPage.last && pages.length < 100 ? lastPage.page + 1 : undefined,
    retry: false, refetchOnWindowFocus: false,
  });
  const selected = kind === "production" ? production : kind === "history" ? brew : cleaning;
  const pages = production.data?.pages;
  const stats = useMemo(() => {
    const records = [...new Map((pages ?? []).flatMap((item) => item.content).map((item) => [item.eventId, item])).values()];
    const daily = new Map<string, number>(), recipes = new Map<string, number>();
    const dayFormatter = new Intl.DateTimeFormat("en", { timeZone: DASHBOARD_BUSINESS_TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit" });
    for (const record of records) {
      const parts = dayFormatter.formatToParts(new Date(record.brewedAt));
      const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((item) => item.type === type)?.value ?? "";
      const day = `${part("year")}-${part("month")}-${part("day")}`;
      daily.set(day, (daily.get(day) ?? 0) + 1);
      recipes.set(record.recipeName, (recipes.get(record.recipeName) ?? 0) + 1);
    }
    const total = pages?.[0]?.totalElements;
    const consistent = pages?.every((item) => item.totalElements === total);
    return { total, loaded: records.length, complete: Boolean(consistent && pages?.at(-1)?.last && records.length === total), daily: [...daily].sort(([a], [b]) => a.localeCompare(b)), recipes: [...recipes].sort((a, b) => b[1] - a[1]) };
  }, [pages]);
  const time = (value: string | null) => value ? new Intl.DateTimeFormat("vi-VN", { timeZone: DASHBOARD_BUSINESS_TIME_ZONE, dateStyle: "short", timeStyle: "medium" }).format(new Date(value)) : "—";
  function applyRange(next: OperationalDateRange) {
    if (!DashboardDateRangeSchema.safeParse(next).success) { setDateError("Chọn khoảng ngày hợp lệ, không sau hôm nay và tối đa 90 ngày."); return; }
    setDateError(""); onNavigate({ ...next, recordPage: undefined });
  }
  const pagination = kind === "history" ? brew.data : cleaning.data;
  return <>
    <section className={styles.operationalOverviewPanel} aria-label="Bộ lọc lịch sử máy">
      <div className={styles.operationalQuickRanges}>{calendarPresets.map(({ key, label }) => <button type="button" key={key} onClick={() => applyRange(makePresetRange(key, businessToday()))}>{label}</button>)}</div>
      <form className={styles.operationalDateForm} onSubmit={(event) => { event.preventDefault(); applyRange(draft); }}>
        <label>Từ ngày<input type="date" value={draft.fromDate} max={draft.toDate || businessToday()} onChange={(event) => setDraft((current) => ({ ...current, fromDate: event.target.value }))} /></label>
        <label>Đến ngày<input type="date" value={draft.toDate} min={draft.fromDate || undefined} max={businessToday()} onChange={(event) => setDraft((current) => ({ ...current, toDate: event.target.value }))} /></label>
        <button type="submit">Áp dụng bộ lọc</button>
      </form>
      {dateError ? <p role="alert">{dateError}</p> : null}
    </section>
    {!valid ? <div className={styles.operationalOverviewError} role="alert"><p>Bộ lọc lịch sử không hợp lệ.</p><ButtonBar onClick={() => onNavigate({ fromDate: undefined, toDate: undefined, recordPage: undefined })}>Đặt lại bộ lọc</ButtonBar></div>
      : selected.isError ? <div className={styles.operationalOverviewError} role="alert"><p>{getApiErrorMessage(selected.error)}</p><ButtonBar onClick={() => void selected.refetch()}>Thử lại</ButtonBar></div>
        : selected.isPending ? <p role="status">Đang tải dữ liệu máy…</p>
          : kind === "production" && production.data ? <>
            <div className={styles.operationalMetricGrid}><article className={styles.operationalMetricCard}><span>Tổng lần pha trong kỳ</span><strong>{formatCount(stats.total)}</strong><small>Máy đang xem · {formatDate(String(fromDate))} – {formatDate(String(toDate))}</small></article></div>
            <p className={styles.operationalOverviewState}>{stats.complete ? "Đã tải đầy đủ lịch sử pha trong kỳ." : `Biểu đồ dựa trên ${formatCount(stats.loaded)}/${formatCount(stats.total)} lần pha đã tải; chưa phải phân bố toàn kỳ.`}</p>
            <div className={styles.monitoringProductionCharts}>
              <section className={styles.operationalOverviewPanel}><h2>Lần pha theo ngày</h2>{stats.daily.length ? <div className={styles.operationalDailyChart} aria-label="Biểu đồ lần pha theo ngày">{stats.daily.map(([day, count]) => <div key={day} className={styles.operationalDailyChartColumn}><strong>{formatCount(count)}</strong><div className={styles.operationalDailyChartTrack}><span className={styles.operationalDailyChartBar} style={{ height: `${count / Math.max(...stats.daily.map((item) => item[1])) * 100}%` }} /></div><time dateTime={day}>{formatDate(day).slice(0, 5)}</time></div>)}</div> : <p>Chưa có lần pha trong khoảng đã chọn.</p>}</section>
              <section className={styles.operationalOverviewPanel}><h2>Lần pha theo món</h2>{stats.recipes.length ? <ul className={styles.monitoringRecipeBars} aria-label="So sánh lần pha theo món">{stats.recipes.map(([name, count]) => <li key={name}><span>{name || "Chưa có tên món"}</span><div><span style={{ width: `${count / stats.recipes[0][1] * 100}%` }} /></div><strong>{formatCount(count)} lần</strong></li>)}</ul> : <p>Chưa có dữ liệu theo món.</p>}</section>
            </div>
            {production.hasNextPage ? <ButtonBar disabled={production.isFetching} onClick={() => void production.fetchNextPage()}>{production.isFetchingNextPage ? "Đang tải…" : "Tải thêm dữ liệu biểu đồ"}</ButtonBar> : !stats.complete ? <p role="status">Chưa tải đủ dữ liệu hoặc dữ liệu đã thay đổi. Hãy chọn khoảng ngắn hơn hoặc làm mới.</p> : null}
            <ButtonBar disabled={production.isFetching} onClick={() => void production.refetch()}>Làm mới</ButtonBar>
          </> : <section className={styles.operationalOverviewPanel}>
            <h2>{kind === "history" ? "Lịch sử từng lần pha" : "Lịch sử vệ sinh"}</h2>
            {kind === "history" && brew.data ? <DataTable rows={brew.data.content} rowKey={(row) => row.id} emptyMessage="Chưa có lần pha trong khoảng đã chọn." columns={[
              { key: "time", header: "Thời gian", render: (row) => time(row.brewedAt) },
              { key: "machine", header: "Máy", render: (row) => row.machineSerialNumber },
              { key: "recipe", header: "Món", render: (row) => row.recipeName },
            ]} /> : cleaning.data ? <DataTable rows={cleaning.data.content} rowKey={(row) => row.id} emptyMessage="Chưa có lịch sử vệ sinh trong khoảng đã chọn." columns={[
              { key: "time", header: "Bắt đầu", render: (row) => time(row.startedAt) },
              { key: "machine", header: "Máy", render: (row) => row.machineSerialNumber },
              { key: "type", header: "Loại vệ sinh", render: (row) => row.cleaningType === "STARTUP" ? "Đầu ngày" : "Cuối ngày" },
              { key: "status", header: "Kết quả", render: (row) => ({ COMPLETED: "Hoàn tất", FAILED: "Chưa hoàn tất", ABORTED: "Bị gián đoạn" })[row.status] },
              { key: "notes", header: "Nội dung", render: (row) => <details><summary>Xem nội dung</summary><dl className={styles.ownerCleaningFlags}><div><dt>Kết thúc</dt><dd>{time(row.finishedAt)}</dd></div>{([ ["Đường cà phê", row.coffeeCleaned], ["Đường sữa", row.milkCleaned], ["Gia nhiệt", row.heatingCompleted], ["Xả đầu pha", row.groupheadPurged] ] as const).map(([label, done]) => <div key={label}><dt>{label}</dt><dd>{done ? "Đã thực hiện" : "Chưa thực hiện"}</dd></div>)}<div><dt>Ghi chú</dt><dd>{row.notes || "—"}</dd></div></dl></details> },
            ]} /> : null}
            {pagination ? <nav className={styles.ownerHistoryPagination} aria-label="Phân trang lịch sử máy"><span>{formatCount(pagination.totalElements)} bản ghi · Trang {pagination.page + 1}</span><ButtonBar disabled={pagination.first || selected.isFetching} onClick={() => onNavigate({ recordPage: String(page - 1) })}>Trang trước</ButtonBar><ButtonBar disabled={pagination.last || selected.isFetching} onClick={() => onNavigate({ recordPage: String(page + 1) })}>Trang sau</ButtonBar><ButtonBar disabled={selected.isFetching} onClick={() => void selected.refetch()}>Làm mới</ButtonBar></nav> : null}
          </section>}
  </>;
}

function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(`${value.slice(0, 10)}T00:00:00Z`);
  if (!Number.isFinite(date.getTime())) return value;
  return new Intl.DateTimeFormat("vi-VN", {
    timeZone: DASHBOARD_BUSINESS_TIME_ZONE,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function formatCount(value: number | null | undefined): string {
  return value == null ? "Chưa có dữ liệu" : new Intl.NumberFormat("vi-VN").format(value);
}

function formatPeriodAmount(value: number | undefined, currency: string | undefined): string | null {
  if (value === undefined) return null;
  const code = currency ?? "VND";
  try {
    return new Intl.NumberFormat("vi-VN", { style: "currency", currency: code, maximumFractionDigits: 0 }).format(value);
  } catch {
    return `${new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 0 }).format(value)} ${code}`;
  }
}

function qualityLabel(status: string | undefined): string | null {
  if (!status) return null;
  if (status === "COMPLETE") return "Đầy đủ";
  if (status === "PARTIAL") return "Một phần";
  if (status === "UNAVAILABLE") return "Chưa khả dụng";
  return null;
}

export interface OperationalOverviewProps {
  machineId: string;
  machineLabel?: string;
  scopeLabel: string;
  showFinancialMetrics: boolean;
  overview?: TDashboardOverview;
  range: OperationalDateRange;
  onRangeChange: (range: OperationalDateRange) => void;
  loading: boolean;
  error?: string;
  onRetry: () => void;
  machineLoading: boolean;
  machineError?: string;
  machineHref: string;
  machineListHref: string;
}

export function OperationalOverview({
  machineId,
  machineLabel,
  scopeLabel,
  showFinancialMetrics,
  overview,
  range,
  onRangeChange,
  loading,
  error,
  onRetry,
  machineLoading,
  machineError,
  machineHref,
  machineListHref,
}: OperationalOverviewProps) {
  const [draftRange, setDraftRange] = useState(range);
  const [rangeError, setRangeError] = useState("");
  useEffect(() => setDraftRange(range), [range]);

  const operations = overview?.operationalMetrics;
  const dailyUsage = operations?.dailyAcceptedCupUsage;
  const maxCups = useMemo(() => Math.max(0, ...(dailyUsage ?? []).map((item) => item.cups ?? 0)), [dailyUsage]);
  const periodLabel = `${formatDate(range.fromDate)} – ${formatDate(range.toDate)}`;
  const today = businessToday();

  function applyRange(nextRange: OperationalDateRange) {
    const parsed = DashboardDateRangeSchema.safeParse(nextRange);
    if (!parsed.success) {
      setRangeError("Chọn khoảng ngày hợp lệ, kết thúc không sau hôm nay và tối đa 90 ngày.");
      return;
    }
    setRangeError("");
    setDraftRange(parsed.data);
    onRangeChange(parsed.data);
  }

  const financialMetrics = (showFinancialMetrics ? overview?.periodFinancialMetrics ?? [] : []).flatMap((metric, index) => {
    const issued = formatPeriodAmount(metric.amountIssuedInPeriod, metric.currency);
    const collected = formatPeriodAmount(metric.amountCollectedInPeriod, metric.currency);
    if (!issued && !collected) return [];
    const currency = metric.currency ?? "VND";
    return [{ metric, index, issued, collected, currency }];
  });

  return (
    <section className={styles.operationalOverview} aria-labelledby="machine-operational-overview-title">
      <div className={styles.operationalOverviewBack}>
        <Link href={machineLoading || !machineError ? machineHref : machineListHref}>← Quay lại máy</Link>
      </div>
      <header className={styles.operationalOverviewHeading}>
        <h1 id="machine-operational-overview-title">Tổng quan dữ liệu vận hành</h1>
        <p>Phạm vi tổng hợp: {scopeLabel}. {machineLabel ?? machineId} chỉ là ngữ cảnh mở màn hình, các số liệu bên dưới không được chia theo máy này.</p>
      </header>

      {machineLoading ? <p className={styles.operationalOverviewState} role="status">Đang xác minh hồ sơ máy…</p> : null}
      {machineError ? (
        <div className={styles.operationalOverviewError} role="alert">
          <p>Không tải được hồ sơ máy để xác nhận ngữ cảnh.</p>
          <Link href={machineListHref}>Về danh sách máy</Link>
        </div>
      ) : null}

      <section className={styles.operationalOverviewPanel} aria-labelledby="operational-period-title">
        <div className={styles.operationalOverviewPanelHeading}>
          <div>
            <h2 id="operational-period-title">Số liệu theo ngày lịch</h2>
            <p>Kỳ đang xem: <strong>{periodLabel}</strong></p>
          </div>
        </div>
        <div className={styles.operationalQuickRanges} role="group" aria-label="Chọn nhanh kỳ tổng quan">
          {calendarPresets.map(({ key, label }) => {
            const presetRange = makePresetRange(key, today);
            const active = range.fromDate === presetRange.fromDate && range.toDate === presetRange.toDate;
            return (
              <button key={key} type="button" aria-pressed={active} onClick={() => applyRange(presetRange)}>
                {label}
              </button>
            );
          })}
        </div>
        <div className={styles.operationalDateForm}>
          <label>
            Từ ngày
            <input
              aria-label="Từ ngày tổng quan"
              type="date"
              max={draftRange.toDate || today}
              value={draftRange.fromDate}
              onChange={(event) => setDraftRange((current) => ({ ...current, fromDate: event.target.value }))}
            />
          </label>
          <label>
            Đến ngày
            <input
              aria-label="Đến ngày tổng quan"
              type="date"
              min={draftRange.fromDate || undefined}
              max={today}
              value={draftRange.toDate}
              onChange={(event) => setDraftRange((current) => ({ ...current, toDate: event.target.value }))}
            />
          </label>
          <button type="button" onClick={() => applyRange(draftRange)}>Áp dụng</button>
        </div>
        {rangeError ? <p className={styles.operationalOverviewErrorText} role="alert">{rangeError}</p> : null}
      </section>

      {loading ? <p className={styles.operationalOverviewState} role="status">Đang tải số liệu tổng hợp…</p> : null}
      {error ? (
        <div className={styles.operationalOverviewError} role="alert">
          <p>{error}</p>
          <button type="button" onClick={onRetry}>Thử lại</button>
        </div>
      ) : null}

      {!loading && !error && overview ? (
        <>
          <div className={styles.operationalMetricGrid}>
            <article className={styles.operationalMetricCard}>
              <span>Ly hợp lệ trong kỳ</span>
              <strong>{formatCount(operations?.cupsInSelectedPeriod)}</strong>
              <small>{periodLabel}</small>
            </article>
            {operations?.openMaintenanceTickets != null ? (
              <article className={styles.operationalMetricCard}>
                <span>Yêu cầu bảo trì đang mở</span>
                <strong>{formatCount(operations.openMaintenanceTickets)}</strong>
                <small>Phạm vi {scopeLabel}</small>
              </article>
            ) : null}
            {operations?.openInstallationWorkOrders != null ? (
              <article className={styles.operationalMetricCard}>
                <span>Lệnh lắp đặt đang mở</span>
                <strong>{formatCount(operations.openInstallationWorkOrders)}</strong>
                <small>Phạm vi {scopeLabel}</small>
              </article>
            ) : null}
            {operations?.overdueInstallationWorkOrders != null ? (
              <article className={styles.operationalMetricCard}>
                <span>Lệnh lắp đặt quá hạn</span>
                <strong>{formatCount(operations.overdueInstallationWorkOrders)}</strong>
                <small>Phạm vi {scopeLabel}</small>
              </article>
            ) : null}
          </div>

          <section className={styles.operationalOverviewPanel} aria-labelledby="daily-cups-title">
            <div className={styles.operationalOverviewPanelHeading}>
              <div>
                <h2 id="daily-cups-title">Ly hợp lệ theo ngày</h2>
                <p>Số liệu tổng hợp theo ngày trong kỳ đã chọn.</p>
              </div>
            </div>
            {dailyUsage === undefined || dailyUsage === null ? (
              <p className={styles.operationalOverviewState}>API chưa trả chuỗi số liệu theo ngày cho kỳ này.</p>
            ) : dailyUsage.length === 0 ? (
              <p className={styles.operationalOverviewState}>Chưa có dữ liệu theo ngày trong kỳ đã chọn.</p>
            ) : (
              <div className={styles.operationalDailyChart} role="list" aria-label="Biểu đồ ly hợp lệ tổng hợp theo ngày">
                {dailyUsage.map((item, index) => {
                  const cups = item.cups ?? null;
                  const height = cups === null || maxCups === 0 ? 2 : Math.max(4, Math.round((cups / maxCups) * 112));
                  return (
                    <div className={styles.operationalDailyChartColumn} role="listitem" key={`${item.date ?? "missing"}-${index}`}>
                      <strong>{cups === null ? "—" : formatCount(cups)}</strong>
                      <div className={styles.operationalDailyChartTrack}>
                        <div className={styles.operationalDailyChartBar} style={{ height }} aria-hidden="true" />
                      </div>
                      <time dateTime={item.date ?? undefined}>{item.date ? formatDate(item.date).slice(0, 5) : "—"}</time>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {financialMetrics.length > 0 ? (
            <section className={styles.operationalOverviewPanel} aria-labelledby="period-finances-title">
              <div className={styles.operationalOverviewPanelHeading}>
                <div>
                  <h2 id="period-finances-title">Tài chính trong kỳ</h2>
                  <p>Chỉ hiển thị khoản tiền API trả về cho phạm vi {scopeLabel}; đây không phải phí riêng của máy đang chọn.</p>
                </div>
              </div>
              <div className={styles.operationalMetricGrid}>
                {financialMetrics.flatMap(({ metric, index, issued, collected, currency }) => [
                  issued ? (
                    <article className={styles.operationalMetricCard} key={`${currency}-${index}-issued`}>
                      <span>Giá trị phát hành trong kỳ</span>
                      <strong>{issued}</strong>
                      <small>{qualityLabel(metric.issuanceQuality?.status) ?? `Đơn vị: ${currency}`}</small>
                    </article>
                  ) : null,
                  collected ? (
                    <article className={styles.operationalMetricCard} key={`${currency}-${index}-collected`}>
                      <span>Đã thu trong kỳ</span>
                      <strong>{collected}</strong>
                      <small>{qualityLabel(metric.collectionQuality?.status) ?? `Đơn vị: ${currency}`}</small>
                    </article>
                  ) : null,
                ])}
              </div>
            </section>
          ) : null}
        </>
      ) : null}
    </section>
  );
}
