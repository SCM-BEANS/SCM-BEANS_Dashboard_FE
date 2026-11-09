import { z } from "zod";

export const InvoiceIdSchema = z.string().uuid();
export const PaymentProofIdSchema = z.string().uuid();
export const RefundIdSchema = z.string().uuid();
const optionalText = z.string().nullish();

export const BILLING_DEFAULT_PAGE_SIZE = 50;
export const BILLING_MAX_PAGE_SIZE = 100;

const pageFields = {
  page: z.number().int().min(0).default(0),
  size: z.number().int().min(1).max(BILLING_MAX_PAGE_SIZE).default(BILLING_DEFAULT_PAGE_SIZE),
};

export const InvoiceListParamsSchema = z.object({
  ownerId: z.string().uuid().optional(),
  status: z.enum(["DRAFT", "PENDING", "UNPAID", "PAID", "OVERDUE", "CANCELLED"]).optional(),
  type: z.enum(["SUPPLY", "RENTAL", "REPAIR"]).optional(),
  period: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/).optional(),
  ...pageFields,
});

export const InvoiceLineItemListParamsSchema = z.object(pageFields);

export const PaymentProofListParamsSchema = z.object({
  status: z.enum(["SUBMITTED", "APPROVED", "REJECTED"]).optional(),
  ...pageFields,
});

export type InvoiceListParams = z.input<typeof InvoiceListParamsSchema>;
export type InvoiceLineItemListParams = z.input<typeof InvoiceLineItemListParamsSchema>;
export type PaymentProofListParams = z.input<typeof PaymentProofListParamsSchema>;

export type BillingPage<T> = {
  items: T[];
  page: number;
  size: number;
  hasNext: boolean;
};

