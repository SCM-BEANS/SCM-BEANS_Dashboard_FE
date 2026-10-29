import type { BackButtonDestination } from "@/components/navigation/back-button";
import { NotificationInbox as SharedNotificationInbox } from "@/components/notifications/notification-inbox";
import { CUSTOMER_MESSAGES } from "@/text/customer/customer-messages";

export function NotificationInbox({ back }: { back?: BackButtonDestination | null }) {
  const messages = CUSTOMER_MESSAGES.WORKFLOWS;
  return (
    <SharedNotificationInbox
      scope="customer"
      title={messages.NOTIFICATIONS_TITLE}
      description={messages.NOTIFICATIONS_DESCRIPTION}
      back={back}
    />
  );
}
