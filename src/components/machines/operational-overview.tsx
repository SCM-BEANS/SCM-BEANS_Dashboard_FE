import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  DASHBOARD_BUSINESS_TIME_ZONE,
  DashboardDateRangeSchema,
  type TDashboardOverview,
} from "@/schema/dashboard.schema";
import styles from "./machines.module.css";

export type OperationalDateRange = { fromDate: string; toDate: string };
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
