import type { z } from 'zod';
import type { StoreLocationSchema } from '@/schemas/dolores/locations';

export type StoreLocation = z.infer<typeof StoreLocationSchema>;
