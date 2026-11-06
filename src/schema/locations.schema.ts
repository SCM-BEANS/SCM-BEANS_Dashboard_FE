import { z } from "zod";
import { MachineSchema } from "@/schema/machines.schema";

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
export const LocationListPageParamsSchema = LocationListParamsSchema.extend({
  q: z.string().trim().max(120).optional(),
  page: z.number().int().nonnegative().default(0),
  size: z.number().int().min(1).max(100).default(50),
});
export const LocationCreateSchema = z.object({
  name: z.string().trim().min(1), address: z.string().trim().optional(),
  city: z.string().trim().optional(), contactPerson: z.string().trim().optional(),
  phoneNumber: z.string().trim().optional(),
});
export const LocationUpdateSchema = LocationCreateSchema;
export const LocationStatsResponseSchema = z.object({
  locationId: LocationIdSchema,
  locationName: z.string(),
  ownerId: z.string().uuid(),
  ownerName: z.string().nullish(),
  totalMachines: z.number().int().nonnegative(),
  onlineMachines: z.number().int().nonnegative(),
  offlineMachines: z.number().int().nonnegative(),
  todayCupsBrewed: z.number().int().nonnegative(),
  weeklyCupsBrewed: z.number().int().nonnegative(),
  averageWastagePct: z.number().nullable(),
}).passthrough();

export const LocationMachinePageParamsSchema = z.object({
  page: z.number().int().nonnegative().default(0),
  size: z.number().int().min(1).max(100).default(20),
}).strict();

export const SpringPageSchema = <T extends z.ZodTypeAny>(contentItemSchema: T) => z.object({
  content: z.array(contentItemSchema),
  number: z.number().int().nonnegative(),
  size: z.number().int().positive(),
  totalElements: z.number().int().nonnegative(),
  totalPages: z.number().int().nonnegative(),
  last: z.boolean(),
}).passthrough();

export const LocationMachinePageSchema = SpringPageSchema(MachineSchema);

export const MachineTransferRequestSchema = z.object({
  targetLocationId: LocationIdSchema,
  reason: z.string().trim().max(500).optional(),
}).strict();

export type Location = z.infer<typeof LocationSchema>;
export type LocationListResponse = z.infer<typeof LocationListSchema>;
export type LocationListPageParams = z.input<typeof LocationListPageParamsSchema>;
export type LocationCreate = z.infer<typeof LocationCreateSchema>;
export type LocationUpdate = z.infer<typeof LocationUpdateSchema>;
export type LocationStatsResponse = z.infer<typeof LocationStatsResponseSchema>;
export type LocationMachinePage = z.infer<typeof LocationMachinePageSchema>;
export type LocationMachinePageParams = z.input<typeof LocationMachinePageParamsSchema>;
export type MachineTransferRequest = z.infer<typeof MachineTransferRequestSchema>;

export function unwrapLocations(response: LocationListResponse): Location[] {
  if (Array.isArray(response)) return response;
  if ("data" in response) return locationArraySchema.parse(response.data);
  if ("locations" in response) return locationArraySchema.parse(response.locations);
  return response.content;
}
