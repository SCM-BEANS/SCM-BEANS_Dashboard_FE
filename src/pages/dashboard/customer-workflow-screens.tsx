import { CUSTOMER_MESSAGES } from "@/text/customer/customer-messages";
import { ActionBar } from "@/components/action-bar/action-bar";
import { ActionBarActions, type ActionBarAction } from "@/components/action-bar/action-bar-actions";
import styles from "./customer-shell.module.css";

type WorkflowFieldType = "text" | "textarea" | "file";

interface WorkflowField {
  label: string;
  type: WorkflowFieldType;
}

export interface CustomerWorkflowDescriptor {
  title: string;
  description: string;
  reason: string;
  fields?: WorkflowField[];
  actions?: string[];
  filters?: string[];
}

const messages = CUSTOMER_MESSAGES.WORKFLOWS;

const screens: Record<string, CustomerWorkflowDescriptor> = {
  "invoices/payment": {
    title: messages.INVOICE_PAYMENT_TITLE,
    description: messages.INVOICE_PAYMENT_DESCRIPTION,
    reason: messages.PAYMENT_API_REASON,
    fields: [{ label: messages.FIELD_PAYMENT_PROOF, type: "file" }],
    actions: [messages.ACTION_SEND_PROOF],
  },
  "invoices/shortfall": {
    title: messages.INVOICE_SHORTFALL_TITLE,
    description: messages.INVOICE_SHORTFALL_DESCRIPTION,
    reason: messages.INVOICE_SHORTFALL_REASON,
    actions: [messages.ACTION_SEND_ADDITIONAL_PROOF],
  },
  "invoices/refund": {
    title: messages.INVOICE_REFUND_TITLE,
    description: messages.INVOICE_REFUND_DESCRIPTION,
    reason: messages.INVOICE_SCOPE_REASON,
  },
  "invoices/reminder": {
    title: messages.INVOICE_REMINDER_TITLE,
    description: messages.INVOICE_REMINDER_DESCRIPTION,
    reason: messages.PAYMENT_API_REASON,
    actions: [messages.ACTION_SEND_REMINDER],
  },
  "invoices/standard-payment": {
    title: messages.STANDARD_PAYMENT_TITLE,
    description: messages.STANDARD_PAYMENT_DESCRIPTION,
    reason: messages.PAYMENT_API_REASON,
    fields: [{ label: messages.FIELD_PAYMENT_PROOF, type: "file" }],
    actions: [messages.ACTION_SEND_PROOF],
  },
  "menu/add-dish": {
    title: messages.MENU_ADD_DISH_TITLE,
    description: messages.MENU_ADD_DISH_DESCRIPTION,
    reason: messages.MENU_API_REASON,
    fields: [
      { label: messages.FIELD_DISH_NAME, type: "text" },
      { label: messages.FIELD_INGREDIENTS, type: "text" },
      { label: messages.FIELD_QUANTITY, type: "text" },
    ],
    actions: [messages.ACTION_ADD_DISH],
  },
  "menu/espresso": {
    title: messages.MENU_EDIT_TITLE,
    description: messages.MENU_EDIT_DESCRIPTION,
    reason: messages.MENU_API_REASON,
    fields: [
      { label: messages.FIELD_DISH_NAME, type: "text" },
      { label: messages.FIELD_INGREDIENTS, type: "text" },
      { label: messages.FIELD_QUANTITY, type: "text" },
    ],
    actions: [messages.ACTION_ADD_DISH],
  },
  "menu/fresh-milk": {
    title: messages.MENU_EDIT_TITLE,
    description: messages.MENU_EDIT_DESCRIPTION,
    reason: messages.MENU_API_REASON,
    fields: [
      { label: messages.FIELD_DISH_NAME, type: "text" },
      { label: messages.FIELD_INGREDIENTS, type: "text" },
      { label: messages.FIELD_QUANTITY, type: "text" },
    ],
    actions: [messages.ACTION_ADD_DISH],
  },
  "menu/sent": {
    title: messages.MENU_SENT_TITLE,
    description: messages.MENU_SENT_DESCRIPTION,
    reason: messages.MENU_API_REASON,
  },
  "menu/applied": {
    title: messages.MENU_APPLIED_TITLE,
    description: messages.MENU_APPLIED_DESCRIPTION,
    reason: messages.MENU_SCOPE_REASON,
  },
  support: {
    title: messages.SUPPORT_TITLE,
    description: messages.SUPPORT_DESCRIPTION,
    reason: messages.SUPPORT_API_REASON,
    actions: [messages.ACTION_CREATE_SUPPORT],
  },
  "support/new": {
    title: messages.SUPPORT_NEW_TITLE,
    description: messages.SUPPORT_NEW_DESCRIPTION,
    reason: messages.SUPPORT_API_REASON,
    fields: [
      { label: messages.FIELD_MACHINE, type: "text" },
      { label: messages.FIELD_SUPPORT_DETAILS, type: "textarea" },
    ],
    actions: [messages.ACTION_CREATE_SUPPORT],
  },
  "support/menu": {
    title: messages.SUPPORT_MENU_TITLE,
    description: messages.SUPPORT_MENU_DESCRIPTION,
    reason: messages.SUPPORT_API_REASON,
    actions: [messages.ACTION_SUPPORT_MENU],
  },
  buyback: {
    title: messages.BUYBACK_TITLE,
    description: messages.BUYBACK_DESCRIPTION,
    reason: messages.BUYBACK_API_REASON,
    actions: [messages.ACTION_CREATE_BUYBACK],
  },
  "buyback/new": {
    title: messages.BUYBACK_NEW_TITLE,
    description: messages.BUYBACK_NEW_DESCRIPTION,
    reason: messages.BUYBACK_API_REASON,
    fields: [
      { label: messages.FIELD_BUYBACK_MACHINE, type: "text" },
      { label: messages.FIELD_BUYBACK_REASON, type: "textarea" },
    ],
    actions: [messages.ACTION_CREATE_BUYBACK],
  },
  "buyback/documents": {
    title: messages.BUYBACK_DOCUMENTS_TITLE,
    description: messages.BUYBACK_DOCUMENTS_DESCRIPTION,
    reason: messages.BUYBACK_API_REASON,
    actions: [messages.ACTION_CONFIRM_RECEIPT],
  },
  "buyback/documents/confirmed": {
    title: messages.BUYBACK_CONFIRMED_TITLE,
    description: messages.BUYBACK_DOCUMENTS_DESCRIPTION,
    reason: messages.BUYBACK_CONFIRMED_REASON,
  },
  "buyback/issue": {
    title: messages.BUYBACK_ISSUE_TITLE,
    description: messages.BUYBACK_ISSUE_DESCRIPTION,
    reason: messages.BUYBACK_API_REASON,
    fields: [{ label: messages.FIELD_DOCUMENT_ISSUE, type: "textarea" }],
    actions: [messages.ACTION_REPORT_BUYBACK_ISSUE],
  },
  notifications: {
    title: messages.NOTIFICATIONS_TITLE,
    description: messages.NOTIFICATIONS_DESCRIPTION,
    reason: messages.NOTIFICATIONS_SCOPE_REASON,
    filters: [messages.NOTIFICATIONS_FILTER_ALL, messages.NOTIFICATIONS_FILTER_UNREAD],
    actions: [messages.ACTION_MARK_READ],
  },
};

