import { z } from "zod";
import { MachineIdSchema } from "@/schema/machines.schema";

const dateTimeSchema = z.string().datetime({ offset: true });
const countSchema = z.number().int().nonnegative();
const connectionStatusSchema = z.enum(["ONLINE", "OFFLINE", "UNKNOWN"]);
const healthStatusSchema = z.enum(["STABLE", "MONITOR", "INSPECT", "INSUFFICIENT_DATA"]);
const scoreSchema = z.number().finite().min(0).max(100);
const measurementSchema = z.number().finite().nonnegative().nullish();
const subsystemFields = {
  score: scoreSchema.nullish(),
  condition: z.string().nullish(),
  evidence: z.string().nullish(),
};
const subsystemSchema = z.object({ ...subsystemFields, status: healthStatusSchema });

export const MachineHealthSchema = z.object({
  machineId: MachineIdSchema,
  serialNumber: z.string().nullish(),
  connectionStatus: connectionStatusSchema,
  overallStatus: healthStatusSchema,
  evaluatedAt: dateTimeSchema.nullish(),
  dataQuality: z.object({
    evaluatedCycles14d: countSchema,
    recentIncidents7d: countSchema,
    stuckSensorDetected: z.boolean(),
    sufficientHistory: z.boolean(),
  }),
  subsystems: z.object({
    thermal: subsystemSchema,
    hydraulics: subsystemSchema,
    kinematics: subsystemSchema,
    milk: z.object({ ...subsystemFields, status: healthStatusSchema.or(z.literal("DISABLED")) }),
  }),
  brewStability: z.array(z.object({
    recipeName: z.string(),
    brewCount: countSchema,
    meanYieldMl: measurementSchema,
    yieldCvPct: measurementSchema,
    meanDurationSec: measurementSchema,
    durationCvPct: measurementSchema,
    stabilityStatus: z.enum(["STABLE", "VARIABLE", "UNSTABLE", "INSUFFICIENT_DATA"]),
  })),
  cleaningHygiene: z.object({
    lastCleanedAt: dateTimeSchema.nullish(),
    cupsSinceLastClean: countSchema.nullish(),
    overdue: z.boolean().nullish(),
    note: z.string().nullish(),
  }),
  recommendations: z.array(z.string()),
  processStabilityDisclaimer: z.string().nullish(),
});

export const MachineMaintenancePriorityQueueSchema = z.array(z.object({
  machineId: MachineIdSchema,
  serialNumber: z.string().nullish(),
  location: z.string().nullish(),
  priorityScore: scoreSchema,
  overallStatus: healthStatusSchema,
  connectionStatus: connectionStatusSchema,
  activeAlerts: countSchema,
  cupsLast14d: countSchema,
  cleaningOverdue: z.boolean(),
  primaryReason: z.string().nullish(),
  recommendedFirstCheck: z.string().nullish(),
}));

export type MachineHealth = z.infer<typeof MachineHealthSchema>;

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
  status: connectionStatusSchema,
  evaluatedAt: dateTimeSchema.nullish(),
  livenessStreamEntryId: z.string().nullish(),
  lastSeenAt: dateTimeSchema.nullish(),
  deviceReportedAt: dateTimeSchema.nullish(),
  healthStreamEntryId: z.string().nullish(),
  healthReportedAt: dateTimeSchema.nullish(),
  healthDeviceReportedAt: dateTimeSchema.nullish(),
  health: HeartbeatHealthSchema.nullish(),
  latitude: z.number().finite().nullish(),
  longitude: z.number().finite().nullish(),
  brewState: z.string().nullish(),
  sequenceNumber: countSchema.safe().nullish(),
  // @JsonRawValue in BE may return any JSON value, not just a JSON string.
  metricsJson: z.unknown().optional(),
}).passthrough();

export const TelemetryPointsParamsSchema = z.object({
  from: dateTimeSchema,
  to: dateTimeSchema,
  limit: z.number().int().min(1).max(500).default(100),
  offset: z.number().int().min(0).max(100_000).default(0),
}).refine((range) => Date.parse(range.from) < Date.parse(range.to), {
  message: "Telemetry start must be before its end.",
  path: ["to"],
}).refine((range) => Date.parse(range.to) - Date.parse(range.from) <= 30 * 86_400_000, {
  message: "Khoảng dữ liệu telemetry tối đa 30 ngày.",
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
