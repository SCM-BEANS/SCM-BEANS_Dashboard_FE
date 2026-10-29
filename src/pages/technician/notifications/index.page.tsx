import { TECHNICIAN_MESSAGES } from "@/text/technician/technician-messages";
import { TechnicianShell } from "../technician-shell";
import { TechnicianNotificationsScreen } from "./notifications-screen";

export default function TechnicianNotificationsPage() {
  return (
    <TechnicianShell pageTitle={TECHNICIAN_MESSAGES.WORKFLOWS.NOTIFICATIONS_TITLE}>
      <TechnicianNotificationsScreen />
    </TechnicianShell>
  );
}
