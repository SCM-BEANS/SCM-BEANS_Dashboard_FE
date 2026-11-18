import type { LinkProps } from "next/link";
import { useQuery } from "@tanstack/react-query";
import { telemetryApi } from "@/apis/telemetry.api";
import { ButtonBar } from "@/components/button/button-bar";
import { TextLinkButton } from "@/components/button/text-link-button";
import { getApiErrorMessage } from "@/lib/api-errors";
import { MachineConnectionBadge } from "./machine-connection-badge";
import { MachineHealthStatus } from "./machine-health-panel";
import { SmartIotPanel } from "./smart-iot-panel";
import styles from "./machine-health.module.css";

const numbers = new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 1 });

export function MaintenancePriorityPanel({ subject, enabled, machineHref }: {
  subject: string;
  enabled: boolean;
  machineHref: (machineId: string) => LinkProps["href"];
}) {
  const query = useQuery({
    queryKey: ["machine-maintenance-priority", subject],
    queryFn: ({ signal }) => telemetryApi.getMaintenancePriorityQueue(signal),
    enabled,
    staleTime: 30_000,
    retry: false,
  });
  const machines = query.data ?? [];
  const state = query.isError ? "error" : query.isPending ? "loading" : machines.length === 0 ? "empty" : undefined;
  const stateMessage = query.isError ? getApiErrorMessage(query.error)
    : query.isPending ? "Đang tải danh sách ưu tiên…" : "Chưa có máy trong danh sách ưu tiên.";

  return <SmartIotPanel title="Ưu tiên bảo trì" state={state} stateMessage={stateMessage} onRetry={() => void query.refetch()}>
    {query.isSuccess && <div className={styles.queueToolbar}>
      <span>{numbers.format(machines.length)} máy</span>
      <ButtonBar disabled={query.isFetching} onClick={() => void query.refetch()}>{query.isFetching ? "Đang cập nhật…" : "Làm mới"}</ButtonBar>
    </div>}
    {!state && <>
      <div className={styles.queueHeader} aria-hidden="true"><span>Máy</span><span>Ưu tiên / Tình trạng</span><span>Kiểm tra trước</span></div>
      <ol className={styles.queue}>
        {machines.map(machine => <li key={machine.machineId} data-status={machine.overallStatus} className={styles.queueRow}>
          <div className={styles.queueMachine}>
            <TextLinkButton href={machineHref(machine.machineId)}>{machine.serialNumber?.trim() || machine.machineId.slice(0, 8).toUpperCase()}</TextLinkButton>
            {machine.location && <small className={styles.subline}>{machine.location}</small>}
          </div>
          <div className={styles.queueStatus}>
            <strong aria-label={`Điểm ưu tiên ${machine.priorityScore} trên 100`} className={styles.priorityScore}>{numbers.format(machine.priorityScore)}<small>/100</small></strong>
            <MachineHealthStatus status={machine.overallStatus} />
            <MachineConnectionBadge state={machine.connectionStatus} />
          </div>
          <div className={styles.queueAction}>
            <p className={styles.firstCheck}>{machine.recommendedFirstCheck?.trim() || "Chưa có đề xuất kiểm tra."}</p>
            {machine.primaryReason && <p className={styles.queueReason}>{machine.primaryReason}</p>}
            <details>
              <summary><span className={styles.desktopDetails}>Xem thêm</span><span className={styles.mobileDetails}>Lý do ưu tiên</span></summary>
              {machine.primaryReason && <p className={styles.mobileReason}>{machine.primaryReason}</p>}
              <small className={styles.subline}>{numbers.format(machine.activeAlerts)} cảnh báo còn mở · {numbers.format(machine.cupsLast14d)} ly trong 14 ngày{machine.cleaningOverdue ? " · Vệ sinh quá hạn" : ""}</small>
            </details>
          </div>
        </li>)}
      </ol>
    </>}
  </SmartIotPanel>;
}
