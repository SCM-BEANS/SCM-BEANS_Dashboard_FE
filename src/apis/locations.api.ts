import { axiosClient, DOLORES_API_BASE_URL } from "@/lib/http";
import {
  LocationCreateSchema, LocationIdSchema, LocationListPageParamsSchema, LocationListParamsSchema,
  LocationListSchema, LocationMachinePageParamsSchema, LocationMachinePageSchema,
  LocationStatsResponseSchema, MachineTransferRequestSchema, LocationSchema,
  TenantLocationListParamsSchema, unwrapLocations, type MachineTransferRequest,
} from "@/schema/locations.schema";
import { MachineIdSchema, MachineSchema } from "@/schema/machines.schema";
import { LocationUpdateSchema, type LocationUpdate } from "@/schema/locations.schema";


export class LocationOwnerMismatchError extends Error {
  constructor() {
    super("Dolores accepted the location request but returned a different Owner.");
    this.name = "LocationOwnerMismatchError";
  }
}

export class LocationIdentityMismatchError extends Error {
  constructor() {
    super("Dolores returned a different location than the requested UUID.");
    this.name = "LocationIdentityMismatchError";
  }
}

export class LocationTenantMismatchError extends Error {
  constructor() {
    super("Dolores returned a location outside the requested tenant scope.");
    this.name = "LocationTenantMismatchError";
  }
}

export class LocationMachineAssignmentMismatchError extends Error {
  constructor(message = "Dolores returned a different machine or location after assignment.") {
    super(message);
    this.name = "LocationMachineAssignmentMismatchError";
  }
}

export class LocationStatsIdentityMismatchError extends Error {
  constructor() {
    super("Dolores returned stats for a different location than the requested UUID.");
    this.name = "LocationStatsIdentityMismatchError";
  }
}

export class LocationMachinePageMismatchError extends Error {
  constructor() {
    super("Dolores returned a machine outside the requested location.");
    this.name = "LocationMachinePageMismatchError";
  }
}

function responseHeader(headers: unknown, key: string): string | undefined {
  if (!headers || typeof headers !== "object") return undefined;
  const record = headers as Record<string, unknown>;
  const value = record[key] ?? record[key.toLowerCase()];
  return typeof value === "string" ? value : undefined;
}

export const locationsApi =  {
  async list(params: { ownerId: string; activeOnly?: boolean }, signal?: AbortSignal) {
    const valid = LocationListParamsSchema.parse(params);
    const response = await axiosClient.get<unknown>("/locations", {
      baseURL: DOLORES_API_BASE_URL, params: valid, signal,
    });
    return unwrapLocations(LocationListSchema.parse(response.data));
  },
  async listPage(
    input: { ownerId: string; activeOnly?: boolean; q?: string; page?: number; size?: number },
    signal?: AbortSignal,
  ) {
    const params = LocationListPageParamsSchema.parse(input);
    const response = await axiosClient.get<unknown>("/locations", {
      baseURL: DOLORES_API_BASE_URL,
      params,
      signal,
    });
    const items = unwrapLocations(LocationListSchema.parse(response.data));
    if (items.some((location) => location.ownerId !== params.ownerId)) {
      throw new LocationOwnerMismatchError();
    }
    const responsePage = Number(responseHeader(response.headers, "x-page"));
    const responseSize = Number(responseHeader(response.headers, "x-page-size"));
    const hasNext = responseHeader(response.headers, "x-has-next");
    return {
      items,
      page: Number.isInteger(responsePage) && responsePage >= 0 ? responsePage : params.page,
      size: Number.isInteger(responseSize) && responseSize > 0 ? responseSize : params.size,
      hasNext: hasNext?.toLowerCase() === "true",
    };
  },
  async listByTenant(tenantId: string, signal?: AbortSignal) {
    const params = TenantLocationListParamsSchema.parse({ tenantId, activeOnly: false });
    const response = await axiosClient.get<unknown>("/locations", {
      baseURL: DOLORES_API_BASE_URL, params, signal,
    });
    const locations = unwrapLocations(LocationListSchema.parse(response.data));
    if (locations.some((location) => location.tenantId && location.tenantId !== params.tenantId)) {
      throw new LocationTenantMismatchError();
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
  async getStats(id: string, signal?: AbortSignal) {
    const validId = LocationIdSchema.parse(id);
    const response = await axiosClient.get<unknown>(`/locations/${encodeURIComponent(validId)}/stats`, {
      baseURL: DOLORES_API_BASE_URL,
      signal,
    });
    const stats = LocationStatsResponseSchema.parse(response.data);
    if (stats.locationId !== validId) throw new LocationStatsIdentityMismatchError();
    return stats;
  },
  async listMachines(id: string, input: { page: number; size: number }, signal?: AbortSignal) {
    const validId = LocationIdSchema.parse(id);
    const params = LocationMachinePageParamsSchema.parse(input);
    const response = await axiosClient.get<unknown>(`/locations/${encodeURIComponent(validId)}/machines`, {
      baseURL: DOLORES_API_BASE_URL,
      params,
      signal,
    });
    const page = LocationMachinePageSchema.parse(response.data);
    if (page.content.some((machine) => machine.locationId !== validId)) {
      throw new LocationMachinePageMismatchError();
    }
    return page;
  },
  async transferMachine(machineId: string, input: MachineTransferRequest) {
    const validMachineId = MachineIdSchema.parse(machineId);
    const body = MachineTransferRequestSchema.parse(input);
    const response = await axiosClient.post<unknown>(
      `/locations/machines/${encodeURIComponent(validMachineId)}/transfer`,
      body,
      { baseURL: DOLORES_API_BASE_URL },
    );
    const machine = MachineSchema.parse(response.data);
    if (machine.id !== validMachineId) {
      throw new LocationMachineAssignmentMismatchError("Dolores returned a different machine after transfer.");
    }
    if (machine.locationId !== body.targetLocationId) {
      throw new LocationMachineAssignmentMismatchError("Dolores did not return the requested target location.");
    }
    return machine;
  },
  async create(ownerId: string, input: unknown) {
    const validOwner = LocationListParamsSchema.shape.ownerId.parse(ownerId);
    const body = LocationCreateSchema.parse(input);
    const response = await axiosClient.post<unknown>("/locations", body, {
      baseURL: DOLORES_API_BASE_URL, params: { ownerId: validOwner },
    });
    const created = LocationSchema.parse(response.data);
    const responseOwnerId = created.ownerId;
    if (responseOwnerId !== validOwner) {
      throw new LocationOwnerMismatchError();
    }
    return created;
  },
  async assignMachine(locationId: string, machineId: string) {
    const validLocationId = LocationIdSchema.parse(locationId);
    const validMachineId = MachineIdSchema.parse(machineId);
    const response = await axiosClient.post<unknown>(
      `/locations/${encodeURIComponent(validLocationId)}/machines/${encodeURIComponent(validMachineId)}/assign`,
      undefined,
      { baseURL: DOLORES_API_BASE_URL },
    );
    const machine = MachineSchema.parse(response.data);
    if (machine.id !== validMachineId) {
      throw new LocationMachineAssignmentMismatchError("Dolores returned a different machine after location assignment.");
    }
    if (machine.locationId !== validLocationId) {
      throw new LocationMachineAssignmentMismatchError("Dolores did not return the requested machine location.");
    }
    return machine;
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
  }
};
