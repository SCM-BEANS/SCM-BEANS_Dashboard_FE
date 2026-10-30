import { z } from "zod";

export const NotificationIdSchema = z.string().uuid();
export const AlertIdSchema = z.string().uuid();

export const NotificationSchema = z.object({
  id: NotificationIdSchema,
  ownerId: z.string().uuid().nullish(),
  title: z.string(),
  message: z.string(),
  type: z.string(),
  createdAt: z.string().nullish(),
  read: z.boolean(),
}).passthrough();

export const NotificationsSchema = z.array(NotificationSchema);
export const NotificationUnreadCountSchema = z.object({
  unreadCount: z.number().int().nonnegative(),
}).passthrough();

export const AlertSchema = z.object({
  id: AlertIdSchema,
  level: z.string(),
  machineId: z.string().uuid().nullish(),
  message: z.string(),
  acknowledged: z.boolean(),
  ts: z.string(),
}).passthrough();

export const AlertsSchema = z.array(AlertSchema);

export type Notification = z.infer<typeof NotificationSchema>;
export type NotificationUnreadCount = z.infer<typeof NotificationUnreadCountSchema>;
export type Alert = z.infer<typeof AlertSchema>;
