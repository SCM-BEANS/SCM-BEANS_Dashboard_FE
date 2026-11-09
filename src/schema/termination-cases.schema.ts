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
export const TerminationCaseRequestSchema = z.object({
  type: TerminationCaseTypeSchema,
  reason: z.string().trim().min(1),
  effectiveDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  idempotencyKey: z.string().trim().min(1),
  correlationId: z.string().trim().min(1),
}).strict();

export const TerminationCaseResponseSchema = z.object({
  id: TerminationCaseIdSchema,
  ownerId: z.string().uuid(),
  contractId: z.string().uuid(),
  machineId: z.string().uuid().nullish(),
  type: TerminationCaseTypeSchema,
  status: TerminationCaseStatusSchema,
  requestedBy: z.string().nullish(),
  reason: z.string(),
  effectiveDate: z.string().nullish(),
  handoverEvidenceReference: z.string().nullish(),
  handoverRecordedAt: z.string().nullish(),
  inspectionTicketId: z.string().uuid().nullish(),
  inspectionDecision: z.string().nullish(),
  settlementId: z.string().uuid().nullish(),
  depositRefundAmount: z.number().finite().nonnegative().nullish(),
  refundId: z.string().uuid().nullish(),
  refundStatus: RefundStatusSchema.nullish(),
  approvedBy: z.string().nullish(),
  approvedAt: z.string().nullish(),
  completedAt: z.string().nullish(),
  rejectedReason: z.string().nullish(),
  createdAt: z.string().nullish(),
  updatedAt: z.string().nullish(),
}).passthrough();

export const TerminationActionRequestSchema = z.object({
  correlationId: z.string().trim().min(1),
}).strict();

export const TerminationInspectionRequestSchema = z.object({
  maintenanceTicketId: z.string().uuid(),
  diagnosis: z.string().trim().min(1),
  responsibility: z.enum(["TENANT", "COMPANY", "UNKNOWN"]),
  actualCost: z.number().finite().nonnegative().optional(),
  evidenceReference: z.string().trim().min(1),
  resolutionResult: z.string().trim().min(1),
  notes: z.string().optional(),
  correlationId: z.string().trim().min(1),
}).strict();

export const TerminationInspectionResultSchema = z.object({
  caseId: z.string().uuid(),
  maintenanceTicketId: z.string().uuid(),
  status: z.string(),
  inspectionDecision: z.enum(["NO_DAMAGE", "DAMAGE", "PARTIAL_DAMAGE"]).nullable(),
  diagnosis: z.string().nullish(),
  actualCost: z.number().nullable(),
  completedAt: z.string().nullable(),
});
export type TerminationInspectionResult = z.infer<typeof TerminationInspectionResultSchema>;

export const TerminationRejectionRequestSchema = z.object({
  reason: z.string().trim().min(1),
  correlationId: z.string().trim().min(1),
}).strict();

export type TerminationCaseRequest = z.infer<typeof TerminationCaseRequestSchema>;
export type TerminationCaseResponse = z.infer<typeof TerminationCaseResponseSchema>;
export type TerminationCaseStatus = z.infer<typeof TerminationCaseStatusSchema>;
export type TerminationInspectionRequest = z.infer<typeof TerminationInspectionRequestSchema>;
