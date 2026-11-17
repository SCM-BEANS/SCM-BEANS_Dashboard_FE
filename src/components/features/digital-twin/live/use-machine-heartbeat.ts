import { useQuery } from "@tanstack/react-query";
import { telemetryApi } from "@/apis/telemetry.api";
import { pollingInterval, usePageVisibility } from "@/components/machines/machine-heartbeat-visibility";
import type { MachineHeartbeat } from "@/schema/telemetry.schema";
import { authScopedQuerySubject } from "@/lib/query-subject";

// shortcut: Latest REST polling can miss subsecond states; use an event stream when the API exposes one.
const HEARTBEAT_REFRESH_INTERVAL_MS = 1_000;

export function useMachineHeartbeat({
  machineId,
  enabled,
  intervalMs = HEARTBEAT_REFRESH_INTERVAL_MS,
}: {
  machineId: string;
  enabled: boolean;
  intervalMs?: number;
}): {
  heartbeat: MachineHeartbeat | undefined;
  receivedAt: number;
  isLoading: boolean;
  error: unknown;
  refetch: () => Promise<unknown>;
} {
  const pageVisible = usePageVisibility();
  const subject = authScopedQuerySubject("OWNER");
  const query = useQuery({
    queryKey: ["owner-machine-heartbeat", subject, machineId],
    queryFn: ({ signal }) => telemetryApi.getLatestHeartbeat(machineId, signal),
    enabled: enabled && pageVisible,
    retry: false,
    staleTime: 900,
    refetchInterval: query => enabled && pageVisible ? pollingInterval(query, intervalMs) : false,
    refetchIntervalInBackground: false,
  });

  return {
    heartbeat: query.data,
    receivedAt: query.dataUpdatedAt,
    isLoading: query.isPending,
    error: query.error,
    refetch: query.refetch,
  };
}
