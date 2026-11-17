import { useEffect, useMemo, useState } from "react";
import { isTemporaryTelemetryError } from "@/components/machines/machine-heartbeat-visibility";
import type { MachineHeartbeat } from "@/schema/telemetry.schema";
import type { DigitalTwinCycleEvent, DigitalTwinCyclePhase } from "@/schema/digital-twin-cycle.schema";
import { DIGITAL_TWIN_LIVE_STATE_LABELS as LABELS } from "@/text/digital-twin/digital-twin-messages";
import { DEFAULT_PART_LAYERS, type DigitalTwinPresentation, type PartGroupId } from "../presentation/part-groups";

export const LIVE_SIGNAL_FRESH_MS = 10_000;
// Bridge brief telemetry gaps without claiming the machine is still online.
export const LIVE_SIGNAL_MAX_AGE_MS = 30_000;
type State = keyof typeof LABELS;
type Stage = { phase: DigitalTwinCyclePhase; focus: PartGroupId[]; effects?: DigitalTwinPresentation["effects"]; pose?: { main: number; lower: number } };
const neutral = { main: 0, lower: 1 };
const tamped = { main: 1, lower: .5 };
const stages: Record<State, Stage> = {
  IDLE: { phase: "idle", focus: [], pose: neutral },
  CHECKING_TEMPERATURE: { phase: "idle", focus: ["water"] },
  HEATING: { phase: "idle", focus: ["water"] },
  CHECKING_ERRORS: { phase: "idle", focus: [] },
  STARTING_MILK: { phase: "idle", focus: ["output"] },
  WAITING_FOR_MILK: { phase: "idle", focus: ["output"] },
  RETURN_TO_NEUTRAL_1: { phase: "scraping", focus: ["brewUnit"], pose: neutral },
  EJECT_GROUNDS_1: { phase: "ejecting", focus: ["brewUnit", "waste"], pose: { main: 0, lower: 0 } },
  RETURN_TO_NEUTRAL_2: { phase: "scraping", focus: ["brewUnit"], pose: neutral },
  GRINDING: { phase: "grinding", focus: ["hopper", "grinder", "brewUnit"], effects: { grinderSpin: true, coffee: true }, pose: neutral },
  CLOSE_CHAMBER_LID: { phase: "closing", focus: ["brewUnit"], pose: { main: 1, lower: 1 } },
  TAMPING_ACCORDING_TO_RECIPE: { phase: "tamping", focus: ["brewUnit"], pose: tamped },
  PRE_INFUSION: { phase: "extraction", focus: ["water", "brewUnit"], effects: { water: true }, pose: tamped },
  MAIN_EXTRACTION: { phase: "extraction", focus: ["water", "brewUnit", "output"], effects: { water: true, coffee: true }, pose: tamped },
  DRY_TAMP: { phase: "tamping", focus: ["brewUnit"], pose: tamped },
  OPEN_CHAMBER_LID: { phase: "opening", focus: ["brewUnit"], pose: { main: 0, lower: .5 } },
  EJECT_GROUNDS_2: { phase: "ejecting", focus: ["brewUnit", "waste"], pose: { main: 0, lower: 0 } },
  RETURN_TO_NEUTRAL_3: { phase: "scraping", focus: ["brewUnit"], pose: neutral },
  COMPLETE: { phase: "complete", focus: [], pose: neutral },
  ERROR: { phase: "fault", focus: [] },
};

export function telemetryMetrics(value: unknown): Record<string, unknown> {
  try {
    const data: unknown = typeof value === "string" ? JSON.parse(value) : value;
    return data && typeof data === "object" && !Array.isArray(data) ? data as Record<string, unknown> : {};
  } catch { return {}; }
}

export function recentLiveHeartbeat(value: MachineHeartbeat | undefined | null, machineId: string, now: number): value is MachineHeartbeat {
  if (!value || value.machineId !== machineId || !value.lastSeenAt) return false;
  const age = now - Date.parse(value.lastSeenAt);
  return Number.isFinite(age) && age >= -5_000 && age <= LIVE_SIGNAL_MAX_AGE_MS;
}

export function selectLiveHeartbeat(previous: MachineHeartbeat | null, incoming: MachineHeartbeat | undefined, machineId: string, _now: number) {
  if (!incoming || incoming.machineId !== machineId || !incoming.lastSeenAt || !Number.isFinite(Date.parse(incoming.lastSeenAt))) return null;
  if (!previous || previous.machineId !== machineId) return incoming;
  const previousTime = Date.parse(previous.deviceReportedAt ?? previous.lastSeenAt!);
  const incomingTime = Date.parse(incoming.deviceReportedAt ?? incoming.lastSeenAt!);
  if (incomingTime < previousTime) return previous;
  // Counters may restart with the next brew/device session; measurement time takes precedence.
  if (incomingTime === previousTime && incoming.sequenceNumber != null && previous.sequenceNumber != null && incoming.sequenceNumber <= previous.sequenceNumber) return incoming.status === previous.status ? previous : { ...previous, status: incoming.status };
  return incoming;
}

