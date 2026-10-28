import type { ActionBarAction } from "@/components/action-bar/action-bar-actions";
import { TECHNICIAN_MESSAGES } from "@/text/technician/technician-messages";
import type { TechnicianScreenDescriptor } from "../technician-screen";

const messages = TECHNICIAN_MESSAGES.WORKFLOWS;
const link: ActionBarAction = {
  label: "Mở công việc được giao",
  href: "/technician/tasks",
};
const markRead: ActionBarAction = {
  label: messages.ACTION_MARK_READ,
  disabled: true,
  describedBy: "technician-screen-reason",
};

export const technicianNotificationsScreen: TechnicianScreenDescriptor = {
  title: messages.NOTIFICATIONS_TITLE,
  description: messages.NOTIFICATIONS_DESCRIPTION,
  reason: messages.NOTIFICATIONS_REASON,
  panelTitle: messages.NOTIFICATIONS_PANEL_TITLE,
  filters: [messages.FILTER_ALL, messages.FILTER_UNREAD],
  filterLabel: messages.FILTER_LABEL_NOTIFICATIONS,
  actions: [link, markRead],
  showNoSubmission: true,
  back: null,
};
