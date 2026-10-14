"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import {
  DigitalTwinMaterialEffectEventSchema,
  type DigitalTwinMaterialEffect,
  type DigitalTwinMaterialEffectEvent,
  type DigitalTwinMaterialEffectPhase,
} from "@/schemas/digitalTwinMaterialEffects";

export interface MaterialEffectsTestState {
  phase: DigitalTwinMaterialEffectPhase;
  progress: number;
  cycleId: number;
  sequence: number;
}

interface MaterialEffectsTestRuntime extends MaterialEffectsTestState {
  elapsedMs: number;
  lastUiElapsedMs: number;
}

export interface UseMaterialEffectsTestOptions {
  effect: DigitalTwinMaterialEffect;
  durationMs: number;
  onFrame: (
    progress: number,
    phase: DigitalTwinMaterialEffectPhase,
    deltaSeconds: number,
  ) => void;
  onStateChange?: (state: MaterialEffectsTestState) => void;
  onEvent?: (event: DigitalTwinMaterialEffectEvent) => void;
}

const INITIAL_STATE: MaterialEffectsTestState = {
  phase: "idle",
  progress: 0,
  cycleId: 0,
  sequence: 0,
};

export function useMaterialEffectsTest({
  effect,
  durationMs,
  onFrame,
  onStateChange,
  onEvent,
}: UseMaterialEffectsTestOptions) {
  const [state, setState] = useState<MaterialEffectsTestState>(INITIAL_STATE);
  const [reducedMotion, setReducedMotion] = useState(false);
  const runtimeRef = useRef<MaterialEffectsTestRuntime>({
    ...INITIAL_STATE,
    elapsedMs: 0,
    lastUiElapsedMs: 0,
  });
  const mountedRef = useRef(true);
  const onFrameRef = useRef(onFrame);
  const onStateChangeRef = useRef(onStateChange);
  const onEventRef = useRef(onEvent);

  useEffect(() => {
    onFrameRef.current = onFrame;
    onStateChangeRef.current = onStateChange;
    onEventRef.current = onEvent;
  }, [onEvent, onFrame, onStateChange]);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updateReducedMotion = () => setReducedMotion(mediaQuery.matches);

    updateReducedMotion();
    mediaQuery.addEventListener("change", updateReducedMotion);
    return () => mediaQuery.removeEventListener("change", updateReducedMotion);
  }, []);

  const publish = useCallback(
    (nextState: MaterialEffectsTestState, emitEvent: boolean) => {
      const runtime = runtimeRef.current;
      runtime.phase = nextState.phase;
      runtime.progress = nextState.progress;
      runtime.cycleId = nextState.cycleId;
      runtime.sequence = nextState.sequence;

      if (!mountedRef.current) return;
      setState(nextState);
      onStateChangeRef.current?.(nextState);

      if (!emitEvent || nextState.cycleId < 1) return;
      const event = DigitalTwinMaterialEffectEventSchema.parse({
        effect,
        phase: nextState.phase,
        progress: nextState.progress,
        cycleId: nextState.cycleId,
        sequence: nextState.sequence,
        emittedAt: new Date().toISOString(),
        source: "test",
      });
      onEventRef.current?.(event);
    },
    [effect],
  );

  const run = useCallback(() => {
    const runtime = runtimeRef.current;
    if (runtime.phase === "running") return;

    const cycleId = runtime.cycleId + 1;
    const runningState: MaterialEffectsTestState = {
      phase: "running",
      progress: 0,
      cycleId,
      sequence: runtime.sequence + 1,
    };
    runtime.elapsedMs = 0;
    runtime.lastUiElapsedMs = 0;
    publish(runningState, true);
    onFrameRef.current?.(0, "running", 0);

    if (!reducedMotion) return;

    const completeState: MaterialEffectsTestState = {
      phase: "complete",
      progress: 1,
      cycleId,
      sequence: runningState.sequence + 1,
    };
    publish(completeState, true);
    onFrameRef.current?.(1, "complete", 0);
  }, [publish, reducedMotion]);

  const reset = useCallback(() => {
    const runtime = runtimeRef.current;
    const resetState: MaterialEffectsTestState = {
      phase: "idle",
      progress: 0,
      cycleId: runtime.cycleId,
      sequence: runtime.sequence + 1,
    };
    runtime.elapsedMs = 0;
    runtime.lastUiElapsedMs = 0;
    publish(resetState, resetState.cycleId >= 1);
    onFrameRef.current?.(0, "idle", 0);
  }, [publish]);

  useFrame((_, deltaSeconds) => {
    const runtime = runtimeRef.current;
    if (runtime.phase !== "running") return;

    const delta = Math.min(Math.max(deltaSeconds, 0), 0.1);
    runtime.elapsedMs += delta * 1000;
    const progress = Math.min(1, runtime.elapsedMs / Math.max(durationMs, 1));
    const hasCompleted = progress >= 1;

    try {
      onFrameRef.current?.(
        progress,
        hasCompleted ? "complete" : "running",
        delta,
      );
    } catch (error) {
      const faultState: MaterialEffectsTestState = {
        phase: "fault",
        progress,
        cycleId: runtime.cycleId,
        sequence: runtime.sequence + 1,
      };
      publish(faultState, true);
      console.error("Material effects test frame failed.", error);
      return;
    }

    if (hasCompleted) {
      const completeState: MaterialEffectsTestState = {
        phase: "complete",
        progress: 1,
        cycleId: runtime.cycleId,
        sequence: runtime.sequence + 1,
      };
      publish(completeState, true);
      return;
    }

    if (runtime.elapsedMs - runtime.lastUiElapsedMs < 80) return;
    runtime.lastUiElapsedMs = runtime.elapsedMs;
    publish(
      {
        phase: "running",
        progress,
        cycleId: runtime.cycleId,
        sequence: runtime.sequence,
      },
      false,
    );
  });

  useEffect(() => {
    return () => {
      mountedRef.current = false;
      runtimeRef.current.phase = "idle";
      runtimeRef.current.progress = 0;
      onFrameRef.current?.(0, "idle", 0);
    };
  }, []);

  return {
    state,
    reducedMotion,
    run,
    reset,
  };
}
