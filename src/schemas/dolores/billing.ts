import { z } from 'zod';

const uuid = z.string().uuid();
const optionalText = z.string().nullish();

export const InvoiceIdSchema = uuid;
export const PaymentProofIdSchema = uuid;

export const InvoiceSchema = z.object({
  id: uuid,
  subscriptionId: uuid.nullish(),
  tenantId: uuid.nullish(),
  contractId: uuid.nullish(),
  amount: z.number().finite(),
  period: z.string(),
  type: z.enum(['SUPPLY', 'RENTAL']),
  status: z.enum(['DRAFT', 'PENDING', 'UNPAID', 'PAID', 'OVERDUE', 'CANCELLED']),
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

export const InvoicesSchema = z.array(InvoiceSchema);

export const PaymentProofSchema = z.object({
  id: PaymentProofIdSchema,
  tenantId: uuid,
  invoiceId: InvoiceIdSchema,
  paymentId: uuid,
  originalFilename: z.string(),
  contentType: z.string(),
  sizeBytes: z.number().int().nonnegative(),
  sha256: z.string(),
  status: z.enum(['SUBMITTED', 'APPROVED', 'REJECTED']),
  submittedBy: z.string(),
  submittedAt: z.string(),
  reviewedBy: optionalText,
  reviewedAt: optionalText,
  reviewReason: optionalText,
});

export const PaymentProofsSchema = z.array(PaymentProofSchema);

