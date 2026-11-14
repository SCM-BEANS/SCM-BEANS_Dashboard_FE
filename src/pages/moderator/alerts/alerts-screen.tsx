import { NotificationManagementScreen } from "@/components/notifications/notification-management-screen";
import { MODERATOR_MESSAGES } from "@/text/moderator/moderator-messages";

export function AlertsScreen() {
  return <NotificationManagementScreen scope="moderator" initialSection="alerts" scopeNotice={MODERATOR_MESSAGES.READ_SCREENS.ALERT_SCOPE_NOTICE} />;
}
