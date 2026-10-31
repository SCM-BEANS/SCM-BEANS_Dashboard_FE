import { MachineConnectionBadge } from "./machine-connection-badge";
import { SmartIotPanel } from "./smart-iot-panel";
import type { MachineHeartbeat } from "@/schema/telemetry.schema";
import styles from "./machines.module.css";

function formatHeartbeatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

export function MachineHeartbeatPanel({
  title,
  heartbeat,
  loading = false,
  error,
  onRetry,
  emptyMessage = "Chưa có heartbeat được ghi nhận.",
  retryLabel = "Thử lại",
}: {
  title: string;
  heartbeat?: MachineHeartbeat;
  loading?: boolean;
  error?: string;
  onRetry?: () => void;
  emptyMessage?: string;
  retryLabel?: string;
}) {
  const state = error ? "error" : loading ? "loading" : !heartbeat ? "empty" : undefined;
  const stateMessage = error ?? (loading ? "Đang tải trạng thái kết nối…" : !heartbeat ? emptyMessage : undefined);
  const health = heartbeat?.health;
  const hasHeartbeatDetails = Boolean(
    heartbeat?.evaluatedAt
      || heartbeat?.lastSeenAt
      || heartbeat?.deviceReportedAt
      || health?.ramUsedMb != null
      || health?.ramTotalMb != null
      || health?.wifiRssiDbm != null
      || health?.netbirdWireguardLatencyMs != null
      || health?.osLoadAvg1m != null
      || health?.firmwareVersion
      || health?.edgeAppVersion,
  );

  return (
    <SmartIotPanel
      title={title}
      state={state}
      stateMessage={stateMessage}
      retryLabel={retryLabel}
      onRetry={onRetry}
    >
      {heartbeat && !error ? <>
        <MachineConnectionBadge state={heartbeat.status} />
        {hasHeartbeatDetails ? <dl className={styles.machineHeartbeatFields}>
          {heartbeat.evaluatedAt ? <div><dt>Đánh giá lúc</dt><dd>{formatHeartbeatDate(heartbeat.evaluatedAt)}</dd></div> : null}
          {heartbeat.lastSeenAt ? <div><dt>Nhận tín hiệu lần cuối</dt><dd>{formatHeartbeatDate(heartbeat.lastSeenAt)}</dd></div> : null}
          {heartbeat.deviceReportedAt ? <div><dt>Thiết bị báo lúc</dt><dd>{formatHeartbeatDate(heartbeat.deviceReportedAt)}</dd></div> : null}
          {health?.ramUsedMb != null || health?.ramTotalMb != null ? <div><dt>Sức khỏe · RAM</dt><dd>{health.ramUsedMb ?? "—"} / {health.ramTotalMb ?? "—"} MB</dd></div> : null}
          {health?.wifiRssiDbm != null ? <div><dt>Sức khỏe · Wi-Fi RSSI</dt><dd>{health.wifiRssiDbm} dBm</dd></div> : null}
          {health?.netbirdWireguardLatencyMs != null ? <div><dt>Sức khỏe · Độ trễ</dt><dd>{health.netbirdWireguardLatencyMs} ms</dd></div> : null}
          {health?.osLoadAvg1m != null ? <div><dt>Sức khỏe · Tải hệ thống (1 phút)</dt><dd>{health.osLoadAvg1m}</dd></div> : null}
          {health?.firmwareVersion ? <div><dt>Sức khỏe · Firmware</dt><dd>{health.firmwareVersion}</dd></div> : null}
          {health?.edgeAppVersion ? <div><dt>Sức khỏe · Ứng dụng Edge</dt><dd>{health.edgeAppVersion}</dd></div> : null}
        </dl> : null}
      </> : null}
    </SmartIotPanel>
  );
}
