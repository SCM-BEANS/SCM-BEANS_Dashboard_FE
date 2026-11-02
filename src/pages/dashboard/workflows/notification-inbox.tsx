import type { BackButtonDestination } from "@/components/navigation/back-button";
import { NotificationInbox as SharedNotificationInbox } from "@/components/notifications/notification-inbox";
import { CUSTOMER_MESSAGES } from "@/text/customer/customer-messages";
import { PATH_CUSTOMER } from "@/routes/path";

export function NotificationInbox({ back }: { back?: BackButtonDestination | null }) {
  const messages = CUSTOMER_MESSAGES.WORKFLOWS;
  return (
    <SharedNotificationInbox
      scope="customer"
      title={messages.NOTIFICATIONS_TITLE}
      description={messages.NOTIFICATIONS_DESCRIPTION}
      repairCostReviewHref={PATH_CUSTOMER.REPAIR_COST_REVIEW_DETAIL}
      back={back}
    />
  );
}
