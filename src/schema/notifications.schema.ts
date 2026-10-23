import { z } from "zod";

export const NotificationIdSchema = z.string().uuid();

export const NotificationSchema = z.object({
  id: NotificationIdSchema,
  ownerId: z.string().uuid().nullish(),
  title: z.string(),
  message: z.string(),
  type: z.string(),
  createdAt: z.string(),
  read: z.boolean(),
}).passthrough();

export const NotificationsSchema = z.array(NotificationSchema);

export const AlertSchema = z.object({
  id: z.string().uuid(),
  level: z.string(),
  machineId: z.string().uuid().nullish(),
  message: z.string(),
  acknowledged: z.boolean(),
  ts: z.string(),
}).passthrough();

export const AlertsSchema = z.array(AlertSchema);

export type Notification = z.infer<typeof NotificationSchema>;
export type Alert = z.infer<typeof AlertSchema>;
