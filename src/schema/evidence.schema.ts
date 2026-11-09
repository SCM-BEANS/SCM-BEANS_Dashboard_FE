import { z } from "zod";

const uuidSchema = z.string().uuid();

export const EvidenceResourceSchema = z.enum([
  "TERMINATION_CASE",
  "DEPOSIT",
  "MAINTENANCE_TICKET",
  "MAINTENANCE_REQUEST",
  "REPAIR_CASE",
  "REPAIR_COST_REVIEW",
  "REPLACEMENT_ASSIGNMENT",
  "BUYBACK_CASE",
  "OFFLINE_REVIEW",
]);

export const EvidenceItemSchema = z.object({
  id: uuidSchema,
  resourceType: EvidenceResourceSchema,
  resourceId: uuidSchema,
  purpose: z.string(),
  originalFilename: z.string(),
  contentType: z.string(),
  sizeBytes: z.number().int().nonnegative(),
  sha256: z.string(),
  uploadedBy: uuidSchema,
  uploadedAt: z.string(),
  downloadPath: z.string(),
}).passthrough();

export const EvidencePageSchema = z.object({
  items: z.array(EvidenceItemSchema),
  page: z.number().int().nonnegative(),
  size: z.number().int().min(1),
  hasNext: z.boolean(),
}).passthrough();

export type EvidenceResource = z.infer<typeof EvidenceResourceSchema>;
export type EvidenceItem = z.infer<typeof EvidenceItemSchema>;
export type EvidencePage = z.infer<typeof EvidencePageSchema>;
