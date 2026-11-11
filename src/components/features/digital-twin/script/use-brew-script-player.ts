import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  DigitalTwinCycleEventSchema,
  type DigitalTwinCycleEvent,
} from "@/schema/digital-twin-cycle.schema";
import { DIGITAL_TWIN_RECIPE_TWIN_MESSAGES as T } from "@/text/digital-twin/digital-twin-messages";
import { DIGITAL_TWIN_OPERATION_STAGES } from "../operation/DigitalTwinOperationConfig";
import { DEFAULT_PART_LAYERS, type DigitalTwinPresentation } from "../presentation/part-groups";
import type { BrewScript, BrewScriptStep } from "./build-brew-script";

export type BrewScriptSource = "server" | "test";
export type BrewScriptPlayerStatus = "idle" | "running";

interface QueuedScript {
  script: BrewScript;
  source: BrewScriptSource;
}

interface ActiveScript extends QueuedScript {
  cycleId: string;
  index: number;
  sequence: number;
  lastMotionEvent: DigitalTwinCycleEvent | null;
}

interface PlaybackState {
  status: BrewScriptPlayerStatus;
  script: BrewScript | null;
  stepIndex: number;
  event: DigitalTwinCycleEvent | null;
  source: BrewScriptSource;
  runId: number;
}

const INITIAL_STATE: PlaybackState = {
  status: "idle",
  script: null,
  stepIndex: -1,
  event: null,
  source: "test",
  runId: 0,
};

function getStepEvent(
  machineId: string,
  active: ActiveScript,
  step: BrewScriptStep,
  progress: number,
) {
  if (!step.phase) return active.lastMotionEvent;
  const event = DigitalTwinCycleEventSchema.parse({
    machineId,
    cycleId: active.cycleId,
    sequence: active.sequence,
    phase: step.phase,
    progress: step.motionProgress ?? progress,
    emittedAt: new Date().toISOString(),
    source: active.source,
  });
  active.sequence += 1;

  const stage = DIGITAL_TWIN_OPERATION_STAGES.find((candidate) => candidate.phase === step.phase);
  if (stage?.motion || step.motionHold || step.motionProgress !== undefined) {
    active.lastMotionEvent = event;
  }
  return event;
}

export function useBrewScriptPlayer(machineId: string) {
  const [playback, setPlayback] = useState<PlaybackState>(INITIAL_STATE);
  const activeRef = useRef<ActiveScript | null>(null);
  const queueRef = useRef<QueuedScript[]>([]);
  const runCounterRef = useRef(0);

  const startScript = useCallback((item: QueuedScript) => {
    runCounterRef.current += 1;
    const unique = runCounterRef.current.toString(36) + "-" + Date.now().toString(36);
    const active: ActiveScript = {
      ...item,
      cycleId: item.script.id + "-" + unique,
      index: 0,
      sequence: 0,
      lastMotionEvent: null,
    };
    activeRef.current = active;
    const firstStep = item.script.steps[0];
    setPlayback({
      status: firstStep ? "running" : "idle",
      script: firstStep ? item.script : null,
      stepIndex: firstStep ? 0 : -1,
      event: null,
      source: item.source,
      runId: runCounterRef.current,
    });
    if (!firstStep) activeRef.current = null;
  }, []);

  const play = useCallback((script: BrewScript, source: BrewScriptSource = "test") => {
    queueRef.current = [];
    startScript({ script, source });
  }, [startScript]);

  const queue = useCallback((scripts: BrewScript | readonly BrewScript[], source: BrewScriptSource = "server") => {
    const scriptList: readonly BrewScript[] = Array.isArray(scripts)
      ? scripts as readonly BrewScript[]
      : [scripts as BrewScript];
    const items: QueuedScript[] = scriptList.map((script) => ({ script, source }));
    if (items.length === 0) return;
    if (activeRef.current) {
      queueRef.current.push(...items);
      return;
    }
    startScript(items[0]);
    if (items.length > 1) queueRef.current.push(...items.slice(1));
  }, [startScript]);

  const stop = useCallback(() => {
    queueRef.current = [];
    activeRef.current = null;
    runCounterRef.current += 1;
    setPlayback({ ...INITIAL_STATE, runId: runCounterRef.current });
  }, []);

  useEffect(() => {
    const active = activeRef.current;
    if (
      playback.status !== "running" ||
      !active ||
      active.script !== playback.script ||
      active.index !== playback.stepIndex
    ) return;

    const step = active.script.steps[active.index];
    if (!step) return;
    const startedAt = Date.now();
    let finished = false;

    const emit = () => {
      if (activeRef.current !== active || finished) return;
      const elapsed = Math.max(0, Date.now() - startedAt);
      const progress = Math.min(1, elapsed / Math.max(1, step.durationMs));
      const event = getStepEvent(machineId, active, step, progress);
      setPlayback((current) => current.runId === playback.runId ? { ...current, event } : current);

      if (elapsed < step.durationMs) return;
      finished = true;
      const nextIndex = active.index + 1;
      if (nextIndex < active.script.steps.length) {
        active.index = nextIndex;
        setPlayback((current) => current.runId === playback.runId ? {
          ...current,
          stepIndex: nextIndex,
          event: active.lastMotionEvent,
        } : current);
        return;
      }

      const next = queueRef.current.shift();
      if (next) {
        startScript(next);
      } else {
        activeRef.current = null;
        setPlayback((current) => current.runId === playback.runId ? {
          ...INITIAL_STATE,
          source: active.source,
          runId: current.runId,
        } : current);
      }
    };

    emit();
    const timer = setInterval(emit, 100);
    return () => clearInterval(timer);
  }, [machineId, playback.runId, playback.script, playback.status, playback.stepIndex, startScript]);

  const currentStep = playback.script?.steps[playback.stepIndex] ?? null;
  const presentation = useMemo<DigitalTwinPresentation>(() => {
    if (!currentStep) {
      return {
        focus: [],
        layers: { ...DEFAULT_PART_LAYERS },
        ghostShells: false,
        autoCamera: true,
        label: { text: T.ready, group: "brewUnit" },
        effects: {},
        active: false,
        stepId: undefined,
      };
    }
    const label = currentStep.valueText
      ? currentStep.label + " " + currentStep.valueText
      : currentStep.label;
    return {
      focus: currentStep.focus,
      layers: { ...DEFAULT_PART_LAYERS },
      ghostShells: true,
      autoCamera: true,
      label: { text: label, group: currentStep.focus[0] ?? "brewUnit" },
      effects: currentStep.effects,
      active: true,
      stepId: playback.runId + ":" + currentStep.id,
    };
  }, [currentStep, playback.runId]);

  return {
    status: playback.status,
    script: playback.script,
    stepIndex: playback.stepIndex,
    currentStep,
    event: playback.event,
    source: playback.source,
    presentation,
    play,
    stop,
    queue,
  };
}
