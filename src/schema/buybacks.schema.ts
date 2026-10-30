import { z } from "zod";

export const BuybackIdSchema = z.string().uuid();
const optionalText = z.string().nullish();
export const BuybackStatusSchema = z.enum([
  "REQUESTED",
  "INSPECTION_PENDING",
  "VALUATION_PENDING",
  "APPROVED",
  "PAYMENT_PENDING",
  "PAID",
  "COLLECTION_PENDING",
  "COLLECTED",
  "REFURBISHING",
  "QA_PENDING",
  "AVAILABLE_FOR_RENT",
  "REJECTED",
  "CANCELLED",
]);

export const BuybackCaseSummarySchema = z.object({
  id: BuybackIdSchema,
  ownerId: z.string().uuid(),
  contractId: z.string().uuid(),
  machineId: z.string().uuid(),
  status: BuybackStatusSchema,
  requestedPrice: z.number().finite(),
  approvedPrice: z.number().finite().nullish(),
  currency: z.string(),
  requestedAt: z.string().nullish(),
  updatedAt: z.string().nullish(),
}).passthrough();

export const BuybackCaseSummaryListSchema = z.array(BuybackCaseSummarySchema);

export const BuybackPaymentRequestSchema = z.object({
  paymentMethod: z.string().trim().min(1).max(64),
  externalReference: z.string().trim().max(128).optional(),
  idempotencyKey: z.string().trim().min(1).max(128),
  correlationId: z.string().trim().min(1).max(128),
}).strict();
export const BuybackPaymentSchema = z.object({
  id: BuybackIdSchema,
  ownerId: z.string().uuid(),
  buybackCaseId: BuybackIdSchema,
  amount: z.number().finite().positive(),
  currency: z.string().length(3),
  paymentMethod: z.string().min(1),
  externalReference: optionalText,
  status: z.enum(["PENDING", "SETTLED", "REJECTED", "REVERSED"]),
  createdBy: optionalText,
  createdAt: optionalText,
  settledBy: optionalText,
  settledAt: optionalText,
  reviewNote: optionalText,
}).passthrough();

export const BuybackInspectionSchema = z.object({
  id: BuybackIdSchema.optional(),
  ownerId: z.string().uuid().optional(),
  buybackCaseId: BuybackIdSchema.optional(),
  condition: optionalText,
  valuationAmount: z.number().finite().nullish(),
  currency: optionalText,
  notes: optionalText,
  evidenceReferences: optionalText,
  decision: z.enum(["SUBMITTED", "ACCEPTED", "REJECTED"]).nullish(),
  inspectorId: optionalText,
  inspectedAt: optionalText,
}).passthrough();

export const BuybackRefurbishmentSchema = z.object({
  id: BuybackIdSchema.optional(),
  ownerId: z.string().uuid().optional(),
  buybackCaseId: BuybackIdSchema.optional(),
  machineId: z.string().uuid().optional(),
  status: z.enum(["OPEN", "COMPLETED", "FAILED"]).nullish(),
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
  eventId: BuybackIdSchema.optional(),
  buybackCaseId: BuybackIdSchema.optional(),
  passed: z.boolean().nullish(),
  actorId: optionalText,
  reason: optionalText,
  occurredAt: optionalText,
}).passthrough();

export const BuybackInspectionHistorySchema = z.array(BuybackInspectionSchema);
export const BuybackRefurbishmentHistorySchema = z.array(BuybackRefurbishmentSchema);
export const BuybackQaDecisionHistorySchema = z.array(BuybackQaDecisionSchema);

