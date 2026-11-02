import { z } from "zod";

export const BuybackIdSchema = z.string().uuid();
export const BuybackStatusSchema = z.enum([
  "REQUESTED", "INSPECTION_PENDING", "VALUATION_PENDING", "APPROVED", "PAYMENT_PENDING",
  "PAID", "COLLECTION_PENDING", "COLLECTED", "REFURBISHING", "QA_PENDING",
  "AVAILABLE_FOR_RENT", "REJECTED", "CANCELLED",
]);
const optionalText = z.string().nullish();
const statusFields = {
  id: BuybackIdSchema,
  ownerId: z.string().uuid(),
  contractId: z.string().uuid(),
  machineId: z.string().uuid(),
  status: BuybackStatusSchema,
  requestedPrice: z.number().finite(),
  approvedPrice: z.number().finite().nullish(),
  currency: z.string(),
  requestedAt: z.string(),
  updatedAt: z.string(),
};

export const BuybackCaseSummarySchema = z.object(statusFields).passthrough();
export const BuybackCasesSchema = z.array(BuybackCaseSummarySchema);

export const BuybackInspectionSchema = z.object({
  id: z.string().uuid(),
  ownerId: z.string().uuid(),
  buybackCaseId: BuybackIdSchema,
  condition: z.string(),
  valuationAmount: z.number().finite(),
  currency: z.string(),
  notes: optionalText,
  evidenceReferences: optionalText,
  decision: optionalText,
  inspectorId: optionalText,
  inspectedAt: optionalText,
}).passthrough();
export const BuybackRefurbishmentSchema = z.object({
  id: z.string().uuid(),
  ownerId: z.string().uuid(),
  buybackCaseId: BuybackIdSchema,
  machineId: z.string().uuid(),
  status: z.string(),
  workPerformed: optionalText,
  partsAndCost: z.number().finite().nullish(),
  currency: optionalText,
  technicianId: optionalText,
  startedAt: optionalText,
  completedAt: optionalText,
  evidenceReferences: optionalText,
  result: optionalText,
}).passthrough();
export const BuybackQaDecisionSchema = z.object({
  eventId: z.string().uuid(),
  passed: z.boolean(),
  actorId: optionalText,
  reason: optionalText,
  occurredAt: optionalText,
}).passthrough();

export const BuybackCaseSchema = z.object({
  ...statusFields,
  policyVersion: z.number().int().nullish(),
  externalAgreementReference: optionalText,
  reason: z.string(),
  approvedAt: optionalText,
  valuationDecisionByRole: optionalText,
  valuationDecisionReason: optionalText,
  rejectedAt: optionalText,
  rejectionReason: optionalText,
  cancelledAt: optionalText,
  cancellationReason: optionalText,
  collectionEvidenceRecorded: z.boolean(),
  collectedAt: optionalText,
  createdAt: z.string(),
  inspection: BuybackInspectionSchema.nullish(),
  refurbishment: BuybackRefurbishmentSchema.nullish(),
  qaDecision: BuybackQaDecisionSchema.nullish(),
  inspectionsPath: z.string().optional(),
  refurbishmentsPath: z.string().optional(),
  qaDecisionsPath: z.string().optional(),
}).passthrough();

