import type { z } from 'zod';
import type {
  AlertSchema,
  NotificationSchema,
  NotificationUnreadCountSchema,
} from '@/schemas/dolores/notifications';

export type Notification = z.infer<typeof NotificationSchema>;
export type NotificationUnreadCount = z.infer<typeof NotificationUnreadCountSchema>;
export type Alert = z.infer<typeof AlertSchema>;
