import axiosClient from '@/lib/axios/axiosClient';
import {
  AdminUserCreateRequestSchema,
  AdminUserCreateResponseSchema,
  AdminUserListParamsSchema,
  AdminUserListResponseSchema,
  AdminUserSchema,
  AdminUserTemporaryPasswordResponseSchema,
  AdminUserUpdateRequestSchema,
  AdminUserUpdateResponseSchema,
  type AdminUserCreateRequest,
  type AdminUserListParams,
  type AdminUserUpdateRequest,
} from '@/schemas/idaas/adminUsers';
import { z } from 'zod';

const UserIdSchema = z.string().uuid();

export const adminUsersApi = {
  list: async (params: AdminUserListParams, signal?: AbortSignal) => {
    const query = AdminUserListParamsSchema.parse(params);
    const response: unknown = await axiosClient.get('/admin/users', { params: query, signal });
    return AdminUserListResponseSchema.parse(response);
  },

  getById: async (userId: string, signal?: AbortSignal) => {
    const id = UserIdSchema.parse(userId);
    const response: unknown = await axiosClient.get(`/admin/users/${encodeURIComponent(id)}`, { signal });
    return AdminUserSchema.parse(response);
  },

  create: async (input: AdminUserCreateRequest) => {
    const payload = AdminUserCreateRequestSchema.parse(input);
    const response: unknown = await axiosClient.post('/admin/users', payload);
    return AdminUserCreateResponseSchema.parse(response);
  },

  update: async (userId: string, input: AdminUserUpdateRequest) => {
    const id = UserIdSchema.parse(userId);
    const payload = AdminUserUpdateRequestSchema.parse(input);
    const response: unknown = await axiosClient.patch(`/admin/users/${encodeURIComponent(id)}`, payload);
    return AdminUserUpdateResponseSchema.parse(response);
  },

  disable: async (userId: string) => {
    const id = UserIdSchema.parse(userId);
    await axiosClient.delete(`/admin/users/${encodeURIComponent(id)}`);
  },

  reissueTemporaryPassword: async (userId: string) => {
    const id = UserIdSchema.parse(userId);
    const response: unknown = await axiosClient.post(
      `/admin/users/${encodeURIComponent(id)}/temporary-password/reissue`
    );
    return AdminUserTemporaryPasswordResponseSchema.parse(response);
  },
};
