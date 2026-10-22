import { doloresAxiosClient, parseDoloresResponse } from './client';
import {
  NotificationIdSchema,
  NotificationSchema,
  NotificationUnreadCountSchema,
  NotificationsSchema,
} from '@/schemas/dolores/notifications';
import type { Notification, NotificationUnreadCount } from '@/types/dolores/notifications';

export const notificationsApi = {
  list: async (signal?: AbortSignal): Promise<Notification[]> => {
    const response = await doloresAxiosClient.get<unknown>('/notifications', { signal });
    return parseDoloresResponse(response.data, NotificationsSchema);
  },

  unreadCount: async (signal?: AbortSignal): Promise<NotificationUnreadCount> => {
    const response = await doloresAxiosClient.get<unknown>('/notifications/unread-count', { signal });
    return parseDoloresResponse(response.data, NotificationUnreadCountSchema);
  },

  markAsRead: async (id: string): Promise<Notification> => {
    const notificationId = NotificationIdSchema.parse(id);
    const response = await doloresAxiosClient.post<unknown>('/notifications/' + notificationId + '/read');
    return parseDoloresResponse(response.data, NotificationSchema);
  },
};
