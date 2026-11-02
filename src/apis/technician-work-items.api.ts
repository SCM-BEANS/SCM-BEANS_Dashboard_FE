import { axiosClient, DOLORES_API_BASE_URL } from "@/lib/http";
import {
  TechnicianWorkItemsPageSchema,
  TechnicianWorkItemsParamsSchema,
  type TechnicianWorkItemsParams,
} from "@/schema/technician-work-items.schema";

export const TECHNICIAN_WORK_ITEMS_QUERY_KEY = ["dolores", "technician", "work-items"] as const;

export const technicianWorkItemsApi = {
  async list(input: TechnicianWorkItemsParams = {}, signal?: AbortSignal) {
    const params = TechnicianWorkItemsParamsSchema.parse(input);
    const response = await axiosClient.get<unknown>("/technician/work-items", {
      baseURL: DOLORES_API_BASE_URL,
      params,
      signal,
    });
    return TechnicianWorkItemsPageSchema.parse(response.data);
  },
};
