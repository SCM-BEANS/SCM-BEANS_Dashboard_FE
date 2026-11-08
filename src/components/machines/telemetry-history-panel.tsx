import { useEffect, useMemo, useState, type FormEvent } from "react";
import { DataTable } from "@/components/table/data-table";
import type { TelemetryPoint } from "@/schema/telemetry.schema";
import styles from "./machines.module.css";

export type TelemetryRange = { from: string; to: string };
export type TelemetryRangePreset = "24h" | "7d" | "30d";

const fieldLabels: Record<string, { label: string; unit: string; group: string }> = {
  boiler_c: { label: "Nhiệt độ nồi hơi", unit: "°C", group: "Nhiệt độ" },
  boiler_sp_c: { label: "Nhiệt độ nồi hơi mục tiêu", unit: "°C", group: "Nhiệt độ" },
  thermoblock_c: { label: "Nhiệt độ bộ gia nhiệt", unit: "°C", group: "Nhiệt độ" },
  thermo_sp_c: { label: "Nhiệt độ bộ gia nhiệt mục tiêu", unit: "°C", group: "Nhiệt độ" },
  outlet_c: { label: "Nhiệt độ nước đầu ra", unit: "°C", group: "Nhiệt độ" },
  pressure_bar: { label: "Áp suất nước", unit: "bar", group: "Nước & bơm" },
  flow_in_mls: { label: "Lưu lượng nước vào", unit: "ml/giây", group: "Nước & bơm" },
  flow_out_mls: { label: "Lưu lượng nước ra", unit: "ml/giây", group: "Nước & bơm" },
  total_volume_in_ml: { label: "Thể tích nước vào tích lũy", unit: "ml", group: "Nước & bơm" },
  total_volume_out_ml: { label: "Thể tích nước ra tích lũy", unit: "ml", group: "Nước & bơm" },
  pump_pwm_pct: { label: "Mức điều khiển bơm", unit: "%", group: "Nước & bơm" },
  ads1115_ain0: { label: "Cảm biến áp suất — ADC thô", unit: "", group: "Nâng cao — cảm biến & điều khiển" },
  ads1115_ain1: { label: "Cảm biến analog — kênh 1", unit: "", group: "Nâng cao — cảm biến & điều khiển" },
  ads1115_ain2: { label: "Cảm biến analog — kênh 2", unit: "", group: "Nâng cao — cảm biến & điều khiển" },
  ads1115_ain3: { label: "Cảm biến analog — kênh 3", unit: "", group: "Nâng cao — cảm biến & điều khiển" },
  flowmeter_in_hz: { label: "Xung cảm biến nước vào", unit: "Hz", group: "Nâng cao — cảm biến & điều khiển" },
  flowmeter_out_hz: { label: "Xung cảm biến nước ra", unit: "Hz", group: "Nâng cao — cảm biến & điều khiển" },
  tamping_enc: { label: "Vị trí cơ cấu nén — encoder", unit: "", group: "Nâng cao — cảm biến & điều khiển" },
  carriage_enc: { label: "Vị trí cơ cấu di chuyển — encoder", unit: "", group: "Nâng cao — cảm biến & điều khiển" },
  solenoid_mask: { label: "Trạng thái van — bitmask", unit: "", group: "Nâng cao — cảm biến & điều khiển" },
  grinder_pwm: { label: "Điều khiển mô-tơ xay — PWM", unit: "", group: "Nâng cao — cảm biến & điều khiển" },
  triac_boiler_pct: { label: "Mức điều khiển gia nhiệt nồi hơi", unit: "%", group: "Nâng cao — cảm biến & điều khiển" },
  triac_thermo_pct: { label: "Mức điều khiển bộ gia nhiệt", unit: "%", group: "Nâng cao — cảm biến & điều khiển" },
};
const fieldGroups = ["Nhiệt độ", "Nước & bơm", "Trạng thái & dữ liệu khác", "Nâng cao — cảm biến & điều khiển"];
const fieldInfo = (field: string) => fieldLabels[field] ?? { label: field, unit: "", group: /^(ads1115_)|(_enc|_mask|_pwm|_hz)$/.test(field) ? fieldGroups[3]! : fieldGroups[2]! };
const fieldLabel = (field: string) => { const info = fieldInfo(field); return `${info.label}${info.unit ? ` (${info.unit})` : ""}`; };

