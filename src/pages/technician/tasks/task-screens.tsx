import type { ActionBarAction } from "@/components/action-bar/action-bar-actions";
import { TECHNICIAN_MESSAGES } from "@/text/technician/technician-messages";
import type { TechnicianField, TechnicianFieldType, TechnicianScreenDescriptor } from "../technician-screen";

const messages = TECHNICIAN_MESSAGES.WORKFLOWS;
const field = (label: string, type: TechnicianFieldType = "text"): TechnicianField => ({ label, type });
const blocked = (label: string, variant: "primary" | "secondary" = "primary"): ActionBarAction => ({
  label,
  variant,
  disabled: true,
  describedBy: "technician-screen-reason",
});
const link = (label: string, href: string, variant: "primary" | "secondary" = "primary"): ActionBarAction => ({
  label,
  href,
  variant,
});

const form = (
  title: string,
  description: string,
  fields: TechnicianField[],
  action: string,
): TechnicianScreenDescriptor => ({
  title,
  description,
  reason: messages.TASK_FORM_REASON,
  panelTitle: messages.FIELDS_TITLE,
  fields,
  actions: [blocked(action)],
});

const tasksScreen: TechnicianScreenDescriptor = {
  title: TECHNICIAN_MESSAGES.NAVIGATION.TASKS,
  description: "Danh sách công việc được Moderator điều phối cho Technician.",
  reason: messages.TASKS_REASON,
  panelTitle: messages.TASKS_PANEL_TITLE,
  filters: [messages.FILTER_ALL, messages.FILTER_INSTALLATION, messages.FILTER_REPAIR, messages.FILTER_RETRIEVAL],
  filterLabel: messages.FILTER_LABEL_TASKS,
  actions: [blocked("Mở chi tiết công việc")],
  back: null,
};

const formScreens: Record<string, TechnicianScreenDescriptor> = {
  "tasks/standard-handover": form(
    messages.HANDOVER_TITLE,
    messages.HANDOVER_DESCRIPTION,
    [
      field(messages.FIELD_MACHINE),
      field(messages.FIELD_CONTRACT),
      field(messages.FIELD_LOCATION),
      field(messages.FIELD_INSTALLATION),
      field(messages.FIELD_HANDOVER, "textarea"),
    ],
    messages.ACTION_HANDOVER,
  ),
  "tasks/smart-activation": form(
    messages.SMART_TITLE,
    messages.SMART_DESCRIPTION,
    [
      field(messages.FIELD_MACHINE),
      field(messages.FIELD_CONTRACT),
      field(messages.FIELD_LOCATION),
      field(messages.FIELD_NETWORK),
      field(messages.FIELD_GPS),
    ],
    messages.ACTION_SMART_ACTIVATION,
  ),
  "tasks/repair": form(
    messages.REPAIR_TITLE,
    messages.REPAIR_DESCRIPTION,
    [
      field(messages.FIELD_MACHINE),
      field(messages.FIELD_CUSTOMER),
      field(messages.FIELD_WORK_DETAILS, "textarea"),
      field(messages.FIELD_PART),
      field(messages.FIELD_QUANTITY_COST),
      field(messages.FIELD_NOTES, "textarea"),
      field(messages.FIELD_EVIDENCE, "file"),
    ],
    messages.ACTION_REPAIR,
  ),
  "tasks/retrieval": form(
    messages.RETRIEVAL_TITLE,
    messages.RETRIEVAL_DESCRIPTION,
    [
      field(messages.FIELD_MACHINE),
      field(messages.FIELD_CONTRACT),
      field(messages.FIELD_RECOVERY),
      field(messages.FIELD_DAMAGE),
      field(messages.FIELD_NOTES, "textarea"),
      field(messages.FIELD_EVIDENCE, "file"),
    ],
    messages.ACTION_RETRIEVAL,
  ),
  "tasks/substitute": form(
    messages.SUBSTITUTE_TITLE,
    messages.SUBSTITUTE_DESCRIPTION,
    [
      field(messages.FIELD_CONTRACT),
      field(messages.FIELD_MACHINE),
      field(messages.FIELD_SUBSTITUTE_MACHINE),
      field(messages.FIELD_MACHINE_TYPE),
    ],
    messages.ACTION_SUBSTITUTE,
  ),
  "tasks/substitute-return": form(
    messages.SUBSTITUTE_RETURN_TITLE,
    messages.SUBSTITUTE_RETURN_DESCRIPTION,
    [
      field(messages.FIELD_CONTRACT),
      field(messages.FIELD_MACHINE),
      field(messages.FIELD_SUBSTITUTE_MACHINE),
      field(messages.FIELD_RETURN_PERIOD),
      field(messages.FIELD_NOTES, "textarea"),
    ],
    messages.ACTION_SUBSTITUTE_RETURN,
  ),
  "tasks/refurbishment": form(
    messages.REFURBISHMENT_TITLE,
    messages.REFURBISHMENT_DESCRIPTION,
    [
      field(messages.FIELD_MACHINE),
      field(messages.FIELD_REFURBISHMENT, "textarea"),
      field(messages.FIELD_TEST_RESULT),
      field(messages.FIELD_EVIDENCE, "file"),
    ],
    messages.ACTION_REFURBISHMENT,
  ),
  "tasks/buyback-assessment": form(
    messages.BUYBACK_ASSESSMENT_TITLE,
    messages.BUYBACK_ASSESSMENT_DESCRIPTION,
    [
      field(messages.FIELD_MACHINE),
      field(messages.FIELD_CUSTOMER),
      field(messages.FIELD_DATE),
      field(messages.FIELD_ASSESSMENT),
      field(messages.FIELD_BUYBACK_PRICE),
      field(messages.FIELD_NOTES, "textarea"),
      field(messages.FIELD_EVIDENCE, "file"),
    ],
    messages.ACTION_BUYBACK_ASSESSMENT,
  ),
  "tasks/maintenance-history": form(
    messages.MAINTENANCE_TITLE,
    messages.MAINTENANCE_DESCRIPTION,
    [
      field(messages.FIELD_MACHINE),
      field(messages.FIELD_CONTRACT),
      field(messages.FIELD_DATE),
      field(messages.FIELD_MAINTENANCE, "textarea"),
      field(messages.FIELD_TEST_RESULT),
      field(messages.FIELD_QUANTITY_COST),
    ],
    messages.ACTION_MAINTENANCE,
  ),
};

