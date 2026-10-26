import { TECHNICIAN_MESSAGES } from "@/text/technician/technician-messages";
import styles from "./technician-shell.module.css";

type TechnicianFieldType = "text" | "textarea" | "file";

interface TechnicianField {
  label: string;
  type: TechnicianFieldType;
}

export interface TechnicianScreenDescriptor {
  title: string;
  description: string;
  reason: string;
  panelTitle?: string;
  fields?: TechnicianField[];
  actions?: string[];
  filters?: string[];
  filterLabel?: string;
}

const messages = TECHNICIAN_MESSAGES.WORKFLOWS;
const field = (label: string, type: TechnicianFieldType = "text"): TechnicianField => ({ label, type });
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
  actions: [action],
});

const tasksScreen: TechnicianScreenDescriptor = {
  title: TECHNICIAN_MESSAGES.NAVIGATION.TASKS,
  description: "Danh sách công việc được Moderator điều phối cho Technician.",
  reason: messages.TASKS_REASON,
  panelTitle: messages.TASKS_PANEL_TITLE,
  filters: [messages.FILTER_ALL, messages.FILTER_INSTALLATION, messages.FILTER_REPAIR, messages.FILTER_RETRIEVAL],
  filterLabel: messages.FILTER_LABEL_TASKS,
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

const detailScreen: TechnicianScreenDescriptor = {
  title: messages.TASK_DETAIL_TITLE,
  description: "Theo dõi hồ sơ và xử lý công việc trong phạm vi được giao.",
  reason: messages.TASK_DETAIL_REASON,
  panelTitle: "Thông tin chi tiết",
  actions: [messages.ACTION_START_TASK, messages.ACTION_SUBMIT_RESULT],
};

const historyScreen: TechnicianScreenDescriptor = {
  title: messages.HISTORY_TITLE,
  description: messages.HISTORY_DESCRIPTION,
  reason: messages.HISTORY_REASON,
  panelTitle: messages.HISTORY_PANEL_TITLE,
  filters: [messages.FILTER_ALL, messages.FILTER_SMART, messages.FILTER_STANDARD],
  filterLabel: messages.FILTER_LABEL_HISTORY,
};

const notificationsScreen: TechnicianScreenDescriptor = {
  title: messages.NOTIFICATIONS_TITLE,
  description: messages.NOTIFICATIONS_DESCRIPTION,
  reason: messages.NOTIFICATIONS_REASON,
  panelTitle: messages.NOTIFICATIONS_PANEL_TITLE,
  filters: [messages.FILTER_ALL, messages.FILTER_UNREAD],
  filterLabel: messages.FILTER_LABEL_NOTIFICATIONS,
  actions: [messages.ACTION_MARK_READ],
};

export function getTechnicianScreenDescriptor(sectionPath: string): TechnicianScreenDescriptor {
  if (!sectionPath || sectionPath === "tasks") return tasksScreen;
  if (sectionPath === "history") return historyScreen;
  if (sectionPath === "notifications") return notificationsScreen;

  const configuredForm = formScreens[sectionPath];
  if (configuredForm) return configuredForm;

  const segments = sectionPath.split("/");
  if (segments[0] === "tasks" && segments.length === 2) return detailScreen;
  if (segments[0] === "history" && segments.length === 2) {
    return {
      ...historyScreen,
      title: messages.HISTORY_DETAIL_TITLE,
      filters: undefined,
      filterLabel: undefined,
    };
  }

  return {
    title: TECHNICIAN_MESSAGES.ROUTES.PENDING_TITLE,
    description: TECHNICIAN_MESSAGES.ROUTES.PAGE_DESCRIPTION,
    reason: TECHNICIAN_MESSAGES.ROUTES.PENDING,
  };
}

function renderField(item: TechnicianField, index: number) {
  const id = `technician-workflow-field-${index}`;

  return (
    <label className={styles.workflowField} htmlFor={id} key={item.label}>
      <span>{item.label}</span>
      {item.type === "textarea" ? (
        <textarea id={id} disabled rows={3} />
      ) : (
        <input id={id} disabled type={item.type} />
      )}
    </label>
  );
}

export function TechnicianRouteScreen({ sectionPath }: { sectionPath: string }) {
  const screen = getTechnicianScreenDescriptor(sectionPath);

  return (
    <section className={styles.pageContent} aria-labelledby="technician-screen-title">
      <header className={styles.pageHeading}>
        <h1 id="technician-screen-title">{screen.title}</h1>
        <p>{screen.description}</p>
      </header>
      {screen.filters?.length ? (
        <div className={styles.workflowActions} role="group" aria-label={screen.filterLabel}>
          {screen.filters.map((filter) => (
            <button
              aria-describedby="technician-screen-reason"
              className={styles.workflowAction}
              disabled
              key={filter}
              type="button"
            >
              {filter}
            </button>
          ))}
        </div>
      ) : null}
      <div className={styles.unavailableStatus} role="status" aria-labelledby="technician-status-title">
        {screen.panelTitle ? <p className={styles.unavailablePanelTitle}>{screen.panelTitle}</p> : null}
        <h2 id="technician-status-title">{messages.UNAVAILABLE_TITLE}</h2>
        <p id="technician-screen-reason">{screen.reason}</p>
        {(screen.fields?.length || screen.actions?.length) ? <p>{messages.NO_SUBMISSION}</p> : null}
      </div>
      {screen.fields?.length ? (
        <fieldset className={styles.workflowFields} disabled aria-label={screen.title}>
          <legend>{messages.FIELDS_TITLE}</legend>
          {screen.fields.map(renderField)}
        </fieldset>
      ) : null}
      {screen.actions?.length ? (
        <div className={styles.workflowActions}>
          {screen.actions.map((action) => (
            <button
              aria-describedby="technician-screen-reason"
              className={styles.workflowAction}
              disabled
              key={action}
              type="button"
            >
              {action}
            </button>
          ))}
        </div>
      ) : null}
    </section>
  );
}