export function getCustomerWorkflowDescriptor(sectionPath: string): CustomerWorkflowDescriptor | null {
  const exactScreen = screens[sectionPath];
  if (exactScreen) return exactScreen;

  if (sectionPath.startsWith("support/") && sectionPath.split("/").length === 2) {
    return {
      title: messages.SUPPORT_PROGRESS_TITLE,
      description: messages.SUPPORT_PROGRESS_DESCRIPTION,
      reason: messages.SUPPORT_API_REASON,
    };
  }

  return null;
}

function renderField(field: WorkflowField, index: number) {
  const id = `customer-workflow-field-${index}`;

  return (
    <label className={styles.workflowField} htmlFor={id} key={field.label}>
      <span>{field.label}</span>
      {field.type === "textarea" ? (
        <textarea id={id} disabled rows={3} />
      ) : (
        <input id={id} disabled type={field.type} />
      )}
    </label>
  );
}

function getCustomerWorkflowActions(sectionPath: string, screen: CustomerWorkflowDescriptor): ActionBarAction[] {
  const blocked = (label: string, variant: "primary" | "secondary" = "primary"): ActionBarAction => ({
    label,
    variant,
    disabled: true,
    describedBy: "customer-workflow-reason",
  });
  const link = (label: string, href: string, variant: "primary" | "secondary" = "primary"): ActionBarAction => ({
    label,
    href,
    variant,
  });
  const blockedActions = (screen.actions ?? []).map((action) => blocked(action));

  if (sectionPath === "support") {
    return [link("Gửi yêu cầu mới", "/dashboard/support/new"), link("Cập nhật menu cần hỗ trợ", "/dashboard/support/menu", "secondary")];
  }
  if (sectionPath === "buyback") {
    return [link("Gửi đề nghị thu mua", "/dashboard/buyback/new"), link("Xem chứng từ thu mua", "/dashboard/buyback/documents", "secondary")];
  }
  if (sectionPath === "invoices/refund") {
    return [blocked("Gửi yêu cầu hoàn tiền"), link("Về hóa đơn", "/dashboard/invoices", "secondary")];
  }
  if (sectionPath === "menu/sent") {
    return [link("Về menu của tôi", "/dashboard/menu"), blocked("Gửi menu riêng đến máy", "secondary")];
  }
  if (sectionPath === "menu/applied") {
    return [link("Về menu của tôi", "/dashboard/menu")];
  }
  if (
    sectionPath.startsWith("support/") &&
    sectionPath.split("/").length === 2 &&
    !["support/new", "support/menu"].includes(sectionPath)
  ) {
    return [link("Về yêu cầu hỗ trợ", "/dashboard/support"), link("Xem lịch sử máy", "/dashboard/machines/history", "secondary")];
  }
  if (sectionPath === "buyback/documents/confirmed") {
    return [link("Về hồ sơ thu mua", "/dashboard/buyback"), link("Xem lại chứng từ", "/dashboard/buyback/documents", "secondary")];
  }

  const navigationActions: Record<string, ActionBarAction[]> = {
    "invoices/payment": [link("Về hóa đơn", "/dashboard/invoices", "secondary")],
    "invoices/shortfall": [link("Xem phần còn thiếu", "/dashboard/invoices", "secondary")],
    "invoices/reminder": [link("Về hóa đơn", "/dashboard/invoices", "secondary")],
    "invoices/standard-payment": [link("Về hóa đơn", "/dashboard/invoices", "secondary")],
    "menu/espresso": [link("Về menu của tôi", "/dashboard/menu", "secondary")],
    "menu/fresh-milk": [link("Về menu của tôi", "/dashboard/menu", "secondary")],
    "menu/add-dish": [link("Hủy", "/dashboard/menu", "secondary")],
    "support/new": [link("Về yêu cầu hỗ trợ", "/dashboard/support", "secondary")],
    "support/menu": [link("Xem máy của tôi", "/dashboard/machines", "secondary")],
    "buyback/new": [link("Về thu mua máy cũ", "/dashboard/buyback", "secondary")],
    "buyback/documents": [link("Có vấn đề cần trao đổi", "/dashboard/buyback/issue", "secondary")],
    "buyback/issue": [link("Về chứng từ thu mua", "/dashboard/buyback/documents", "secondary")],
    notifications: [
      link("Về tổng quan", "/dashboard"),
      link("Chưa đọc", "/dashboard/notifications?view=unread", "secondary"),
    ],
  };

  return [...blockedActions, ...(navigationActions[sectionPath] ?? [link("Về tổng quan", "/dashboard", "secondary")])];
}

