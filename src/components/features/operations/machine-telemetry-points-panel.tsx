import { useInfiniteQuery } from "@tanstack/react-query";
import { useState } from "react";
import { telemetryApi, TELEMETRY_POINTS_PAGE_SIZE } from "@/apis/telemetry.api";
import { ButtonBar } from "@/components/button/button-bar";
import { DataTable } from "@/components/table/data-table";
import { getApiErrorMessage } from "@/lib/api-errors";
import { authScopedQuerySubject } from "@/lib/query-subject";
import styles from "./action-items-panel.module.css";

type Role = "OWNER" | "TECHNICIAN";
type Range = { from: string; to: string };
const TELEMETRY_MAX_OFFSET = 100_000;

function formatTimestamp(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium", timeStyle: "medium" }).format(date);
}

function displayValue(value: unknown) {
  if (value == null) return "—";
  return typeof value === "object" ? JSON.stringify(value) : String(value);
}

export function MachineTelemetryPointsPanel({ machineId, role }: { machineId: string; role: Role }) {
  const [range, setRange] = useState<Range | null>(null);
  const points = useInfiniteQuery({
    queryKey: ["dolores", "telemetry", "points", role, authScopedQuerySubject(role), machineId, range],
    queryFn: ({ pageParam, signal }) => {
      if (!range) throw new Error("Chọn khoảng thời gian trước khi đọc telemetry.");
      return telemetryApi.listMachinePoints(machineId, range, pageParam, signal);
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage, pages) => {
      const nextOffset = pages.length * TELEMETRY_POINTS_PAGE_SIZE;
      return lastPage.length === TELEMETRY_POINTS_PAGE_SIZE && nextOffset <= TELEMETRY_MAX_OFFSET
        ? nextOffset
        : undefined;
    },
    enabled: Boolean(range),
    retry: false,
  });
  const rows = points.data?.pages.flat() ?? [];

  const loadRecentPoints = () => {
    const to = new Date();
    const from = new Date(to.getTime() - 24 * 60 * 60 * 1000);
    setRange({ from: from.toISOString(), to: to.toISOString() });
  };

  return (
    <section className={styles.panel} aria-labelledby={`telemetry-points-${machineId}`}>
      <div className={styles.header}>
        <div>
          <h2 id={`telemetry-points-${machineId}`}>Dữ liệu telemetry</h2>
          <p>Đọc tối đa {TELEMETRY_POINTS_PAGE_SIZE} điểm mỗi lần trong 24 giờ gần nhất. Dữ liệu chỉ tải khi bạn yêu cầu.</p>
        </div>
        <ButtonBar type="button" disabled={points.isFetching} onClick={loadRecentPoints}>
          {points.isFetching ? "Đang tải…" : range ? "Tải lại 24 giờ gần nhất" : "Tải 24 giờ gần nhất"}
        </ButtonBar>
      </div>
      {points.isError && <p className={`${styles.notice} ${styles.error}`} role="alert">{getApiErrorMessage(points.error)}</p>}
      {range && rows.length === 0 && !points.isFetching && !points.isError && (
        <p className={styles.notice} role="status">Không có điểm telemetry trong khoảng thời gian này.</p>
      )}
      {rows.length > 0 && (
        <>
          <DataTable
            variant={role === "OWNER" ? "customer" : "standard"}
            rows={rows}
            rowKey={(point, index) => `${point.timestamp}:${point.field}:${index}`}
            columns={[
              { key: "time", header: "Thời điểm", render: (point) => formatTimestamp(point.timestamp) },
              { key: "field", header: "Chỉ số", render: (point) => point.field },
              { key: "value", header: "Giá trị", render: (point) => displayValue(point.value) },
              { key: "state", header: "Trạng thái máy", render: (point) => point.subState ?? "—" },
            ]}
          />
          {points.hasNextPage && (
            <div className={styles.pagination}>
              <span>Đã tải {rows.length} điểm</span>
              <ButtonBar type="button" disabled={points.isFetchingNextPage} onClick={() => void points.fetchNextPage()}>
                {points.isFetchingNextPage ? "Đang tải…" : "Tải thêm"}
              </ButtonBar>
            </div>
          )}
        </>
      )}
    </section>
  );
}
