import { axiosClient, DOLORES_API_BASE_URL } from "@/lib/http";
import {
  LocationCreateSchema, LocationIdSchema, LocationListParamsSchema,
  LocationListSchema, LocationSchema,
} from "@/schema/locations.schema";

export class LocationOwnerMismatchError extends Error {
  constructor() {
    super("Dolores accepted the location request but returned a different Owner.");
    this.name = "LocationOwnerMismatchError";
  }
}

export const locationsApi = {
  async list(params: { ownerId: string; activeOnly?: boolean }, signal?: AbortSignal) {
    const valid = LocationListParamsSchema.parse(params);
    const response = await axiosClient.get<unknown>("/locations", {
      baseURL: DOLORES_API_BASE_URL, params: valid, signal,
    });
    return LocationListSchema.parse(response.data);
  },
  async getById(id: string, signal?: AbortSignal) {
    const response = await axiosClient.get<unknown>(`/locations/${encodeURIComponent(LocationIdSchema.parse(id))}`, {
      baseURL: DOLORES_API_BASE_URL, signal,
    });
    return LocationSchema.parse(response.data);
  },
  async create(ownerId: string, input: unknown) {
    const validOwner = LocationListParamsSchema.shape.ownerId.parse(ownerId);
    const body = LocationCreateSchema.parse(input);
    const response = await axiosClient.post<unknown>("/locations", body, {
      baseURL: DOLORES_API_BASE_URL, params: { ownerId: validOwner },
    });
    const created = LocationSchema.parse(response.data);
    const responseOwnerId = created.ownerId ?? created.tenantId;
    if (responseOwnerId && responseOwnerId !== validOwner) {
      throw new LocationOwnerMismatchError();
    }
    return created;
  },
};