const taskDetailScreen: TechnicianScreenDescriptor = {
  title: messages.TASK_DETAIL_TITLE,
  description: "Theo dõi hồ sơ và xử lý công việc trong phạm vi được giao.",
  reason: messages.TASK_DETAIL_REASON,
  panelTitle: "Thông tin chi tiết",
  showNoSubmission: true,
  actions: [
    blocked(messages.ACTION_START_TASK),
    blocked(messages.ACTION_SUBMIT_RESULT),
    link("Nhập kết quả thu hồi", "/technician/tasks/retrieval", "secondary"),
    link("Về danh sách công việc", "/technician/tasks", "secondary"),
  ],
};

function getTaskBackNavigation(sectionPath: string) {
  if (sectionPath === "tasks/substitute-return") {
    return { label: "Máy thay thế", fallbackHref: "/technician/tasks/substitute" };
  }
  if (sectionPath === "tasks/maintenance-history") {
    return { label: "Lịch sử máy", fallbackHref: "/technician/history" };
  }
  if (formScreens[sectionPath] || /^tasks\/[^/]+$/.test(sectionPath)) {
    return { label: "Danh sách công việc", fallbackHref: "/technician/tasks" };
  }
  return null;
}

const formNavigation: Record<string, ActionBarAction[]> = {
  "tasks/substitute": [link("Ghi nhận trả máy thay", "/technician/tasks/substitute-return", "secondary")],
  "tasks/substitute-return": [link("Về máy thay thế", "/technician/tasks/substitute", "secondary")],
  "tasks/buyback-assessment": [link("Về công việc", "/technician/tasks", "secondary")],
  "tasks/maintenance-history": [link("Về lịch sử máy", "/technician/history", "secondary")],
};

export function getTechnicianTaskScreenDescriptor(sectionPath: string): TechnicianScreenDescriptor {
  if (!sectionPath || sectionPath === "tasks") return tasksScreen;

  const configuredForm = formScreens[sectionPath];
  if (configuredForm) {
    return {
      ...configuredForm,
      actions: [...(configuredForm.actions ?? []), ...(formNavigation[sectionPath] ?? [])],
      back: getTaskBackNavigation(sectionPath),
    };
  }

  if (/^tasks\/[^/]+$/.test(sectionPath)) {
    return { ...taskDetailScreen, back: getTaskBackNavigation(sectionPath) };
  }

  return {
    title: TECHNICIAN_MESSAGES.ROUTES.PENDING_TITLE,
    description: TECHNICIAN_MESSAGES.ROUTES.PAGE_DESCRIPTION,
    reason: TECHNICIAN_MESSAGES.ROUTES.PENDING,
    back: null,
  };
}

export function getTechnicianTaskBackNavigation(sectionPath: string) {
  return getTaskBackNavigation(sectionPath);
}
