import { z } from 'zod';

const uuid = z.string().uuid();
const optionalText = z.string().nullish();

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

export type Invoice = z.infer<typeof InvoiceSchema>;
