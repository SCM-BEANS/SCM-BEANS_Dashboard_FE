import { useRouter } from "next/router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState, type FormEvent } from "react";
import { CalendarDays } from "lucide-react";
import { billingApi } from "@/apis/billing.api";
import { dashboardApi } from "@/apis/dashboard.api";
import { getApiErrorMessage } from "@/lib/api-errors";
import { DataTable } from "@/components/table/data-table";
import { DASHBOARD_BUSINESS_TIME_ZONE, DashboardDateRangeSchema } from "@/schema/dashboard.schema";
import { PATH_ADMIN } from "@/routes/path";
import { ADMIN_MESSAGES } from "@/text/admin/admin-messages";
import { AdminShell, adminStyles as styles } from "../admin-shell";

const countFormatter = new Intl.NumberFormat("vi-VN");
const amountFormatter = new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 2 });
const REPORT_QUERY_KEY = ["dolores", "dashboard", "overview"] as const;
const INVOICE_QUERY_KEY = ["dolores", "billing", "invoices"] as const;
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

function queryString(value: string | string[] | undefined): string {
  return typeof value === "string" ? value : "";
}

function displayAmount(value: number | null | undefined, currency: string | null | undefined): string {
  if (value == null) return "—";
  return amountFormatter.format(value) + (currency ? " " + currency : "");
}

function formatDateOnly(value: string | null | undefined): string {
  if (!value) return "—";
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return "—";
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== value) return "—";
  return date.toLocaleDateString("vi-VN", { timeZone: "UTC" });
}

function formatDateTime(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isFinite(date.getTime())
    ? date.toLocaleString("vi-VN", { timeZone: DASHBOARD_BUSINESS_TIME_ZONE })
    : value;
}