const buybackCommandKeys = {
  idempotencyKey: z.string().trim().min(1).max(128),
  correlationId: z.string().trim().min(1).max(128),
};
export const BuybackActionRequestSchema = z.object({
  ...buybackCommandKeys,
  reason: z.string().trim().min(1).max(1000),
}).strict();
export const BuybackCreateRequestSchema = z.object({
  ...buybackCommandKeys,
  contractId: z.string().uuid(),
  machineId: z.string().uuid(),
  requestedPrice: z.number().finite().positive(),
  currency: z.string().trim().min(3).max(3),
  externalAgreementReference: z.string().trim().max(128).optional(),
  reason: z.string().trim().min(1).max(1000),
}).strict();
export const BuybackInspectionRequestSchema = z.object({
  ...buybackCommandKeys,
  condition: z.string().trim().min(1).max(1000),
  valuationAmount: z.number().finite().positive(),
  currency: z.string().trim().min(3).max(3),
  notes: z.string().max(4000).optional(),
  evidenceReferences: z.string().max(1000).optional(),
}).strict();
export const BuybackValuationRequestSchema = z.object({
  ...buybackCommandKeys,
  approved: z.boolean(),
  approvedPrice: z.number().finite().positive().optional(),
  reason: z.string().trim().min(1).max(1000),
}).strict().superRefine((value, context) => {
  if (value.approved && value.approvedPrice == null) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["approvedPrice"], message: "Enter the approved amount." });
  }
});
export const BuybackCollectionRequestSchema = z.object({
  ...buybackCommandKeys,
  evidenceReference: z.string().trim().min(1).max(1000),
}).strict();
export const BuybackRefurbishmentStartRequestSchema = z.object({
  ...buybackCommandKeys,
  workPlanned: z.string().trim().min(1).max(4000),
  estimatedPartsCost: z.number().finite().nonnegative(),
  currency: z.string().trim().min(3).max(3),
}).strict();
export const BuybackRefurbishmentCompleteRequestSchema = z.object({
  ...buybackCommandKeys,
  workPerformed: z.string().trim().min(1).max(4000),
  result: z.enum(["PASSED", "FAILED"]),
  evidenceReferences: z.string().max(1000).optional(),
}).strict();
export const BuybackQaRequestSchema = z.object({
  ...buybackCommandKeys,
  passed: z.boolean(),
  reason: z.string().trim().min(1).max(1000),
}).strict();

export const BuybackCaseSchema = z.object({
  id: BuybackIdSchema,
  ownerId: z.string().uuid(),
  contractId: z.string().uuid(),
  machineId: z.string().uuid(),
  status: BuybackStatusSchema,
  requestedPrice: z.number().finite(),
  approvedPrice: z.number().finite().nullish(),
  currency: z.string(),
  externalAgreementReference: optionalText,
  reason: optionalText,
  requestedBy: optionalText,
  requestedAt: optionalText,
  approvedBy: optionalText,
  approvedAt: optionalText,
  rejectedBy: optionalText,
  rejectedAt: optionalText,
  rejectionReason: optionalText,
  cancelledBy: optionalText,
  cancelledAt: optionalText,
  cancellationReason: optionalText,
  valuationDecisionByRole: optionalText,
  valuationDecisionReason: optionalText,
  collectionEvidence: optionalText,
  collectionEvidenceRecorded: z.boolean().nullish(),
  collectedBy: optionalText,
  collectedAt: optionalText,
  createdAt: optionalText,
  updatedAt: optionalText,
  version: z.number().int().nonnegative().optional(),
  inspection: BuybackInspectionSchema.nullish(),
  refurbishment: BuybackRefurbishmentSchema.nullish(),
  qaDecision: BuybackQaDecisionSchema.nullish(),
  inspectionsPath: optionalText,
  refurbishmentsPath: optionalText,
  qaDecisionsPath: optionalText,
}).passthrough();

export type BuybackCase = z.infer<typeof BuybackCaseSchema>;
export type BuybackCaseSummary = z.infer<typeof BuybackCaseSummarySchema>;
export type BuybackPaymentRequest = z.infer<typeof BuybackPaymentRequestSchema>;
export type BuybackPayment = z.infer<typeof BuybackPaymentSchema>;
export type BuybackStatus = z.infer<typeof BuybackStatusSchema>;
export type BuybackActionRequest = z.infer<typeof BuybackActionRequestSchema>;
export type BuybackCreateRequest = z.infer<typeof BuybackCreateRequestSchema>;
export type BuybackInspectionRequest = z.infer<typeof BuybackInspectionRequestSchema>;
export type BuybackValuationRequest = z.infer<typeof BuybackValuationRequestSchema>;
export type BuybackCollectionRequest = z.infer<typeof BuybackCollectionRequestSchema>;
export type BuybackRefurbishmentStartRequest = z.infer<typeof BuybackRefurbishmentStartRequestSchema>;
export type BuybackRefurbishmentCompleteRequest = z.infer<typeof BuybackRefurbishmentCompleteRequestSchema>;
export type BuybackQaRequest = z.infer<typeof BuybackQaRequestSchema>;