export function CustomerWorkflowScreen({ sectionPath }: { sectionPath: string }) {
  const screen = getCustomerWorkflowDescriptor(sectionPath);
  if (!screen) return null;

  return (
    <section className={styles.pageContent} aria-labelledby="customer-workflow-title">
      <header className={styles.pageHeading}>
        <h1 id="customer-workflow-title">{screen.title}</h1>
        <p>{screen.description}</p>
      </header>
      <div className={styles.workflowStatus} role="status" aria-describedby="customer-workflow-reason">
        <h2>{messages.UNAVAILABLE_TITLE}</h2>
        <p id="customer-workflow-reason">{screen.reason}</p>
        {(screen.fields?.length || screen.actions?.length || screen.filters?.length)
          ? <p>{messages.NO_SUBMISSION}</p>
          : null}
      </div>
      {screen.fields?.length ? (
        <fieldset className={styles.workflowFields} disabled aria-label={screen.title}>
          <legend>{messages.FIELDS_TITLE}</legend>
          {screen.fields.map(renderField)}
        </fieldset>
      ) : null}
      {screen.filters?.length ? (
        <div className={styles.workflowActions} role="group" aria-label={messages.NOTIFICATIONS_FILTER_LABEL}>
          {screen.filters.map((filter) => (
            <button
              aria-describedby="customer-workflow-reason"
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
      <ActionBar label={`Thao tác ${screen.title}`}>
        <ActionBarActions actions={getCustomerWorkflowActions(sectionPath, screen)} />
      </ActionBar>
    </section>
  );
}
