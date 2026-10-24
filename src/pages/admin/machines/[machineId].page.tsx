import { useRouter } from "next/router";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { useMemo, useState, type FormEvent } from "react";
import { machinesApi } from "@/apis/machines.api";
import { getApiErrorMessage } from "@/lib/api-errors";
import { TELEMETRY_POINTS_PAGE_SIZE, telemetryApi } from "@/apis/telemetry.api";
import { ButtonBar } from "@/components/button/button-bar";
import { DataTable } from "@/components/table/data-table";
import { PATH_ADMIN } from "@/routes/path";
import { MachineIdSchema } from "@/schema/machines.schema";
import { ADMIN_OPERATIONS_MESSAGES as T } from "@/text/admin/admin-operations-messages";
import { AdminActionBar } from "@/components/action-bar/admin-action-bar";
import { AdminShell, adminStyles as styles } from "../admin-shell";

type Range = { from: string; to: string };

const STATUS_LABELS: Record<string, string> = {
  IN_WAREHOUSE: "Trong kho",
  PENDING_ACTIVATION: "Chờ kích hoạt",
  DEPLOYED_CONTRACT_OWNER: "Đang triển khai · Owner hợp đồng",
  DEPLOYED_STORE_OWNER: "Đang triển khai · Owner cửa hàng",
  UNDER_MAINTENANCE: "Đang bảo trì",
  REFURBISHING: "Đang tân trang",
  PENDING_QA: "Chờ kiểm định",
  AVAILABLE_FOR_RENT: "Sẵn sàng cho thuê",
  RETIRED: "Đã ngừng sử dụng",
};

function formatDate(value: string | null | undefined, time = false): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("vi-VN", time ? { dateStyle: "medium", timeStyle: "short" } : { dateStyle: "medium" }).format(date);
}

function formatNumber(value: number | null | undefined): string {
  return value === null || value === undefined ? "—" : new Intl.NumberFormat("vi-VN").format(value);
}

function localInputValue(date: Date): string {
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return localDate.toISOString().slice(0, 16);
}

