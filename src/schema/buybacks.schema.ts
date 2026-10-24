import { z } from "zod";

export const BuybackIdSchema = z.string().uuid();
const optionalText = z.string().nullish();

// Deliberately model only fields used for read-only Moderator display. Private
// idempotency/correlation values are stripped by Zod's default object policy.
export const BuybackCaseSchema = z.object({
  id: BuybackIdSchema,
  tenantId: z.string().uuid(),
  contractId: z.string().uuid(),
  machineId: z.string().uuid(),
  status: z.enum([
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
  ]),
  requestedPrice: z.number().finite(),
  approvedPrice: z.number().finite().nullish(),
  currency: z.string(),
  externalAgreementReference: optionalText,
  reason: z.string(),
  requestedBy: z.string(),
  requestedAt: z.string(),
  approvedBy: optionalText,
  approvedAt: optionalText,
  rejectedBy: optionalText,
  rejectedAt: optionalText,
  rejectionReason: optionalText,
  cancelledBy: optionalText,
  cancelledAt: optionalText,
  cancellationReason: optionalText,
  collectionEvidence: optionalText,
  collectedBy: optionalText,
  collectedAt: optionalText,
  createdAt: z.string(),
  updatedAt: z.string(),
  version: z.number().int().nonnegative(),
});

export type BuybackCase = z.infer<typeof BuybackCaseSchema>;
