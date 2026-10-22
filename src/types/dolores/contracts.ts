import type { z } from 'zod';
import type {
  ContractDocumentSchema,
  ContractExpiryStatusSchema,
  ContractSchema,
} from '@/schemas/dolores/contracts';

export type Contract = z.infer<typeof ContractSchema>;
export type ContractExpiryStatus = z.infer<typeof ContractExpiryStatusSchema>;
export type ContractDocument = z.infer<typeof ContractDocumentSchema>;