function inputToIso(value: string): string | null {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function formatTelemetryValue(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return String(value);
  try { return JSON.stringify(value); } catch { return "[không thể hiển thị]"; }
}

function MachineDetailContent() {
  const router = useRouter();
  const machineId = typeof router.query.machineId === "string" ? router.query.machineId : "";
  const validId = router.isReady && MachineIdSchema.safeParse(machineId).success;
  const [fromInput, setFromInput] = useState("");
  const [toInput, setToInput] = useState("");
  const [range, setRange] = useState<Range | null>(null);
  const [rangeError, setRangeError] = useState("");

  const machine = useQuery({
    queryKey: ["dolores", "machines", "detail", machineId],
    queryFn: ({ signal }) => machinesApi.getById(machineId, signal),
    enabled: validId,
  });
  const schedule = useQuery({
    queryKey: ["dolores", "machines", "maintenance-schedule", machineId],
    queryFn: ({ signal }) => machinesApi.getMaintenanceSchedule(machineId, signal),
    enabled: validId && Boolean(machine.data),
  });
  const isSmartIot = machine.data?.machineType === "SMART_IOT";
  const heartbeat = useQuery({
    queryKey: ["dolores", "telemetry", "heartbeat", machineId],
    queryFn: ({ signal }) => telemetryApi.getLatestHeartbeat(machineId, signal),
    enabled: validId && isSmartIot,
  });
  const points = useInfiniteQuery({
    queryKey: ["dolores", "telemetry", "points", machineId, range?.from, range?.to],
    queryFn: ({ signal, pageParam }) => {
      if (!range) throw new Error("A telemetry time range is required.");
      return telemetryApi.listMachinePoints(machineId, range, pageParam, signal);
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      const nextOffset = allPages.length * TELEMETRY_POINTS_PAGE_SIZE;
      return lastPage.length === TELEMETRY_POINTS_PAGE_SIZE && nextOffset <= 100_000 ? nextOffset : undefined;
    },
    enabled: validId && isSmartIot && range !== null,
  });
  const telemetryPoints = useMemo(() => points.data?.pages.flatMap((page) => page) ?? [], [points.data]);
  const refresh = () => {
    void Promise.all([
      machine.refetch(),
      schedule.refetch(),
      isSmartIot ? heartbeat.refetch() : Promise.resolve(),
    ]);
  };
  const actionBar = (showRefresh: boolean) => (
    <AdminActionBar>
      {validId && <ButtonBar href={PATH_ADMIN.IOT}>{T.MACHINES.VIEW_IOT}</ButtonBar>}
      <ButtonBar href={PATH_ADMIN.MACHINES}>{T.MACHINES.BACK}</ButtonBar>
      {showRefresh && <ButtonBar type="button" disabled={machine.isFetching || schedule.isFetching || heartbeat.isFetching} onClick={refresh}>{T.COMMON.RETRY}</ButtonBar>}
    </AdminActionBar>
  );

  const submitRange = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const from = inputToIso(fromInput);
    const to = inputToIso(toInput);
    if (!from || !to || Date.parse(from) >= Date.parse(to)) {
      setRangeError(T.MACHINES.RANGE_INVALID);
      return;
    }
    setRangeError("");
    setRange({ from, to });
  };

  const loadLastDay = () => {
    const now = new Date();
    const from = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    setFromInput(localInputValue(from));
    setToInput(localInputValue(now));
    setRange({ from: from.toISOString(), to: now.toISOString() });
    setRangeError("");
  };

  if (!router.isReady) return <AdminShell><div className={styles.pageContent}><section className={styles.panel} role="status">{T.COMMON.LOADING}</section></div>{actionBar(false)}</AdminShell>;
  if (!validId) return <AdminShell><div className={styles.pageContent}>
    <div className={`${styles.notice} ${styles.errorNotice}`} role="alert"><p>{T.MACHINES.INVALID_ID}</p></div>
  </div>{actionBar(false)}</AdminShell>;
  if (machine.isPending) return <AdminShell><div className={styles.pageContent}><section className={styles.panel} role="status">{T.COMMON.LOADING}</section></div>{actionBar(true)}</AdminShell>;
  if (machine.isError) return <AdminShell><div className={styles.pageContent}>
    <div className={`${styles.notice} ${styles.errorNotice}`} role="alert"><p>{getApiErrorMessage(machine.error)}</p></div>
  </div>{actionBar(true)}</AdminShell>;
  if (!machine.data) return <AdminShell><div className={styles.pageContent}><p className={styles.emptyText}>{T.MACHINES.NOT_FOUND}</p></div>{actionBar(false)}</AdminShell>;

  const device = machine.data;
  const health = heartbeat.data?.health;
  const machineTypeLabel = device.machineType === "SMART_IOT" ? T.MACHINES.SMART : device.machineType === "CONVENTIONAL" ? T.MACHINES.CONVENTIONAL : T.MACHINES.UNCLASSIFIED;

  return <AdminShell>
    <div className={styles.pageContent}>
      <div className={styles.pageHeading}>
        <h1>{T.MACHINES.DETAIL} · {device.serialNumber ?? device.id.slice(0, 8).toUpperCase()}</h1>
        <p>{device.id}</p>
      </div>
      <div className={styles.metricsGrid}>
        <article className={styles.metricCard}><span>{T.MACHINES.STATUS}</span><strong>{device.status ? STATUS_LABELS[device.status] ?? device.status : "—"}</strong></article>
        <article className={styles.metricCard}><span>{T.MACHINES.MACHINE_TYPE}</span><strong>{machineTypeLabel}</strong></article>
        <article className={styles.metricCard}><span>{T.MACHINES.CUPS}</span><strong>{formatNumber(schedule.data?.cupsServedSinceLastDescale ?? device.cupsServedSinceLastDescale)}</strong></article>
        <article className={styles.metricCard}><span>{T.MACHINES.NEXT_MAINTENANCE}</span><strong>{formatDate(schedule.data?.nextPreventiveMaintenanceAt ?? device.nextPreventiveMaintenanceAt)}</strong></article>
      </div>

      <section className={styles.panel}>
        <h2>{T.MACHINES.DETAIL}</h2>
        <div className={styles.operationsGrid}>
          <div><span>{T.MACHINES.MACHINE_ID}</span><strong>{device.id}</strong></div>
          <div><span>{T.MACHINES.SERIAL}</span><strong>{device.serialNumber ?? "—"}</strong></div>
          <div><span>{T.MACHINES.OWNER_ID}</span><strong>{device.ownerId ?? "—"}</strong></div>
          <div><span>{T.MACHINES.REGION}</span><strong>{device.region ?? "—"}</strong></div>
          <div><span>{T.MACHINES.LOCATION_ID}</span><strong>{device.locationId ?? "—"}</strong></div>
          <div><span>{T.MACHINES.DEPLOYED_AT}</span><strong>{formatDate(device.deployedAt, true)}</strong></div>
        </div>
      </section>

      <section className={styles.panel}>
        <h2>{T.MACHINES.PREVENTIVE}</h2>
        {schedule.isPending && <p className={styles.emptyText} role="status">{T.COMMON.LOADING}</p>}
        {schedule.isError && <div className={`${styles.notice} ${styles.errorNotice}`} role="alert"><p>{getApiErrorMessage(schedule.error)}</p><button type="button" onClick={() => void schedule.refetch()}>{T.COMMON.RETRY}</button></div>}
        {schedule.data && <div className={styles.operationsGrid}>
          <div><span>{T.MACHINES.NEXT_MAINTENANCE}</span><strong>{formatDate(schedule.data.nextPreventiveMaintenanceAt, true)}</strong></div>
          <div><span>{T.MACHINES.CUPS}</span><strong>{formatNumber(schedule.data.cupsServedSinceLastDescale)}</strong></div>
        </div>}
      </section>

      <section className={styles.panel}>
        <h2>{T.MACHINES.TICKET_HISTORY}</h2>
        <div className={styles.operationsNotice} role="note">
          <p>{T.MACHINES.TICKET_UNAVAILABLE}</p>
          <button type="button" disabled aria-disabled="true" title={T.MACHINES.TICKET_UNAVAILABLE}>Tải lịch sử</button>
        </div>
      </section>

      {isSmartIot ? <>
        <section className={styles.panel}>
          <h2>{T.MACHINES.HEARTBEAT}</h2>
          {heartbeat.isPending && <p className={styles.emptyText} role="status">{T.COMMON.LOADING}</p>}
          {heartbeat.isError && <div className={`${styles.notice} ${styles.errorNotice}`} role="alert"><p>{getApiErrorMessage(heartbeat.error)}</p><button type="button" onClick={() => void heartbeat.refetch()}>{T.COMMON.RETRY}</button></div>}
          {heartbeat.data && <>
            <div className={styles.operationsGrid}>
              <div><span>{T.MACHINES.HEARTBEAT_STATUS}</span><strong>{heartbeat.data.status}</strong></div>
              <div><span>{T.MACHINES.EVALUATED_AT}</span><strong>{formatDate(heartbeat.data.evaluatedAt, true)}</strong></div>
              <div><span>{T.MACHINES.LAST_SEEN}</span><strong>{formatDate(heartbeat.data.lastSeenAt, true)}</strong></div>
              <div><span>{T.MACHINES.DEVICE_REPORTED}</span><strong>{formatDate(heartbeat.data.deviceReportedAt, true)}</strong></div>
            </div>
            {health && <div className={styles.operationsGrid}>
              <div><span>{T.MACHINES.HEALTH} · RAM</span><strong>{formatNumber(health.ramUsedMb)} / {formatNumber(health.ramTotalMb)} MB</strong></div>
              <div><span>{T.MACHINES.HEALTH} · Wi‑Fi RSSI</span><strong>{health.wifiRssiDbm ?? "—"} dBm</strong></div>
              <div><span>{T.MACHINES.HEALTH} · Firmware</span><strong>{health.firmwareVersion ?? "—"}</strong></div>
              <div><span>{T.MACHINES.HEALTH} · Edge app</span><strong>{health.edgeAppVersion ?? "—"}</strong></div>
            </div>}
          </>}
          {!heartbeat.isPending && !heartbeat.isError && !heartbeat.data && <p className={styles.emptyText}>{T.COMMON.EMPTY}</p>}
        </section>
        <section className={styles.panel}>
          <h2>{T.MACHINES.TELEMETRY}</h2>
          <p className={styles.panelSubtitle}>{T.MACHINES.SAMPLE_TIME}: {formatDate(heartbeat.data?.evaluatedAt, true)}</p>
          <form className={styles.operationsFilters} onSubmit={submitRange}>
            <label>{T.MACHINES.FROM}<input type="datetime-local" required value={fromInput} onChange={(event) => setFromInput(event.target.value)} /></label>
            <label>{T.MACHINES.TO}<input type="datetime-local" required value={toInput} onChange={(event) => setToInput(event.target.value)} /></label>
            <div className={styles.operationsButtons}><button className={styles.accountPrimaryButton} type="submit">{T.MACHINES.QUERY}</button><button className={styles.accountSecondaryButton} type="button" onClick={loadLastDay}>{T.MACHINES.LOAD_24H}</button></div>
          </form>
          {rangeError && <p className={styles.accountInlineWarning} role="alert">{rangeError}</p>}
          {!range && <p className={styles.emptyText}>{T.MACHINES.SELECT_RANGE}</p>}
          {points.isPending && range && <p className={styles.emptyText} role="status">{T.COMMON.LOADING}</p>}
          {points.isError && <div className={`${styles.notice} ${styles.errorNotice}`} role="alert"><p>{getApiErrorMessage(points.error)}</p><button type="button" onClick={() => void points.refetch()}>{T.COMMON.RETRY}</button></div>}
          {points.data && telemetryPoints.length === 0 && <p className={styles.emptyText}>{T.MACHINES.NO_POINTS}</p>}
          {telemetryPoints.length > 0 && <>
            <p className={styles.panelSubtitle}>{formatNumber(telemetryPoints.length)} điểm đã tải.</p>
            <DataTable
              rows={telemetryPoints}
              rowKey={(point, index) => `${point.timestamp}-${point.field}-${index}`}
              columns={[
                { key: "time", header: T.MACHINES.POINT_TIME, render: (point) => formatDate(point.timestamp, true) },
                { key: "field", header: T.MACHINES.FIELD, render: (point) => point.field },
                { key: "value", header: T.MACHINES.VALUE, render: (point) => formatTelemetryValue(point.value) },
                { key: "sub-state", header: "Sub-state", render: (point) => point.subState ?? "—" },
              ]}
            />
            {points.hasNextPage && <button className={styles.accountSecondaryButton} type="button" disabled={points.isFetchingNextPage} onClick={() => void points.fetchNextPage()}>{points.isFetchingNextPage ? T.COMMON.LOADING : T.MACHINES.MORE}</button>}
          </>}
        </section>
      </> : <section className={styles.panel}>
        <h2>{T.MACHINES.HEARTBEAT}</h2>
        <p className={styles.emptyText}>{device.machineType === "CONVENTIONAL" ? "Máy thường không có heartbeat hoặc telemetry IoT." : "Chưa truy vấn heartbeat vì backend chưa xác nhận loại máy là Smart IoT."}</p>
      </section>}
    </div>
    {actionBar(true)}
  </AdminShell>;
}

export default function MachineDetailPage() {
  return <MachineDetailContent />;
}
