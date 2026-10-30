import { z } from "zod";

export const ContractIdSchema = z.string().uuid();
const ContractMachineTypeSchema = z.enum(["CONVENTIONAL", "SMART_IOT"]);
const contractDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((value) => {
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
});

export const ContractTermsSnapshotSchema = z.object({
  policyVersion: z.number().int().positive(),
  maintenanceIntervalMonths: z.number().int().min(1).max(24),
  maintenanceWindowDays: z.number().int().min(0).max(30),
  allowedReplacementMachineTypes: z.array(ContractMachineTypeSchema).min(1),
  repairCostResponsibility: z.enum(["TENANT", "COMPANY", "UNKNOWN"]),
  paymentDueEligibleDays: z.number().int().min(1).max(60),
  paymentDestinationReference: z.string().max(128).optional(),
  offlineViolationAction: z.enum(["WARN_ONLY", "MANUAL_REVIEW"]),
  buybackEnabled: z.boolean(),
  buybackMinimumMonths: z.number().int().min(0).max(120),
  buybackValuationMethod: z.enum(["MANUAL_APPRAISAL"]),
  offlineLimitMinutes: z.number().int().positive().optional(),
}).passthrough();

export const CreateContractRequestSchema = z.object({
  ownerId: z.string().uuid(),
  machineId: z.string().uuid(),
  startDate: contractDateSchema,
  endDate: contractDateSchema,
  terms: z.string().min(1),
  monthlyRentalFee: z.number().finite().nonnegative(),
  depositAmount: z.number().finite().nonnegative().optional(),
  installationFee: z.number().finite().nonnegative().optional(),
  paygUnitPrice: z.number().finite().nonnegative().optional(),
  offlineLimitMinutes: z.number().int().positive().optional(),
  contractTermsSnapshot: ContractTermsSnapshotSchema.optional(),
}).superRefine((contract, context) => {
  if (contract.startDate >= contract.endDate) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["endDate"],
      message: "Ngày kết thúc phải sau ngày bắt đầu.",
    });
  }
});

export const CreateContractResponseSchema = z.object({ id: ContractIdSchema }).passthrough();

export const ContractSchema = z.object({
  id: ContractIdSchema, ownerId: z.string().uuid(), machineId: z.string().uuid().nullish(),
  startDate: z.string().nullish(), endDate: z.string().nullish(), terms: z.string().nullish(),
  termsSnapshot: z.string().nullish(), status: z.enum(["DRAFT", "ACTIVE", "TERMINATED"]),
  machineTypeSnapshot: z.string().nullish(), monthlyRentalFee: z.number().nullish(),
  depositAmount: z.number().nullish(), installationFee: z.number().nullish(),
  paygUnitPrice: z.number().nullish(), offlineLimitMinutes: z.number().int().nullish(),
  contractTermsSnapshot: ContractTermsSnapshotSchema.nullish(),
  currentPolicyVersion: z.number().int().nonnegative().nullish(),
  policyReadiness: z.string().nullish(),
  legacyUnmapped: z.boolean().optional(), terminatedAt: z.string().nullish(),
}).passthrough();
export const ContractListSchema = z.array(ContractSchema);

// Kept separate from the Admin DTO while the role-specific screen migrates.
export const ModeratorContractSchema = z.object({
  id: ContractIdSchema,
  ownerId: z.string().uuid(),
  machineId: z.string().uuid().nullish(),
  startDate: z.string().nullish(),
  endDate: z.string().nullish(),
  terms: z.string().nullish(),
  termsSnapshot: z.string().nullish(),
  status: z.string().min(1),
  machineTypeSnapshot: z.string().nullish(),
  contractTermsSnapshot: ContractTermsSnapshotSchema.nullish(),
  monthlyRentalFee: z.number().nullish(),
  depositAmount: z.union([z.number(), z.string()]).nullish(),
  installationFee: z.union([z.number(), z.string()]).nullish(),
  paygUnitPrice: z.union([z.number(), z.string()]).nullish(),
  offlineLimitMinutes: z.number().int().nullish(),
  legacyUnmapped: z.boolean().optional(),
}).passthrough();
export const ModeratorContractListSchema = z.array(ModeratorContractSchema);

