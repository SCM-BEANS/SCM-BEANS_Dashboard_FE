import { TECHNICIAN_MESSAGES } from "@/text/technician/technician-messages";
import { getTechnicianHistoryBackNavigation, getTechnicianHistoryScreenDescriptor } from "./history/history-screen";
import { technicianMachineCheckScreen } from "./machine-check/machine-check-screen";
import { TechnicianNotificationsScreen } from "./notifications/notifications-screen";
import { TechnicianScreen, type TechnicianScreenDescriptor } from "./technician-screen";
import { getTechnicianTaskBackNavigation, getTechnicianTaskScreenDescriptor } from "./tasks/task-screens";

export type { TechnicianScreenDescriptor } from "./technician-screen";

export function getTechnicianBackNavigation(sectionPath: string) {
  if (sectionPath === "history" || sectionPath.startsWith("history/")) {
    return getTechnicianHistoryBackNavigation(sectionPath);
  }
  if (!sectionPath || sectionPath === "tasks" || sectionPath.startsWith("tasks/")) {
    return getTechnicianTaskBackNavigation(sectionPath);
  }
  return null;
}

export function getTechnicianScreenDescriptor(sectionPath: string): TechnicianScreenDescriptor {
  if (!sectionPath || sectionPath === "tasks" || sectionPath.startsWith("tasks/")) {
    return getTechnicianTaskScreenDescriptor(sectionPath);
  }
  if (sectionPath === "history" || sectionPath.startsWith("history/")) {
    return getTechnicianHistoryScreenDescriptor(sectionPath);
  }
  if (sectionPath === "machine-check") return technicianMachineCheckScreen;
  return {
    title: TECHNICIAN_MESSAGES.ROUTES.PENDING_TITLE,
    description: TECHNICIAN_MESSAGES.ROUTES.PAGE_DESCRIPTION,
    reason: TECHNICIAN_MESSAGES.ROUTES.PENDING,
    back: null,
  };
}

export function TechnicianRouteScreen({ sectionPath }: { sectionPath: string }) {
  if (sectionPath === "notifications") return <TechnicianNotificationsScreen />;
  return <TechnicianScreen screen={getTechnicianScreenDescriptor(sectionPath)} />;
}
