import { z } from "zod";

const uuidSchema = z.string().uuid();
const dateTimeSchema = z.string().datetime({ offset: true });

export const InstallationWorkOrderIdSchema = uuidSchema;
export const InstallationWorkOrderTenantIdSchema = uuidSchema;

export const InstallationWorkOrderSummarySchema = z.object({
  id: InstallationWorkOrderIdSchema,
  tenantId: InstallationWorkOrderTenantIdSchema,
  contractId: uuidSchema,
  machineId: uuidSchema,
  machineType: z.enum(["CONVENTIONAL", "SMART_IOT"]),
  status: z.enum(["PENDING", "ASSIGNED", "IN_PROGRESS", "COMPLETED", "FAILED", "CANCELLED"]),
  assignedTechnicianId: uuidSchema.nullish(),
  scheduledFor: dateTimeSchema.nullish(),
  startedAt: dateTimeSchema.nullish(),
  completedAt: dateTimeSchema.nullish(),
  handoverRecipient: z.string().nullish(),
  failureReason: z.string().nullish(),
  createdAt: dateTimeSchema,
  updatedAt: dateTimeSchema,
});

export const InstallationWorkOrderListSchema = z.array(InstallationWorkOrderSummarySchema);

export const InstallationWorkOrderChecklistItemSchema = z.object({
  id: uuidSchema,
  itemCode: z.string(),
  label: z.string(),
  required: z.boolean(),
  displayOrder: z.number().int(),
  result: z.enum(["PENDING", "PASSED", "FAILED", "NOT_APPLICABLE"]),
  notes: z.string().nullish(),
  completedBy: uuidSchema.nullish(),
  completedAt: dateTimeSchema.nullish(),
});

export const InstallationWorkOrderAccessorySchema = z.object({
  id: uuidSchema,
  accessoryName: z.string(),
  quantity: z.number().int().nonnegative(),
  serialNumber: z.string().nullish(),
  notes: z.string().nullish(),
  recordedBy: uuidSchema.nullish(),
  recordedAt: dateTimeSchema.nullish(),
});

export const InstallationWorkOrderEvidenceMetadataSchema = z.object({
  id: uuidSchema,
  originalFilename: z.string(),
  contentType: z.string().nullish(),
  sizeBytes: z.number().int().nonnegative(),
  sha256: z.string().nullish(),
  uploadedBy: uuidSchema.nullish(),
  uploadedAt: dateTimeSchema.nullish(),
});

export const InstallationWorkOrderDetailsSchema = z.object({
  workOrder: InstallationWorkOrderSummarySchema,
  checklistItems: z.array(InstallationWorkOrderChecklistItemSchema),
  accessories: z.array(InstallationWorkOrderAccessorySchema),
  evidence: z.array(InstallationWorkOrderEvidenceMetadataSchema),
});

export type InstallationWorkOrderSummary = z.infer<typeof InstallationWorkOrderSummarySchema>;
export type InstallationWorkOrderDetails = z.infer<typeof InstallationWorkOrderDetailsSchema>;
