import { z } from "zod";

const uuidSchema = z.string().uuid();
const dateTimeSchema = z.string().refine((value) => {
  const isoDateTime = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})?$/;
  if (!isoDateTime.test(value)) return false;
  const normalized = value.replace(/(\.\d{3})\d+(?=Z|[+-]\d{2}:\d{2}|$)/, "$1");
  return !Number.isNaN(Date.parse(normalized));
}, "Expected an ISO date-time with or without a timezone offset.");

export const TechnicianWorkTypeSchema = z.enum([
  "INSTALLATION",
  "MAINTENANCE",
  "REPAIR",
  "RECALL",
]);

export const TechnicianWorkItemRelatedStepSchema = z.object({
  stepType: z.string().min(1),
  id: uuidSchema,
  status: z.string(),
  scheduledAt: dateTimeSchema.nullish(),
  createdAt: dateTimeSchema.nullish(),
}).passthrough();

export const TechnicianWorkItemSchema = z.object({
  workType: TechnicianWorkTypeSchema,
  id: uuidSchema,
  status: z.string().min(1),
  scheduledAt: dateTimeSchema.nullish(),
  createdAt: dateTimeSchema.nullish(),
  machineId: uuidSchema,
  serialNumber: z.string().nullish(),
  machineType: z.string().nullish(),
  modelName: z.string().nullish(),
  ownerId: uuidSchema.nullish(),
  ownerName: z.string().nullish(),
  locationId: uuidSchema.nullish(),
  locationName: z.string().nullish(),
  locationAddress: z.string().nullish(),
  summary: z.string().nullish(),
  detailPath: z.string(),
  relatedSteps: z.array(TechnicianWorkItemRelatedStepSchema).default([]),
}).passthrough();

export const TechnicianWorkItemsParamsSchema = z.object({
  page: z.number().int().nonnegative().default(0),
  size: z.number().int().positive().max(100).default(50),
  workType: TechnicianWorkTypeSchema.optional(),
}).strict();

export const TechnicianWorkItemsPageSchema = z.object({
  items: z.array(TechnicianWorkItemSchema),
  page: z.number().int().nonnegative(),
  size: z.number().int().positive(),
  hasNext: z.boolean(),
}).passthrough();

export type TechnicianWorkType = z.infer<typeof TechnicianWorkTypeSchema>;
export type TechnicianWorkItem = z.infer<typeof TechnicianWorkItemSchema>;
export type TechnicianWorkItemsParams = z.input<typeof TechnicianWorkItemsParamsSchema>;
export type TechnicianWorkItemsPage = z.infer<typeof TechnicianWorkItemsPageSchema>;
