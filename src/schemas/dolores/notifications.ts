import { z } from 'zod';

export const NotificationIdSchema = z.string().uuid();

export const NotificationSchema = z.object({
  id: NotificationIdSchema,
  tenantId: z.string().uuid().nullish(),
  title: z.string(),
  message: z.string(),
  type: z.string(),
  read: z.boolean(),
  createdAt: z.string().min(1).nullish(),
});

export const NotificationsSchema = z.array(NotificationSchema);

export const NotificationUnreadCountSchema = z.object({
  unreadCount: z.number().int().nonnegative(),
});

export const AlertSchema = z.object({
  id: z.string().uuid(),
  level: z.string(),
  machineId: z.string().uuid().nullish(),
  message: z.string(),
  acknowledged: z.boolean(),
  ts: z.string().min(1),
});

export const AlertsSchema = z.array(AlertSchema);

export type Notification = z.infer<typeof NotificationSchema>;
export type Alert = z.infer<typeof AlertSchema>;
