import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { telemetryApi } from "@/apis/telemetry.api";
import { usePageVisibility } from "@/components/machines/machine-heartbeat-visibility";
import {
  DIGITAL_TWIN_OPERATION_STAGES,
  type DigitalTwinOperationPhase,
} from "@/components/features/digital-twin/operation/DigitalTwinOperationConfig";
import {
  DigitalTwinCycleEventSchema,
  type DigitalTwinCycleEvent,
} from "@/schema/digital-twin-cycle.schema";
import type { MachineHeartbeat } from "@/schema/telemetry.schema";
import { authScopedQuerySubject } from "@/lib/query-subject";
import { mapBrewState } from "./brew-state-mapping";

const LIVE_EVENT_INTERVAL_MS = 100;

interface LiveCycleRef {
  machineId: string;
  rawState: string | null;
  cycleId: string;
  sequence: number;
  startedAt: number;
  progress: number;
}

export function useLiveBrewCycle({
  machineId,
  enabled,
}: {
  machineId: string;
  enabled: boolean;
}) {
  const pageVisible = usePageVisibility();
  const subject = authScopedQuerySubject("OWNER");
  const heartbeatQuery = useQuery({
    queryKey: ["digital-twin-live-heartbeat", subject, machineId],
    queryFn: ({ signal }) => telemetryApi.getLatestHeartbeat(machineId, signal),
    enabled,
    retry: false,
    refetchInterval: enabled && pageVisible ? 3_000 : false,
    refetchIntervalInBackground: false,
  });
  const heartbeat = heartbeatQuery.data;
  const rawState = heartbeat?.brewState ?? null;
  const mapped = useMemo(() => mapBrewState(rawState), [rawState]);
  const [event, setEvent] = useState<DigitalTwinCycleEvent | null>(null);
  const cycleRef = useRef<LiveCycleRef | null>(null);
  const isLive =
    enabled &&
    pageVisible &&
    !heartbeatQuery.isError &&
    heartbeat?.status === "ONLINE";

  useEffect(() => {
    if (!isLive || !machineId) return;

    const sameCycle =
      cycleRef.current?.machineId === machineId &&
      cycleRef.current.rawState === rawState;
    if (!sameCycle) {
      cycleRef.current = {
        machineId,
        rawState,
        cycleId: `server-${Date.now().toString(36)}`,
        sequence: 0,
        startedAt: Date.now(),
        progress: 0,
      };
    }

    const emit = (phase: DigitalTwinCycleEvent["phase"], progress: number) => {
      const cycle = cycleRef.current;
      if (!cycle) return;
      cycle.progress = progress;
      setEvent(
        DigitalTwinCycleEventSchema.parse({
          machineId,
          cycleId: cycle.cycleId,
          sequence: cycle.sequence,
          phase,
          progress,
          emittedAt: new Date().toISOString(),
          source: "server",
        }),
      );
      cycle.sequence += 1;
    };

    const phase = mapped.phase;
    if (phase === null) {
      cycleRef.current = null;
      setEvent(null);
      return;
    }

    const operationPhase = phase as DigitalTwinOperationPhase;
    const stage = DIGITAL_TWIN_OPERATION_STAGES.find(
      (candidate) => candidate.phase === operationPhase,
    );
    if (!stage) {
      const progress = phase === "complete" ? 1 : 0;
      emit(phase, progress);
      return;
    }

    if (!sameCycle) emit(phase, 0);
    else emit(phase, cycleRef.current?.progress ?? 0);

    const updateProgress = () => {
      const cycle = cycleRef.current;
      if (!cycle) return;
      const elapsedMs = Math.max(0, Date.now() - cycle.startedAt);
      const positionMs = elapsedMs % stage.durationMs;
      const progress =
        elapsedMs > 0 && positionMs < LIVE_EVENT_INTERVAL_MS
          ? 1
          : positionMs / stage.durationMs;
      emit(phase, progress);
    };
    const timer = setInterval(updateProgress, LIVE_EVENT_INTERVAL_MS);

    return () => {
      clearInterval(timer);
      const cycle = cycleRef.current;
      if (cycle?.machineId === machineId && cycle.rawState === rawState) {
        cycle.startedAt = Date.now() - cycle.progress * stage.durationMs;
      }
    };
  }, [enabled, heartbeat?.status, heartbeatQuery.isError, isLive, machineId, mapped, pageVisible, rawState]);

  return {
    heartbeat,
    event,
    mapped,
    stale: heartbeat?.status === "OFFLINE" || heartbeat?.status === "UNKNOWN",
    isLoading: heartbeatQuery.isPending,
    error: heartbeatQuery.error,
    refetch: heartbeatQuery.refetch,
  };
}
