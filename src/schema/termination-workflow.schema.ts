import { z } from "zod";
import { RefundStatusSchema } from "./billing.schema";

export const TerminationCaseIdSchema = z.string().uuid();
export const TerminationCaseTypeSchema = z.enum(["NORMAL", "EARLY", "VIOLATION"]);
export const TerminationCaseStatusSchema = z.enum([
  "REQUESTED",
  "RECOVERY_PENDING",
  "INSPECTION_PENDING",
  "SETTLEMENT_PENDING",
  "APPROVED",
  "COMPLETED",
  "REJECTED",
]);

const nullableDateTime = z.string().nullish();

export const TerminationCaseSchema = z.object({
  id: TerminationCaseIdSchema,
  ownerId: z.string().uuid(),
  contractId: z.string().uuid(),
  machineId: z.string().uuid(),
  type: TerminationCaseTypeSchema,
  status: TerminationCaseStatusSchema,
  requestedBy: z.string(),
  reason: z.string(),
  effectiveDate: z.string().nullish(),
  handoverEvidenceReference: z.string().nullish(),
  handoverRecordedAt: nullableDateTime,
  inspectionTicketId: z.string().uuid().nullish(),
  inspectionDecision: z.string().nullish(),
  settlementId: z.string().uuid().nullish(),
  depositRefundAmount: z.number().finite().nonnegative().nullish(),
  refundId: z.string().uuid().nullish(),
  refundStatus: RefundStatusSchema.nullish(),
  approvedBy: z.string().nullish(),
  approvedAt: nullableDateTime,
  completedAt: nullableDateTime,
  rejectedReason: z.string().nullish(),
  createdAt: z.string(),
  updatedAt: z.string(),
}).passthrough();

export const TerminationCaseCreateRequestSchema = z.object({
  type: TerminationCaseTypeSchema,
  reason: z.string().trim().min(1).max(2000),
  effectiveDate: z.string().date().optional(),
  idempotencyKey: z.string().trim().min(1).max(128),
  correlationId: z.string().trim().min(1).max(128),
}).strict();

export const TerminationActionRequestSchema = z.object({
  correlationId: z.string().trim().min(1).max(128),
}).strict();

export const TerminationInspectionRequestSchema = z.object({
  maintenanceTicketId: z.string().uuid(),
  diagnosis: z.string().trim().min(1).max(2000),
  responsibility: z.enum(["TENANT", "COMPANY", "UNKNOWN"]),
  actualCost: z.number().finite().nonnegative().optional(),
  resolutionResult: z.string().trim().min(1).max(2000),
  notes: z.string().max(2000).optional(),
  correlationId: z.string().trim().min(1).max(128),
  inspectionDecision: z.enum(["NO_DAMAGE", "DAMAGE", "PARTIAL_DAMAGE"]),
}).strict();

export const TerminationSettlementRequestSchema = z.object({
  decision: z.enum(["NO_DAMAGE", "DAMAGE", "PARTIAL_DAMAGE"]),
  damageAmount: z.number().finite().nonnegative(),
  penaltyAmount: z.number().finite().nonnegative(),
  outstandingAmount: z.number().finite().nonnegative(),
  idempotencyKey: z.string().trim().min(1).max(128),
  correlationId: z.string().trim().min(1).max(128),
}).strict().refine(
  (input) => input.decision !== "NO_DAMAGE" || input.damageAmount === 0,
  { message: "NO_DAMAGE cannot include a damage amount.", path: ["damageAmount"] },
);

export const TerminationRejectionRequestSchema = z.object({
  reason: z.string().trim().min(1).max(2000),
  correlationId: z.string().trim().min(1).max(128),
}).strict();

export const RecallWorkOrderIdSchema = z.string().uuid();
export const RecallWorkOrderStatusSchema = z.enum([
  "UNASSIGNED",
  "ASSIGNED",
  "SCHEDULED",
  "PICKUP_IN_PROGRESS",
  "OWNER_ACK_PENDING",
  "CUSTODY_VERIFICATION_PENDING",
  "RECEIPT_REVIEW_PENDING",
  "RECEIVED_AT_DEPOT",
  "LEGACY_REVIEW_REQUIRED",
  "CANCELLED",
]);
export const RecallEvidenceTypeSchema = z.enum(["PICKUP", "OWNER_HANDOVER", "DEPOT_RECEIPT"]);
export const RecallWorkOrderListParamsSchema = z.object({
  status: RecallWorkOrderStatusSchema.optional(),
  ownerId: z.string().uuid().optional(),
  contractId: z.string().uuid().optional(),
  machineId: z.string().uuid().optional(),
  technicianId: z.string().uuid().optional(),
  page: z.number().int().nonnegative().default(0),
  size: z.number().int().min(1).max(100).default(20),
}).strict();

const recallCore = {
  id: RecallWorkOrderIdSchema,
  terminationCaseId: TerminationCaseIdSchema,
  ownerId: z.string().uuid(),
  contractId: z.string().uuid(),
  machineId: z.string().uuid(),
  status: RecallWorkOrderStatusSchema,
  assignedTechnicianId: z.string().uuid().nullish(),
  scheduledPickupAt: nullableDateTime,
  pickupStartedAt: nullableDateTime,
  createdAt: z.string(),
  updatedAt: z.string(),
};

export const RecallWorkOrderSummarySchema = z.object({
  ...recallCore,
  ownerAcknowledgedAt: nullableDateTime,
  depotReceivedAt: nullableDateTime,
}).passthrough();

