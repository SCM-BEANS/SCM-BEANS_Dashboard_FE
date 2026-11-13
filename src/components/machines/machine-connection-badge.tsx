import { Loader2, Wifi, X } from "lucide-react";
import styles from "./machines.module.css";

export type MachineConnectionState = "ONLINE" | "OFFLINE" | "UNKNOWN" | "loading" | "error" | "not-requested" | "permission-denied";

const labels: Record<MachineConnectionState, string> = {
  ONLINE: "Đang kết nối",
  OFFLINE: "Mất kết nối",
  UNKNOWN: "Chưa rõ",
  loading: "Đang tải",
  error: "Không tải được",
  "not-requested": "Chưa tải",
  "permission-denied": "Chưa có quyền xem",
};

export function MachineConnectionBadge({
  state,
  onRetry,
}: {
  state: MachineConnectionState;
  onRetry?: () => void;
}) {
  return (
    <span className={styles.machineConnectionBadge} data-state={state} role={state === "error" ? "alert" : "status"}>
      <span className={styles.connectionIcon} aria-hidden="true">
        {state === "loading" ? <Loader2 className={styles.connectionSpinner} /> : <Wifi />}
        {state === "OFFLINE" ? <X className={styles.connectionCross} /> : null}
      </span>
      <span>{labels[state]}</span>
      {state === "error" && onRetry ? (
        <button type="button" className={styles.machineConnectionRetry} onClick={onRetry} aria-label="Tải lại trạng thái kết nối">
          Thử lại
        </button>
      ) : null}
    </span>
  );
}
