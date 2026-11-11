import { useQuery } from "@tanstack/react-query";
import { telemetryApi } from "@/apis/telemetry.api";
import { usePageVisibility } from "@/components/machines/machine-heartbeat-visibility";
import type { MachineHeartbeat } from "@/schema/telemetry.schema";
import { authScopedQuerySubject } from "@/lib/query-subject";

const HEARTBEAT_REFRESH_INTERVAL_MS = 10_000;

export function useMachineHeartbeat({
  machineId,
  enabled,
}: {
  machineId: string;
  enabled: boolean;
}): {
  heartbeat: MachineHeartbeat | undefined;
  stale: boolean;
  isLoading: boolean;
  error: unknown;
  refetch: () => Promise<unknown>;
} {
  const pageVisible = usePageVisibility();
  const subject = authScopedQuerySubject("OWNER");
  const query = useQuery({
    queryKey: ["digital-twin-heartbeat", subject, machineId],
    queryFn: ({ signal }) => telemetryApi.getLatestHeartbeat(machineId, signal),
    enabled,
    retry: false,
    refetchInterval: enabled && pageVisible ? HEARTBEAT_REFRESH_INTERVAL_MS : false,
    refetchIntervalInBackground: false,
  });

  return {
    heartbeat: query.data,
    stale: !query.isPending && (
      !query.data || query.data.status === "OFFLINE" || query.data.status === "UNKNOWN"
    ),
    isLoading: query.isPending,
    error: query.error,
    refetch: query.refetch,
  };
}
