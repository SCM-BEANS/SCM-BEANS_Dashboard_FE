import { z } from "zod";
import { MachineIdSchema } from "@/schema/machines.schema";

const dateTimeSchema = z.string().datetime({ offset: true });
const countSchema = z.number().int().nonnegative();

export const HeartbeatHealthSchema = z.object({
  osLoadAvg1m: z.number().nullish(),
  ramUsedMb: countSchema.nullish(),
  ramTotalMb: countSchema.nullish(),
  netbirdWireguardLatencyMs: countSchema.nullish(),
  wifiRssiDbm: z.number().int().nullish(),
  uartStats: z.object({
    packetsRx: countSchema.nullish(),
    crcErrors: countSchema.nullish(),
    droppedFrames: countSchema.nullish(),
  }).nullish(),
  firmwareVersion: z.string().nullish(),
  edgeAppVersion: z.string().nullish(),
}).passthrough();

export const MachineHeartbeatSchema = z.object({
  machineId: MachineIdSchema,
  status: z.enum(["ONLINE", "OFFLINE", "UNKNOWN"]),
  evaluatedAt: dateTimeSchema.nullish(),
  livenessStreamEntryId: z.string().nullish(),
  lastSeenAt: dateTimeSchema.nullish(),
  deviceReportedAt: dateTimeSchema.nullish(),
  healthStreamEntryId: z.string().nullish(),
  healthReportedAt: dateTimeSchema.nullish(),
  healthDeviceReportedAt: dateTimeSchema.nullish(),
  health: HeartbeatHealthSchema.nullish(),
}).passthrough();

export const TelemetryPointsParamsSchema = z.object({
  from: dateTimeSchema,
  to: dateTimeSchema,
  limit: z.number().int().min(1).max(1000).default(100),
  offset: z.number().int().min(0).max(100_000).default(0),
}).refine((range) => Date.parse(range.from) < Date.parse(range.to), {
  message: "Telemetry start must be before its end.",
  path: ["to"],
});

export const TelemetryPointSchema = z.object({
  timestamp: dateTimeSchema,
  field: z.string(),
  value: z.unknown(),
  machineId: MachineIdSchema,
  ownerId: z.string().uuid().nullish(),
  tenantId: z.string().uuid().nullish(),
  subState: z.string().nullish(),
}).passthrough();

export const TelemetryPointListSchema = z.array(TelemetryPointSchema);

export type MachineHeartbeat = z.infer<typeof MachineHeartbeatSchema>;
export type TelemetryPoint = z.infer<typeof TelemetryPointSchema>;
export type TelemetryPointsParams = z.infer<typeof TelemetryPointsParamsSchema>;
