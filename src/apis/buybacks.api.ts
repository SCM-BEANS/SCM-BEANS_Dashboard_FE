import { axiosClient, DOLORES_API_BASE_URL } from "@/lib/http";
import { BuybackCaseSchema, BuybackIdSchema } from "@/schema/buybacks.schema";

const buybackPath = (id: string) =>
  "/buybacks/" + encodeURIComponent(BuybackIdSchema.parse(id));

export const buybacksApi = {
  async getById(id: string, signal?: AbortSignal) {
    const validId = BuybackIdSchema.parse(id);
    const response = await axiosClient.get<unknown>(buybackPath(validId), {
      baseURL: DOLORES_API_BASE_URL,
      signal,
    });
    const buyback = BuybackCaseSchema.parse(response.data);
    if (buyback.id !== validId) {
      throw new Error("Dolores returned a buyback case that does not match the requested ID.");
    }
    return buyback;
  },
};
