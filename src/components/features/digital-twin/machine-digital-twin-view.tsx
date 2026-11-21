import { SectionTabList } from "@/components/tabs/section-tab-list";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { notificationsApi } from "@/apis/notifications.api";
import { ownerAnalyticsApi } from "@/apis/owner-analytics.api";
import { recipeMenusApi } from "@/apis/recipe-menus.api";
import { recipesApi } from "@/apis/recipes.api";
import { ButtonBar } from "@/components/button/button-bar";
import { MachineConnectionBadge } from "@/components/machines/machine-connection-badge";
import { isTemporaryTelemetryError, pollingInterval, usePageVisibility } from "@/components/machines/machine-heartbeat-visibility";
import { StatusBadge, type StatusBadgeTone } from "@/components/status-badge/status-badge";
import { authScopedQuerySubject } from "@/lib/query-subject";
import type { Machine } from "@/schema/machines.schema";
import type { Alert } from "@/schema/notifications.schema";
import type { OwnerBrewRecord } from "@/schema/owner-analytics.schema";
import { DIGITAL_TWIN_LIVE_MESSAGES as LIVE_T } from "@/text/digital-twin/digital-twin-messages";
import { DIGITAL_TWIN_RECIPE_TWIN_MESSAGES as T } from "@/text/digital-twin/digital-twin-messages";
import { BodyModelViewer } from "./BodyModelViewer";
import {
  CLUSTER_03_MODEL_URLS,
  CLUSTER_03_MOTION_URLS,
  CLUSTER_03_ROOT_FRAME_URL,
} from "./digital-twin-model-config";
import { useMachineHeartbeat } from "./live/use-machine-heartbeat";
import { useLiveBrewState } from "./live/use-live-brew-state";
import { buildBrewScript, buildDefaultBrewScript, type BrewScript } from "./script/build-brew-script";
import { parseProcedure } from "./script/parse-procedure";
import { useBrewScriptPlayer } from "./script/use-brew-script-player";
import styles from "./machine-digital-twin-view.module.css";

type Mode = "live" | "simulation";
type MachineType = Machine["machineType"];
type MetricValue = string | number | boolean | null;
type RecipeSource = "local" | "global";
interface RecipeCatalogItem {
  id: string;
  name: string;
  source: RecipeSource;
}

const ALERT_REFRESH_INTERVAL_MS = 15_000;
const BREW_RECORD_REFRESH_INTERVAL_MS = 5_000;
const BREW_HISTORY_WINDOW_MS = 24 * 60 * 60 * 1_000;
const DEFAULT_RECIPE_ID = "__default__";

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
    .sort((left, right) => Number(alertTone(right.level) === "danger") - Number(alertTone(left.level) === "danger") || Date.parse(right.ts) - Date.parse(left.ts))
    .slice(0, 5);
}

function recipeNameKey(name: string) {
  return name.trim().toLocaleLowerCase("vi-VN");
}

function sortNewest(records: OwnerBrewRecord[]) {
  return [...records].sort((left, right) => Date.parse(right.brewedAt) - Date.parse(left.brewedAt));
}

