import { axiosClient, DOLORES_API_BASE_URL } from "@/lib/http";
import {
  ProfileContractPageSchema, ProfileHistoryPageSchema, ProfileIdSchema,
  ProfileListParamsSchema, ProfilePageSchema, ProfileSchema,
} from "@/schema/profiles.schema";

const profilePath = (id: string) => `/profiles/${encodeURIComponent(ProfileIdSchema.parse(id))}`;

export class ProfileIdentityMismatchError extends Error {
  constructor() {
    super("Dolores returned a different profile than the requested IDaaS UUID.");
    this.name = "ProfileIdentityMismatchError";
  }
}

export const profilesApi = {
  async list(params: { role?: string; status?: string; q?: string; page: number; size: number }, signal?: AbortSignal) {
    const response = await axiosClient.get<unknown>("/profiles", {
      baseURL: DOLORES_API_BASE_URL, params: ProfileListParamsSchema.parse(params), signal,
    });
    return ProfilePageSchema.parse(response.data);
  },
  async getById(id: string, signal?: AbortSignal) {
    const validId = ProfileIdSchema.parse(id);
    const response = await axiosClient.get<unknown>(profilePath(validId), { baseURL: DOLORES_API_BASE_URL, signal });
    const profile = ProfileSchema.parse(response.data);
    if (profile.idaasUserId !== validId) throw new ProfileIdentityMismatchError();
    return profile;
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
