import { useCallback, useEffect, useRef, useState } from "react";
import {
  DigitalTwinCycleEventSchema,
  type DigitalTwinCycleEvent,
  type DigitalTwinCyclePhase,
  type DigitalTwinCycleStatus,
} from "@/schemas/digitalTwinCycle";
import {
  DIGITAL_TWIN_OPERATION_STAGES,
  validateDigitalTwinOperationConfig,
  type DigitalTwinOperationStageDefinition,
} from "./DigitalTwinOperationConfig";

const DEFAULT_TEST_MACHINE_ID = "coffee-machine-local-test";
const CYCLE_TICK_MS = 100;

export interface UseDigitalTwinTestCycleOptions {
  machineId?: string;
  stages?: readonly DigitalTwinOperationStageDefinition[];
}

export interface DigitalTwinTestCycleState {
  status: DigitalTwinCycleStatus;
  currentEvent: DigitalTwinCycleEvent | null;
  error: string | null;
  isRunning: boolean;
  start: () => void;
  reset: () => void;
  fail: (reason: unknown) => void;
}

function createCycleId() {
  return `test-${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unknown test cycle error.";
}

export function useDigitalTwinTestCycle({
  machineId = DEFAULT_TEST_MACHINE_ID,
  stages = DIGITAL_TWIN_OPERATION_STAGES,
}: UseDigitalTwinTestCycleOptions = {}): DigitalTwinTestCycleState {
  const [status, setStatus] = useState<DigitalTwinCycleStatus>("idle");
  const [currentEvent, setCurrentEvent] =
    useState<DigitalTwinCycleEvent | null>(null);
  const [error, setError] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const runTokenRef = useRef(0);
  const runningRef = useRef(false);

  const clearTimer = useCallback(() => {
    if (timerRef.current === null) return;
    clearTimeout(timerRef.current);
    timerRef.current = null;
  }, []);

  const reset = useCallback(() => {
    runTokenRef.current += 1;
    runningRef.current = false;
    clearTimer();
    setStatus("idle");
    setCurrentEvent(null);
    setError(null);
  }, [clearTimer]);

  const fail = useCallback(
    (reason: unknown) => {
      runTokenRef.current += 1;
      runningRef.current = false;
      clearTimer();
      setError(getErrorMessage(reason));
      setStatus("fault");
      setCurrentEvent((previousEvent) =>
        DigitalTwinCycleEventSchema.parse({
          machineId,
          cycleId: previousEvent?.cycleId ?? createCycleId(),
          sequence: (previousEvent?.sequence ?? -1) + 1,
          phase: "fault",
          progress: 0,
          emittedAt: new Date().toISOString(),
          source: "test",
        }),
      );
    },
    [clearTimer, machineId],
  );

  const start = useCallback(() => {
    if (runningRef.current || status === "running") return;

    runTokenRef.current += 1;
    runningRef.current = true;
    const runToken = runTokenRef.current;
    clearTimer();

    const cycleId = createCycleId();
    let sequence = 0;
    let stageIndex = 0;
    let stageStartedAt = Date.now();

    const emit = (phase: DigitalTwinCyclePhase, progress: number) => {
      const event = DigitalTwinCycleEventSchema.parse({
        machineId,
        cycleId,
        sequence,
        phase,
        progress,
        emittedAt: new Date().toISOString(),
        source: "test",
      });
      sequence += 1;
      setCurrentEvent(event);
      return event;
    };

    try {
      validateDigitalTwinOperationConfig(stages);
      setError(null);
      setStatus("running");
      emit(stages[stageIndex].phase, 0);

      const tick = () => {
        if (runTokenRef.current !== runToken) return;

        const stage = stages[stageIndex];
        const elapsedMs = Date.now() - stageStartedAt;
        const progress = Math.min(elapsedMs / stage.durationMs, 1);

        if (progress >= 1) {
          emit(stage.phase, 1);

          if (stageIndex === stages.length - 1) {
            emit("complete", 1);
            timerRef.current = null;
            runningRef.current = false;
            setStatus("complete");
            return;
          }

          stageIndex += 1;
          stageStartedAt = Date.now();
          emit(stages[stageIndex].phase, 0);
        } else {
          emit(stage.phase, progress);
        }

        timerRef.current = setTimeout(tick, CYCLE_TICK_MS);
      };

      timerRef.current = setTimeout(tick, CYCLE_TICK_MS);
    } catch (cycleError) {
      const message = getErrorMessage(cycleError);
      setError(message);
      setStatus("fault");
      runningRef.current = false;
      emit("fault", 0);
      timerRef.current = null;
    }
  }, [clearTimer, machineId, stages, status]);

  useEffect(() => {
    return () => {
      runTokenRef.current += 1;
      runningRef.current = false;
      clearTimer();
    };
  }, [clearTimer]);

  return {
    status,
    currentEvent,
    error,
    isRunning: status === "running",
    start,
    reset,
    fail,
  };
}
