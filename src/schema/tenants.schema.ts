import { z } from "zod";

export const TenantIdSchema = z.string().uuid();

export const TenantSchema = z.object({
  id: TenantIdSchema,
  name: z.string().min(1),
  type: z.string().nullish(),
  billingExempt: z.boolean().nullish(),
});

export const TenantListSchema = z.array(TenantSchema);

export type Tenant = z.infer<typeof TenantSchema>;
