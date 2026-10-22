import type { z } from 'zod';
import type { BuybackCaseSchema } from '@/schemas/dolores/buybacks';

export type BuybackCase = z.infer<typeof BuybackCaseSchema>;