function parseLocalizedDate(value: string): string | undefined {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value.trim());
  if (!match) return undefined;
  const [, day, month, year] = match;
  const normalized = `${year}-${month}-${day}`;
  const date = new Date(`${normalized}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === normalized
    ? normalized
    : undefined;
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
  return new Date(Date.parse(`${date}T00:00:00Z`) + amount * DAY_MS).toISOString().slice(0, 10);
}

function previousMonthSameDay(date: string): string {
  const [year, month, day] = date.split("-").map(Number);
  const daysInPreviousMonth = new Date(Date.UTC(year, month - 1, 0)).getUTCDate();
  return new Date(Date.UTC(year, month - 2, Math.min(day, daysInPreviousMonth)))
    .toISOString().slice(0, 10);
}

function getQuickRange(key: QuickRange, today: string): DateRange {
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

function formatRange(fromDate: string | null | undefined, toDate: string | null | undefined): string {
  if (!fromDate && !toDate) return "";
  if (!fromDate) return `Đến ${formatDateOnly(toDate)}`;
  if (!toDate) return `Từ ${formatDateOnly(fromDate)}`;
  return `${formatDateOnly(fromDate)} – ${formatDateOnly(toDate)}`;
}

function invoiceStatusLabel(status: string): string {
  switch (status.toUpperCase()) {
    case "DRAFT": return "Bản nháp";
    case "PENDING": return "Đang chờ";
    case "UNPAID": return "Chưa thanh toán";
    case "PAID": return "Đã thanh toán";
    case "OVERDUE": return "Quá hạn";
    case "CANCELLED": return "Đã hủy";
    default: return status;
  }
}

function invoiceStatusClass(status: string): string {
  switch (status.toUpperCase()) {
    case "PAID": return "reportStatusPaid";
    case "OVERDUE": return "reportStatusOverdue";
    case "CANCELLED": return "reportStatusCancelled";
    default: return "reportStatusPending";
  }
}

function ReportContent() {
  const router = useRouter();
  const [today, setToday] = useState("");
  const [fromDate, setFromDate] = useState(() => queryString(router.query.fromDate));
  const [toDate, setToDate] = useState(() => queryString(router.query.toDate));
  const [fromDateInput, setFromDateInput] = useState("");
  const [toDateInput, setToDateInput] = useState("");
  const [activeQuickRange, setActiveQuickRange] = useState<QuickRange | null>(null);
  const [rangeError, setRangeError] = useState("");

  useEffect(() => {
    if (!router.isReady) return;
    const currentDate = businessToday();
    const queryRange = DashboardDateRangeSchema.safeParse({
      fromDate: queryString(router.query.fromDate),
      toDate: queryString(router.query.toDate),
    });
    setToday(currentDate);
    if (queryRange.success) {
      setFromDate(queryRange.data.fromDate);
      setToDate(queryRange.data.toDate);
      setFromDateInput(formatDateOnly(queryRange.data.fromDate));
      setToDateInput(formatDateOnly(queryRange.data.toDate));
      const matchingPreset = quickRanges.find(({ key }) => {
        const range = getQuickRange(key, currentDate);
        return range.fromDate === queryRange.data.fromDate && range.toDate === queryRange.data.toDate;
      });
      setActiveQuickRange(matchingPreset?.key ?? null);
    } else {
      setFromDate("");
      setToDate("");
      setFromDateInput("");
      setToDateInput("");
      setActiveQuickRange(null);
    }
    setRangeError("");
  }, [router.isReady, router.query.fromDate, router.query.toDate]);

  const hasDateQuery =
    router.query.fromDate !== undefined || router.query.toDate !== undefined;
  const parsedRange = hasDateQuery
    ? DashboardDateRangeSchema.safeParse({
        fromDate: router.query.fromDate,
        toDate: router.query.toDate,
      })
    : null;
  const rangeIsValid = !hasDateQuery || Boolean(parsedRange?.success);
  const validRange = parsedRange?.success ? parsedRange.data : undefined;

  const overview = useQuery({
    queryKey: [...REPORT_QUERY_KEY, validRange ?? "default"],
    queryFn: ({ signal }) => dashboardApi.getOverview(
      signal,
      validRange?.fromDate,
      validRange?.toDate,
    ),
    enabled: router.isReady && rangeIsValid,
  });
  const invoices = useQuery({
    queryKey: INVOICE_QUERY_KEY,
    queryFn: ({ signal }) => billingApi.listInvoices(signal),
  });

  const applyRange = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalizedFromDate = parseLocalizedDate(fromDateInput);
    const normalizedToDate = parseLocalizedDate(toDateInput);
    const parsed = normalizedFromDate && normalizedToDate
      ? DashboardDateRangeSchema.safeParse({ fromDate: normalizedFromDate, toDate: normalizedToDate })
      : null;
    if (!parsed?.success) {
      setRangeError(
        fromDateInput.trim() === "" || toDateInput.trim() === ""
          ? ADMIN_MESSAGES.REPORTS.RANGE_REQUIRED
          : !normalizedFromDate || !normalizedToDate
            ? "Nhập ngày theo định dạng ngày/tháng/năm, ví dụ 23/10/2026."
            : ADMIN_MESSAGES.REPORTS.INVALID_RANGE,
      );
      return;
    }
    setRangeError("");
    setActiveQuickRange(null);
    void router.push(
      { pathname: PATH_ADMIN.REPORTS, query: parsed.data },
      undefined,
      { shallow: true },
    );
  };

  const applyQuickRange = (key: QuickRange) => {
    if (!today) return;
    const range = getQuickRange(key, today);
    setFromDate(range.fromDate);
    setToDate(range.toDate);
    setFromDateInput(formatDateOnly(range.fromDate));
    setToDateInput(formatDateOnly(range.toDate));
    setActiveQuickRange(key);
    setRangeError("");
    void router.push({ pathname: PATH_ADMIN.REPORTS, query: range }, undefined, { shallow: true });
  };

  const useDefaultRange = () => {
    setRangeError("");
    setFromDate("");
    setToDate("");
    setFromDateInput("");
    setToDateInput("");
    setActiveQuickRange(null);
    void router.push(PATH_ADMIN.REPORTS, undefined, { shallow: true });
  };

  const finance = overview.data?.financialMetrics ?? [];
  const dailyUsage = overview.data?.operationalMetrics?.dailyAcceptedCupUsage ?? [];
  const rentalInvoices = (invoices.data ?? []).filter(
    (invoice) => invoice.type.toUpperCase() === "RENTAL",
  );
  const activePeriod = validRange
    ? formatRange(validRange.fromDate, validRange.toDate)
    : hasDateQuery && !rangeIsValid
      ? "Khoảng ngày không hợp lệ"
      : overview.data
      ? formatRange(overview.data.usagePeriodStart, overview.data.usagePeriodEnd) || "Chu kỳ mặc định của Dashboard"
      : overview.isPending
        ? "Đang tải chu kỳ mặc định…"
        : "Chu kỳ mặc định của Dashboard";

  return (
    <>
    <div className={styles.pageContent}>
      <div className={styles.pageHeading}>
        <h1>{ADMIN_MESSAGES.REPORTS.TITLE}</h1>
        <p>{ADMIN_MESSAGES.REPORTS.DESCRIPTION}</p>
      </div>

      <section className={styles.reportFilterPanel} aria-label="Bộ lọc kỳ báo cáo">
        <div className={styles.reportFilterHeader}>
          <div>
            <h2>Kỳ báo cáo</h2>
            <p>Chọn khoảng thời gian để xem số liệu.</p>
          </div>
          <div className={styles.reportActivePeriod} aria-live="polite">
            <span>Kỳ đang xem</span>
            <strong>{activePeriod}</strong>
          </div>
        </div>

        <div className={styles.reportQuickRanges} role="group" aria-label="Lọc nhanh theo thời gian">
          {quickRanges.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              aria-pressed={activeQuickRange === key}
              disabled={!today}
              onClick={() => applyQuickRange(key)}
            >
              {label}
            </button>
          ))}
        </div>

        <form id="report-range-form" className={styles.reportRangeForm} onSubmit={applyRange}>
          <div className={styles.reportRangeField}>
            <label htmlFor="report-from-date">{ADMIN_MESSAGES.REPORTS.FROM}</label>
            <div className={styles.reportDateControl}>
              <input
                id="report-from-date"
                type="text"
                inputMode="numeric"
                placeholder="dd/mm/yyyy"
                autoComplete="off"
                value={fromDateInput}
                aria-invalid={fromDateInput !== "" && !parseLocalizedDate(fromDateInput)}
                disabled={!today}
                onChange={(event) => {
                  const inputValue = event.target.value;
                  setFromDateInput(inputValue);
                  setFromDate(parseLocalizedDate(inputValue) ?? "");
                  setActiveQuickRange(null);
                  setRangeError("");
                }}
              />
              <label className={styles.reportCalendarPicker}>
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
          <div className={styles.reportRangeField}>
            <label htmlFor="report-to-date">{ADMIN_MESSAGES.REPORTS.TO}</label>
            <div className={styles.reportDateControl}>
              <input
                id="report-to-date"
                type="text"
                inputMode="numeric"
                placeholder="dd/mm/yyyy"
                autoComplete="off"
                value={toDateInput}
                aria-invalid={toDateInput !== "" && !parseLocalizedDate(toDateInput)}
                disabled={!today}
                onChange={(event) => {
                  const inputValue = event.target.value;
                  setToDateInput(inputValue);
                  setToDate(parseLocalizedDate(inputValue) ?? "");
                  setActiveQuickRange(null);
                  setRangeError("");
                }}
              />
              <label className={styles.reportCalendarPicker}>
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
          <div className={styles.reportRangeActions}>
            <button className={styles.reportApplyButton} type="submit" disabled={!today || overview.isFetching}>
              {ADMIN_MESSAGES.REPORTS.APPLY}
            </button>
            <button className={styles.reportDefaultButton} type="button" onClick={useDefaultRange}>
              {ADMIN_MESSAGES.REPORTS.ALL_PERIODS}
            </button>
          </div>
        </form>
        <p className={styles.reportFilterScope}>{ADMIN_MESSAGES.REPORTS.NOTE}</p>
        {rangeError && <p className={styles.accountInlineWarning} role="alert">{rangeError}</p>}
        {hasDateQuery && !rangeIsValid && (
          <p className={styles.accountInlineWarning} role="alert">{ADMIN_MESSAGES.REPORTS.INVALID_RANGE}</p>
        )}
      </section>

      <section className={styles.panel}>
        <h2>{ADMIN_MESSAGES.REPORTS.FINANCIAL}</h2>
        {overview.isPending && <p role="status">{ADMIN_MESSAGES.OVERVIEW.LOADING}</p>}
        {overview.isError && (
          <div className={[styles.notice, styles.errorNotice].join(" ")} role="alert">
            <p>{getApiErrorMessage(overview.error)}</p>
            <button type="button" onClick={() => void overview.refetch()}>{ADMIN_MESSAGES.REPORTS.RETRY}</button>
          </div>
        )}
        {overview.data && finance.length === 0 && (
          <p className={styles.emptyText}>{ADMIN_MESSAGES.REPORTS.NO_FINANCIAL}</p>
        )}
        {overview.data && finance.length > 0 && (
          <div className={styles.reportFinanceCurrencies}>
            {finance.map((metric, index) => (
              <div className={styles.reportCurrency} key={metric.currency || index}>
                <h3>{metric.currency || "Tiền tệ khác"}</h3>
                <div className={styles.reportFinanceMetrics}>
                  {[
                    { key: "issued", label: ADMIN_MESSAGES.OVERVIEW.ISSUED, value: metric.amountIssued },
                    { key: "collected", label: ADMIN_MESSAGES.OVERVIEW.COLLECTED, value: metric.amountCollected },
                    { key: "outstanding", label: ADMIN_MESSAGES.OVERVIEW.OUTSTANDING, value: metric.outstandingBalance },
                    { key: "overdue", label: ADMIN_MESSAGES.OVERVIEW.OVERDUE, value: metric.overdueBalance },
                  ].map(({ key, label, value }) => (
                    <div
                      className={[
                        styles.reportFinanceMetric,
                        key === "overdue" ? styles.reportFinanceMetricOverdue : undefined,
                      ].filter(Boolean).join(" ")}
                      key={key}
                    >
                      <span>{label}</span>
                      <strong>{displayAmount(value, metric.currency)}</strong>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className={styles.panel}>
        <h2>{ADMIN_MESSAGES.REPORTS.USAGE}</h2>
        {overview.data && (
          <p className={styles.panelSubtitle}>Kỳ dữ liệu: {activePeriod}</p>
        )}
        {overview.data && dailyUsage.length === 0 && (
          <p className={styles.emptyText}>{ADMIN_MESSAGES.OVERVIEW.NO_DAILY_DATA}</p>
        )}
        {overview.data && dailyUsage.length > 0 && (
          <DataTable
            variant="standard"
            className={styles.reportDailyTable}
            rows={dailyUsage}
            rowKey={(day, index) => `${day.date || "unknown"}-${index}`}
            columns={[
              { key: "date", header: ADMIN_MESSAGES.OVERVIEW.DATE, render: (day) => formatDateOnly(day.date) },
              { key: "cups", header: ADMIN_MESSAGES.OVERVIEW.CUP_COUNT, render: (day) => day.cups == null ? "—" : countFormatter.format(day.cups) },
            ]}
          />
        )}
      </section>

      <section id="rental-invoices" className={styles.panel}>
        <h2>{ADMIN_MESSAGES.REPORTS.INVOICES}</h2>
        {invoices.isPending && <p role="status">{ADMIN_MESSAGES.REPORTS.LOADING_INVOICES}</p>}
        {invoices.isError && (
          <div className={[styles.notice, styles.errorNotice].join(" ")} role="alert">
            <p>{getApiErrorMessage(invoices.error)}</p>
            <button type="button" onClick={() => void invoices.refetch()}>{ADMIN_MESSAGES.REPORTS.RETRY}</button>
          </div>
        )}
        {invoices.data && rentalInvoices.length === 0 && (
          <p className={styles.emptyText}>{ADMIN_MESSAGES.REPORTS.EMPTY_INVOICES}</p>
        )}
        {invoices.data && rentalInvoices.length > 0 && (
          <>
            <p className={styles.reportInvoiceHint}>Cuộn ngang để xem đầy đủ thông tin hóa đơn.</p>
            <DataTable
              className={styles.reportInvoiceTable}
              rows={rentalInvoices}
              rowKey={(invoice) => invoice.id}
              columns={[
                { key: "period", header: ADMIN_MESSAGES.REPORTS.INVOICE_PERIOD, render: (invoice) => invoice.period },
                { key: "owner", header: ADMIN_MESSAGES.REPORTS.OWNER_ID, render: (invoice) => invoice.ownerId },
                { key: "contract", header: ADMIN_MESSAGES.REPORTS.CONTRACT_ID, render: (invoice) => invoice.contractId },
                { key: "amount", header: ADMIN_MESSAGES.REPORTS.AMOUNT, render: (invoice) => displayAmount(invoice.amount, invoice.currency) },
                {
                  key: "status",
                  header: ADMIN_MESSAGES.REPORTS.STATUS,
                  render: (invoice) => (
                    <span className={[styles.reportStatus, styles[invoiceStatusClass(invoice.status)]].join(" ")}>
                      {invoiceStatusLabel(invoice.status)}
                    </span>
                  ),
                },
                { key: "created", header: ADMIN_MESSAGES.REPORTS.CREATED, render: (invoice) => formatDateTime(invoice.createdAt) },
              ]}
            />
          </>
        )}
      </section>
    </div>
    </>
  );
}

export default function AdminReportsPage() {
  return <AdminShell><ReportContent /></AdminShell>;
}
