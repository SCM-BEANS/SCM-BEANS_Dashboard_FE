'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { notificationsApi } from '@/apis/dolores/notifications.api';
import { NotificationIdSchema } from '@/schemas/dolores/notifications';
import { retryDoloresRead } from './queryPolicy';

export const notificationQueryKeys = {
  all: ['dolores', 'notifications'] as const,
  list: () => [...notificationQueryKeys.all, 'list'] as const,
  unreadCount: () => [...notificationQueryKeys.all, 'unread-count'] as const,
};

export function useNotifications() {
  return useQuery({
    queryKey: notificationQueryKeys.list(),
    queryFn: ({ signal }) => notificationsApi.list(signal),
    retry: retryDoloresRead,
  });
}

export function useUnreadNotificationCount() {
  return useQuery({
    queryKey: notificationQueryKeys.unreadCount(),
    queryFn: ({ signal }) => notificationsApi.unreadCount(signal),
    retry: retryDoloresRead,
  });
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => notificationsApi.markAsRead(NotificationIdSchema.parse(id)),
    retry: false,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: notificationQueryKeys.all });
    },
  });
}
