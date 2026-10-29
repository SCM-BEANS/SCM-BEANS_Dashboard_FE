import Link from "next/link";
import { NotificationInbox } from "@/components/notifications/notification-inbox";
import { PATH_MODERATOR } from "@/routes/path";
import { MODERATOR_MESSAGES } from "@/text/moderator/moderator-messages";

export function NotificationsScreen() {
  const messages = MODERATOR_MESSAGES.READ_SCREENS;
  return (
    <NotificationInbox
      scope="moderator"
      title={messages.NOTIFICATIONS_TITLE}
      description={messages.NOTIFICATIONS_DESCRIPTION}
    >
      <Link href={PATH_MODERATOR.NOTIFICATION_ALERTS}>{messages.VIEW_ALERTS}</Link>
    </NotificationInbox>
  );
}