export const BuybackCreateRequestSchema = z.object({
  contractId: z.string().uuid(),
  machineId: z.string().uuid(),
  requestedPrice: z.number().finite().positive(),
  currency: z.string().trim().min(1).max(16),
  externalAgreementReference: z.string().trim().max(256).optional(),
  reason: z.string().trim().min(1).max(2000),
  idempotencyKey: z.string().trim().min(1).max(128),
  correlationId: z.string().trim().min(1).max(128),
}).strict();
export const BuybackActionRequestSchema = z.object({
  idempotencyKey: z.string().trim().min(1).max(128),
  correlationId: z.string().trim().min(1).max(128),
  reason: z.string().trim().min(1).max(2000),
}).strict();
export const BuybackInspectionRequestSchema = z.object({
  condition: z.string().trim().min(1).max(2000),
  valuationAmount: z.number().finite().positive(),
  currency: z.string().trim().min(1).max(16),
  notes: z.string().trim().max(2000).optional(),
  evidenceReferences: z.string().trim().min(1).optional(),
  idempotencyKey: z.string().trim().min(1).max(128),
  correlationId: z.string().trim().min(1).max(128),
}).strict();
export const BuybackValuationRequestSchema = z.object({
  approved: z.boolean(),
  approvedPrice: z.number().finite().positive().optional(),
  reason: z.string().trim().min(1).max(2000),
  idempotencyKey: z.string().trim().min(1).max(128),
  correlationId: z.string().trim().min(1).max(128),
}).strict().superRefine((request, context) => {
  if (request.approved && request.approvedPrice === undefined) context.addIssue({ code: "custom", path: ["approvedPrice"], message: "Approved price is required when valuation is approved." });
});
export const BuybackPaymentRequestSchema = z.object({
  paymentMethod: z.string().trim().min(1).max(64),
  externalReference: z.string().trim().max(256).optional(),
  idempotencyKey: z.string().trim().min(1).max(128),
  correlationId: z.string().trim().min(1).max(128),
}).strict();
export const BuybackPaymentSchema = z.object({
  id: z.string().uuid(),
  ownerId: z.string().uuid(),
  buybackCaseId: BuybackIdSchema,
  amount: z.number().finite(),
  currency: z.string(),
  paymentMethod: z.string(),
  externalReference: optionalText,
  status: z.string(),
  createdBy: optionalText,
  createdAt: z.string(),
  settledBy: optionalText,
  settledAt: optionalText,
  reviewNote: optionalText,
}).passthrough();
export const BuybackPaymentProofSchema = z.object({
  id: z.string().uuid(),
  buybackCaseId: BuybackIdSchema,
  paymentId: z.string().uuid(),
  originalFilename: z.string(),
  contentType: z.string(),
  sizeBytes: z.number().nonnegative(),
  sha256: z.string(),
  status: z.string(),
  submittedBy: optionalText,
  submittedAt: z.string(),
  reviewedBy: optionalText,
  reviewedAt: optionalText,
  reviewReason: optionalText,
}).passthrough();
export const BuybackPaymentProofReviewRequestSchema = z.object({
  approved: z.boolean(),
  reason: z.string().trim().min(1).max(2000),
  idempotencyKey: z.string().trim().min(1).max(128),
  correlationId: z.string().trim().min(1).max(128),
}).strict();
export const BuybackCollectionRequestSchema = z.object({
  evidenceReference: z.string().trim().min(1),
  idempotencyKey: z.string().trim().min(1).max(128),
  correlationId: z.string().trim().min(1).max(128),
}).strict();
export const BuybackRefurbishmentStartRequestSchema = z.object({
  workPlanned: z.string().trim().min(1).max(2000),
  estimatedPartsCost: z.number().finite().nonnegative(),
  currency: z.string().trim().min(1).max(16),
  idempotencyKey: z.string().trim().min(1).max(128),
  correlationId: z.string().trim().min(1).max(128),
}).strict();
export const BuybackRefurbishmentCompleteRequestSchema = z.object({
  workPerformed: z.string().trim().min(1).max(2000),
  result: z.string().trim().min(1).max(2000),
  evidenceReferences: z.string().trim().min(1).optional(),
  idempotencyKey: z.string().trim().min(1).max(128),
  correlationId: z.string().trim().min(1).max(128),
}).strict();
export const BuybackQaRequestSchema = z.object({
  passed: z.boolean(),
  reason: z.string().trim().min(1).max(2000),
  idempotencyKey: z.string().trim().min(1).max(128),
  correlationId: z.string().trim().min(1).max(128),
}).strict();

export type BuybackCase = z.infer<typeof BuybackCaseSchema>;
export type BuybackCreateRequest = z.infer<typeof BuybackCreateRequestSchema>;
export type BuybackActionRequest = z.infer<typeof BuybackActionRequestSchema>;
export type BuybackInspectionRequest = z.infer<typeof BuybackInspectionRequestSchema>;
export type BuybackValuationRequest = z.infer<typeof BuybackValuationRequestSchema>;
export type BuybackPaymentRequest = z.infer<typeof BuybackPaymentRequestSchema>;
export type BuybackPaymentProofReviewRequest = z.infer<typeof BuybackPaymentProofReviewRequestSchema>;
export type BuybackRefurbishmentStartRequest = z.infer<typeof BuybackRefurbishmentStartRequestSchema>;
export type BuybackRefurbishmentCompleteRequest = z.infer<typeof BuybackRefurbishmentCompleteRequestSchema>;
export type BuybackQaRequest = z.infer<typeof BuybackQaRequestSchema>;


export const BuybackCaseSummaryListSchema = z.array(BuybackCaseSummarySchema);

export const BuybackInspectionHistorySchema = z.array(BuybackInspectionSchema);

export const BuybackRefurbishmentHistorySchema = z.array(BuybackRefurbishmentSchema);

export const BuybackQaDecisionHistorySchema = z.array(BuybackQaDecisionSchema);

const buybackCommandKeys = {
  idempotencyKey: z.string().trim().min(1).max(128),
  correlationId: z.string().trim().min(1).max(128),
};

export type BuybackCaseSummary = z.infer<typeof BuybackCaseSummarySchema>;

export type BuybackPayment = z.infer<typeof BuybackPaymentSchema>;

export type BuybackStatus = z.infer<typeof BuybackStatusSchema>;

export type BuybackCollectionRequest = z.infer<typeof BuybackCollectionRequestSchema>;
