import { z } from 'zod';

export const StoreLocationSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  address: z.string().nullish(),
  city: z.string().nullish(),
  contactPerson: z.string().nullish(),
  phoneNumber: z.string().nullish(),
  active: z.boolean().nullish(),
});

const locations = z.array(StoreLocationSchema);

const ensureComplete = (value: Record<string, unknown>, context: z.RefinementCtx) => {
  if (value.hasNext === true || value.last === false ||
      (typeof value.totalPages === 'number' && value.totalPages > 1) ||
      (value.nextCursor !== undefined && value.nextCursor !== null)) {
    context.addIssue({ code: z.ZodIssueCode.custom, message: 'Location list contains more pages.' });
  }
};

// The current OpenAPI response is only `object`; validate supported list
// envelopes and reject an unrecognized or incomplete payload.
export const StoreLocationListSchema = z.union([
  locations,
  z.object({ data: locations }).passthrough().superRefine(ensureComplete),
  z.object({ locations }).passthrough().superRefine(ensureComplete),
  z.object({ content: locations, last: z.literal(true) }),
]);

export type StoreLocation = z.infer<typeof StoreLocationSchema>;

export function unwrapLocations(response: z.infer<typeof StoreLocationListSchema>): StoreLocation[] {
  if (Array.isArray(response)) return response;
  if ('data' in response) return locations.parse(response.data);
  if ('locations' in response) return locations.parse(response.locations);
  return response.content;
}
