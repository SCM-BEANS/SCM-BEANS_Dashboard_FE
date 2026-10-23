import { z } from "zod";

export const ContractIdSchema = z.string().uuid();
export const ContractSchema = z.object({
  id: ContractIdSchema, ownerId: z.string().uuid(), machineId: z.string().uuid().nullish(),
  startDate: z.string().nullish(), endDate: z.string().nullish(), terms: z.string().nullish(),
  termsSnapshot: z.string().nullish(), status: z.enum(["DRAFT", "ACTIVE", "TERMINATED"]),
  machineTypeSnapshot: z.string().nullish(), monthlyRentalFee: z.number().nullish(),
  depositAmount: z.number().nullish(), installationFee: z.number().nullish(),
  paygUnitPrice: z.number().nullish(), offlineLimitMinutes: z.number().int().nullish(),
  legacyUnmapped: z.boolean().optional(), terminatedAt: z.string().nullish(),
}).passthrough();
export const ContractListSchema = z.array(ContractSchema);
export const ContractExpirySchema = z.object({
  expiryDate: z.string().nullish(), reminderDate: z.string().nullish(), reminderSentAt: z.string().nullish(),
  decision: z.string().nullish(), decidedAt: z.string().nullish(), expiryProcessedAt: z.string().nullish(),
}).passthrough();
export const ContractDocumentSchema = z.object({
  id: z.string().uuid(), contractId: z.string().uuid(), documentType: z.string(),
  originalFilename: z.string(), contentType: z.string().nullish(), sizeBytes: z.number().nonnegative(),
  version: z.number().int().positive(), uploadedAt: z.string().nullish(), uploadedBy: z.string().nullish(),
  archivedAt: z.string().nullish(),
}).passthrough();
export const ContractDocumentsSchema = z.array(ContractDocumentSchema);
export type Contract = z.infer<typeof ContractSchema>;
export type ContractDocument = z.infer<typeof ContractDocumentSchema>;
