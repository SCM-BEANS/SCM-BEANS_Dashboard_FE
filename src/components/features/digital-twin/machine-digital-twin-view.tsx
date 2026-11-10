import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { notificationsApi } from "@/apis/notifications.api";
import { MachineConnectionBadge } from "@/components/machines/machine-connection-badge";
import { usePageVisibility } from "@/components/machines/machine-heartbeat-visibility";
import { StatusBadge, type StatusBadgeTone } from "@/components/status-badge/status-badge";
import { authScopedQuerySubject } from "@/lib/query-subject";
import type { Machine } from "@/schema/machines.schema";
import type { Alert } from "@/schema/notifications.schema";
import { DIGITAL_TWIN_LIVE_MESSAGES as T } from "@/text/digital-twin/digital-twin-messages";
import { BodyModelViewer } from "./BodyModelViewer";
import {
  CLUSTER_03_MODEL_URLS,
  CLUSTER_03_MOTION_URLS,
  CLUSTER_03_ROOT_FRAME_URL,
} from "./digital-twin-model-config";
import { LIVE_BREW_STEPS } from "./live/brew-state-mapping";
import { useLiveBrewCycle } from "./live/use-live-brew-cycle";
import styles from "./machine-digital-twin-view.module.css";

type Mode = "live" | "simulation";
type MachineType = Machine["machineType"];
type MetricValue = string | number | boolean | null;

const ALERT_REFRESH_INTERVAL_MS = 15_000;

function formatVietnamTime(value: string | null | undefined): string | null {
  if (!value) return null;
  const timestamp = Date.parse(value);
  if (Number.isNaN(timestamp)) return null;

  const deltaSeconds = Math.round((timestamp - Date.now()) / 1_000);
  const absoluteSeconds = Math.abs(deltaSeconds);
  if (absoluteSeconds >= 30 * 24 * 60 * 60) {
    return new Intl.DateTimeFormat("vi-VN", {
      dateStyle: "short",
      timeStyle: "short",
      timeZone: "Asia/Ho_Chi_Minh",
    }).format(timestamp);
  }

  const unit: Intl.RelativeTimeFormatUnit =
    absoluteSeconds < 60
      ? "second"
      : absoluteSeconds < 60 * 60
        ? "minute"
        : absoluteSeconds < 24 * 60 * 60
          ? "hour"
          : "day";
  const unitSeconds =
    unit === "second" ? 1 : unit === "minute" ? 60 : unit === "hour" ? 3_600 : 86_400;
  return new Intl.RelativeTimeFormat("vi-VN", { numeric: "always" }).format(
    Math.round(deltaSeconds / unitSeconds),
    unit,
  );
}

function getMetricEntries(value: unknown): [string, MetricValue][] {
  let candidate = value;
  if (typeof candidate === "string") {
    try {
      candidate = JSON.parse(candidate) as unknown;
    } catch {
      return [];
    }
  }
  if (candidate === null || typeof candidate !== "object" || Array.isArray(candidate)) return [];
  const prototype = Object.getPrototypeOf(candidate);
  if (prototype !== Object.prototype && prototype !== null) return [];

  return Object.entries(candidate)
    .filter((entry): entry is [string, MetricValue] => {
      const item = entry[1];
      return item === null || ["string", "number", "boolean"].includes(typeof item);
    })
    .slice(0, 8);
}

function isForbiddenError(error: unknown): boolean {
  if (!error || typeof error !== "object" || !("response" in error)) return false;
  const response = (error as { response?: { status?: number } }).response;
  return response?.status === 403;
}

function alertTone(level: string): StatusBadgeTone {
  const normalized = level.toUpperCase();
  if (["CRITICAL", "ERROR", "FATAL", "HIGH"].includes(normalized)) return "danger";
  if (["WARN", "WARNING", "MEDIUM"].includes(normalized)) return "warning";
  if (["INFO", "LOW"].includes(normalized)) return "info";
  return "neutral";
}

function sortOpenAlerts(alerts: Alert[], machineId: string) {
  return alerts
    .filter((alert) => alert.machineId === machineId && !alert.acknowledged)
    .sort((left, right) => Date.parse(right.ts) - Date.parse(left.ts))
    .slice(0, 5);
}