export function createTelemetryRange(preset: TelemetryRangePreset, now = new Date()): TelemetryRange {
  const end = now.getTime();
  const duration = preset === "24h" ? 24 : preset === "7d" ? 24 * 7 : 24 * 30;
  return {
    from: new Date(end - duration * 60 * 60 * 1000).toISOString(),
    to: new Date(end).toISOString(),
  };
}

function toDateTimeLocal(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Ho_Chi_Minh", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(date);
  const part = (type: string) => parts.find((item) => item.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}T${part("hour")}:${part("minute")}`;
}

function fromDateTimeLocal(value: string) {
  if (!value) return null;
  const date = new Date(`${value}:00+07:00`);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function formatPointValue(value: unknown) {
  if (value == null) return "—";
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return String(value);
  try {
    return JSON.stringify(value);
  } catch {
    return "Không thể hiển thị giá trị";
  }
}

function formatPointTime(value: string) {
  const timestamp = Date.parse(value);
  return Number.isNaN(timestamp)
    ? value
    : new Intl.DateTimeFormat("vi-VN", { dateStyle: "short", timeStyle: "short", timeZone: "Asia/Ho_Chi_Minh" }).format(timestamp);
}

function formatAxisValue(value: number) {
  const magnitude = Math.abs(value);
  return new Intl.NumberFormat("vi-VN", {
    maximumSignificantDigits: 6,
    notation: magnitude !== 0 && (magnitude < 0.001 || magnitude >= 1_000_000) ? "scientific" : "standard",
  }).format(value);
}

export function TelemetryHistoryPanel({
  range,
  onRangeChange,
  points,
  loading,
  error,
  onRetry,
  hasMore,
  loadingMore,
  onLoadMore,
  selectedField: controlledField,
  onFieldChange,
}: {
  range: TelemetryRange | null;
  onRangeChange: (range: TelemetryRange) => void;
  points: TelemetryPoint[];
  loading: boolean;
  error?: string;
  onRetry?: () => void;
  hasMore?: boolean;
  loadingMore?: boolean;
  onLoadMore?: () => void;
  selectedField?: string;
  onFieldChange?: (field: string) => void;
}) {
  const [fromInput, setFromInput] = useState("");
  const [toInput, setToInput] = useState("");
  const [selectedField, setSelectedField] = useState("");
  const [rangeError, setRangeError] = useState("");
  const [editingRange, setEditingRange] = useState(false);
  const [view, setView] = useState<"chart" | "table">("chart");
  const duration = range ? Date.parse(range.to) - Date.parse(range.from) : 0;
  const activePreset = editingRange ? "custom" : duration === 86_400_000 ? "24h" : duration === 7 * 86_400_000 ? "7d" : duration === 30 * 86_400_000 ? "30d" : "custom";

  useEffect(() => {
    if (!range) return;
    setFromInput(toDateTimeLocal(range.from));
    setToInput(toDateTimeLocal(range.to));
    setEditingRange(false);
  }, [range]);

  const orderedPoints = useMemo(
    () => [...points].sort((left, right) => Date.parse(left.timestamp) - Date.parse(right.timestamp)),
    [points],
  );
  const fields = useMemo(() => [...new Set(orderedPoints.map((point) => point.field))].sort(), [orderedPoints]);
  const preferredField = controlledField ?? selectedField;
  const field = fields.includes(preferredField) ? preferredField : fields.find((name) => fieldInfo(name).group === "Nhiệt độ") ?? fields.find((name) => fieldInfo(name).group !== fieldGroups[3]) ?? fields[0] ?? "";
  const numericPoints = orderedPoints.filter((point) => point.field === field && typeof point.value === "number" && Number.isFinite(point.value));
  const chartSource = numericPoints.slice(-500);
  const chartMin = chartSource.reduce((minimum, point) => Math.min(minimum, point.value as number), Number.POSITIVE_INFINITY);
  const chartMax = chartSource.reduce((maximum, point) => Math.max(maximum, point.value as number), Number.NEGATIVE_INFINITY);
  const chartStart = chartSource.length ? Date.parse(chartSource[0]!.timestamp) : 0;
  const chartEnd = chartSource.length ? Date.parse(chartSource[chartSource.length - 1]!.timestamp) : 0;
  const chartCoordinates = chartSource.map((point) => {
    const x = chartEnd === chartStart ? 500 : ((Date.parse(point.timestamp) - chartStart) / (chartEnd - chartStart)) * 1000;
    const y = chartMax === chartMin ? 100 : 180 - (((point.value as number) - chartMin) / (chartMax - chartMin)) * 160;
    return { x, y };
  });
  const chartPoints = chartCoordinates.map(({ x, y }) => `${x},${y}`).join(" ");

  const selectPreset = (preset: TelemetryRangePreset) => {
    const nextRange = createTelemetryRange(preset);
    setEditingRange(false);
    setRangeError("");
    onRangeChange(nextRange);
  };

  const submitCustomRange = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const from = fromDateTimeLocal(fromInput);
    const to = fromDateTimeLocal(toInput);
    if (!from || !to || Date.parse(from) >= Date.parse(to)) {
      setRangeError("Ngày bắt đầu phải sớm hơn ngày kết thúc.");
      return;
    }
    if (Date.parse(to) - Date.parse(from) > 30 * 86_400_000) {
      setRangeError("Khoảng dữ liệu tối đa 30 ngày.");
      return;
    }
    setEditingRange(false);
    setRangeError("");
    onRangeChange({ from, to });
  };

  return (
    <div className={styles.telemetryHistory}>
      <div className={styles.telemetryRangePresets} role="group" aria-label="Chọn khoảng thời gian telemetry">
        <button type="button" aria-pressed={activePreset === "24h"} onClick={() => selectPreset("24h")}>24 giờ</button>
        <button type="button" aria-pressed={activePreset === "7d"} onClick={() => selectPreset("7d")}>7 ngày</button>
        <button type="button" aria-pressed={activePreset === "30d"} onClick={() => selectPreset("30d")}>30 ngày</button>
      </div>
      <form className={styles.telemetryRangeForm} onSubmit={submitCustomRange}>
        <label>Từ ngày và giờ (UTC+7)<input type="datetime-local" required value={fromInput} onChange={(event) => { setFromInput(event.target.value); setEditingRange(true); }} /></label>
        <label>Đến ngày và giờ (UTC+7)<input type="datetime-local" required value={toInput} onChange={(event) => { setToInput(event.target.value); setEditingRange(true); }} /></label>
        <button type="submit">Áp dụng khoảng thời gian</button>
      </form>
      {rangeError ? <p className={styles.telemetryRangeError} role="alert">{rangeError}</p> : null}
      {range ? <p className={styles.telemetryRangeCaption}>Dữ liệu từ {formatPointTime(range.from)} đến {formatPointTime(range.to)} · tối đa 100 điểm mỗi lần tải.</p> : null}
      {loading ? <p role="status">Đang tải lịch sử thông số…</p> : null}
      {error ? <div className={styles.telemetryError} role="alert"><p>{error}</p>{onRetry ? <button type="button" onClick={onRetry}>Thử lại</button> : null}</div> : null}
      {!loading && !error && orderedPoints.length === 0 && range ? <p className={styles.monitoringEmpty} role="status">Chưa có thông số trong khoảng thời gian này.</p> : null}
      {orderedPoints.length > 0 ? <>
        <p className={styles.telemetryRangeCaption}>Dữ liệu đã tải: {orderedPoints.length.toLocaleString("vi-VN")} điểm · {formatPointTime(orderedPoints[0]!.timestamp)} – {formatPointTime(orderedPoints[orderedPoints.length - 1]!.timestamp)} (giờ Việt Nam){hasMore ? " · còn dữ liệu chưa tải" : ""}.</p>
        <div className={styles.monitoringChartToolbar}>
        {fields.length > 0 ? <label className={styles.telemetryFieldSelector}>Thông số đang xem
          <select value={field} onChange={(event) => { setSelectedField(event.target.value); onFieldChange?.(event.target.value); }}>
            {fieldGroups.map((group) => {
              const names = fields.filter((name) => fieldInfo(name).group === group);
              return names.length ? <optgroup key={group} label={group}>{names.map((name) => <option key={name} value={name}>{fieldLabel(name)}</option>)}</optgroup> : null;
            })}
          </select>
        </label> : null}
        <div className={styles.telemetryRangePresets} role="group" aria-label="Cách xem thông số"><button type="button" aria-pressed={view === "chart"} onClick={() => setView("chart")}>Biểu đồ</button><button type="button" aria-pressed={view === "table"} onClick={() => setView("table")}>Bảng dữ liệu</button></div>
        </div>
        {fieldInfo(field).group === fieldGroups[3] ? <p className={styles.telemetryRangeCaption}>Thông số nâng cao · {field}. Dùng để chẩn đoán kỹ thuật, không dùng để đếm ly.</p> : null}
        {field.startsWith("total_volume_") ? <p className={styles.telemetryRangeCaption}>Thể tích nước không phải số ly pha chế.</p> : null}
        {view === "chart" && numericPoints.length > 0 ? <>
        <dl className={styles.monitoringMetricStrip}>
          <div><dt>Gần nhất trong dữ liệu đã tải</dt><dd>{formatPointValue(numericPoints[numericPoints.length - 1]!.value)}</dd></div>
          <div><dt>Thấp nhất · biểu đồ</dt><dd>{formatPointValue(chartMin)}</dd></div>
          <div><dt>Cao nhất · biểu đồ</dt><dd>{formatPointValue(chartMax)}</dd></div>
        </dl>
        <figure className={styles.telemetryChart}>
          <figcaption>{fieldLabel(field)} theo thời gian{numericPoints.length > chartSource.length ? " · 500 điểm mới nhất" : ""}</figcaption>
          <svg viewBox="-85 0 1100 205" role="img" aria-label={`Biểu đồ ${field} theo thời gian`}>
            {[20, 100, 180].map((y, index) => <g key={y}><line x1="0" y1={y} x2="1000" y2={y} /><text x="-12" y={y + 4} textAnchor="end">{formatAxisValue(chartMax === chartMin ? chartMin : chartMax - index * (chartMax - chartMin) / 2)}</text></g>)}
            {chartSource.length === 1
              ? <circle cx="500" cy="100" r="6" />
              : <polyline points={chartPoints} />}
            {chartSource.length > 1 ? chartSource.map((point, index) => <circle key={`${point.timestamp}-${index}`} cx={chartCoordinates[index]!.x} cy={chartCoordinates[index]!.y} r="4" aria-label={`${formatPointTime(point.timestamp)}: ${formatPointValue(point.value)}`}><title>{`${formatPointTime(point.timestamp)} · ${formatPointValue(point.value)}`}</title></circle>) : null}
          </svg>
          <div><span>{formatPointTime(chartSource[0]!.timestamp)}</span><span>{formatPointTime(chartSource[chartSource.length - 1]!.timestamp)}</span></div>
        </figure></> : view === "chart" ? <p className={styles.monitoringEmpty} role="status">Thông số này không phải dữ liệu số. Chọn Bảng dữ liệu để xem nội dung.</p> : null}
        {view === "table" ? <><p className={styles.telemetryRecordsLabel}>Bản ghi theo thời gian · {field}</p>
        <DataTable
          headerVariant="admin"
          rows={orderedPoints.filter((point) => point.field === field)}
          rowKey={(point, index) => `${point.timestamp}-${point.field}-${index}`}
          columns={[
            { key: "time", header: "Thời điểm", render: (point) => formatPointTime(point.timestamp) },
            { key: "field", header: "Thông số", render: (point) => <span title={point.field}>{fieldLabel(point.field)}</span> },
            { key: "value", header: "Giá trị", render: (point) => formatPointValue(point.value) },
            { key: "sub-state", header: "Trạng thái", render: (point) => point.subState ?? "—" },
          ]}
        /></> : null}
        {hasMore && onLoadMore ? <button type="button" className={styles.telemetryLoadMore} disabled={loadingMore} onClick={onLoadMore}>{loadingMore ? "Đang tải…" : "Tải thêm dữ liệu"}</button> : null}
      </> : null}
    </div>
  );
}
