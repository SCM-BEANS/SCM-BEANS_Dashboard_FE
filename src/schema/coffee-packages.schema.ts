import { z } from "zod";

export const CoffeePackageIdSchema = z.string().uuid();
export const CoffeePackageOrderIdSchema = z.string().uuid();
export const CoffeePackageInvoiceIdSchema = z.string().uuid();
export const CoffeePackageProofIdSchema = z.string().uuid();
export const CoffeePackageRefundIdSchema = z.string().uuid();

const optionalText = z.string().nullish();
const optionalMoney = z.number().finite().nonnegative().nullish();

export const CoffeePackageSchema = z.object({
  id: CoffeePackageIdSchema,
  code: optionalText,
  name: z.string().trim().min(1),
  description: optionalText,
  unitPrice: z.number().finite().nonnegative(),
  currency: z.string().trim().min(1).default("VND"),
  usageDays: z.number().int().positive().nullish(),
  active: z.boolean().optional(),
  status: optionalText,
}).passthrough();
export const CoffeePackagesSchema = z.array(CoffeePackageSchema);

export const CoffeePackageUpsertRequestSchema = z.object({
  code: z.string().trim().min(1).max(80),
  name: z.string().trim().min(1).max(160),
  description: z.string().trim().max(2000).optional(),
  unitPrice: z.number().finite().nonnegative(),
  currency: z.string().trim().min(1).max(8).default("VND"),
  usageDays: z.number().int().positive(),
}).strict();

export const CoffeePackageOrderSchema = z.object({
  id: CoffeePackageOrderIdSchema,
  contractId: z.string().uuid().nullish(),
  packageId: z.string().uuid().nullish(),
  ownerId: z.string().uuid().nullish(),
  moderatorId: z.string().uuid().nullish(),
  machineId: z.string().uuid().nullish(),
  packageCode: optionalText,
  packageName: optionalText,
  unitPrice: optionalMoney,
  usageDays: z.number().int().positive().nullish(),
  quantity: z.number().int().positive().nullish(),
  ownerReceivedAt: optionalText,
  status: z.string().trim().min(1),
  amount: optionalMoney,
  total: optionalMoney,
  currency: optionalText,
  reviewedBy: optionalText,
  reviewedAt: optionalText,
  reviewNote: optionalText,
  payosQrUrl: optionalText,
  payosQrRef: optionalText,
  createdAt: optionalText,
  updatedAt: optionalText,
}).passthrough();
export const CoffeePackageOrdersSchema = z.array(CoffeePackageOrderSchema);

export const CoffeePackagePlaceOrderRequestSchema = z.object({
  contractId: z.string().uuid(),
  packageId: CoffeePackageIdSchema,
  quantity: z.number().int().positive(),
}).strict();

export const CoffeePackageApprovalRequestSchema = z.object({
  supplyConfirmed: z.boolean(),
  note: z.string().trim().max(2000),
}).strict();
export const CoffeePackageReasonRequestSchema = z.object({ reason: z.string().trim().min(1).max(2000) }).strict();
export const CoffeePackageWaitingStockRequestSchema = z.object({
  reason: z.string().trim().min(1).max(2000),
  expectedStockAt: z.string().datetime({ offset: true }),
}).strict();
export const CoffeePackageHandoverRequestSchema = z.object({
  method: z.enum(["SELF_PICKUP", "COMPANY_DELIVERY_EXTERNAL"]),
  recipient: z.string().trim().min(1).max(160),
  quantity: z.number().int().positive(),
  expiryChecked: z.literal(true),
}).strict();

export const CoffeePackageInvoiceSchema = z.object({
  id: CoffeePackageInvoiceIdSchema,
  orderId: CoffeePackageOrderIdSchema,
  ownerId: z.string().uuid().nullish(),
  contractId: z.string().uuid().nullish(),
  quantity: z.number().int().positive().nullish(),
  unitPrice: optionalMoney,
  total: optionalMoney,
  approvedAmount: optionalMoney,
  currency: optionalText,
  status: z.string().trim().min(1),
  approvedAt: optionalText,
  dueAt: optionalText,
  paidAt: optionalText,
}).passthrough();

