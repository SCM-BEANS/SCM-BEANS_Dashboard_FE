import { axiosClient, DOLORES_API_BASE_URL } from "@/lib/http";
import { TenantIdSchema, TenantListSchema, TenantSchema } from "@/schema/tenants.schema";

export const tenantsApi = {
  async list(signal?: AbortSignal) {
    const response = await axiosClient.get<unknown>("/tenants", {
      baseURL: DOLORES_API_BASE_URL,
      signal,
    });
    return TenantListSchema.parse(response.data);
  },
  async getById(id: string, signal?: AbortSignal) {
    const tenantId = TenantIdSchema.parse(id);
    const response = await axiosClient.get<unknown>(`/tenants/${encodeURIComponent(tenantId)}`, {
      baseURL: DOLORES_API_BASE_URL,
      signal,
    });
    const tenant = TenantSchema.parse(response.data);
    if (tenant.id !== tenantId) {
      throw new Error("Dolores returned a tenant that does not match the requested ID");
    }
    return tenant;
  },
};
