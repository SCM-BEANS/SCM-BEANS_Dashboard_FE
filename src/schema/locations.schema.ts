import { z } from "zod";

export const LocationIdSchema = z.string().uuid();
export const LocationSchema = z.object({
  id: LocationIdSchema,
  ownerId: z.string().uuid().optional(),
  tenantId: z.string().uuid().optional(),
  name: z.string().min(1), address: z.string().nullish(), city: z.string().nullish(),
  contactPerson: z.string().nullish(), phoneNumber: z.string().nullish(),
  active: z.boolean().optional(), machineCount: z.number().int().nonnegative().optional(),
  createdAt: z.string().nullish(),
}).passthrough();
export const LocationListSchema = z.array(LocationSchema);
export const LocationListParamsSchema = z.object({ ownerId: z.string().uuid(), activeOnly: z.boolean().optional() });
export const LocationCreateSchema = z.object({
  name: z.string().trim().min(1), address: z.string().trim().optional(),
  city: z.string().trim().optional(), contactPerson: z.string().trim().optional(),
  phoneNumber: z.string().trim().optional(),
});
export type Location = z.infer<typeof LocationSchema>;
export type LocationCreate = z.infer<typeof LocationCreateSchema>;
