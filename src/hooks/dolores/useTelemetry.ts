'use client';

import { useInfiniteQuery } from '@tanstack/react-query';
import { telemetryApi, TELEMETRY_POINTS_PAGE_SIZE } from '@/apis/dolores/telemetry.api';
import { retryDoloresRead } from '@/hooks/dolores/queryPolicy';
import { MachineIdSchema } from '@/schemas/dolores/machines';

export type TelemetryPointsRange = {
  from: string;
  to: string;
};

export const telemetryQueryKeys = {
  machinePoints: (machineId: string, from: string | null, to: string | null) =>
    ['dolores', 'telemetry', 'points', machineId, from, to] as const,
};

export function useMachineTelemetryPoints(
  machineId: string,
  range: TelemetryPointsRange | null,
  enabled: boolean
) {
  const validId = MachineIdSchema.safeParse(machineId).success;

  return useInfiniteQuery({
    queryKey: telemetryQueryKeys.machinePoints(machineId, range?.from ?? null, range?.to ?? null),
    queryFn: ({ signal, pageParam }) => {
      if (!range) {
        throw new Error('A time range is required to query telemetry points.');
      }

      return telemetryApi.listMachinePoints(machineId, range.from, range.to, pageParam, signal);
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) =>
      lastPage.length === TELEMETRY_POINTS_PAGE_SIZE ? allPages.length * TELEMETRY_POINTS_PAGE_SIZE : undefined,
    enabled: validId && enabled && range !== null,
    retry: retryDoloresRead,
  });
}
