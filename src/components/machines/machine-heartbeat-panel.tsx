import { MachineConnectionBadge } from "./machine-connection-badge";
import { SmartIotPanel } from "./smart-iot-panel";
import type { MachineHeartbeat } from "@/schema/telemetry.schema";
import { MACHINE_CONNECTION_MESSAGES as T } from "@/text/machine-connection-messages";
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
  const hasGps = heartbeat?.latitude != null && heartbeat.longitude != null
    && Math.abs(heartbeat.latitude) <= 90 && Math.abs(heartbeat.longitude) <= 180
    && (heartbeat.latitude !== 0 || heartbeat.longitude !== 0);
  const hasHeartbeatDetails = Boolean(
    health
      || heartbeat?.evaluatedAt
      || heartbeat?.deviceReportedAt
      || heartbeat?.healthReportedAt
      || heartbeat?.healthDeviceReportedAt,
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
        <div className={styles.monitoringHeartbeatSummary}><div><span className={styles.telemetryRangeCaption}>Kết nối hiện tại</span><MachineConnectionBadge state={heartbeat.status} /></div><div><span className={styles.telemetryRangeCaption}>Tín hiệu gần nhất · Giờ Việt Nam</span><strong>{heartbeat.lastSeenAt ? formatHeartbeatDate(heartbeat.lastSeenAt) : "Chưa ghi nhận"}</strong></div></div>
        {heartbeat.status === "UNKNOWN" ? <p className={styles.telemetryRangeCaption}>Chưa đủ tín hiệu để xác định máy đang kết nối hay mất kết nối.</p> : null}
        {hasGps ? <dl className={styles.machineHeartbeatFields}>
          <div><dt>Vị trí</dt><dd>{heartbeat.status === "ONLINE" ? "Đã ghi nhận tọa độ" : "Tọa độ gần nhất"}</dd></div>
          <div><dt>Vĩ độ</dt><dd>{heartbeat.latitude!.toFixed(6)}</dd></div>
          <div><dt>Kinh độ</dt><dd>{heartbeat.longitude!.toFixed(6)}</dd></div>
        </dl> : <p className={styles.telemetryRangeCaption}>{T.GPS_MISSING}</p>}
        {!hasGps && heartbeat.status === "ONLINE" ? <p>Máy đang kết nối nhưng chưa gửi vị trí GPS hợp lệ. Hãy kiểm tra quyền truy cập vị trí trên thiết bị và anten GPS.</p> : null}
        {hasHeartbeatDetails ? <details className={styles.machineHeartbeatDetails}>
          <summary>Chi tiết kết nối và thiết bị</summary>
          <div className={styles.machineHeartbeatDetailsContent}>
            {heartbeat.evaluatedAt || heartbeat.deviceReportedAt || heartbeat.healthReportedAt || heartbeat.healthDeviceReportedAt ? <dl className={styles.machineHeartbeatFields}>
              {heartbeat.evaluatedAt ? <div><dt>Đánh giá trạng thái lúc</dt><dd>{formatHeartbeatDate(heartbeat.evaluatedAt)}</dd></div> : null}
              {heartbeat.deviceReportedAt ? <div><dt>Thiết bị gửi tín hiệu lúc</dt><dd>{formatHeartbeatDate(heartbeat.deviceReportedAt)}</dd></div> : null}
              {heartbeat.healthReportedAt ? <div><dt>Hệ thống nhận thông số lúc</dt><dd>{formatHeartbeatDate(heartbeat.healthReportedAt)}</dd></div> : null}
              {heartbeat.healthDeviceReportedAt ? <div><dt>Thiết bị ghi thông số lúc</dt><dd>{formatHeartbeatDate(heartbeat.healthDeviceReportedAt)}</dd></div> : null}
            </dl> : null}
            {health ? <>
              {heartbeat.status !== "ONLINE" || !heartbeat.healthReportedAt ? <p>Dữ liệu đã ghi nhận, không phản ánh tình trạng hiện tại của máy.</p> : <p>Thông số bên dưới được ghi nhận tại một thời điểm, không phải dữ liệu đo liên tục.</p>}
              <dl className={styles.machineHeartbeatFields}>
                {health.ramUsedMb != null || health.ramTotalMb != null ? <div><dt>RAM</dt><dd>{health.ramUsedMb ?? "—"} / {health.ramTotalMb ?? "—"} MB</dd></div> : null}
                {health.wifiRssiDbm != null ? <div><dt>Wi-Fi RSSI</dt><dd>{health.wifiRssiDbm} dBm</dd></div> : null}
                {health.netbirdWireguardLatencyMs != null ? <div><dt>Độ trễ</dt><dd>{health.netbirdWireguardLatencyMs} ms</dd></div> : null}
                {health.osLoadAvg1m != null ? <div><dt>Tải hệ thống (1 phút)</dt><dd>{health.osLoadAvg1m}</dd></div> : null}
                {health.firmwareVersion ? <div><dt>Firmware</dt><dd>{health.firmwareVersion}</dd></div> : null}
                {health.edgeAppVersion ? <div><dt>Ứng dụng Edge</dt><dd>{health.edgeAppVersion}</dd></div> : null}
              </dl>
            </> : null}
          </div>
        </details> : null}
      </> : null}
    </SmartIotPanel>
  );
}
