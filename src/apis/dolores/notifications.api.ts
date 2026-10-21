import { requestDolores } from './client';
import {
  NotificationIdSchema,
  NotificationSchema,
  NotificationUnreadCountSchema,
  NotificationsSchema,
} from '@/schemas/dolores/notifications';

export const notificationsApi = {
  list(signal?: AbortSignal) {
    return requestDolores({ method: 'GET', url: '/notifications', signal }, NotificationsSchema);
  },

  unreadCount(signal?: AbortSignal) {
    return requestDolores(
      { method: 'GET', url: '/notifications/unread-count', signal },
      NotificationUnreadCountSchema
    );
  },

  markAsRead(id: string) {
    const notificationId = NotificationIdSchema.parse(id);
    return requestDolores(
      { method: 'POST', url: '/notifications/' + notificationId + '/read' },
      NotificationSchema
    );
  },
};
