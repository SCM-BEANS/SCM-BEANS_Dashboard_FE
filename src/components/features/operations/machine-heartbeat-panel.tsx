import { useQuery } from "@tanstack/react-query";
import { telemetryApi } from "@/apis/telemetry.api";
import { getApiErrorMessage } from "@/lib/api-errors";
import { authScopedQuerySubject } from "@/lib/query-subject";
import styles from "./action-items-panel.module.css";

function formatTimestamp(value?: string | null) {
  if (!value) return "Chưa ghi nhận";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Chưa ghi nhận"
    : new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium", timeStyle: "medium" }).format(date);
}

export function MachineHeartbeatPanel({ machineId, role }: { machineId: string; role: "OWNER" | "TECHNICIAN" }) {
  const heartbeat = useQuery({
    queryKey: ["dolores", "telemetry", "heartbeat", role, authScopedQuerySubject(role), machineId],
    queryFn: ({ signal }) => telemetryApi.getLatestHeartbeat(machineId, signal),
    refetchInterval: 5_000,
    retry: false,
  });

  return (
    <section className={styles.panel} aria-labelledby={`heartbeat-${machineId}`}>
      <h2 id={`heartbeat-${machineId}`}>Kết nối máy pha</h2>
      {heartbeat.isPending && <p className={styles.notice} role="status">Đang tải trạng thái thiết bị…</p>}
      {heartbeat.isError && (
        <div className={`${styles.notice} ${styles.error}`} role="alert">
          <p>{getApiErrorMessage(heartbeat.error)}</p>
          <button type="button" onClick={() => void heartbeat.refetch()}>Thử lại</button>
        </div>
      )}
      {heartbeat.data && (
        <dl className={styles.metadata}>
          <div><dt>Trạng thái</dt><dd>{heartbeat.data.status}</dd></div>
          <div><dt>Tín hiệu cuối</dt><dd>{formatTimestamp(heartbeat.data.lastSeenAt ?? heartbeat.data.evaluatedAt)}</dd></div>
          {heartbeat.data.health?.firmwareVersion && <div><dt>Firmware</dt><dd>{heartbeat.data.health.firmwareVersion}</dd></div>}
          {heartbeat.data.health?.edgeAppVersion && <div><dt>Ứng dụng thiết bị</dt><dd>{heartbeat.data.health.edgeAppVersion}</dd></div>}
          {heartbeat.data.health?.wifiRssiDbm != null && <div><dt>Wi-Fi RSSI</dt><dd>{heartbeat.data.health.wifiRssiDbm} dBm</dd></div>}
        </dl>
      )}
      <p className={styles.availability}>Trạng thái được làm mới mỗi 5 giây. ONLINE/OFFLINE phản ánh thời điểm máy chủ nhận tín hiệu.</p>
    </section>
  );
}
