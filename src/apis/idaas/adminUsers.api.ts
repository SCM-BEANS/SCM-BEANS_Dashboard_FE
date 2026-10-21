import { requestIdaas } from './client';
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
  list(params: AdminUserListParams, signal?: AbortSignal) {
    const query = AdminUserListParamsSchema.parse(params);
    return requestIdaas(
      { method: 'GET', url: '/admin/users', params: query, signal },
      AdminUserListResponseSchema
    );
  },

  getById(userId: string, signal?: AbortSignal) {
    const id = UserIdSchema.parse(userId);
    return requestIdaas(
      { method: 'GET', url: '/admin/users/' + encodeURIComponent(id), signal },
      AdminUserSchema
    );
  },

  create(input: AdminUserCreateRequest) {
    const payload = AdminUserCreateRequestSchema.parse(input);
    return requestIdaas(
      { method: 'POST', url: '/admin/users', data: payload },
      AdminUserCreateResponseSchema
    );
  },

  update(userId: string, input: AdminUserUpdateRequest) {
    const id = UserIdSchema.parse(userId);
    const payload = AdminUserUpdateRequestSchema.parse(input);
    return requestIdaas(
      { method: 'PATCH', url: '/admin/users/' + encodeURIComponent(id), data: payload },
      AdminUserUpdateResponseSchema
    );
  },

  async disable(userId: string) {
    const id = UserIdSchema.parse(userId);
    await requestIdaas(
      { method: 'DELETE', url: '/admin/users/' + encodeURIComponent(id) },
      z.unknown()
    );
  },

  reissueTemporaryPassword(userId: string) {
    const id = UserIdSchema.parse(userId);
    return requestIdaas(
      {
        method: 'POST',
        url: '/admin/users/' + encodeURIComponent(id) + '/temporary-password/reissue',
      },
      AdminUserTemporaryPasswordResponseSchema
    );
  },
};
