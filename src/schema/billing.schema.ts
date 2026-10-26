import { z } from "zod";

export const InvoiceIdSchema = z.string().uuid();
export const PaymentProofIdSchema = z.string().uuid();
const optionalText = z.string().nullish();

export const InvoiceSchema = z.object({
  id: z.string().uuid(),
  ownerId: z.string().uuid(),
  contractId: z.string().uuid(),
  amount: z.number(),
  period: z.string(),
  type: z.string(),
  status: z.string(),
  currency: z.string(),
  billingPeriodStart: z.string().nullish(),
  billingPeriodEnd: z.string().nullish(),
  dueDate: z.string().nullish(),
  lineItems: z.union([z.array(z.unknown()), z.string()]).nullish(),
  rentalFeeSnapshot: z.number().nullish(),
  overageCups: z.number().nullish(),
  overageUnitPrice: z.number().nullish(),
  createdAt: z.string().nullish(),
  paidAt: z.string().nullish(),
}).passthrough();

export const InvoicesSchema = z.array(InvoiceSchema);

export const InvoiceLineItemSchema = z.object({
  id: z.string().uuid().nullish(),
  invoiceId: InvoiceIdSchema,
  ownerId: z.string().uuid().nullish(),
  contractId: z.string().uuid().nullish(),
  machineId: z.string().uuid().nullish(),
  repairCaseId: z.string().uuid().nullish(),
  serviceCode: z.string().nullish(),
  description: z.string().nullish(),
  quantity: z.number().nullish(),
  unitPrice: z.number().nullish(),
  amount: z.number().nullish(),
  effectiveStart: z.string().nullish(),
  effectiveEnd: z.string().nullish(),
  createdAt: z.string().nullish(),
}).passthrough();
export const InvoiceLineItemsSchema = z.array(InvoiceLineItemSchema);

export type Invoice = z.infer<typeof InvoiceSchema>;

// Moderator reads may use tenantId while Admin's billing DTO uses ownerId.
// Keep this schema separate so the existing Admin contract stays unchanged.
export const ModeratorInvoiceSchema = z.object({
  id: InvoiceIdSchema,
  subscriptionId: z.string().uuid().nullish(),
  ownerId: z.string().uuid().nullish(),
  tenantId: z.string().uuid().nullish(),
  contractId: z.string().uuid().nullish(),
  repairCostReviewId: z.string().uuid().nullish(),
  repairCostDecisionId: z.string().uuid().nullish(),
  amount: z.number().finite(),
  period: z.string(),
  type: z.enum(["SUPPLY", "RENTAL"]),
  status: z.enum(["DRAFT", "PENDING", "UNPAID", "PAID", "OVERDUE", "CANCELLED"]),
  currency: z.string(),
  billingPeriodStart: optionalText,
  billingPeriodEnd: optionalText,
  dueDate: optionalText,
  lineItems: optionalText,
  rentalFeeSnapshot: z.number().finite().nullish(),
  quotaSnapshot: z.number().int().nullish(),
  overageCups: z.number().int().nullish(),
  overageUnitPrice: z.number().finite().nullish(),
  createdAt: optionalText,
  paidAt: optionalText,
});

export const ModeratorInvoicesSchema = z.array(ModeratorInvoiceSchema);

// objectKey is intentionally absent. Zod strips unknown fields before the
// proof metadata reaches the UI.
export const PaymentProofSchema = z.object({
  id: PaymentProofIdSchema,
  invoiceId: InvoiceIdSchema,
  ownerId: z.string().uuid().nullish(),
  tenantId: z.string().uuid().nullish(),
  paymentId: z.string().uuid(),
  originalFilename: z.string(),
  contentType: z.string(),
  sizeBytes: z.number().int().nonnegative(),
  sha256: z.string(),
  status: z.enum(["SUBMITTED", "APPROVED", "REJECTED"]),
  submittedBy: z.string(),
  submittedAt: z.string(),
  reviewedBy: z.string().nullish(),
  reviewedAt: z.string().nullish(),
  reviewReason: z.string().nullish(),
});

export const PaymentProofsSchema = z.array(PaymentProofSchema);
export const PaymentProofSubmitResponseSchema = z.object({}).passthrough();

export type ModeratorInvoice = z.infer<typeof ModeratorInvoiceSchema>;
export type PaymentProof = z.infer<typeof PaymentProofSchema>;
export type InvoiceLineItem = z.infer<typeof InvoiceLineItemSchema>;