export function MachineDigitalTwinView({
  machineId,
  machineType,
}: {
  machineId: string;
  machineType: MachineType;
}) {
  const smartMachine = machineType === "SMART_IOT";
  const [mode, setMode] = useState<Mode>(smartMachine ? "live" : "simulation");
  const pageVisible = usePageVisibility();
  const subject = authScopedQuerySubject("OWNER");
  const liveEnabled = smartMachine && mode === "live";
  const live = useLiveBrewCycle({ machineId, enabled: liveEnabled });
  const alertsQuery = useQuery({
    queryKey: ["digital-twin-live-alerts", subject, machineId],
    queryFn: ({ signal }) => notificationsApi.listAlerts({ machineId }, signal),
    enabled: liveEnabled && pageVisible,
    retry: false,
    refetchInterval: (query) =>
      liveEnabled && pageVisible && !isForbiddenError(query.state.error)
        ? ALERT_REFRESH_INTERVAL_MS
        : false,
    refetchIntervalInBackground: false,
  });

  useEffect(() => {
    setMode(smartMachine ? "live" : "simulation");
  }, [machineId, smartMachine]);

  const timeLabel = formatVietnamTime(live.heartbeat?.lastSeenAt);
  const metrics = getMetricEntries(live.heartbeat?.metricsJson);
  const currentStepIndex = live.mapped.step
    ? LIVE_BREW_STEPS.findIndex((step) => step.key === live.mapped.step)
    : -1;
  const openAlerts = sortOpenAlerts(alertsQuery.data ?? [], machineId);
  const displayConnectionState = live.isLoading
    ? "loading"
    : live.error
      ? "error"
      : live.heartbeat?.status ?? "UNKNOWN";
  const note = !smartMachine
    ? T.digital_twin_live_conventional_note
    : mode === "live"
      ? T.digital_twin_live_note_live
      : T.digital_twin_live_note_simulation;

  return (
    <section className={styles.root}>
      {smartMachine ? (
        <div className={styles.modeRow}>
          <div className={styles.modeSwitch} role="group" aria-label="Chế độ xem máy">
            <button
              type="button"
              className={styles.modeButton}
              aria-pressed={mode === "live"}
              onClick={() => setMode("live")}
            >
              {T.digital_twin_live_mode_live}
            </button>
            <button
              type="button"
              className={styles.modeButton}
              aria-pressed={mode === "simulation"}
              onClick={() => setMode("simulation")}
            >
              {T.digital_twin_live_mode_simulation}
            </button>
          </div>
        </div>
      ) : null}

      <p className={styles.note}>{note}</p>

      <div className={styles.layout}>
        <div className={styles.viewerColumn}>
          <div className={styles.viewerFrame}>
            <BodyModelViewer
              enableOperationTest
              enableCoffeeEffect
              enableWaterEffect
              includeCompressorMotion
              compressorModelUrls={CLUSTER_03_MODEL_URLS}
              compressorRootFrameUrl={CLUSTER_03_ROOT_FRAME_URL}
              compressorMotionDefinitionUrls={CLUSTER_03_MOTION_URLS}
              operationEvent={liveEnabled ? live.event : null}
              operationSource={liveEnabled ? "external" : "test"}
            />
            {liveEnabled && live.stale ? (
              <div className={styles.offlineOverlay} role="status">
                {timeLabel ? (
                  <>
                    <span>{T.digital_twin_live_disconnected} — {T.digital_twin_live_disconnected_at}</span>
                    <time dateTime={live.heartbeat?.lastSeenAt ?? undefined}>{timeLabel}</time>
                  </>
                ) : (
                  <span>{T.digital_twin_live_never_seen}</span>
                )}
              </div>
            ) : null}
          </div>
        </div>

        {liveEnabled ? (
          <aside className={styles.sidePanel}>
            <section className={styles.panelSection}>
              <h3>{T.digital_twin_live_connection}</h3>
              {live.isLoading ? (
                <p className={styles.stateMessage} role="status">
                  {T.digital_twin_live_connecting}
                </p>
              ) : live.error ? (
                <>
                  <MachineConnectionBadge
                    state="error"
                    onRetry={() => void live.refetch()}
                  />
                  <p className={styles.errorMessage} role="alert">
                    {T.digital_twin_live_error}
                  </p>
                </>
              ) : (
                <>
                  <MachineConnectionBadge state={displayConnectionState} />
                  <p className={styles.lastSeen}>
                    {T.digital_twin_live_last_seen}: {timeLabel ?? T.digital_twin_live_no_signal}
                  </p>
                </>
              )}
            </section>

            <section className={styles.panelSection}>
              <h3>{T.digital_twin_live_step_heading}</h3>
              <ol className={styles.stepList}>
                {LIVE_BREW_STEPS.map((step, index) => {
                  const current = step.key === live.mapped.step;
                  const complete = currentStepIndex >= 0 && index < currentStepIndex;
                  return (
                    <li
                      key={step.key}
                      className={[
                        styles.step,
                        current ? styles.currentStep : "",
                        complete ? styles.completeStep : "",
                      ].filter(Boolean).join(" ")}
                      aria-current={current ? "step" : undefined}
                    >
                      <span className={styles.stepMarker} aria-hidden="true">
                        {complete ? "✓" : current ? "●" : "○"}
                      </span>
                      <span>{step.label}</span>
                    </li>
                  );
                })}
              </ol>
              <p className={live.mapped.fault ? styles.faultLabel : styles.currentLabel} role={live.mapped.fault ? "alert" : undefined}>
                {live.mapped.label}
              </p>
            </section>

            {metrics.length > 0 ? (
              <section className={styles.panelSection}>
                <h3>{T.digital_twin_live_metrics}</h3>
                <dl className={styles.metricsList}>
                  {metrics.map(([key, value]) => (
                    <div className={styles.metricRow} key={key}>
                      <dt>{key}</dt>
                      <dd>{value === null ? "null" : String(value)}</dd>
                    </div>
                  ))}
                </dl>
              </section>
            ) : null}

            {!isForbiddenError(alertsQuery.error) ? (
              <section className={styles.panelSection}>
                <h3>{T.digital_twin_live_alerts}</h3>
                {alertsQuery.isPending ? (
                  <p className={styles.stateMessage} role="status">
                    {T.digital_twin_live_alerts_loading}
                  </p>
                ) : alertsQuery.isError ? (
                  <p className={styles.errorMessage} role="alert">
                    {T.digital_twin_live_alerts_error}
                  </p>
                ) : openAlerts.length === 0 ? (
                  <p className={styles.stateMessage}>{T.digital_twin_live_alerts_empty}</p>
                ) : (
                  <ul className={styles.alertList}>
                    {openAlerts.map((alert) => (
                      <li className={styles.alertItem} key={alert.id}>
                        <StatusBadge tone={alertTone(alert.level)}>{alert.level}</StatusBadge>
                        <p>{alert.message}</p>
                        <time dateTime={alert.ts}>
                          {formatVietnamTime(alert.ts) ?? T.digital_twin_live_no_signal}
                        </time>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            ) : null}
          </aside>
        ) : null}
      </div>
    </section>
  );
}
