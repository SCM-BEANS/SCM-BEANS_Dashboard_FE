import { MachineConnectionBadge } from "./machine-connection-badge";
import { SmartIotPanel } from "./smart-iot-panel";
import type { MachineHeartbeat } from "@/schema/telemetry.schema";
import styles from "./machines.module.css";

function formatHeartbeatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Ho_Chi_Minh" }).format(date);
}

export function MachineHeartbeatPanel({
  title,
  heartbeat,
  loading = false,
  error,
  onRetry,
  emptyMessage = "Chưa nhận được tín hiệu kết nối của máy.",
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
      || heartbeat?.deviceReportedAt,
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
        <div className={styles.monitoringHeartbeatSummary}><div><span className={styles.telemetryRangeCaption}>Kết nối hiện tại</span><MachineConnectionBadge state={heartbeat.status} /></div><div><span className={styles.telemetryRangeCaption}>Tín hiệu gần nhất · Giờ Việt Nam</span><strong>{heartbeat.lastSeenAt ? formatHeartbeatDate(heartbeat.lastSeenAt) : "Chưa ghi nhận"}</strong></div><div><span className={styles.telemetryRangeCaption}>Thông số sức khỏe</span><strong>{health ? "Có dữ liệu đã ghi nhận" : "Chưa có dữ liệu"}</strong></div></div>
        {heartbeat.status === "UNKNOWN" ? <p className={styles.telemetryRangeCaption}>Chưa đủ tín hiệu để xác định máy đang kết nối hay mất kết nối.</p> : null}
        {hasHeartbeatDetails ? <p className={styles.telemetryRangeCaption}>{heartbeat.evaluatedAt ? `Đánh giá lúc ${formatHeartbeatDate(heartbeat.evaluatedAt)}` : ""}{heartbeat.deviceReportedAt ? ` · Thiết bị báo lúc ${formatHeartbeatDate(heartbeat.deviceReportedAt)}` : ""}</p> : null}
        {health ? <details open><summary>Sức khỏe ghi nhận gần nhất</summary>
          {heartbeat.status !== "ONLINE" || !heartbeat.healthReportedAt ? <p>Dữ liệu đã ghi nhận, không phản ánh tình trạng hiện tại của máy.</p> : <p>Thông số tại lần ghi nhận bên dưới, không phải dữ liệu đo liên tục.</p>}
          <dl className={styles.machineHeartbeatFields}>
          <div><dt>Thời điểm ghi nhận sức khỏe</dt><dd>{heartbeat.healthReportedAt ? formatHeartbeatDate(heartbeat.healthReportedAt) : "Chưa ghi nhận thời điểm"}</dd></div>
          {health?.ramUsedMb != null || health?.ramTotalMb != null ? <div><dt>Sức khỏe · RAM</dt><dd>{health.ramUsedMb ?? "—"} / {health.ramTotalMb ?? "—"} MB</dd></div> : null}
          {health?.wifiRssiDbm != null ? <div><dt>Sức khỏe · Wi-Fi RSSI</dt><dd>{health.wifiRssiDbm} dBm</dd></div> : null}
          {health?.netbirdWireguardLatencyMs != null ? <div><dt>Sức khỏe · Độ trễ</dt><dd>{health.netbirdWireguardLatencyMs} ms</dd></div> : null}
          {health?.osLoadAvg1m != null ? <div><dt>Sức khỏe · Tải hệ thống (1 phút)</dt><dd>{health.osLoadAvg1m}</dd></div> : null}
          {health?.firmwareVersion ? <div><dt>Sức khỏe · Firmware</dt><dd>{health.firmwareVersion}</dd></div> : null}
          {health?.edgeAppVersion ? <div><dt>Sức khỏe · Ứng dụng Edge</dt><dd>{health.edgeAppVersion}</dd></div> : null}
          </dl></details> : null}
      </> : null}
    </SmartIotPanel>
  );
}
