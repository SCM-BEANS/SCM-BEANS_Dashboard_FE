import { z } from "zod";

export const LocationIdSchema = z.string().uuid();
export const LocationSchema = z.object({
  id: LocationIdSchema,
  ownerId: z.string().uuid().nullish(),
  tenantId: z.string().uuid().nullish(),
  name: z.string().min(1), address: z.string().nullish(), city: z.string().nullish(),
  contactPerson: z.string().nullish(), phoneNumber: z.string().nullish(),
  active: z.boolean().nullish(), machineCount: z.number().int().nonnegative().nullish(),
  createdAt: z.string().nullish(),
}).passthrough();
const locationArraySchema = z.array(LocationSchema);
const ensureCompleteLocationList = (
  value: Record<string, unknown>,
  context: z.RefinementCtx,
) => {
  if (value.hasNext === true || value.last === false ||
      (typeof value.totalPages === "number" && value.totalPages > 1) ||
      (value.nextCursor !== undefined && value.nextCursor !== null)) {
    context.addIssue({ code: z.ZodIssueCode.custom, message: "Location list contains more pages." });
  }
};

export const LocationListSchema = z.union([
  locationArraySchema,
  z.object({ data: locationArraySchema }).passthrough().superRefine(ensureCompleteLocationList),
  z.object({ locations: locationArraySchema }).passthrough().superRefine(ensureCompleteLocationList),
  z.object({ content: locationArraySchema, last: z.literal(true) }),
]);
export const LocationListParamsSchema = z.object({ ownerId: z.string().uuid(), activeOnly: z.boolean().optional() });
export const TenantLocationListParamsSchema = z.object({ tenantId: z.string().uuid(), activeOnly: z.boolean().default(false) });
export const LocationCreateSchema = z.object({
  name: z.string().trim().min(1), address: z.string().trim().optional(),
  city: z.string().trim().optional(), contactPerson: z.string().trim().optional(),
  phoneNumber: z.string().trim().optional(),
});
export type Location = z.infer<typeof LocationSchema>;
export type LocationListResponse = z.infer<typeof LocationListSchema>;
export type LocationCreate = z.infer<typeof LocationCreateSchema>;

export function unwrapLocations(response: LocationListResponse): Location[] {
  if (Array.isArray(response)) return response;
  if ("data" in response) return locationArraySchema.parse(response.data);
  if ("locations" in response) return locationArraySchema.parse(response.locations);
  return response.content;
}
