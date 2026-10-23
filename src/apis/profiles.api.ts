import { axiosClient, DOLORES_API_BASE_URL } from "@/lib/http";
import {
  ProfileContractPageSchema, ProfileHistoryPageSchema, ProfileIdSchema,
  ProfileListParamsSchema, ProfilePageSchema, ProfileSchema,
} from "@/schema/profiles.schema";

const profilePath = (id: string) => `/profiles/${encodeURIComponent(ProfileIdSchema.parse(id))}`;

export const profilesApi = {
  async list(params: { role?: string; status?: string; q?: string; page: number; size: number }, signal?: AbortSignal) {
    const response = await axiosClient.get<unknown>("/profiles", {
      baseURL: DOLORES_API_BASE_URL, params: ProfileListParamsSchema.parse(params), signal,
    });
    return ProfilePageSchema.parse(response.data);
  },
  async getById(id: string, signal?: AbortSignal) {
    const response = await axiosClient.get<unknown>(profilePath(id), { baseURL: DOLORES_API_BASE_URL, signal });
    return ProfileSchema.parse(response.data);
  },
  async getHistory(id: string, page = 0, size = 20, signal?: AbortSignal) {
    const response = await axiosClient.get<unknown>(`${profilePath(id)}/history`, {
      baseURL: DOLORES_API_BASE_URL, params: { page, size }, signal,
    });
    return ProfileHistoryPageSchema.parse(response.data);
  },
  async getContracts(id: string, page = 0, size = 20, signal?: AbortSignal) {
    const response = await axiosClient.get<unknown>(`${profilePath(id)}/contracts`, {
      baseURL: DOLORES_API_BASE_URL, params: { page, size }, signal,
    });
    return ProfileContractPageSchema.parse(response.data);
  },
};
