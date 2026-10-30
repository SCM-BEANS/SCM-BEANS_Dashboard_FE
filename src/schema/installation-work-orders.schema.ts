import { z } from "zod";

const uuidSchema = z.string().uuid();
const dateTimeSchema = z.string().datetime({ offset: true });

export const InstallationWorkOrderIdSchema = uuidSchema;
export const InstallationWorkOrderOwnerIdSchema = uuidSchema;
export const InstallationWorkOrderTenantIdSchema = InstallationWorkOrderOwnerIdSchema;

export const CreateInstallationWorkOrderRequestSchema = z.object({
  ownerId: uuidSchema,
  contractId: uuidSchema,
  machineId: uuidSchema,
  technicianId: uuidSchema.optional(),
  scheduledFor: dateTimeSchema.optional(),
  installationNotes: z.string().max(4000).optional(),
});

export const CreateInstallationWorkOrderResponseSchema = z.object({
  id: InstallationWorkOrderIdSchema,
  status: z.enum(["PENDING", "ASSIGNED", "IN_PROGRESS", "COMPLETED", "FAILED", "CANCELLED"]),
}).passthrough();

export const AssignInstallationWorkOrderRequestSchema = z.object({
  technicianId: uuidSchema,
});
export const RescheduleInstallationWorkOrderRequestSchema = z.object({
  scheduledFor: dateTimeSchema,
});
export const CancelInstallationWorkOrderRequestSchema = z.object({
  reason: z.string().trim().min(1).max(4000),
});

export type CreateInstallationWorkOrderRequest = z.infer<typeof CreateInstallationWorkOrderRequestSchema>;
export type CreateInstallationWorkOrderResponse = z.infer<typeof CreateInstallationWorkOrderResponseSchema>;
export type AssignInstallationWorkOrderRequest = z.infer<typeof AssignInstallationWorkOrderRequestSchema>;
export type RescheduleInstallationWorkOrderRequest = z.infer<typeof RescheduleInstallationWorkOrderRequestSchema>;
export type CancelInstallationWorkOrderRequest = z.infer<typeof CancelInstallationWorkOrderRequestSchema>;

export const InstallationWorkOrderSummarySchema = z.object({
  id: InstallationWorkOrderIdSchema,
  ownerId: InstallationWorkOrderOwnerIdSchema,
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

export const AssignedInstallationWorkOrderSummarySchema = z.object({
  id: InstallationWorkOrderIdSchema,
  ownerId: InstallationWorkOrderOwnerIdSchema,
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
  createdBy: uuidSchema,
});

export const AssignedInstallationWorkOrderListSchema = z.array(AssignedInstallationWorkOrderSummarySchema);

export const InstallationWorkOrderRecordSchema = z.object({
  id: InstallationWorkOrderIdSchema,
  ownerId: InstallationWorkOrderOwnerIdSchema,
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
  createdBy: uuidSchema,
}).passthrough();

export const InstallationWorkOrderEvidenceUploadResponseSchema = z.object({
  id: uuidSchema,
  originalFilename: z.string(),
  contentType: z.string(),
  sizeBytes: z.number().int().nonnegative(),
  sha256: z.string(),
  uploadedBy: uuidSchema,
  uploadedAt: dateTimeSchema,
}).passthrough();

export const CompleteInstallationWorkOrderRequestSchema = z.object({
  handoverRecipient: z.string().trim().min(1),
});

export const InstallationChecklistResultRequestSchema = z.object({
  result: z.enum(["PASSED", "FAILED", "NOT_APPLICABLE"]),
  notes: z.string().max(4000).optional(),
}).strict();

export const InstallationChecklistResultResponseSchema = z.object({
  workOrderId: InstallationWorkOrderIdSchema,
  checklistItemId: uuidSchema,
  result: z.enum(["PENDING", "PASSED", "FAILED", "NOT_APPLICABLE"]),
}).passthrough();

export const InstallationAccessoryRequestSchema = z.object({
  accessoryName: z.string().trim().min(1).max(160),
  quantity: z.number().int().positive().optional(),
  serialNumber: z.string().max(128).optional(),
  notes: z.string().max(4000).optional(),
}).strict();

export const FailInstallationWorkOrderRequestSchema = z.object({
  failureReason: z.string().trim().min(1).max(4000),
}).strict();

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
  workOrder: InstallationWorkOrderRecordSchema,
  checklistItems: z.array(InstallationWorkOrderChecklistItemSchema),
  accessories: z.array(InstallationWorkOrderAccessorySchema),
  evidence: z.array(InstallationWorkOrderEvidenceMetadataSchema),
  installationNotes: z.string().nullish(),
  checklistItemCount: z.number().int().nonnegative().optional(),
  accessoryCount: z.number().int().nonnegative().optional(),
  evidenceCount: z.number().int().nonnegative().optional(),
}).passthrough();

export type InstallationWorkOrderSummary = z.infer<typeof InstallationWorkOrderSummarySchema>;
export type AssignedInstallationWorkOrderSummary = z.infer<typeof AssignedInstallationWorkOrderSummarySchema>;
export type InstallationWorkOrderRecord = z.infer<typeof InstallationWorkOrderRecordSchema>;
export type InstallationWorkOrderDetails = z.infer<typeof InstallationWorkOrderDetailsSchema>;
export type InstallationChecklistResultRequest = z.infer<typeof InstallationChecklistResultRequestSchema>;
export type InstallationAccessoryRequest = z.infer<typeof InstallationAccessoryRequestSchema>;
export type FailInstallationWorkOrderRequest = z.infer<typeof FailInstallationWorkOrderRequestSchema>;
