import Link from "next/link";
import { useRouter } from "next/router";
import { useQuery } from "@tanstack/react-query";
import { Fragment, useEffect, useState, type FormEvent } from "react";
import { CalendarDays } from "lucide-react";
import { dashboardApi } from "@/apis/dashboard.api";
import { getApiErrorMessage } from "@/lib/api-errors";
import { DataTable } from "@/components/table/data-table";
import { ButtonBar } from "@/components/button/button-bar";
import { DashboardDateRangeSchema, DASHBOARD_BUSINESS_TIME_ZONE } from "@/schema/dashboard.schema";
import { PATH_ADMIN } from "@/routes/path";
import { ADMIN_MESSAGES } from "@/text/admin/admin-messages";
import { AdminShell, adminStyles as styles } from "../admin-shell";

const number = new Intl.NumberFormat("vi-VN");
const money = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
});
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
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value.trim());
  if (!match) return undefined;
  const [, day, month, year] = match;
  const normalized = `${year}-${month}-${day}`;
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

function AdminOverview() {
  const router = useRouter();
  const [today, setToday] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [fromDateInput, setFromDateInput] = useState("");
  const [toDateInput, setToDateInput] = useState("");
  const [appliedRange, setAppliedRange] = useState<DateRange | null>(null);
  const [activeQuickRange, setActiveQuickRange] = useState<QuickRange | null>(null);
  const [rangeError, setRangeError] = useState("");
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

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
    setActiveQuickRange(queryRange.success ? null : "LAST_7_DAYS");
  }, [router.isReady, router.query.fromDate, router.query.toDate]);

  const overview = useQuery({
    queryKey: ["dolores", "dashboard", "overview", appliedRange],
    queryFn: ({ signal }) => {
      if (!appliedRange) throw new Error("Chưa chọn kỳ dữ liệu.");
      return dashboardApi.getOverview(signal, appliedRange.fromDate, appliedRange.toDate);
    },
    enabled: Boolean(appliedRange),
  });
  const metrics = overview.data?.operationalMetrics;
  const days = metrics?.dailyAcceptedCupUsage ?? [];
  const machineUsage = useQuery({
    queryKey: ["dolores", "dashboard", "daily-machine-cups", selectedDate],
    queryFn: ({ signal }) => {
      if (!selectedDate) throw new Error("Chưa chọn ngày cần xem.");
      return dashboardApi.getDailyMachineCupUsage(selectedDate, signal);
    },
    enabled: Boolean(selectedDate),
  });
  const vnd = overview.data?.financialMetrics?.find(
    (item) => item.currency?.toUpperCase() === "VND",
  );
  const usagePeriod = appliedRange
    ? formatDateRange(appliedRange.fromDate, appliedRange.toDate)
    : "Đang tải kỳ dữ liệu";

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
    setSelectedDate(null);
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
    setSelectedDate(null);
  };

  return (
    <div className={styles.pageContent}>
      <div className={styles.pageHeading}>
        <div>
          <h1>{ADMIN_MESSAGES.OVERVIEW.TITLE}</h1>
          <p>{ADMIN_MESSAGES.OVERVIEW.DESCRIPTION}</p>
        </div>
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

      {overview.data && !metrics && (
        <div className={styles.notice}>{ADMIN_MESSAGES.OVERVIEW.EMPTY}</div>
      )}

      {overview.data && (
        <>
          {metrics && (
            <div className={styles.metricsGrid}>
              {[
                { label: ADMIN_MESSAGES.OVERVIEW.CUSTOMERS, value: metrics.totalOwners, isCupMetric: false },
                { label: ADMIN_MESSAGES.OVERVIEW.CUPS, value: metrics.cupsInSelectedPeriod, isCupMetric: true },
                { label: ADMIN_MESSAGES.OVERVIEW.MAINTENANCE, value: metrics.openMaintenanceTickets, isCupMetric: false },
                { label: ADMIN_MESSAGES.OVERVIEW.INSTALLATIONS, value: metrics.openInstallationWorkOrders, isCupMetric: false },
              ].map(({ label, value, isCupMetric }) => (
                <div className={styles.metricCard} key={label}>
                  <span>{label}</span>
                  <strong>{count(value)}</strong>
                  {value == null && <small className={styles.overviewMetricMeta}>Chưa có dữ liệu</small>}
                  {isCupMetric && (
                    <div className={styles.overviewCupMetricFooter}>
                      <small>
                        <span>{ADMIN_MESSAGES.OVERVIEW.PERIOD}: </span>
                        <strong>{usagePeriod}</strong>
                      </small>
                      <Link
                        className={styles.overviewReportLink}
                        href={{ pathname: PATH_ADMIN.REPORTS, query: appliedRange ?? undefined }}
                      >
                        Xem báo cáo <span aria-hidden="true">→</span>
                      </Link>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          <section className={styles.panel}>
            <h2>{ADMIN_MESSAGES.OVERVIEW.DAILY_CUPS}</h2>
            <p className={styles.panelSubtitle}>
              {ADMIN_MESSAGES.OVERVIEW.UPDATED} {formatDateOnly(overview.data.asOfDate)}
            </p>

            <div className={styles.overviewRangeControls}>
              <div className={styles.overviewRangeHeading}>
                <strong>Kỳ thống kê</strong>
                <p>Kỳ này áp dụng cho tổng ly hợp lệ phía trên và bảng theo ngày.</p>
              </div>
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

            {days.length ? (
              <DataTable
                  headerVariant="admin"
                  variant="standard"
                  className={`${styles.adminTable} ${styles.overviewDailyTable}`}
                  headers={["Chọn", ADMIN_MESSAGES.OVERVIEW.DATE, ADMIN_MESSAGES.OVERVIEW.CUP_COUNT]}
                >
                  {days.map((day, index) => (
                    <Fragment key={`${day.date ?? "unknown"}-${index}`}>
                      <tr>
                        <td>
                          {day.date && (
                            <label className={styles.overviewDayCheckLabel}>
                              <input
                                className={styles.overviewDayCheckbox}
                                type="checkbox"
                                checked={selectedDate === day.date}
                                aria-label={`Xem chi tiết số ly theo máy ngày ${formatDateOnly(day.date)}`}
                                onChange={(event) => setSelectedDate(event.target.checked ? day.date ?? null : null)}
                              />
                            </label>
                          )}
                        </td>
                        <td>{formatDateOnly(day.date)}</td>
                        <td>{day.cups == null ? "Chưa có dữ liệu" : count(day.cups)}</td>
                      </tr>
                      {selectedDate === day.date && day.date && (
                        <tr className={styles.overviewBreakdownRow}>
                          <td colSpan={3}>
                            <div className={styles.overviewMachineBreakdown} aria-labelledby="machine-cups-title">
                              <div className={styles.overviewBreakdownHeading}>
                                <div>
                                  <h3 id="machine-cups-title">Số ly theo máy · {formatDateOnly(day.date)}</h3>
                                  <p className={styles.panelSubtitle}>Máy có ghi nhận ly hợp lệ trong ngày đã chọn.</p>
                                </div>
                                <button type="button" onClick={() => setSelectedDate(null)}>Đóng chi tiết</button>
                              </div>
                              <p className={styles.overviewBreakdownTotal}>
                                Tổng của ngày: <strong>{count(day.cups)}</strong> ly hợp lệ
                              </p>
                              {machineUsage.isPending && <p role="status">Đang tải sản lượng theo máy…</p>}
                              {machineUsage.isError && (
                                <div className={`${styles.notice} ${styles.errorNotice}`} role="alert">
                                  <p>{getApiErrorMessage(machineUsage.error)}</p>
                                  <button type="button" onClick={() => void machineUsage.refetch()}>
                                    Thử tải lại
                                  </button>
                                </div>
                              )}
                              {machineUsage.data && machineUsage.data.length === 0 && (
                                <p className={styles.emptyText}>Không có máy nào ghi nhận ly hợp lệ trong ngày này.</p>
                              )}
                              {machineUsage.data && machineUsage.data.length > 0 && (
                                <div className={styles.overviewMachineRows}>
                                  <DataTable
                                    headerVariant="admin"
                                    variant="standard"
                                    className={styles.adminTable}
                                    rows={machineUsage.data}
                                    rowKey={(machine) => machine.machineId}
                                    columns={[
                                      { key: "machine", header: "Máy", render: (machine) => machine.serialNumber || machine.machineId },
                                      { key: "region", header: "Khu vực", render: (machine) => machine.region || "—" },
                                      {
                                        key: "cups",
                                        header: "Số ly hợp lệ",
                                        render: (machine) => count(machine.cups),
                                        cellProps: () => ({ className: styles.overviewMachineCupCell }),
                                      },
                                    ]}
                                  />
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  ))}
              </DataTable>
            ) : (
              <p className={styles.emptyText}>{ADMIN_MESSAGES.OVERVIEW.NO_DAILY_DATA}</p>
            )}
          </section>

          <section className={styles.panel}>
            <h2>{ADMIN_MESSAGES.OVERVIEW.FINANCIAL}</h2>
            {vnd ? (
              <div className={styles.financeGrid}>
                {[
                  { label: ADMIN_MESSAGES.OVERVIEW.ISSUED, rawValue: vnd.amountIssued },
                  { label: ADMIN_MESSAGES.OVERVIEW.COLLECTED, rawValue: vnd.amountCollected },
                  { label: ADMIN_MESSAGES.OVERVIEW.OUTSTANDING, rawValue: vnd.outstandingBalance },
                  { label: ADMIN_MESSAGES.OVERVIEW.OVERDUE, rawValue: vnd.overdueBalance },
                ].map(({ label, rawValue }) => (
                  <div key={label}>
                    <span>{label}</span>
                    <strong>{amount(rawValue)}</strong>
                    {rawValue == null && <small className={styles.overviewMetricMeta}>Chưa có dữ liệu</small>}
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