export function MachineDigitalTwinView({
  machineId,
  machineType,
  activeMenuId,
}: {
  machineId: string;
  machineType: MachineType;
  activeMenuId: string | null;
}) {
  const smartMachine = machineType === "SMART_IOT";
  const [moreOpen, setMoreOpen] = useState(false);
  const [partsTarget, setPartsTarget] = useState<HTMLDivElement | null>(null);
  const [mode, setMode] = useState<Mode>(smartMachine ? "live" : "simulation");
  const [selectedRecipeId, setSelectedRecipeId] = useState(DEFAULT_RECIPE_ID);
  const [simulationPending, setSimulationPending] = useState(false);
  const [simulationStopped, setSimulationStopped] = useState(false);
  const [replayRecord, setReplayRecord] = useState<OwnerBrewRecord | null>(null);
  const runVersion = useRef(0);
  const pageVisible = usePageVisibility();
  const subject = authScopedQuerySubject("OWNER");
  const liveEnabled = smartMachine && mode === "live";
  const heartbeat = useMachineHeartbeat({ machineId, enabled: smartMachine, intervalMs: liveEnabled ? 1_000 : 5_000 });
  const player = useBrewScriptPlayer(machineId);
  const { play: playScript, stop: stopScript } = player;
  const live = useLiveBrewState(machineId, heartbeat.heartbeat, liveEnabled && pageVisible, heartbeat.error, heartbeat.receivedAt);
  const [lastDishName, setLastDishName] = useState<string | null>(null);
  useEffect(() => {
    if (player.script?.name) setLastDishName(player.script.name);
  }, [player.script?.name]);
  useEffect(() => { setLastDishName(null); }, [machineId]);
  const brewingHeading = player.status === "running"
    ? `${T.now_brewing}: ${player.script?.name ?? T.ready}`
    : lastDishName ? `${T.just_brewed}: ${lastDishName}` : `${T.now_brewing}: ${T.ready}`;

  const recipeCatalogQuery = useQuery({
    queryKey: ["digital-twin-recipe-catalog", subject, activeMenuId],
    queryFn: async ({ signal }): Promise<RecipeCatalogItem[]> => {
      if (activeMenuId) {
        const page = await recipeMenusApi.listLocalRecipes(activeMenuId, { page: 0, size: 100 }, signal);
        return page.content.map((recipe) => ({ id: recipe.id, name: recipe.name, source: "local" }));
      }
      const page = await recipesApi.listGlobalPage(0, 100, signal);
      return page.items.map((recipe) => ({ id: recipe.id, name: recipe.name, source: "global" }));
    },
    retry: false,
  });

  const fetchScriptForRecipe = useCallback(async (recipe: RecipeCatalogItem | undefined): Promise<BrewScript> => {
    if (!recipe) return buildDefaultBrewScript();
    try {
      const detail = recipe.source === "local"
        ? await recipeMenusApi.getLocalRecipe(recipe.id)
        : await recipesApi.getGlobalById(recipe.id);
      const procedure = parseProcedure(detail.steps);
      if (procedure.length === 0) return buildDefaultBrewScript();
      return buildBrewScript(procedure, detail.name);
    } catch {
      return buildDefaultBrewScript();
    }
  }, []);

  const resolveRecipeScript = useCallback(async (name: string, catalog: RecipeCatalogItem[] = recipeCatalogQuery.data ?? []) => {
    const target = recipeNameKey(name);
    const recipe = catalog.find((candidate) => recipeNameKey(candidate.name) === target);
    return fetchScriptForRecipe(recipe);
  }, [fetchScriptForRecipe, recipeCatalogQuery.data]);

  const recordsQuery = useQuery({
    queryKey: ["digital-twin-brew-records", subject, machineId],
    queryFn: ({ signal }) => {
      const to = new Date();
      const from = new Date(to.getTime() - BREW_HISTORY_WINDOW_MS);
      return ownerAnalyticsApi.listBrewRecords({
        machineId,
        from: from.toISOString(),
        to: to.toISOString(),
        page: 0,
        size: 100,
      }, signal);
    },
    enabled: liveEnabled && pageVisible,
    retry: false,
    refetchInterval: query => liveEnabled && pageVisible ? pollingInterval(query, BREW_RECORD_REFRESH_INTERVAL_MS) : false,
    refetchIntervalInBackground: false,
  });

  const alertsQuery = useQuery({
    queryKey: ["digital-twin-live-alerts", subject, machineId],
    queryFn: ({ signal }) => notificationsApi.listAlerts({ machineId }, signal),
    enabled: liveEnabled && pageVisible,
    retry: false,
    refetchInterval: (query) =>
      liveEnabled && pageVisible
        ? pollingInterval(query, ALERT_REFRESH_INTERVAL_MS)
        : false,
    refetchIntervalInBackground: false,
  });

  useEffect(() => { setMode(smartMachine ? "live" : "simulation"); setReplayRecord(null); }, [machineId, smartMachine]);
  useEffect(() => {
    runVersion.current += 1;
    stopScript();
    setSimulationStopped(true);
    setSimulationPending(false);
    return () => { runVersion.current += 1; };
  }, [machineId, mode, stopScript]);

  useEffect(() => {
    const catalog = recipeCatalogQuery.data;
    if (!catalog) return;
    setSelectedRecipeId((current) =>
      current === DEFAULT_RECIPE_ID || !catalog.some((recipe) => recipe.id === current)
        ? catalog[0]?.id ?? DEFAULT_RECIPE_ID
        : current,
    );
  }, [activeMenuId, recipeCatalogQuery.data]);

  const recentRecords = useMemo(() => sortNewest(recordsQuery.data?.content ?? []).slice(0, 5), [recordsQuery.data]);
  const liveRecipeName = live.recipeName || recipeCatalogQuery.data?.find(recipe => recipe.id === live.recipeId)?.name;

  const timeLabel = formatVietnamTime(heartbeat.heartbeat?.lastSeenAt);
  const metrics = getMetricEntries(heartbeat.heartbeat?.metricsJson);
  const errorCode = metrics.find(([key]) => key === "error_code")?.[1];
  const openAlerts = sortOpenAlerts(alertsQuery.data ?? [], machineId);
  const criticalAlert = openAlerts.find(alert => alertTone(alert.level) === "danger");
  const displayConnectionState = heartbeat.isLoading
    ? "loading"
    : live.reconnecting
      ? "reconnecting"
      : heartbeat.error && !isTemporaryTelemetryError(heartbeat.error)
        ? "error"
        : liveEnabled && heartbeat.heartbeat && !live.connected
          ? "OFFLINE"
          : heartbeat.error
            ? "error"
            : heartbeat.heartbeat?.status ?? "UNKNOWN";
  const catalog = useMemo(() => recipeCatalogQuery.data ?? [], [recipeCatalogQuery.data]);
  const selectedRecipe = useMemo(
    () => catalog.find((recipe) => recipe.id === selectedRecipeId),
    [catalog, selectedRecipeId],
  );

  const handleSimulationRun = useCallback(async () => {
    const version = runVersion.current;
    setSimulationPending(true);
    try {
      const script = selectedRecipe
        ? await fetchScriptForRecipe(selectedRecipe)
        : buildDefaultBrewScript();
      if (version === runVersion.current) {
        setSimulationStopped(false);
        playScript(script, "test");
      }
    } finally {
      if (version === runVersion.current) setSimulationPending(false);
    }
  }, [fetchScriptForRecipe, playScript, selectedRecipe]);

  const handleReplay = useCallback((record: OwnerBrewRecord) => {
    setReplayRecord(record);
    setMode("simulation");
  }, []);
  useEffect(() => {
    if (mode !== "simulation" || !replayRecord) return;
    let cancelled = false;
    setSimulationPending(true);
    void resolveRecipeScript(replayRecord.recipeName).then(script => {
      if (cancelled) return;
      setSimulationStopped(false);
      playScript(script, "server");
      setReplayRecord(null);
      setSimulationPending(false);
    });
    return () => { cancelled = true; };
  }, [mode, replayRecord, resolveRecipeScript, playScript]);

  const viewerPresentation = useMemo(() => {
    const presentation = liveEnabled ? live.presentation : player.presentation;
    return presentation ? { ...presentation, label: undefined } : undefined;
  }, [liveEnabled, live.presentation, player.presentation]);

  const stepList = player.script?.steps ?? [];
  const currentStepIndex = player.status === "running" ? player.stepIndex : -1;

  return (
    <section className={styles.root} data-owner-twin-layout>
      <div className={styles.layout}>
        <div className={styles.viewerColumn}>
          <div className={styles.viewerFrame}>
            <header className={styles.viewerHeader}>
              {smartMachine ? (
                <div className={styles.modeRow}>
                  <SectionTabList role="group" aria-label={T.mode_label}>
                    <ButtonBar
                      type="button"
                      className={styles.modeButton}
                      aria-pressed={mode === "live"}
                      onClick={() => setMode("live")}
                    >
                      {LIVE_T.digital_twin_live_mode_live}
                    </ButtonBar>
                    <ButtonBar
                      type="button"
                      className={styles.modeButton}
                      aria-pressed={mode === "simulation"}
                      onClick={() => setMode("simulation")}
                    >
                      {LIVE_T.digital_twin_live_mode_simulation}
                    </ButtonBar>
                  </SectionTabList>
                </div>
              ) : null}
              <span className={styles.caption}>{T.camera_hint}</span>
            </header>
            <BodyModelViewer
              ownerLayout
              partsTarget={partsTarget}
              enableCoffeeEffect
              enableWaterEffect
              includeCompressorMotion
              compressorModelUrls={CLUSTER_03_MODEL_URLS}
              compressorRootFrameUrl={CLUSTER_03_ROOT_FRAME_URL}
              compressorMotionDefinitionUrls={CLUSTER_03_MOTION_URLS}
              operationEvent={liveEnabled ? live.event : player.event}
              operationSource="external"
              presentation={viewerPresentation}
              showElectricalLayer={false}
            />
          </div>
        </div>

        <aside className={styles.sidePanel}>
          {liveEnabled ? (
            <>
              <section className={styles.panelSection}>
                <h3>{LIVE_T.digital_twin_live_connection}</h3>
                {heartbeat.isLoading ? (
                  <p className={styles.stateMessage} role="status">
                    {LIVE_T.digital_twin_live_connecting}
                  </p>
                ) : displayConnectionState === "error" ? (
                  <>
                    <MachineConnectionBadge state="error" onRetry={() => void heartbeat.refetch()} />
                    <p className={styles.errorMessage} role="alert">{LIVE_T.digital_twin_live_error}</p>
                  </>
                ) : (
                  <>
                    <MachineConnectionBadge state={displayConnectionState} />
                    {live.delayed ? <>
                      <StatusBadge tone="warning" variant="dot">{T.telemetry_delayed}</StatusBadge>
                      <p className={styles.lastSeen}>{T.telemetry_waiting}</p>
                    </> : null}
                    <p className={styles.lastSeen}>
                      {LIVE_T.digital_twin_live_last_seen}: {timeLabel ?? LIVE_T.digital_twin_live_no_signal}
                    </p>
                  </>
                )}
              </section>

              <section className={styles.panelSection} aria-label={T.current_step} data-live-brew-state={live.state ?? "UNKNOWN"}>
                <h3>{live.fresh ? T.current_step : T.last_observed_step}</h3>
                <p className={styles.stepTitle} role="status">{live.label}</p>
                <p className={styles.recipeLine}>{[liveRecipeName, live.recipeStep !== null ? `${T.step_count} ${live.recipeStep}` : null].filter(Boolean).join(" \u00b7 ")}</p>
                {live.simulated ? <p className={styles.stateMessage}>{T.telemetry_test_data}</p> : null}
              </section>

              {!isForbiddenError(alertsQuery.error) ? (
                <p className={styles.alertSummary} data-tone={criticalAlert ? "danger" : alertsQuery.isSuccess ? (openAlerts.length ? "warning" : "success") : "neutral"} role={criticalAlert ? "alert" : undefined}>
                  {criticalAlert?.message ?? (alertsQuery.isError ? LIVE_T.digital_twin_live_alerts_error : alertsQuery.isPending ? LIVE_T.digital_twin_live_alerts_loading : openAlerts.length ? `${LIVE_T.digital_twin_live_alerts}: ${openAlerts.length}` : LIVE_T.digital_twin_live_alerts_empty)}
                </p>
              ) : null}
              <ButtonBar type="button" className={styles.moreButton} aria-expanded={moreOpen} aria-controls="digital-twin-more" onClick={() => setMoreOpen(value => !value)}>{T.more}<span aria-hidden="true">{moreOpen ? "\u2212" : "+"}</span></ButtonBar>
              <div id="digital-twin-more" hidden={!moreOpen}>
                <details className={styles.details}>
                  <summary>{T.recent_cups}</summary>

                  {recordsQuery.isError ? (
                    <p className={styles.errorMessage} role="alert">{T.live_history_error}</p>
                  ) : recentRecords.length === 0 ? (
                    <p className={styles.stateMessage}>{T.no_recent_cups}</p>
                  ) : (
                    <ol className={styles.recentList}>
                      {recentRecords.map((record) => (
                        <li className={styles.recentItem} key={record.id}>
                          <div className={styles.recentCopy}>
                            <strong>{record.recipeName}</strong>
                            <time dateTime={record.brewedAt}>{formatVietnamTime(record.brewedAt) ?? record.brewedAt}</time>
                          </div>
                          <ButtonBar type="button" className={styles.replayButton} onClick={() => void handleReplay(record)}>
                            {T.replay}
                          </ButtonBar>
                        </li>
                      ))}
                    </ol>
                  )}
                  <p className={styles.delayNote}>{T.brew_delay_note}</p>
                </details>
                <details className={styles.details}>
                  <summary>{LIVE_T.digital_twin_live_metrics}</summary>
                  {metrics.length === 0 ? <p className={styles.stateMessage}>{T.metrics_empty}</p> : null}
                  <dl className={styles.metricsList}>
                    {live.recipeStep !== null ? <div className={styles.metricRow}><dt>{T.reported_step}</dt><dd>{live.recipeStep}</dd></div> : null}
                    {errorCode !== undefined ? <div className={styles.metricRow}><dt>{T.error_code}</dt><dd>{errorCode === 0 ? T.no_error : String(errorCode)}</dd></div> : null}
                  </dl>
                  <details className={styles.details}>
                    <summary>{T.diagnostics}</summary>
                    <dl className={styles.metricsList}>
                      {metrics.map(([key, value]) => (
                        <div className={styles.metricRow} key={key}>
                          <dt>{key}</dt>
                          <dd>{value === null ? "null" : String(value)}</dd>
                        </div>
                      ))}
                    </dl>
                  </details>
                </details>
                <details className={styles.details}>
                  <summary>{T.parts}</summary>
                  <div ref={setPartsTarget} />
                </details>
                {!isForbiddenError(alertsQuery.error) ? (
                  <details className={styles.details}>
                    <summary>{LIVE_T.digital_twin_live_alerts}</summary>
                    {alertsQuery.isPending ? (
                      <p className={styles.stateMessage} role="status">{LIVE_T.digital_twin_live_alerts_loading}</p>
                    ) : alertsQuery.isError ? (
                      <p className={styles.errorMessage} role="alert">{LIVE_T.digital_twin_live_alerts_error}</p>
                    ) : openAlerts.length === 0 ? (
                      <p className={styles.stateMessage}>{LIVE_T.digital_twin_live_alerts_empty}</p>
                    ) : (
                      <ul className={styles.alertList}>
                        {openAlerts.map((alert) => (
                          <li className={styles.alertItem} key={alert.id}>
                            <StatusBadge tone={alertTone(alert.level)}>{alert.level}</StatusBadge>
                            <p>{alert.message}</p>
                            <time dateTime={alert.ts}>{formatVietnamTime(alert.ts) ?? LIVE_T.digital_twin_live_no_signal}</time>
                          </li>
                        ))}
                      </ul>
                    )}
                  </details>
                ) : null}
              </div>
            </>
          ) : (
            <>
              <section className={styles.panelSection}>
                <h3>{T.simulation_heading}</h3>
                <p className={styles.stateMessage}>{LIVE_T.digital_twin_live_note_simulation}</p>
                <label className={styles.selectLabel} htmlFor="digital-twin-recipe-select">{T.recipe_select}</label>
                <select
                  id="digital-twin-recipe-select"
                  className={styles.recipeSelect}
                  value={selectedRecipeId}
                  onChange={(event) => setSelectedRecipeId(event.target.value)}
                >
                  <option value={DEFAULT_RECIPE_ID}>{T.recipe_default}</option>
                  {catalog.map((recipe) => (
                    <option key={recipe.id} value={recipe.id}>{recipe.name}</option>
                  ))}
                </select>
                {recipeCatalogQuery.isPending ? (
                  <p className={styles.stateMessage} role="status">{T.recipe_loading}</p>
                ) : recipeCatalogQuery.isError ? (
                  <p className={styles.stateMessage}>{T.recipe_unavailable}</p>
                ) : null}
                <div className={styles.simulationActions}>
                  <ButtonBar
                    type="button"
                    variant="primary"
                    className={styles.runButton}
                    disabled={simulationPending || player.status === "running"}
                    onClick={() => void handleSimulationRun()}
                  >
                    {T.run_recipe}
                  </ButtonBar>
                  <ButtonBar
                    type="button"
                    className={styles.stopButton}
                    disabled={player.status !== "running" && !simulationPending}
                    onClick={() => { runVersion.current += 1; setReplayRecord(null); setSimulationPending(false); setSimulationStopped(true); stopScript(); }}
                  >
                    {T.stop_recipe}
                  </ButtonBar>
                </div>
              </section>
              <section className={styles.panelSection}>
                <h3>{brewingHeading}</h3>
                <p className={styles.stepTitle} role="status">{player.status === "running" ? stepList[currentStepIndex]?.label : lastDishName ? simulationStopped ? T.simulation_stopped : T.simulation_complete : T.ready}</p>
                <details className={styles.details}><summary>{T.procedure}</summary>
                  {player.status === "running" && stepList.length > 0 ? (
                    <ol className={styles.stepList}>
                      {stepList.map((step, index) => {
                        const current = index === currentStepIndex;
                        const complete = currentStepIndex >= 0 && index < currentStepIndex;
                        const label = step.valueText ? step.label + " " + step.valueText : step.label;
                        return (
                          <li
                            key={step.id}
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
                            <span>{label}</span>
                          </li>
                        );
                      })}
                    </ol>
                  ) : (
                    <p className={styles.stateMessage}>{T.ready}</p>
                  )}
                </details>
                <details className={styles.details}><summary>{T.parts}</summary><div ref={setPartsTarget} /></details>
              </section>
            </>
          )}
        </aside>
      </div>
    </section>
  );
}
