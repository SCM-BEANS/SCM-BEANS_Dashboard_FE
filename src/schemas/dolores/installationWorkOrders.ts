import { z } from 'zod';

const uuid = z.string().uuid();
const dateTime = z.string().datetime({ offset: true });

export const InstallationWorkOrderIdSchema = uuid;
export const InstallationWorkOrderTenantIdSchema = uuid;

export const InstallationWorkOrderSummarySchema = z.object({
  id: InstallationWorkOrderIdSchema,
  tenantId: InstallationWorkOrderTenantIdSchema,
  contractId: uuid,
  machineId: uuid,
  machineType: z.enum(['CONVENTIONAL', 'SMART_IOT']),
  status: z.enum(['PENDING', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'FAILED', 'CANCELLED']),
  assignedTechnicianId: uuid.nullish(),
  scheduledFor: dateTime.nullish(),
  startedAt: dateTime.nullish(),
  completedAt: dateTime.nullish(),
  handoverRecipient: z.string().nullish(),
  failureReason: z.string().nullish(),
  createdAt: dateTime,
  updatedAt: dateTime,
});

export const InstallationWorkOrderListSchema = z.array(InstallationWorkOrderSummarySchema);

export const InstallationWorkOrderChecklistItemSchema = z.object({
  id: uuid,
  itemCode: z.string(),
  label: z.string(),
  required: z.boolean(),
  displayOrder: z.number().int(),
  result: z.enum(['PENDING', 'PASSED', 'FAILED', 'NOT_APPLICABLE']),
  notes: z.string().nullish(),
  completedBy: uuid.nullish(),
  completedAt: dateTime.nullish(),
});

export const InstallationWorkOrderAccessorySchema = z.object({
  id: uuid,
  accessoryName: z.string(),
  quantity: z.number().int().nonnegative(),
  serialNumber: z.string().nullish(),
  notes: z.string().nullish(),
  recordedBy: uuid.nullish(),
  recordedAt: dateTime.nullish(),
});

export const InstallationWorkOrderEvidenceMetadataSchema = z.object({
  id: uuid,
  originalFilename: z.string(),
  contentType: z.string().nullish(),
  sizeBytes: z.number().int().nonnegative(),
  sha256: z.string().nullish(),
  uploadedBy: uuid.nullish(),
  uploadedAt: dateTime.nullish(),
});

export const InstallationWorkOrderDetailsSchema = z.object({
  workOrder: InstallationWorkOrderSummarySchema,
  checklistItems: z.array(InstallationWorkOrderChecklistItemSchema),
  accessories: z.array(InstallationWorkOrderAccessorySchema),
  evidence: z.array(InstallationWorkOrderEvidenceMetadataSchema),
});