export const ContractExpirySchema = z.object({
  contractId: ContractIdSchema.nullish(),
  expiryDate: z.string().nullish(), reminderDate: z.string().nullish(), reminderSentAt: z.string().nullish(),
  decision: z.enum(["CONTINUE", "DO_NOT_CONTINUE", "NO_RESPONSE"]).nullish(),
  decidedBy: z.string().nullish(), decidedAt: z.string().nullish(), expiryProcessedAt: z.string().nullish(),
  terminationCaseId: ContractIdSchema.nullish(),
}).passthrough();
export const ContractExpiryDecisionRequestSchema = z.object({
  decision: z.enum(["CONTINUE", "DO_NOT_CONTINUE"]),
}).strict();
export const ContractDocumentSchema = z.object({
  id: z.string().uuid(), contractId: z.string().uuid(), documentType: z.string(),
  originalFilename: z.string(), contentType: z.string().nullish(), sizeBytes: z.number().nonnegative(),
  version: z.number().int().positive(), uploadedAt: z.string().nullish(), uploadedBy: z.string().nullish(),
  archivedAt: z.string().nullish(),
}).passthrough();
export const ContractDocumentsSchema = z.array(ContractDocumentSchema);
export const ContractPolicyVersionSchema = z.object({
  id: z.string().uuid(), contractId: ContractIdSchema, version: z.number().int().positive(),
  snapshot: ContractTermsSnapshotSchema, supersedesVersionId: z.string().uuid().nullish(),
  actorId: z.string().uuid().nullish(), actorRole: z.string(), reason: z.string(),
  effectiveDate: contractDateSchema, effectiveAt: z.string().nullish(), createdAt: z.string().nullish(),
}).passthrough();
export const ContractPolicyHistorySchema = z.array(ContractPolicyVersionSchema);
export const ContractPolicyAmendmentRequestSchema = z.object({
  snapshot: ContractTermsSnapshotSchema,
  reason: z.string().trim().min(1),
  effectiveDate: contractDateSchema,
}).strict();
export const ContractContinuationRequestSchema = z.object({
  startDate: contractDateSchema,
  endDate: contractDateSchema,
  terms: z.string().trim().min(1),
  monthlyRentalFee: z.number().finite().nonnegative(),
  depositAmount: z.number().finite().nonnegative().optional(),
  installationFee: z.number().finite().nonnegative().optional(),
  paygUnitPrice: z.number().finite().nonnegative().optional(),
  offlineLimitMinutes: z.number().int().positive().optional(),
  contractTermsSnapshot: ContractTermsSnapshotSchema.optional(),
}).strict().superRefine((value, context) => {
  if (value.startDate >= value.endDate) context.addIssue({ code: z.ZodIssueCode.custom, path: ["endDate"], message: "End date must be after start date." });
});
export const TerminationCaseRequestSchema = z.object({
  type: z.enum(["NORMAL", "EARLY", "VIOLATION"]),
  reason: z.string().trim().min(1),
  effectiveDate: contractDateSchema.optional(),
  idempotencyKey: z.string().trim().min(1),
  correlationId: z.string().trim().min(1),
}).strict();
export const TerminationCaseResponseSchema = z.object({
  id: z.string().uuid(), ownerId: z.string().uuid(), contractId: ContractIdSchema,
  machineId: z.string().uuid().nullish(), type: z.enum(["NORMAL", "EARLY", "VIOLATION"]),
  status: z.string(), requestedBy: z.string().nullish(), reason: z.string(),
  effectiveDate: contractDateSchema.nullish(), createdAt: z.string().nullish(), updatedAt: z.string().nullish(),
}).passthrough();
export type Contract = z.infer<typeof ContractSchema>;
export type CreateContractRequest = z.infer<typeof CreateContractRequestSchema>;
export type ContractTermsSnapshot = z.infer<typeof ContractTermsSnapshotSchema>;
export type ContractPolicyAmendmentRequest = z.infer<typeof ContractPolicyAmendmentRequestSchema>;
export type ContractContinuationRequest = z.infer<typeof ContractContinuationRequestSchema>;
export type TerminationCaseRequest = z.infer<typeof TerminationCaseRequestSchema>;
export type TerminationCaseResponse = z.infer<typeof TerminationCaseResponseSchema>;
export type ContractExpiry = z.infer<typeof ContractExpirySchema>;
export type ContractExpiryDecisionRequest = z.infer<typeof ContractExpiryDecisionRequestSchema>;
export type ModeratorContract = z.infer<typeof ModeratorContractSchema>;
export type ContractDocument = z.infer<typeof ContractDocumentSchema>;
