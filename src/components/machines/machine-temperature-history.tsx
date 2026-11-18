import { useMemo, useState } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { telemetryApi, TELEMETRY_POINTS_PAGE_SIZE } from "@/apis/telemetry.api";
import { ButtonBar } from "@/components/button/button-bar";
import { getApiErrorMessage } from "@/lib/api-errors";
import type { TelemetryPoint } from "@/schema/telemetry.schema";
import styles from "./machine-health.module.css";

const hour = 3_600_000;
const day = 24 * hour;
const vietnamOffset = 7 * hour;
const windows = { "24h": 1, "7d": 7, "14d": 14 } as const;
type Window = keyof typeof windows;
type Reading = { sum: number; count: number };
const timeWindow = (period: Window) => {
  const now = Date.now();
  return { period, from: new Date(now - windows[period] * day).toISOString(), to: new Date(now).toISOString() };
};

const chartDate = new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit", timeZone: "Asia/Ho_Chi_Minh" });
const chartHour = new Intl.DateTimeFormat("vi-VN", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Ho_Chi_Minh" });
const tooltipTime = new Intl.DateTimeFormat("vi-VN", { dateStyle: "short", timeStyle: "short", timeZone: "Asia/Ho_Chi_Minh" });

function bucketTemperatures(points: TelemetryPoint[], from: string, to: string, interval: number) {
  const start = Date.parse(from);
  const end = Date.parse(to);
  const floorTime = (time: number) => Math.floor((time + vietnamOffset) / interval) * interval - vietnamOffset;
  const byInterval = new Map<number, { measured?: Reading; target?: Reading }>();
  for (const { field, timestamp, value } of points) {
    const key = field === "boiler_c" ? "measured" : field === "boiler_sp_c" ? "target" : null;
    const time = Date.parse(timestamp);
    if (!key || typeof value !== "number" || !Number.isFinite(value) || time < start || time > end) continue;
    const bucketTime = floorTime(time);
    const bucket = byInterval.get(bucketTime) ?? {};
    const current = bucket[key];
    bucket[key] = { sum: (current?.sum ?? 0) + value, count: (current?.count ?? 0) + 1 };
    byInterval.set(bucketTime, bucket);
  }
  const rows = [];
  for (let time = floorTime(start); time <= end; time += interval) {
    const { measured, target } = byInterval.get(time) ?? {};
    rows.push({ time, measured: measured ? measured.sum / measured.count : null, target: target ? target.sum / target.count : null });
  }
  return rows;
}

export function MachineTemperatureHistory({ machineId, subject }: { machineId: string; subject: string }) {
  const [range, setRange] = useState(() => timeWindow("24h"));
  const query = useInfiniteQuery({
    queryKey: ["machine-health-temperature", subject, machineId, range.from, range.to],
    queryFn: ({ pageParam, signal }) => telemetryApi.listMachinePoints(machineId, range, pageParam, signal),
    initialPageParam: 0,
    getNextPageParam: (last, pages) => {
      const offset = pages.length * TELEMETRY_POINTS_PAGE_SIZE;
      return last.length === TELEMETRY_POINTS_PAGE_SIZE && offset <= 100_000 ? offset : undefined;
    },
    staleTime: 30_000,
    retry: false,
    refetchOnWindowFocus: false,
  });
  const interval = range.period === "24h" ? hour : day;
  const rows = useMemo(() => bucketTemperatures(query.data?.pages.flat() ?? [], range.from, range.to, interval),
    [query.data, range.from, range.to, interval]);
  const hasReadings = rows.some(row => row.measured != null || row.target != null);
  const timeLabel = range.period === "24h" ? chartHour : chartDate;
  const lastPage = query.data?.pages.at(-1);
  const reachedPageLimit = lastPage?.length === TELEMETRY_POINTS_PAGE_SIZE && !query.hasNextPage;

  return <figure className={styles.temperature} aria-label="Biểu đồ nhiệt độ nồi hơi">
    <figcaption className={styles.temperatureHeader}>
      <span><strong>Nhiệt độ nồi hơi</strong><small>Trung bình theo {interval === hour ? "giờ" : "ngày"} · Giờ Việt Nam</small></span>
      <select aria-label="Khoảng xem nhiệt độ" value={range.period} onChange={event => setRange(timeWindow(event.target.value as Window))}>
        <option value="24h">24 giờ</option><option value="7d">7 ngày</option><option value="14d">14 ngày</option>
      </select>
    </figcaption>
    {query.isPending && <p role="status">Đang tải lịch sử nhiệt độ…</p>}
    {query.isError && <div className={styles.temperatureActions} role="alert">
      <span>{getApiErrorMessage(query.error)}</span>
      {query.isFetchNextPageError
        ? <ButtonBar onClick={() => void query.fetchNextPage()}>Thử tải thêm</ButtonBar>
        : <ButtonBar onClick={() => void query.refetch()}>Thử lại</ButtonBar>}
    </div>}
    {hasReadings && <div className={styles.temperatureChart}>
      <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 300, height: 225 }}>
        <LineChart data={rows} accessibilityLayer margin={{ top: 8, right: 12, bottom: 4 }}>
          <CartesianGrid stroke="#e9e2dc" vertical={false} />
          <XAxis dataKey="time" tickFormatter={value => timeLabel.format(value)} minTickGap={24} tick={{ fontSize: 12 }} />
          <YAxis width={50} unit=" °C" domain={["auto", "auto"]} tick={{ fontSize: 12 }} />
          <Tooltip labelFormatter={value => tooltipTime.format(Number(value))} formatter={value => `${Number(value).toFixed(1)} °C`} />
          <Legend />
          <Line name="Đo được" dataKey="measured" stroke="#b81724" strokeWidth={2} dot={{ r: 2 }} isAnimationActive={false} />
          <Line name="Mục tiêu đã ghi nhận" dataKey="target" stroke="#526575" strokeWidth={2} strokeDasharray="5 4" dot={{ r: 2 }} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>}
    {!hasReadings && query.isSuccess && <p className={styles.muted}>Chưa có điểm đo nhiệt độ trong dữ liệu đã tải.</p>}
    {(query.hasNextPage || reachedPageLimit) && <div className={styles.temperatureActions}>
      <small className={styles.muted}>{reachedPageLimit ? "Đã tới giới hạn tải cho khoảng này. Chọn khoảng ngắn hơn để xem thêm chi tiết." : "Còn dữ liệu trong khoảng đã chọn."}</small>
      {query.hasNextPage && !query.isFetchNextPageError && <ButtonBar disabled={query.isFetching} onClick={() => void query.fetchNextPage()}>
        {query.isFetchingNextPage ? "Đang tải…" : "Tải thêm điểm đo"}
      </ButtonBar>}
    </div>}
  </figure>;
}
