import { z } from "zod";

const uuid = z.string().uuid();
const decimal = z.union([z.number(), z.string()]);
const dateTime = z.union([
  z.string().datetime({ offset: true }),
  z.string().datetime({ local: true }),
]);
const privateEvidenceReference = z.string().trim().min(1).max(512)
  .refine((reference) => !/^https?:\/\//i.test(reference) && !/[\r\n]/.test(reference));

export const RepairCostReviewIdSchema = uuid;

export const RepairCostComponentRequestSchema = z.object({
  category: z.enum(["PARTS", "LABOR", "TRANSPORT", "OTHER"]),
  description: z.string().trim().min(1).max(1000),
  quantity: z.number().positive(),
  unitPrice: z.number().nonnegative(),
}).strict();

export const ApprovedRepairCostComponentRequestSchema = z.object({
  componentId: uuid,
  quantity: z.number().positive(),
  unitPrice: z.number().nonnegative(),
}).strict();

export const RepairCostProposalRequestSchema = z.object({
  cause: z.enum(["NORMAL_WEAR", "WARRANTY_OR_MACHINE_FAULT", "MISUSE", "EXTERNAL_DAMAGE", "UNDETERMINED"]),
  diagnosis: z.string().trim().min(1),
  estimatedAmount: z.number().nonnegative(),
  currency: z.string().regex(/^[A-Za-z]{3}$/),
  evidenceReferences: z.array(privateEvidenceReference).min(1),
  proposedResponsibleParty: z.enum(["TENANT", "COMPANY", "UNKNOWN"]),
  costComponents: z.array(RepairCostComponentRequestSchema).optional(),
}).strict();

export const RepairCostDecisionRequestSchema = z.object({
  approve: z.boolean(),
  responsibleParty: z.enum(["TENANT", "COMPANY", "UNKNOWN"]).nullable().optional(),
  approvedAmount: z.number().nonnegative().nullable().optional(),
  reason: z.string().trim().min(1),
  approvedComponents: z.array(ApprovedRepairCostComponentRequestSchema).optional(),
}).strict();

export const RepairCostAcknowledgementRequestSchema = z.object({
  acknowledgeApprovedAmount: z.literal(true),
}).strict();

export const RepairCostDisputeRequestSchema = z.object({
  reason: z.string().trim().min(1),
  disputedAmount: z.number().positive(),
  evidenceReferences: z.array(privateEvidenceReference).min(1),
}).strict();

export const RepairCostResolutionRequestSchema = z.object({
  rejectCharge: z.boolean(),
  responsibleParty: z.enum(["TENANT", "COMPANY", "UNKNOWN"]).nullable().optional(),
  approvedAmount: z.number().nonnegative().nullable().optional(),
  reason: z.string().trim().min(1),
  approvedComponents: z.array(ApprovedRepairCostComponentRequestSchema).optional(),
}).strict();

const RepairCostDecisionSchema = z.object({
  id: uuid,
  type: z.string(),
  actorId: uuid.nullish(),
  actorRole: z.string().nullish(),
  reason: z.string().nullish(),
  responsibleParty: z.string().nullish(),
  amount: decimal.nullish(),
  currency: z.string().nullish(),
  occurredAt: dateTime.nullish(),
}).passthrough();

const RepairCostComponentSchema = z.object({
  id: uuid,
  category: z.string(),
  description: z.string(),
  quantity: decimal,
  unitPrice: decimal,
  amount: decimal,
}).passthrough();

const ApprovedCostComponentSchema = RepairCostComponentSchema.extend({
  decisionId: uuid.nullish(),
  sourceComponentId: uuid.nullish(),
  currency: z.string().nullish(),
  approvedAt: dateTime.nullish(),
}).passthrough();

export const RepairCostReviewSchema = z.object({
  id: RepairCostReviewIdSchema,
  maintenanceTicketId: uuid,
  contractId: uuid.nullish(),
  machineId: uuid,
  ownerId: uuid,
  policyVersionId: uuid.nullish(),
  cause: z.string(),
  diagnosis: z.string(),
  estimatedAmount: decimal,
  currency: z.string(),
  evidenceReferences: z.string().nullish(),
  proposedResponsibleParty: z.string(),
  status: z.enum([
    "PROPOSED",
    "APPROVED_NO_OWNER_CHARGE",
    "APPROVED_PENDING_OWNER_ACK",
    "DISPUTED",
    "RESOLVED_PENDING_OWNER_ACK",
    "COLLECTIBLE",
    "REJECTED",
  ]),
  approvedAmount: decimal.nullish(),
  approvedResponsibleParty: z.string().nullish(),
  currentInvoiceId: uuid.nullish(),
  ownerNotifiedAt: dateTime.nullish(),
  ownerAcknowledgedAt: dateTime.nullish(),
  disputeReason: z.string().nullish(),
  disputedAmount: decimal.nullish(),
  undisputedAmount: decimal.nullish(),
  disputeEvidenceReferences: z.string().nullish(),
  disputedAt: dateTime.nullish(),
  resolvedAt: dateTime.nullish(),
  createdAt: dateTime,
  decisions: z.array(RepairCostDecisionSchema),
  costComponents: z.array(RepairCostComponentSchema),
  approvedComponents: z.array(ApprovedCostComponentSchema),
}).passthrough();

export type RepairCostReview = z.infer<typeof RepairCostReviewSchema>;
export type RepairCostProposalRequest = z.infer<typeof RepairCostProposalRequestSchema>;
export type RepairCostDecisionRequest = z.infer<typeof RepairCostDecisionRequestSchema>;
export type RepairCostDisputeRequest = z.infer<typeof RepairCostDisputeRequestSchema>;
export type RepairCostResolutionRequest = z.infer<typeof RepairCostResolutionRequestSchema>;
