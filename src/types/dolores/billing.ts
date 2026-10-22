import type { z } from 'zod';
import type { InvoiceSchema, PaymentProofSchema } from '@/schemas/dolores/billing';

export type Invoice = z.infer<typeof InvoiceSchema>;
export type PaymentProof = z.infer<typeof PaymentProofSchema>;
