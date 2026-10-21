import { z } from 'zod';

const uuid = z.string().uuid();
const count = z.number().int().nonnegative();
const dateTime = z.string().datetime({ offset: true });
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const MachineIdSchema = uuid;

export const MachineStatusSchema = z.enum([
  'IN_WAREHOUSE',
  'PENDING_ACTIVATION',
  'DEPLOYED_CONTRACT_OWNER',
  'DEPLOYED_STORE_OWNER',
  'UNDER_MAINTENANCE',
  'REFURBISHING',
  'PENDING_QA',
  'AVAILABLE_FOR_RENT',
  'RETIRED',
]);

export const MachineTypeSchema = z.enum(['CONVENTIONAL', 'SMART_IOT']);

export const MachineInventoryItemSchema = z.object({
  id: uuid,
  tenantId: uuid.nullish(),
  serialNumber: z.string().nullish(),
  status: MachineStatusSchema.nullish(),
  deployedAt: dateTime.nullish(),
  region: z.string().nullish(),
  ownerType: z.string().nullish(),
  contractStartDate: date.nullish(),
  contractEndDate: date.nullish(),
  monthlyRentalFee: z.number().nullish(),
});

export const MachineInventorySchema = z.array(MachineInventoryItemSchema);

export const MachineDetailSchema = z.object({
  id: uuid,
  tenantId: uuid.nullish(),
  serialNumber: z.string().nullish(),
  status: MachineStatusSchema.nullish(),
  deployedAt: dateTime.nullish(),
  nextPreventiveMaintenanceAt: dateTime.nullish(),
  cupsServedSinceLastDescale: count.nullish(),
  region: z.string().nullish(),
  locationId: uuid.nullish(),
  machineType: MachineTypeSchema.nullish(),
  machineTypeMappedAt: dateTime.nullish(),
  machineTypeMappedBy: z.string().nullish(),
  machineTypeMappingReason: z.string().nullish(),
});

export const InventorySummarySchema = z.object({
  totalMachines: count.nullish(),
  statusCounts: z.record(count).nullish(),
});

export const MaintenanceTicketSchema = z.object({
  id: uuid.nullish(),
  machineId: uuid.nullish(),
  tenantId: uuid.nullish(),
  contractId: uuid.nullish(),
  terminationCaseId: uuid.nullish(),
  alertLevel: z.string().nullish(),
  createdFromAlertId: uuid.nullish(),
  source: z.string().nullish(),
  preventiveSubtype: z.string().nullish(),
  createdBy: z.string().nullish(),
  acknowledgedAt: dateTime.nullish(),
  resolvedAt: dateTime.nullish(),
  assignedTo: z.string().nullish(),
  status: z.enum(['PENDING', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED']).nullish(),
  partsCost: z.number().nullish(),
  partsReplaced: z.string().nullish(),
  startedAt: dateTime.nullish(),
  resolutionDurationMinutes: count.nullish(),
  diagnosis: z.string().nullish(),
  responsibility: z.enum(['TENANT', 'COMPANY', 'UNKNOWN']).nullish(),
  estimatedCost: z.number().nullish(),
  actualCost: z.number().nullish(),
  notes: z.string().nullish(),
  evidenceReference: z.string().nullish(),
  resolutionResult: z.string().nullish(),
  completedAt: dateTime.nullish(),
});

export const MaintenanceTicketListSchema = z.array(MaintenanceTicketSchema);

export const MaintenanceScheduleSchema = z.object({
  nextPreventiveMaintenanceAt: dateTime.nullish(),
  cupsServedSinceLastDescale: count.nullish(),
});

const UartStatsSchema = z.object({
  packetsRx: count.nullish(),
  crcErrors: count.nullish(),
  droppedFrames: count.nullish(),
});

const HeartbeatHealthSchema = z.object({
  osLoadAvg1m: z.number().nullish(),
  ramUsedMb: count.nullish(),
  ramTotalMb: count.nullish(),
  netbirdWireguardLatencyMs: count.nullish(),
  wifiRssiDbm: z.number().int().nullish(),
  uartStats: UartStatsSchema.nullish(),
  firmwareVersion: z.string().nullish(),
  edgeAppVersion: z.string().nullish(),
});

export const MachineHeartbeatSchema = z.object({
  machineId: uuid,
  status: z.enum(['ONLINE', 'OFFLINE', 'UNKNOWN']),
  evaluatedAt: dateTime.nullish(),
  livenessStreamEntryId: z.string().nullish(),
  lastSeenAt: dateTime.nullish(),
  deviceReportedAt: dateTime.nullish(),
  healthStreamEntryId: z.string().nullish(),
  healthReportedAt: dateTime.nullish(),
  healthDeviceReportedAt: dateTime.nullish(),
  health: HeartbeatHealthSchema.nullish(),
});

export type MachineInventoryItem = z.infer<typeof MachineInventoryItemSchema>;
export type MachineDetail = z.infer<typeof MachineDetailSchema>;
export type InventorySummary = z.infer<typeof InventorySummarySchema>;
export type MaintenanceTicket = z.infer<typeof MaintenanceTicketSchema>;
export type MachineHeartbeat = z.infer<typeof MachineHeartbeatSchema>;
