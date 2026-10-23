import { z } from "zod";

export const MachineIdSchema = z.string().uuid();
const countSchema = z.number().int().nonnegative();
const dateTimeSchema = z.union([
  z.string().datetime({ offset: true }),
  z.string().datetime({ local: true }),
]);
const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const MachineStatusSchema = z.enum([
  "IN_WAREHOUSE",
  "PENDING_ACTIVATION",
  "DEPLOYED_CONTRACT_OWNER",
  "DEPLOYED_STORE_OWNER",
  "UNDER_MAINTENANCE",
  "REFURBISHING",
  "PENDING_QA",
  "AVAILABLE_FOR_RENT",
  "RETIRED",
]);

export const MachineTypeSchema = z.enum(["CONVENTIONAL", "SMART_IOT"]);

export const MachineInventoryItemSchema = z.object({
  id: MachineIdSchema,
  ownerId: z.string().uuid().nullish(),
  serialNumber: z.string().nullish(),
  status: MachineStatusSchema.nullish(),
  deployedAt: dateTimeSchema.nullish(),
  region: z.string().nullish(),
  contractStartDate: dateSchema.nullish(),
  contractEndDate: dateSchema.nullish(),
  monthlyRentalFee: z.number().nullish(),
}).passthrough();

export const MachineInventorySchema = z.array(MachineInventoryItemSchema);

export const MachineSchema = z.object({
  id: MachineIdSchema,
  ownerId: z.string().uuid().nullish(),
  serialNumber: z.string().nullish(),
  status: MachineStatusSchema.nullish(),
  deployedAt: dateTimeSchema.nullish(),
  nextPreventiveMaintenanceAt: dateTimeSchema.nullish(),
  cupsServedSinceLastDescale: countSchema.nullish(),
  region: z.string().nullish(),
  locationId: z.string().uuid().nullish(),
  machineType: MachineTypeSchema.nullish(),
  machineTypeMappedAt: dateTimeSchema.nullish(),
  machineTypeMappedBy: z.string().nullish(),
  machineTypeMappingReason: z.string().nullish(),
}).passthrough();

export const InventorySummarySchema = z.object({
  totalMachines: countSchema.nullish(),
  statusCounts: z.record(countSchema).nullish(),
}).passthrough();

export const MaintenanceScheduleSchema = z.object({
  nextPreventiveMaintenanceAt: dateTimeSchema.nullish(),
  cupsServedSinceLastDescale: countSchema.nullish(),
}).passthrough();

export type MachineInventoryItem = z.infer<typeof MachineInventoryItemSchema>;
export type Machine = z.infer<typeof MachineSchema>;
export type InventorySummary = z.infer<typeof InventorySummarySchema>;
export type MaintenanceSchedule = z.infer<typeof MaintenanceScheduleSchema>;