export const RecallWorkOrderSchema = z.object({
  ...recallCore,
  pickupEvidenceReference: z.string().nullish(),
  ownerAcknowledgedBy: z.string().uuid().nullish(),
  ownerAcknowledgedAt: nullableDateTime,
  ownerConditionNotes: z.string().nullish(),
  ownerEvidenceReference: z.string().nullish(),
  depotReceivedAt: nullableDateTime,
  depotClaimedReceivedAt: nullableDateTime,
  depotLocation: z.string().nullish(),
  depotEvidenceReference: z.string().nullish(),
  depotSubmittedBy: z.string().uuid().nullish(),
  receiptReviewedBy: z.string().uuid().nullish(),
  receiptReviewedAt: nullableDateTime,
  receiptReviewReason: z.string().nullish(),
  legacyReviewedBy: z.string().uuid().nullish(),
  legacyReviewedAt: nullableDateTime,
  legacyReviewDecision: z.string().nullish(),
  legacyReviewReason: z.string().nullish(),
}).passthrough();

export const RecallWorkOrderPageSchema = z.object({
  content: z.array(RecallWorkOrderSummarySchema),
  page: z.number().int().nonnegative(),
  size: z.number().int().positive(),
  totalElements: z.number().int().nonnegative(),
  totalPages: z.number().int().nonnegative(),
}).passthrough();

export const RecallWorkOrderEventSchema = z.object({
  id: z.string().uuid(),
  recallWorkOrderId: RecallWorkOrderIdSchema,
  eventType: z.string(),
  fromStatus: z.string().nullish(),
  toStatus: z.string().nullish(),
  actorId: z.string().uuid().nullish(),
  actorRole: z.string().nullish(),
  occurredAt: z.string(),
  reason: z.string().nullish(),
  details: z.object({}).passthrough().nullish(),
}).passthrough();
export const RecallWorkOrderEventPageSchema = z.object({
  content: z.array(RecallWorkOrderEventSchema),
  page: z.number().int().nonnegative(),
  size: z.number().int().positive(),
  totalElements: z.number().int().nonnegative(),
  totalPages: z.number().int().nonnegative(),
}).passthrough();

export const RecallEvidenceSchema = z.object({
  id: z.string().uuid(),
  recallWorkOrderId: RecallWorkOrderIdSchema,
  evidenceType: RecallEvidenceTypeSchema,
  originalFilename: z.string(),
  contentType: z.string().nullish(),
  sizeBytes: z.number().int().nonnegative(),
  sha256: z.string().nullish(),
  uploadedBy: z.string().uuid().nullish(),
  uploadedRole: z.string().nullish(),
  uploadedAt: z.string(),
}).passthrough();
export const RecallEvidenceListSchema = z.array(RecallEvidenceSchema);

export const RecallAssignRequestSchema = z.object({
  technicianId: z.string().uuid(),
  scheduledPickupAt: z.string().optional(),
  correlationId: z.string().trim().min(1).max(128),
}).strict();
export const RecallPickupRequestSchema = z.object({
  successful: z.boolean(),
  evidenceId: z.string().uuid().optional(),
  notes: z.string().max(2000).optional(),
  correlationId: z.string().trim().min(1).max(128),
}).strict();
export const RecallOwnerAcknowledgementRequestSchema = z.object({
  conditionNotes: z.string().trim().min(1).max(2000),
  evidenceId: z.string().uuid(),
  correlationId: z.string().trim().min(1).max(128),
}).strict();
export const RecallDepotReceiptRequestSchema = z.object({
  depotLocation: z.string().trim().min(1).max(500),
  depotReceivedAt: z.string().optional(),
  evidenceId: z.string().uuid(),
  correlationId: z.string().trim().min(1).max(128),
}).strict();
export const RecallReceiptDecisionRequestSchema = z.object({
  approved: z.boolean(),
  reason: z.string().max(2000).optional(),
  correlationId: z.string().trim().min(1).max(128),
}).strict().refine((input) => input.approved || Boolean(input.reason?.trim()), "A reason is required to reject a depot receipt.");

export type TerminationCase = z.infer<typeof TerminationCaseSchema>;
export type TerminationCaseCreateRequest = z.infer<typeof TerminationCaseCreateRequestSchema>;
export type TerminationActionRequest = z.infer<typeof TerminationActionRequestSchema>;
export type TerminationInspectionRequest = z.infer<typeof TerminationInspectionRequestSchema>;
export type TerminationSettlementRequest = z.infer<typeof TerminationSettlementRequestSchema>;
export type TerminationRejectionRequest = z.infer<typeof TerminationRejectionRequestSchema>;
export type RecallWorkOrderSummary = z.infer<typeof RecallWorkOrderSummarySchema>;
export type RecallWorkOrder = z.infer<typeof RecallWorkOrderSchema>;
export type RecallEvidence = z.infer<typeof RecallEvidenceSchema>;
export type RecallEvidenceType = z.infer<typeof RecallEvidenceTypeSchema>;
export type RecallWorkOrderListParams = z.input<typeof RecallWorkOrderListParamsSchema>;
export type RecallAssignRequest = z.infer<typeof RecallAssignRequestSchema>;
export type RecallPickupRequest = z.infer<typeof RecallPickupRequestSchema>;
export type RecallOwnerAcknowledgementRequest = z.infer<typeof RecallOwnerAcknowledgementRequestSchema>;
export type RecallDepotReceiptRequest = z.infer<typeof RecallDepotReceiptRequestSchema>;
export type RecallReceiptDecisionRequest = z.infer<typeof RecallReceiptDecisionRequestSchema>;
