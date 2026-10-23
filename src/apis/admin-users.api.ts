import { axiosClient } from "@/lib/http";
import {
  AdminUserCreateResponseSchema,
  AdminUserCreateSchema,
  AdminUserIdSchema,
  AdminUserListParamsSchema,
  AdminUserListSchema,
  AdminUserReissueResponseSchema,
  AdminUserSchema,
  AdminUserUpdateResponseSchema,
  AdminUserUpdateSchema,
  type AdminUserCreate,
  type AdminUserListParams,
  type AdminUserUpdate,
} from "@/schema/admin-users.schema";

function userPath(userId: string): string {
  return `/admin/users/${encodeURIComponent(AdminUserIdSchema.parse(userId))}`;
}

export const adminUsersApi = {
  async list(params: AdminUserListParams, signal?: AbortSignal) {
    const response = await axiosClient.get<unknown>("/admin/users", {
      params: AdminUserListParamsSchema.parse(params),
      signal,
    });
    return AdminUserListSchema.parse(response.data);
  },

  async getById(userId: string, signal?: AbortSignal) {
    const response = await axiosClient.get<unknown>(userPath(userId), { signal });
    return AdminUserSchema.parse(response.data);
  },

  async create(input: AdminUserCreate) {
    const response = await axiosClient.post<unknown>(
      "/admin/users",
      AdminUserCreateSchema.parse(input),
    );
    return AdminUserCreateResponseSchema.parse(response.data);
  },

  async update(userId: string, input: AdminUserUpdate) {
    const response = await axiosClient.patch<unknown>(
      userPath(userId),
      AdminUserUpdateSchema.parse(input),
    );
    return AdminUserUpdateResponseSchema.parse(response.data);
  },

  async disable(userId: string) {
    await axiosClient.delete(userPath(userId));
  },

  async reissueTemporaryPassword(userId: string) {
    const response = await axiosClient.post<unknown>(
      `${userPath(userId)}/temporary-password/reissue`,
      {},
    );
    return AdminUserReissueResponseSchema.parse(response.data);
  },
};
