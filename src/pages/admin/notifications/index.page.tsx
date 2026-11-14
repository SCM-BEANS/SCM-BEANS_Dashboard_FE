import { NotificationManagementScreen } from "@/components/notifications/notification-management-screen";
import { AdminShell } from "../admin-shell";

export default function AdminNotificationsPage() {
  return <AdminShell><NotificationManagementScreen scope="admin" /></AdminShell>;
}
