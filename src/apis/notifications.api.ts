import { axiosClient, DOLORES_API_BASE_URL } from "@/lib/http";
import {
  AlertSchema,
  AlertsSchema,
  NotificationIdSchema,
  NotificationSchema,
  NotificationUnreadCountSchema,
  NotificationsSchema,
} from "@/schema/notifications.schema";

function isAbortSignal(value: { machineId?: string } | AbortSignal): value is AbortSignal {
  return "aborted" in value && typeof value.aborted === "boolean";
}

export const notificationsApi = {
  async list(signal?: AbortSignal, unreadOnly?: boolean) {
    const response = await axiosClient.get<unknown>("/notifications", {
      baseURL: DOLORES_API_BASE_URL,
      ...(unreadOnly === undefined ? {} : { params: { unreadOnly } }),
      signal,
    });
    return NotificationsSchema.parse(response.data);
  },

  async unreadCount(signal?: AbortSignal) {
    const response = await axiosClient.get<unknown>("/notifications/unread-count", {
      baseURL: DOLORES_API_BASE_URL,
      signal,
    });
    return NotificationUnreadCountSchema.parse(response.data);
  },

  async listAlerts(input?: { machineId?: string } | AbortSignal, signal?: AbortSignal) {
    const inputIsSignal = input !== undefined && isAbortSignal(input);
    const machineId = input !== undefined && !inputIsSignal ? input.machineId : undefined;
    const response = await axiosClient.get<unknown>("/alerts", {
      baseURL: DOLORES_API_BASE_URL,
      ...(machineId ? { params: { machineId } } : {}),
      signal: inputIsSignal ? input : signal,
    });
    return AlertsSchema.parse(response.data);
  },

  async acknowledgeAlert(id: string): Promise<void> {
    const validId = NotificationIdSchema.parse(id);
    await axiosClient.post<unknown>(
      "/alerts/" + encodeURIComponent(validId) + "/ack",
      undefined,
      { baseURL: DOLORES_API_BASE_URL },
    );
  },

  async markAsRead(id: string) {
    const validId = NotificationIdSchema.parse(id);
    const response = await axiosClient.post<unknown>(
      "/notifications/" + encodeURIComponent(validId) + "/read",
      undefined,
      { baseURL: DOLORES_API_BASE_URL },
    );
    const notification = NotificationSchema.parse(response.data);
    if (notification.id !== validId || !notification.read) {
      throw new Error("Dolores did not confirm that the notification was marked as read.");
    }
    return notification;
  },

  async markAllAsRead() {
    const response = await axiosClient.post<unknown>(
      "/notifications/read-all",
      undefined,
      { baseURL: DOLORES_API_BASE_URL },
    );
    return response.data;
  },
};