export const CoffeePackagePaymentProofSchema = z.object({
  id: CoffeePackageProofIdSchema,
  invoiceId: CoffeePackageInvoiceIdSchema,
  ownerId: z.string().uuid().nullish(),
  amount: optionalMoney,
  originalFilename: optionalText,
  contentType: optionalText,
  sizeBytes: z.number().int().nonnegative().nullish(),
  sha256: optionalText,
  status: z.string().trim().min(1),
  submittedAt: optionalText,
  reviewedBy: optionalText,
  reviewedAt: optionalText,
  reviewReason: optionalText,
  verifiedAmount: optionalMoney,
  allocatedAmount: optionalMoney,
  excessAmount: optionalMoney,
  disposition: optionalText,
  bankReference: optionalText,
  returnBankReference: optionalText,
  dispositionReason: optionalText,
  disposedBy: optionalText,
  disposedAt: optionalText,
  downloadPath: optionalText,
  dispositionEvidencePath: optionalText,
}).passthrough();
export const CoffeePackagePaymentProofsSchema = z.array(CoffeePackagePaymentProofSchema);

export const CoffeePackageProofReviewRequestSchema = z.object({
  approve: z.boolean(),
  reason: z.string().trim().min(1).max(2000),
}).strict();
export const CoffeePackageProofDispositionSchema = z.enum([
  "NO_FUNDS",
  "EXCESS_RETURNED",
  "EXCESS_INCLUDED_IN_REFUND",
]);

export const CoffeePackageRefundSchema = z.object({
  id: CoffeePackageRefundIdSchema,
  orderId: CoffeePackageOrderIdSchema.nullish(),
  invoiceId: CoffeePackageInvoiceIdSchema.nullish(),
  ownerId: z.string().uuid().nullish(),
  amount: optionalMoney,
  currency: optionalText,
  status: z.string().trim().min(1),
  reason: optionalText,
  createdAt: optionalText,
  approvedBy: optionalText,
  approvedAt: optionalText,
  payoutAttempt: z.number().int().nonnegative().nullish(),
  payoutBankReference: optionalText,
  payoutRecordedBy: optionalText,
  payoutRecordedAt: optionalText,
  ownerConfirmedAt: optionalText,
}).passthrough();
export const CoffeePackageRefundsSchema = z.array(CoffeePackageRefundSchema);

export const CoffeePackagePayoutAttemptSchema = z.object({
  id: z.string().uuid(),
  refundId: CoffeePackageRefundIdSchema,
  attemptNumber: z.number().int().positive(),
  amount: optionalMoney,
  currency: optionalText,
  originalFilename: optionalText,
  contentType: optionalText,
  sizeBytes: z.number().int().nonnegative().nullish(),
  sha256: optionalText,
  bankReference: optionalText,
  createdBy: optionalText,
  createdAt: optionalText,
  status: z.string().trim().min(1),
  downloadPath: optionalText,
}).passthrough();
export const CoffeePackagePayoutAttemptsSchema = z.array(CoffeePackagePayoutAttemptSchema);

export const CoffeePackageFulfillmentSchema = z.object({
  orderId: CoffeePackageOrderIdSchema,
  status: z.string().trim().min(1),
  quantity: z.number().int().positive().nullish(),
  waitingReason: optionalText,
  expectedStockAt: optionalText,
  ownerWaitedAt: optionalText,
  handoverMethod: optionalText,
  handoverRecipient: optionalText,
  handedOverBy: optionalText,
  handedOverAt: optionalText,
  expiryCheckedBy: optionalText,
  expiryCheckedAt: optionalText,
  ownerReceivedAt: optionalText,
}).passthrough();

export const CoffeePackageCancellationSchema = z.object({
  orderId: CoffeePackageOrderIdSchema,
  status: z.string().trim().min(1),
  refundId: CoffeePackageRefundIdSchema.nullish(),
  refundAmount: optionalMoney,
  currency: optionalText,
  reason: optionalText,
}).passthrough();

export const CoffeePackagePayoutDisputeRequestSchema = z.object({
  reason: z.string().trim().min(1).max(2000),
}).strict();
export const CoffeePackageResolveDisputeRequestSchema = z.object({
  resolution: z.enum(["CONFIRM_PAYOUT", "RETRY_PAYOUT"]),
  reason: z.string().trim().min(1).max(2000),
}).strict();

export type CoffeePackage = z.infer<typeof CoffeePackageSchema>;
export type CoffeePackageOrder = z.infer<typeof CoffeePackageOrderSchema>;
export type CoffeePackageInvoice = z.infer<typeof CoffeePackageInvoiceSchema>;
export type CoffeePackagePaymentProof = z.infer<typeof CoffeePackagePaymentProofSchema>;
export type CoffeePackageRefund = z.infer<typeof CoffeePackageRefundSchema>;
export type CoffeePackagePayoutAttempt = z.infer<typeof CoffeePackagePayoutAttemptSchema>;
export type CoffeePackageUpsertRequest = z.input<typeof CoffeePackageUpsertRequestSchema>;
