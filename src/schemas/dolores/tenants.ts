import { z } from 'zod';

export const TenantSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  type: z.string().nullish(),
  billingExempt: z.boolean().nullish(),
});

export const TenantListSchema = z.array(TenantSchema);

export type Tenant = z.infer<typeof TenantSchema>;
