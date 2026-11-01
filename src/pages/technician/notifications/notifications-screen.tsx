import { useQueryClient } from "@tanstack/react-query";
import { NotificationInbox } from "@/components/notifications/notification-inbox";
import { TechnicianTasksTable } from "@/pages/technician/tasks/technician-tasks-table";
import { TECHNICIAN_MESSAGES } from "@/text/technician/technician-messages";

export function TechnicianNotificationsScreen() {
  const queryClient = useQueryClient();
  const messages = TECHNICIAN_MESSAGES.WORKFLOWS;
  return (
    <NotificationInbox
      scope="technician"
      title={messages.NOTIFICATIONS_TITLE}
      description="Thông báo tài khoản và cập nhật công việc được giao cho bạn."
      onRefreshExtra={() => queryClient.invalidateQueries({ queryKey: ["dolores", "technician"] })}
    >
      <TechnicianTasksTable display="notifications" />
    </NotificationInbox>
  );
}
