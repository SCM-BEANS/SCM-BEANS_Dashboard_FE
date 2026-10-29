import { NotificationInbox } from "@/components/notifications/notification-inbox";
import { TECHNICIAN_MESSAGES } from "@/text/technician/technician-messages";

export function TechnicianNotificationsScreen() {
  const messages = TECHNICIAN_MESSAGES.WORKFLOWS;
  return (
    <NotificationInbox
      scope="technician"
      title={messages.NOTIFICATIONS_TITLE}
      description={messages.NOTIFICATIONS_DESCRIPTION}
    />
  );
}
