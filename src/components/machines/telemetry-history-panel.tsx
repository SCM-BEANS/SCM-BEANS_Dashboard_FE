import { useEffect, useMemo, useState, type FormEvent } from "react";
import { DataTable } from "@/components/table/data-table";
import type { TelemetryPoint } from "@/schema/telemetry.schema";
import styles from "./machines.module.css";

export type TelemetryRange = { from: string; to: string };
export type TelemetryRangePreset = "24h" | "7d" | "30d";

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
  const pad = (part: number) => String(part).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function fromDateTimeLocal(value: string) {
  if (!value) return null;
  const date = new Date(value);
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
    : new Intl.DateTimeFormat("vi-VN", { dateStyle: "short", timeStyle: "short" }).format(timestamp);
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
}) {
  const [fromInput, setFromInput] = useState("");
  const [toInput, setToInput] = useState("");
  const [selectedField, setSelectedField] = useState("");
  const [rangeError, setRangeError] = useState("");
  const [activePreset, setActivePreset] = useState<TelemetryRangePreset | "custom" | null>("24h");

  useEffect(() => {
    if (!range) return;
    setFromInput(toDateTimeLocal(range.from));
    setToInput(toDateTimeLocal(range.to));
  }, [range]);

  const orderedPoints = useMemo(
    () => [...points].sort((left, right) => Date.parse(left.timestamp) - Date.parse(right.timestamp)),
    [points],
  );
  const fields = useMemo(() => [...new Set(orderedPoints.map((point) => point.field))].sort(), [orderedPoints]);
  const field = fields.includes(selectedField) ? selectedField : fields[0] ?? "";
  const numericPoints = orderedPoints.filter((point) => point.field === field && typeof point.value === "number" && Number.isFinite(point.value));
  const chartSource = numericPoints.slice(-500);
  const chartMin = chartSource.reduce((minimum, point) => Math.min(minimum, point.value as number), Number.POSITIVE_INFINITY);
  const chartMax = chartSource.reduce((maximum, point) => Math.max(maximum, point.value as number), Number.NEGATIVE_INFINITY);
  const chartPoints = chartSource.map((point, index) => {
    const x = chartSource.length === 1 ? 500 : (index / (chartSource.length - 1)) * 1000;
    const y = chartMax === chartMin ? 100 : 180 - (((point.value as number) - chartMin) / (chartMax - chartMin)) * 160;
    return `${x},${y}`;
  }).join(" ");

  const selectPreset = (preset: TelemetryRangePreset) => {
    const nextRange = createTelemetryRange(preset);
    setActivePreset(preset);
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
    setActivePreset("custom");
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
        <label>Từ ngày và giờ<input type="datetime-local" required value={fromInput} onChange={(event) => { setFromInput(event.target.value); setActivePreset("custom"); }} /></label>
        <label>Đến ngày và giờ<input type="datetime-local" required value={toInput} onChange={(event) => { setToInput(event.target.value); setActivePreset("custom"); }} /></label>
        <button type="submit">Áp dụng khoảng thời gian</button>
      </form>
      {rangeError ? <p className={styles.telemetryRangeError} role="alert">{rangeError}</p> : null}
      {range ? <p className={styles.telemetryRangeCaption}>Dữ liệu từ {formatPointTime(range.from)} đến {formatPointTime(range.to)} · tối đa 100 điểm mỗi lần tải.</p> : null}
      {loading ? <p role="status">Đang tải dữ liệu telemetry…</p> : null}
      {error ? <div className={styles.telemetryError} role="alert"><p>{error}</p>{onRetry ? <button type="button" onClick={onRetry}>Thử lại</button> : null}</div> : null}
      {!loading && !error && orderedPoints.length === 0 && range ? <p role="status">Không có dữ liệu telemetry trong khoảng đã chọn.</p> : null}
      {orderedPoints.length > 0 ? <>
        {fields.length > 0 ? <label className={styles.telemetryFieldSelector}>Trường dữ liệu
          <select value={field} onChange={(event) => setSelectedField(event.target.value)}>
            {fields.map((fieldName) => <option key={fieldName} value={fieldName}>{fieldName}</option>)}
          </select>
        </label> : null}
        {numericPoints.length > 0 ? <figure className={styles.telemetryChart}>
          <figcaption>Giá trị số theo thời gian · {field}{numericPoints.length > chartSource.length ? " · 500 điểm mới nhất" : ""}</figcaption>
          <svg viewBox="0 0 1000 200" role="img" aria-label={`Biểu đồ ${field} theo thời gian`} preserveAspectRatio="none">
            <line x1="0" y1="180" x2="1000" y2="180" />
            {chartSource.length === 1
              ? <circle cx="500" cy="100" r="6" />
              : <polyline points={chartPoints} />}
          </svg>
          <div><span>{formatPointTime(chartSource[0]!.timestamp)}</span><span>{formatPointTime(chartSource[chartSource.length - 1]!.timestamp)}</span></div>
        </figure> : <p role="status">Trường này không có giá trị số để vẽ biểu đồ.</p>}
        <p className={styles.telemetryRecordsLabel}>Bản ghi theo thời gian</p>
        <DataTable
          headerVariant="admin"
          rows={orderedPoints}
          rowKey={(point, index) => `${point.timestamp}-${point.field}-${index}`}
          columns={[
            { key: "time", header: "Thời điểm", render: (point) => formatPointTime(point.timestamp) },
            { key: "field", header: "Trường", render: (point) => point.field },
            { key: "value", header: "Giá trị", render: (point) => formatPointValue(point.value) },
            { key: "sub-state", header: "Trạng thái", render: (point) => point.subState ?? "—" },
          ]}
        />
        {hasMore && onLoadMore ? <button type="button" className={styles.telemetryLoadMore} disabled={loadingMore} onClick={onLoadMore}>{loadingMore ? "Đang tải…" : "Tải thêm dữ liệu"}</button> : null}
      </> : null}
    </div>
  );
}
