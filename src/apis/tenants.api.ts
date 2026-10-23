import { axiosClient, DOLORES_API_BASE_URL } from "@/lib/http";
import { TenantListSchema } from "@/schema/tenants.schema";

export const tenantsApi = {
  async list(signal?: AbortSignal) {
    const response = await axiosClient.get<unknown>("/tenants", {
      baseURL: DOLORES_API_BASE_URL,
      signal,
    });
    return TenantListSchema.parse(response.data);
  },
};
