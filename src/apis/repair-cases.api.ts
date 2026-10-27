import { axiosClient, DOLORES_API_BASE_URL } from "@/lib/http";
import { RepairCaseListSchema } from "@/schema/machines.schema";

export const repairCasesApi = {
  async list(signal?: AbortSignal) {
    const response = await axiosClient.get<unknown>("/repair-cases", {
      baseURL: DOLORES_API_BASE_URL,
      signal,
    });
    return RepairCaseListSchema.parse(response.data);
  },
};
