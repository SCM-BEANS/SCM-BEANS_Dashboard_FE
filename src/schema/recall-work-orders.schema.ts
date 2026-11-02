import { z } from "zod";

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
export type RecallWorkOrderStatus = z.infer<typeof RecallWorkOrderStatusSchema>;

export const RecallWorkOrderSummarySchema = z.object({
  id: RecallWorkOrderIdSchema,
  terminationCaseId: z.string().uuid(),
  ownerId: z.string().uuid(),
  contractId: z.string().uuid(),
  machineId: z.string().uuid(),
  status: RecallWorkOrderStatusSchema,
  assignedTechnicianId: z.string().uuid().nullish(),
  scheduledPickupAt: z.string().nullish(),
  pickupStartedAt: z.string().nullish(),
  ownerAcknowledgedAt: z.string().nullish(),
  depotReceivedAt: z.string().nullish(),
  createdAt: z.string().nullish(),
  updatedAt: z.string().nullish(),
}).passthrough();

export const RecallWorkOrderSchema = RecallWorkOrderSummarySchema.extend({
  pickupEvidenceReference: z.string().nullish(),
  ownerAcknowledgedBy: z.string().uuid().nullish(),
  ownerConditionNotes: z.string().nullish(),
  ownerEvidenceReference: z.string().nullish(),
  depotClaimedReceivedAt: z.string().nullish(),
  depotLocation: z.string().nullish(),
  depotEvidenceReference: z.string().nullish(),
  depotSubmittedBy: z.string().uuid().nullish(),
  receiptReviewedBy: z.string().uuid().nullish(),
  receiptReviewedAt: z.string().nullish(),
  receiptReviewReason: z.string().nullish(),
  legacyReviewedBy: z.string().uuid().nullish(),
  legacyReviewedAt: z.string().nullish(),
  legacyReviewDecision: z.string().nullish(),
  legacyReviewReason: z.string().nullish(),
}).passthrough();

export const RecallEventDetailsSchema = z.object({
  previousTechnicianId: z.string().nullish(),
  technicianId: z.string().nullish(),
  previousSchedule: z.string().nullish(),
  scheduledPickupAt: z.string().nullish(),
  decision: z.string().nullish(),
  evidenceId: z.string().nullish(),
  type: z.string().nullish(),
  sha256: z.string().nullish(),
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
  details: RecallEventDetailsSchema.nullish(),
}).passthrough();

export const RecallEvidenceSchema = z.object({
  id: z.string().uuid(),
  recallWorkOrderId: RecallWorkOrderIdSchema,
  evidenceType: z.enum(["PICKUP", "OWNER_HANDOVER", "DEPOT_RECEIPT"]),
  originalFilename: z.string(),
  contentType: z.string(),
  sizeBytes: z.number().nonnegative(),
  sha256: z.string(),
  uploadedBy: z.string().uuid().nullish(),
  uploadedRole: z.string().nullish(),
  uploadedAt: z.string().nullish(),
}).passthrough();

const RecallPageSchema = <T extends z.ZodTypeAny>(itemSchema: T) => z.object({
  content: z.array(itemSchema),
  page: z.number().int().nonnegative(),
  size: z.number().int().positive(),
  totalElements: z.number().int().nonnegative(),
  totalPages: z.number().int().nonnegative(),
  first: z.boolean(),
  last: z.boolean(),
}).passthrough();

export const RecallWorkOrderPageSchema = RecallPageSchema(RecallWorkOrderSummarySchema);
export const RecallWorkOrderEventPageSchema = RecallPageSchema(RecallWorkOrderEventSchema);
export const RecallWorkOrderListParamsSchema = z.object({
  status: RecallWorkOrderStatusSchema.optional(),
  ownerId: z.string().uuid().optional(),
  contractId: z.string().uuid().optional(),
  machineId: z.string().uuid().optional(),
  technicianId: z.string().uuid().optional(),
  page: z.number().int().nonnegative().default(0),
  size: z.number().int().min(1).max(100).default(50),
}).strict();

export const RecallAssignRequestSchema = z.object({
  technicianId: z.string().uuid(),
  scheduledPickupAt: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d{1,9})?)?$/).optional(),
  correlationId: z.string().trim().min(1),
}).strict();
export const RecallActionRequestSchema = z.object({ correlationId: z.string().trim().min(1) }).strict();
export const RecallPickupRequestSchema = z.object({
  successful: z.boolean(),
  evidenceId: z.string().trim().optional(),
  notes: z.string().optional(),
  correlationId: z.string().trim().min(1),
}).strict();
export const RecallOwnerAcknowledgementRequestSchema = z.object({
  conditionNotes: z.string().trim().min(1),
  evidenceId: z.string().trim().min(1),
  correlationId: z.string().trim().min(1),
}).strict();
export const RecallDepotReceiptRequestSchema = z.object({
  depotLocation: z.string().trim().min(1),
  depotReceivedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d{1,9})?)?$/).optional(),
  evidenceId: z.string().trim().min(1),
  correlationId: z.string().trim().min(1),
}).strict();
export const RecallReceiptDecisionRequestSchema = z.object({
  approved: z.boolean(),
  reason: z.string().optional(),
  correlationId: z.string().trim().min(1),
}).strict();

export type RecallWorkOrder = z.infer<typeof RecallWorkOrderSchema>;
export type RecallWorkOrderSummary = z.infer<typeof RecallWorkOrderSummarySchema>;
export type RecallWorkOrderEvent = z.infer<typeof RecallWorkOrderEventSchema>;
export type RecallEvidence = z.infer<typeof RecallEvidenceSchema>;
export type RecallWorkOrderListParams = z.infer<typeof RecallWorkOrderListParamsSchema>;
