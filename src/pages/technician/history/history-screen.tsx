import type { ActionBarAction } from "@/components/action-bar/action-bar-actions";
import { TECHNICIAN_MESSAGES } from "@/text/technician/technician-messages";
import type { TechnicianScreenDescriptor } from "../technician-screen";

const messages = TECHNICIAN_MESSAGES.WORKFLOWS;
const link = (label: string, href: string, variant: "primary" | "secondary" = "primary"): ActionBarAction => ({
  label,
  href,
  variant,
});
const blocked = (label: string, variant: "primary" | "secondary" = "primary"): ActionBarAction => ({
  label,
  variant,
  disabled: true,
  describedBy: "technician-screen-reason",
});

const historyScreen: TechnicianScreenDescriptor = {
  title: messages.HISTORY_TITLE,
  description: messages.HISTORY_DESCRIPTION,
  reason: messages.HISTORY_REASON,
  panelTitle: messages.HISTORY_PANEL_TITLE,
  filters: [messages.FILTER_ALL, messages.FILTER_SMART, messages.FILTER_STANDARD],
  filterLabel: messages.FILTER_LABEL_HISTORY,
  actions: [blocked("Xem lịch sử chi tiết"), link("Ghi nhận bảo trì", "/technician/tasks/maintenance-history", "secondary")],
  back: null,
};

export function getTechnicianHistoryScreenDescriptor(sectionPath: string): TechnicianScreenDescriptor {
  if (sectionPath === "history") return historyScreen;
  if (/^history\/[^/]+$/.test(sectionPath)) {
    return {
      ...historyScreen,
      title: messages.HISTORY_DETAIL_TITLE,
      filters: undefined,
      filterLabel: undefined,
      actions: [
        link("Ghi nhận bảo trì", "/technician/tasks/maintenance-history"),
        link("Về danh sách lịch sử", "/technician/history", "secondary"),
      ],
      back: { label: "Lịch sử máy", fallbackHref: "/technician/history" },
    };
  }

  return {
    title: TECHNICIAN_MESSAGES.ROUTES.PENDING_TITLE,
    description: TECHNICIAN_MESSAGES.ROUTES.PAGE_DESCRIPTION,
    reason: TECHNICIAN_MESSAGES.ROUTES.PENDING,
    back: null,
  };
}

export function getTechnicianHistoryBackNavigation(sectionPath: string) {
  return getTechnicianHistoryScreenDescriptor(sectionPath).back ?? null;
}
