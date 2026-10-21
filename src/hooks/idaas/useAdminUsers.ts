'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { adminUsersApi } from '@/apis/idaas/adminUsers.api';
import type {
  AdminUserCreateRequest,
  AdminUserListParams,
  AdminUserOneTimeCredential,
  AdminUserUpdateRequest,
} from '@/schemas/idaas/adminUsers';
import { useCallback, useState } from 'react';

export const adminUserQueryKeys = {
  all: ['idaas', 'admin-users'] as const,
  list: (params: AdminUserListParams) => [...adminUserQueryKeys.all, 'list', params] as const,
  detail: (userId: string | null) => [...adminUserQueryKeys.all, 'detail', userId] as const,
};

export function useAdminUsers(params: AdminUserListParams, enabled = true) {
  return useQuery({
    queryKey: adminUserQueryKeys.list(params),
    queryFn: ({ signal }) => adminUsersApi.list(params, signal),
    enabled,
  });
}

export function useAdminUser(userId: string | null, enabled = true) {
  return useQuery({
    queryKey: adminUserQueryKeys.detail(userId),
    queryFn: ({ signal }) => {
      if (!userId) throw new Error('A user ID is required.');
      return adminUsersApi.getById(userId, signal);
    },
    enabled: enabled && Boolean(userId),
  });
}

export function useAdminUserMutations() {
  const queryClient = useQueryClient();
  const [oneTimeCredential, setOneTimeCredential] = useState<AdminUserOneTimeCredential | null>(null);
  const clearOneTimeCredential = useCallback(() => setOneTimeCredential(null), []);

  const invalidateUsers = async () => {
    await queryClient.invalidateQueries({ queryKey: adminUserQueryKeys.all });
  };

  const create = useMutation<void, unknown, AdminUserCreateRequest>({
    mutationFn: async (input) => {
      const result = await adminUsersApi.create(input);
      setOneTimeCredential({
        userId: result.id,
        password: result.temporary_password,
        expiresAt: result.temporary_password_expires_at,
        emailVerificationStarted: result.email_verification_started,
      });
    },
    retry: false,
    onSuccess: invalidateUsers,
  });

  const update = useMutation<void, unknown, { userId: string; input: AdminUserUpdateRequest }>({
    mutationFn: async ({ userId, input }) => {
      await adminUsersApi.update(userId, input);
    },
    retry: false,
    onSuccess: invalidateUsers,
  });

  const disable = useMutation<void, unknown, string>({
    mutationFn: (userId) => adminUsersApi.disable(userId),
    retry: false,
    onSuccess: invalidateUsers,
  });

  const reissueTemporaryPassword = useMutation<void, unknown, string>({
    mutationFn: async (userId) => {
      const result = await adminUsersApi.reissueTemporaryPassword(userId);
      setOneTimeCredential({
        userId: result.user_id,
        password: result.temporary_password,
        expiresAt: result.temporary_password_expires_at,
      });
    },
    retry: false,
    onSuccess: invalidateUsers,
  });

  return {
    create,
    update,
    disable,
    reissueTemporaryPassword,
    oneTimeCredential,
    clearOneTimeCredential,
  };
}
