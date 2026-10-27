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

export const CreateMachineRequestSchema = z.object({
  serialNumber: z.string().trim().min(1),
  status: z.literal("IN_WAREHOUSE"),
  cupsServedSinceLastDescale: countSchema,
  region: z.string().trim().min(1).optional(),
});

export const MachineInventoryItemSchema = z.object({
  id: MachineIdSchema,
  ownerId: z.string().uuid().nullish(),
  tenantId: z.string().uuid().nullish(),
  locationId: z.string().uuid().nullish(),
  machineType: MachineTypeSchema.nullish(),
  serialNumber: z.string().nullish(),
  status: MachineStatusSchema.nullish(),
  deployedAt: dateTimeSchema.nullish(),
  region: z.string().nullish(),
  ownerType: z.string().nullish(),
  contractStartDate: dateSchema.nullish(),
  contractEndDate: dateSchema.nullish(),
  monthlyRentalFee: z.number().nullish(),
}).passthrough();

export const MachineInventorySchema = z.array(MachineInventoryItemSchema);

export const MachineSchema = z.object({
  id: MachineIdSchema,
  ownerId: z.string().uuid().nullish(),
  tenantId: z.string().uuid().nullish(),
  serialNumber: z.string().nullish(),
  status: MachineStatusSchema.nullish(),
  deployedAt: dateTimeSchema.nullish(),
  nextPreventiveMaintenanceAt: dateTimeSchema.nullish(),
  cupsServedSinceLastDescale: countSchema.nullish(),
  region: z.string().nullish(),
  ownerType: z.string().nullish(),
  contractStartDate: dateSchema.nullish(),
  contractEndDate: dateSchema.nullish(),
  monthlyRentalFee: z.number().nullish(),
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

export const MaintenanceTicketSchema = z.object({
  id: z.string().uuid().nullish(),
  machineId: MachineIdSchema.nullish(),
  status: z.enum(["PENDING", "ASSIGNED", "IN_PROGRESS", "RESOLVED"]).nullish(),
  scheduledDueAt: dateTimeSchema.nullish(),
  maintenanceWindowDeadline: dateTimeSchema.nullish(),
  startedAt: dateTimeSchema.nullish(),
  acknowledgedAt: dateTimeSchema.nullish(),
  completedAt: dateTimeSchema.nullish(),
  assignedTo: z.string().nullish(),
  assignedTechnicianId: z.string().uuid().nullish(),
  source: z.string().nullish(),
  preventiveSubtype: z.string().nullish(),
  notes: z.string().nullish(),
  diagnosis: z.string().nullish(),
  resolutionResult: z.string().nullish(),
  actionableInstructions: z.string().nullish(),
}).strip();

export const MaintenanceTicketListSchema = z.array(MaintenanceTicketSchema);

export const RepairIntakeRequestSchema = z.object({
  machineId: MachineIdSchema,
  idempotencyKey: z.string().min(1).max(128),
  issueDescription: z.string().max(4000),
  evidenceReference: z.string().max(512).optional(),
}).strict();

export const RepairIntakeResponseSchema = z.record(z.string(), z.unknown());

export type RepairIntakeRequest = z.infer<typeof RepairIntakeRequestSchema>;
export type RepairIntakeResponse = z.infer<typeof RepairIntakeResponseSchema>;

export type MachineInventoryItem = z.infer<typeof MachineInventoryItemSchema>;
export type Machine = z.infer<typeof MachineSchema>;
export type CreateMachineRequest = z.infer<typeof CreateMachineRequestSchema>;
export type InventorySummary = z.infer<typeof InventorySummarySchema>;
export type MaintenanceSchedule = z.infer<typeof MaintenanceScheduleSchema>;
export type MaintenanceTicket = z.infer<typeof MaintenanceTicketSchema>;
