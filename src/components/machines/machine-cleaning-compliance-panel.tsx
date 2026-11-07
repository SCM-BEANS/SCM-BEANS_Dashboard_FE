import { ButtonBar } from "@/components/button/button-bar";
import type { MachineCleaningCompliance } from "@/schema/machines.schema";
import { SmartIotPanel } from "./smart-iot-panel";
import styles from "./machines.module.css";

export function MachineCleaningCompliancePanel({ data, days, loading, refreshing, error, onDaysChange, onRefresh }: {
  data?: MachineCleaningCompliance;
  days: number;
  loading: boolean;
  refreshing: boolean;
  error?: string;
  onDaysChange: (days: number) => void;
  onRefresh: () => void;
}) {
  const presets = [7, 30, 90];
  const periods = presets.includes(days) ? presets : [...presets, days];
  const metrics = data ? [
    ["Tỷ lệ đạt chuẩn", `${new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 1 }).format(data.compliance_percentage)}%`],
    ["Ngày đạt chuẩn", `${data.compliant_days.toLocaleString("vi-VN")} / ${data.evaluated_days.toLocaleString("vi-VN")}`],
    ["Thiếu vệ sinh đầu ca", `${data.missing_startup_days.toLocaleString("vi-VN")} ngày`],
    ["Thiếu vệ sinh cuối ca", `${data.missing_closing_days.toLocaleString("vi-VN")} ngày`],
  ] : [];

  return <SmartIotPanel title="Tuân thủ vệ sinh">
    <div className={styles.monitoringChartToolbar}>
      <label className={styles.telemetryFieldSelector}>Khoảng đánh giá vệ sinh
        <select aria-label="Khoảng đánh giá vệ sinh" value={days} onChange={(event) => onDaysChange(Number(event.target.value))}>
          {periods.map((period) => <option key={period} value={period}>{period} ngày</option>)}
        </select>
      </label>
      <ButtonBar disabled={loading || refreshing} onClick={onRefresh}>{refreshing ? "Đang cập nhật…" : "Làm mới"}</ButtonBar>
    </div>
    {error ? <div className={styles.telemetryError} role="alert"><p>{error}</p><ButtonBar onClick={onRefresh}>Thử lại</ButtonBar></div>
      : loading ? <p role="status">Đang tải đánh giá vệ sinh…</p>
        : data ? <>
          <p className={styles.telemetryRangeCaption}>Đánh giá {data.evaluated_days.toLocaleString("vi-VN")} ngày theo UTC, độc lập với bộ lọc lịch sử vệ sinh.</p>
          <div className={styles.operationalMetricGrid}>
            {metrics.map(([label, value]) => <article className={styles.operationalMetricCard} key={label}><span>{label}</span><strong>{value}</strong></article>)}
          </div>
          {data.flagged_dates.length > 0 ? <details>
            <summary>Các ngày cần kiểm tra ({data.flagged_dates.length})</summary>
            <ul className={styles.ownerCleaningFlags}>
              {data.flagged_dates.map((date) => <li key={date}><time dateTime={date}>{new Intl.DateTimeFormat("vi-VN", { timeZone: "UTC", dateStyle: "short" }).format(new Date(`${date}T00:00:00Z`))}</time></li>)}
            </ul>
          </details> : <p className={styles.telemetryRangeCaption}>Không có ngày cần kiểm tra trong kỳ đánh giá.</p>}
        </> : <p role="status">Chưa có kết quả đánh giá vệ sinh.</p>}
  </SmartIotPanel>;
}
