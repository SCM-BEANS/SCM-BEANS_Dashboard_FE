import { axiosClient, DOLORES_API_BASE_URL } from "@/lib/http";
import { MaintenanceRequestListSchema } from "@/schema/machines.schema";

export const maintenanceRequestsApi = {
  async list(signal?: AbortSignal) {
    const response = await axiosClient.get<unknown>("/maintenance-requests", {
      baseURL: DOLORES_API_BASE_URL,
      signal,
    });
    return MaintenanceRequestListSchema.parse(response.data);
  },
};