export function liveBrewView(heartbeat: MachineHeartbeat | null, fresh = true) {
  const metrics = telemetryMetrics(heartbeat?.metricsJson);
  const raw = heartbeat?.brewState && heartbeat.brewState !== "BREW_STATE_UNSPECIFIED" ? heartbeat.brewState : typeof metrics.fsm_state === "string" ? metrics.fsm_state : "";
  const normalized = raw.trim().toUpperCase().replace(/^BREW_STATE_/, "");
  const errorCode = typeof metrics.error_code === "number" ? metrics.error_code : 0;
  const state: State | null = errorCode > 0 ? "ERROR" : Object.hasOwn(stages, normalized) ? normalized as State : null;
  const stage = state ? stages[state] : undefined;
  const recipeStep = typeof metrics.recipe_step === "number" && Number.isSafeInteger(metrics.recipe_step) && metrics.recipe_step >= 0 ? metrics.recipe_step : null;
  const active = fresh && Boolean(state && !["IDLE", "COMPLETE", "ERROR"].includes(state));
  const label = !heartbeat ? "Chưa có tín hiệu pha mới từ máy" : state ? LABELS[state] : "Chưa nhận diện được bước pha của máy";
  const event: DigitalTwinCycleEvent | null = heartbeat && stage ? {
    machineId: heartbeat.machineId,
    cycleId: `${heartbeat.machineId}:live`,
    sequence: heartbeat.sequenceNumber ?? Date.parse(heartbeat.lastSeenAt!),
    phase: stage.phase,
    // Phase poses are schematic; raw encoder counts need a hardware calibration before driving geometry.
    progress: 1,
    emittedAt: new Date(heartbeat.lastSeenAt!).toISOString(),
    source: "server",
  } : null;
  const presentation = liveBrewPresentation(state, heartbeat?.machineId ?? "", recipeStep, fresh);
  return { state, label, event, presentation, active, recipeId: typeof metrics.recipe_id === "string" ? metrics.recipe_id : "", recipeName: typeof metrics.recipe_name === "string" ? metrics.recipe_name : "", recipeStep, simulated: metrics.simulated === true };
}

export function liveBrewPresentation(state: State | null, machineId: string, recipeStep: number | null, fresh: boolean): DigitalTwinPresentation {
  const stage = state ? stages[state] : undefined;
  const active = fresh && Boolean(state && !["IDLE", "COMPLETE", "ERROR"].includes(state));
  return {
    focus: stage?.focus ?? [], layers: { ...DEFAULT_PART_LAYERS }, ghostShells: active, autoCamera: true,
    continuousEffects: active, active, effects: active ? stage?.effects ?? {} : {},
    mechanismPose: stage?.pose,
    holdMechanism: !fresh || !state || state === "ERROR",
    stepId: machineId && state ? `${machineId}:live:${state}:${recipeStep ?? ""}` : undefined,
  };
}

export function liveHeartbeatConnected(heartbeat: MachineHeartbeat | undefined, machineId: string, now: number, error?: unknown) {
  if ((error && !isTemporaryTelemetryError(error)) || !heartbeat || heartbeat.machineId !== machineId || heartbeat.status !== "ONLINE") return false;
  // The server evaluates liveness independently from the latest brewing measurement.
  const evaluated = Date.parse(heartbeat.evaluatedAt ?? heartbeat.lastSeenAt ?? "");
  const age = now - evaluated;
  return Number.isFinite(age) && age >= -5_000 && age <= LIVE_SIGNAL_FRESH_MS;
}

export function useLiveBrewState(machineId: string, heartbeat: MachineHeartbeat | undefined, enabled: boolean, error: unknown, receivedAt = 0) {
  const [now, setNow] = useState(Date.now);
  const [accepted, setAccepted] = useState<MachineHeartbeat | null>(null);
  useEffect(() => {
    if (!enabled) return;
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(timer);
  }, [enabled]);
  // Use the API clock plus elapsed time so a skewed browser clock does not mark live data offline.
  const evaluatedAt = Date.parse(heartbeat?.evaluatedAt ?? "");
  const signalNow = receivedAt && Number.isFinite(evaluatedAt) ? evaluatedAt + Math.max(0, now - receivedAt) : now;
  useEffect(() => {
    setAccepted(previous => enabled ? selectLiveHeartbeat(previous, heartbeat, machineId, signalNow) : null);
  }, [enabled, heartbeat, machineId, signalNow]);
  const usable = enabled && accepted?.machineId === machineId ? accepted : null;
  // Liveness belongs to the newest heartbeat, even when its brew packet was rejected as out of order.
  const connected = enabled && liveHeartbeatConnected(heartbeat, machineId, signalNow, error);
  const fresh = Boolean(usable && connected && recentLiveHeartbeat(usable, machineId, signalNow) && signalNow - Date.parse(usable.lastSeenAt!) <= LIVE_SIGNAL_FRESH_MS);
  const view = useMemo(() => liveBrewView(usable, fresh), [usable, fresh]);
  // Keep camera/material work tied to a step change rather than every heartbeat.
  const presentation = useMemo(() => liveBrewPresentation(view.state, machineId, view.recipeStep, fresh), [view.state, machineId, view.recipeStep, fresh]);
  return { ...view, presentation, connected, fresh, reconnecting: connected && isTemporaryTelemetryError(error), delayed: Boolean(usable && !fresh) };
}
