import { z } from "zod";

export const TenantSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  type: z.string().nullish(),
  billingExempt: z.boolean().nullish(),
});

export const TenantListSchema = z.array(TenantSchema);

export type Tenant = z.infer<typeof TenantSchema>;
