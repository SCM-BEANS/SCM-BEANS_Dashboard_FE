import { axiosClient, DOLORES_API_BASE_URL } from "@/lib/http";
import {
  LocationCreateSchema, LocationIdSchema, LocationListParamsSchema,
  LocationListSchema, LocationSchema, unwrapLocations,
  LocationUpdateSchema,
  type LocationUpdate,
} from "@/schema/locations.schema";

export class LocationOwnerMismatchError extends Error {
  constructor() {
    super("Dolores returned a location outside the requested Owner scope.");
    this.name = "LocationOwnerMismatchError";
  }
}

export class LocationIdentityMismatchError extends Error {
  constructor() {
    super("Dolores returned a different location than the requested UUID.");
    this.name = "LocationIdentityMismatchError";
  }
}

export const locationsApi = {
  async list(params: { ownerId: string; activeOnly?: boolean }, signal?: AbortSignal) {
    const valid = LocationListParamsSchema.parse(params);
    const response = await axiosClient.get<unknown>("/locations", {
      baseURL: DOLORES_API_BASE_URL, params: valid, signal,
    });
    return unwrapLocations(LocationListSchema.parse(response.data));
  },
  async listByTenant(tenantId: string, signal?: AbortSignal) {
    return locationsApi.listByOwner(tenantId, signal);
  },
  async listByOwner(ownerId: string, signal?: AbortSignal) {
    const validOwnerId = LocationListParamsSchema.shape.ownerId.parse(ownerId);
    const response = await axiosClient.get<unknown>("/locations", {
      baseURL: DOLORES_API_BASE_URL,
      params: { ownerId: validOwnerId, activeOnly: false },
      signal,
    });
    const locations = unwrapLocations(LocationListSchema.parse(response.data));
    if (locations.some((location) => location.ownerId !== validOwnerId)) {
      throw new LocationOwnerMismatchError();
    }
    return locations;
  },
  async getById(id: string, signal?: AbortSignal) {
    const validId = LocationIdSchema.parse(id);
    const response = await axiosClient.get<unknown>(`/locations/${encodeURIComponent(validId)}`, {
      baseURL: DOLORES_API_BASE_URL, signal,
    });
    const location = LocationSchema.parse(response.data);
    if (location.id !== validId) throw new LocationIdentityMismatchError();
    return location;
  },
  async create(ownerId: string, input: unknown) {
    const validOwner = LocationListParamsSchema.shape.ownerId.parse(ownerId);
    const body = LocationCreateSchema.parse(input);
    const response = await axiosClient.post<unknown>("/locations", body, {
      baseURL: DOLORES_API_BASE_URL, params: { ownerId: validOwner },
    });
    const created = LocationSchema.parse(response.data);
    const responseOwnerId = created.ownerId;
    if (responseOwnerId && responseOwnerId !== validOwner) {
      throw new LocationOwnerMismatchError();
    }
    return created;
  },
  async update(id: string, input: LocationUpdate) {
    const validId = LocationIdSchema.parse(id);
    const body = LocationUpdateSchema.parse(input);
    const response = await axiosClient.put<unknown>(`/locations/${encodeURIComponent(validId)}`, body, {
      baseURL: DOLORES_API_BASE_URL,
    });
    const updated = LocationSchema.parse(response.data);
    if (updated.id !== validId) throw new LocationIdentityMismatchError();
    return updated;
  },
  async deactivate(id: string) {
    const validId = LocationIdSchema.parse(id);
    await axiosClient.delete(`/locations/${encodeURIComponent(validId)}`, {
      baseURL: DOLORES_API_BASE_URL,
    });
  },
};
