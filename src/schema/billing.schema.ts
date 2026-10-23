import { z } from "zod";

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
  lineItems: z.array(z.unknown()).nullish(),
  rentalFeeSnapshot: z.number().nullish(),
  overageCups: z.number().nullish(),
  overageUnitPrice: z.number().nullish(),
  createdAt: z.string().nullish(),
  paidAt: z.string().nullish(),
}).passthrough();

export const InvoicesSchema = z.array(InvoiceSchema);

export type Invoice = z.infer<typeof InvoiceSchema>;