export const InvoiceSchema = z.object({
  id: z.string().uuid(),
  ownerId: z.string().uuid().nullish(),
  contractId: z.string().uuid().nullish(),
  amount: z.number().finite(),
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
  type: z.enum(["SUPPLY", "RENTAL", "REPAIR"]),
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
  amount: z.number().finite().nullish(),
  currency: z.string().nullish(),
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
export const PaymentProofSubmitResponseSchema = PaymentProofSchema;
export const PaymentProofReviewRequestSchema = z.object({
  approve: z.boolean(),
  reason: z.string().trim().min(1),
});

export const RefundStatusSchema = z.enum([
  "REQUESTED",
  "TENANT_CONFIRMED",
  "APPROVED",
  "SUBMITTED",
  "COMPLETED",
  "REJECTED",
  "FAILED",
  "DISPUTED",
]);

const refundMetadata = {
  ownerName: z.string().nullish(),
  depositLedgerEntryId: z.string().uuid().nullish(),
  approvalRequiredRole: z.enum(["ADMIN", "MODERATOR"]).optional(),
  reason: z.string().optional(),
  requestedBy: z.string().optional(),
  ownerConfirmedBy: z.string().nullish(),
  ownerConfirmedAt: optionalText,
  approvedBy: z.string().nullish(),
  approvedAt: optionalText,
  submittedBy: z.string().nullish(),
  submittedAt: optionalText,
  completedBy: z.string().nullish(),
  completedAt: optionalText,
  ownerReceiptConfirmedBy: z.string().nullish(),
  ownerReceiptConfirmedAt: optionalText,
  ownerReceivedAmount: z.number().finite().nonnegative().nullish(),
  ownerReceiptNote: optionalText,
  failureReason: optionalText,
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
};

export const RefundDetailSchema = z.object({
  id: RefundIdSchema,
  ownerId: z.string().uuid(),
  contractId: z.string().uuid().nullable(),
  invoiceId: InvoiceIdSchema.nullable(),
  terminationCaseId: z.string().uuid().nullable(),
  refundKind: z.enum(["DEPOSIT", "OVERPAYMENT", "ORDINARY"]),
  amount: z.number().finite().positive(),
  currency: z.literal("VND"),
  status: RefundStatusSchema,
  requestedAt: z.string(),
  ...refundMetadata,
}).strict();

export const RefundRequestResponseSchema = RefundDetailSchema.extend({
  approvalRequiredRole: z.enum(["ADMIN", "MODERATOR"]),
  reason: z.string(),
  requestedBy: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const RefundCreateRequestSchema = z.object({
  ownerId: z.string().uuid(),
  contractId: z.string().uuid().nullish(),
  invoiceId: InvoiceIdSchema.nullish(),
  depositLedgerEntryId: z.string().uuid().nullish(),
  refundKind: z.enum(["DEPOSIT", "OVERPAYMENT"]),
  amount: z.number().finite().positive(),
  currency: z.literal("VND"),
  reason: z.string().trim().min(1).max(2000),
  idempotencyKey: z.string().trim().min(1).max(128),
}).strict().superRefine((value, context) => {
  const field = value.refundKind === "DEPOSIT" ? "contractId" : "invoiceId";
  if (!value[field]) context.addIssue({ code: z.ZodIssueCode.custom, path: [field], message: `${field} is required for this refund source.` });
});

export const RefundReasonRequestSchema = z.object({ reason: z.string().trim().min(1).max(2000) }).strict();
export const RefundOverdueParamsSchema = z.object({ ownerId: z.string().uuid().optional(), ...pageFields }).strict();
export const RefundPayoutEvidenceSchema = z.object({
  id: z.string().uuid(),
  originalFilename: z.string(),
  contentType: z.enum(["application/pdf", "image/jpeg", "image/png"]),
  sizeBytes: z.number().int().positive(),
  sha256: z.string(),
  uploadedBy: z.string(),
  uploadedAt: z.string(),
}).strict();

export const DepositSettlementResponseSchema = z.object({
  ownerId: z.string().uuid(),
  contractId: z.string().uuid(),
  refundableBalance: z.number().finite().nonnegative(),
  receivableAmount: z.number().finite().nonnegative(),
  entries: z.array(z.object({
    id: z.string().uuid(), ownerId: z.string().uuid(), contractId: z.string().uuid(),
    entryType: z.string(), amount: z.number().finite(), refundableBalanceAfter: z.number().finite().nonnegative(),
    currency: z.literal("VND"), reason: z.string().nullish(), actorId: z.string(), occurredAt: z.string(),
  }).strict()),
}).strict();
export const DepositReserveRequestSchema = z.object({ idempotencyKey: z.string().trim().min(1).max(128) }).strict();
export const DepositReleaseRequestSchema = DepositReserveRequestSchema.extend({ reason: z.string().trim().min(1).max(2000) });
export const DepositDamageRequestSchema = z.object({
  damageAmount: z.number().finite().nonnegative(),
  maintenanceTicketId: z.string().uuid().optional(), decision: z.enum(["NO_DAMAGE", "DAMAGE", "PARTIAL_DAMAGE"]),
  notes: z.string().max(2000).optional(),
}).strict().refine((value) => value.decision !== "NO_DAMAGE" || value.damageAmount === 0, { path: ["damageAmount"], message: "NO_DAMAGE requires zero damage amount." });

export type RefundDetail = z.infer<typeof RefundDetailSchema>;
export type RefundCreateRequest = z.infer<typeof RefundCreateRequestSchema>;
export type RefundOverdueParams = z.input<typeof RefundOverdueParamsSchema>;
export type RefundPayoutEvidence = z.infer<typeof RefundPayoutEvidenceSchema>;

export const RefundReceiptRequestSchema = z.object({
  receivedAmount: z.number().finite().nonnegative(),
  received: z.boolean(),
  note: z.string().trim().max(2000).optional(),
}).strict();

export type RefundStatus = z.infer<typeof RefundStatusSchema>;
export type RefundReceiptRequest = z.infer<typeof RefundReceiptRequestSchema>;

export type ModeratorInvoice = z.infer<typeof ModeratorInvoiceSchema>;
export type PaymentProof = z.infer<typeof PaymentProofSchema>;
export type InvoiceLineItem = z.infer<typeof InvoiceLineItemSchema>;


export const ExportJobIdSchema = z.string().uuid();

export const BillingExportRequestSchema = z.object({
  format: z.enum(["CSV", "PDF"]),
  invoiceIds: z.array(InvoiceIdSchema).max(1000).optional(),
  ownerId: z.string().uuid().optional(),
}).strict().refine(
  ({ invoiceIds, ownerId }) => Boolean(ownerId || (invoiceIds && invoiceIds.length > 0)),
  { message: "Select invoices or specify one owner for the export." },
);

export const ExportJobResponseSchema = z.object({
  id: ExportJobIdSchema,
  ownerId: z.string().uuid().nullish(),
  format: z.enum(["CSV", "PDF"]).nullish(),
  status: z.enum(["QUEUED", "PROCESSING", "COMPLETED", "FAILED"]),
  createdAt: optionalText,
  completedAt: optionalText,
  invoiceCount: z.number().int().nonnegative().nullish(),
  downloadPath: optionalText,
  errorCode: optionalText,
  message: optionalText,
}).strict();

export const BillingPreviewLineItemSchema = z.object({
  serviceCode: z.enum(["RENTAL_FEE", "INSTALLATION_FEE", "DEPOSIT", "PAYG_CUPS"]).nullish(),
  description: optionalText,
  quantity: z.number().finite().nullish(),
  unitPrice: z.number().finite().nullish(),
  amount: z.number().finite().nullish(),
  currency: optionalText,
  effectiveStart: optionalText,
  effectiveEnd: optionalText,
}).strict();

export const RepairChargePreviewLineSchema = z.object({
  repairCostReviewId: z.string().uuid().nullish(),
  repairCaseId: z.string().uuid().nullish(),
  componentId: z.string().uuid().nullish(),
  serviceCode: optionalText,
  description: optionalText,
  reviewStatus: z.enum([
    "PROPOSED",
    "APPROVED_NO_OWNER_CHARGE",
    "APPROVED_PENDING_OWNER_ACK",
    "DISPUTED",
    "RESOLVED_PENDING_OWNER_ACK",
    "COLLECTIBLE",
    "REJECTED",
  ]).nullish(),
  responsibleParty: z.enum(["TENANT", "COMPANY", "UNKNOWN"]).nullish(),
  ownerAcknowledged: z.boolean().nullish(),
  amountSource: z.enum(["APPROVED_COMPONENT", "APPROVED_AMOUNT", "ESTIMATED_AMOUNT"]).nullish(),
  currency: optionalText,
  amount: z.number().finite().nullish(),
  alreadyInvoiced: z.boolean().nullish(),
  includedInPreview: z.boolean().nullish(),
  requiresReviewOrAcknowledgement: z.boolean().nullish(),
}).strict();

export const BillingCurrencySubtotalSchema = z.object({
  currency: optionalText,
  contractAmount: z.number().finite().nullish(),
  repairAmount: z.number().finite().nullish(),
  tenantRepairAmount: z.number().finite().nullish(),
  companyRepairAmount: z.number().finite().nullish(),
  unknownRepairAmount: z.number().finite().nullish(),
  previewTotal: z.number().finite().nullish(),
}).strict();

export const ContractBillingPreviewResponseSchema = z.object({
  previewOnly: z.boolean().nullish(),
  contractId: z.string().uuid().nullish(),
  ownerId: z.string().uuid().nullish(),
  asOf: optionalText,
  period: optionalText,
  fromDate: optionalText,
  throughDate: optionalText,
  eligible: z.boolean().nullish(),
  eligibilityReasons: z.array(z.string()).nullish(),
  warnings: z.array(z.string()).nullish(),
  contractCharges: z.array(BillingPreviewLineItemSchema).nullish(),
  repairCharges: z.array(RepairChargePreviewLineSchema).nullish(),
  totalsByCurrency: z.array(BillingCurrencySubtotalSchema).nullish(),
}).strict();

export type BillingExportRequest = z.infer<typeof BillingExportRequestSchema>;

export type ExportJobResponse = z.infer<typeof ExportJobResponseSchema>;

export type ContractBillingPreviewResponse = z.infer<typeof ContractBillingPreviewResponseSchema>;

export const InvoiceStatusChangeRequestSchema = z.object({
  status: z.enum(["DRAFT", "PENDING", "UNPAID", "PAID", "OVERDUE", "CANCELLED"]),
});

export type PaymentProofReviewRequest = z.infer<typeof PaymentProofReviewRequestSchema>;

export type InvoiceStatusChangeRequest = z.infer<typeof InvoiceStatusChangeRequestSchema>;
