import { axiosClient, DOLORES_API_BASE_URL } from "@/lib/http";
import { MachineIdSchema } from "@/schema/machines.schema";
import {
  MachineHeartbeatSchema,
  TelemetryPointListSchema,
  TelemetryPointsParamsSchema,
} from "@/schema/telemetry.schema";

export const TELEMETRY_POINTS_PAGE_SIZE = 100;

export class TelemetryMachineMismatchError extends Error {
  constructor() {
    super("Dolores returned telemetry for a different machine UUID.");
    this.name = "TelemetryMachineMismatchError";
  }
}

export class HeartbeatMachineMismatchError extends Error {
  constructor() {
    super("Dolores returned a heartbeat for a different machine UUID.");
    this.name = "HeartbeatMachineMismatchError";
  }
}

const machinePath = (id: string) => encodeURIComponent(MachineIdSchema.parse(id));

export const telemetryApi = {
  async getLatestHeartbeat(id: string, signal?: AbortSignal) {
    const machineId = MachineIdSchema.parse(id);
    const response = await axiosClient.get<unknown>(
      `/telemetry-query/machines/${machinePath(machineId)}/heartbeats/latest`,
      { baseURL: DOLORES_API_BASE_URL, signal },
    );
    const heartbeat = MachineHeartbeatSchema.parse(response.data);
    if (heartbeat.machineId !== machineId) throw new HeartbeatMachineMismatchError();
    return heartbeat;
  },
  async listMachinePoints(
    id: string,
    range: { from: string; to: string },
    offset: number,
    signal?: AbortSignal,
  ) {
    const machineId = MachineIdSchema.parse(id);
    const params = TelemetryPointsParamsSchema.parse({
      ...range,
      limit: TELEMETRY_POINTS_PAGE_SIZE,
      offset,
    });
    const response = await axiosClient.get<unknown>(
      `/telemetry-query/machines/${machinePath(machineId)}/points`,
      { baseURL: DOLORES_API_BASE_URL, params, signal },
    );
    const points = TelemetryPointListSchema.parse(response.data);
    if (points.some((point) => point.machineId !== machineId)) {
      throw new TelemetryMachineMismatchError();
    }
    return points;
  },
};
