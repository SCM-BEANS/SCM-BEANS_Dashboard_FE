import { requestDolores } from './client';
import { MachineIdSchema } from '@/schemas/dolores/machines';
import { TelemetryPointListSchema } from '@/schemas/dolores/telemetry';

export const TELEMETRY_POINTS_PAGE_SIZE = 100;

function requireMachineId(machineId: string): string {
  return MachineIdSchema.parse(machineId);
}

export const telemetryApi = {
  listMachinePoints: (
    machineId: string,
    from: string,
    to: string,
    offset: number,
    signal?: AbortSignal
  ) =>
    requestDolores(
      {
        method: 'GET',
        url: '/telemetry-query/machines/' + encodeURIComponent(requireMachineId(machineId)) + '/points',
        params: { from, to, limit: TELEMETRY_POINTS_PAGE_SIZE, offset },
        signal,
      },
      TelemetryPointListSchema
    ),
};
