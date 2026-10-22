import type { z } from 'zod';
import type { TenantSchema } from '@/schemas/dolores/tenants';

export type Tenant = z.infer<typeof TenantSchema>;
