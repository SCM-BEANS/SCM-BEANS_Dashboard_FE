import { useRef, useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { machinesApi } from "@/apis/machines.api";
import { notificationsApi } from "@/apis/notifications.api";
import { recipesApi } from "@/apis/recipes.api";
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

function createIdempotencyKey() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return Date.now().toString(36) + "-" + Math.random().toString(36).slice(2);
}

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
    actions: [messages.REPAIR_INTAKE_SUBMIT],
  },
  "support/new": {
    title: messages.SUPPORT_NEW_TITLE,
    description: messages.SUPPORT_NEW_DESCRIPTION,
    reason: messages.SUPPORT_API_REASON,
    fields: [
      { label: messages.REPAIR_INTAKE_MACHINE, type: "text" },
      { label: messages.REPAIR_INTAKE_DESCRIPTION, type: "textarea" },
    ],
    actions: [messages.REPAIR_INTAKE_SUBMIT],
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
    reason: messages.BUYBACK_API_REASON,
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
    actions: [messages.NOTIFICATIONS_MARK_ALL],
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
  const id = "customer-workflow-field-" + index;

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

function RepairIntakeForm({ title, description }: { title: string; description: string }) {
  const [machineId, setMachineId] = useState("");
  const [issueDescription, setIssueDescription] = useState("");
  const [validationError, setValidationError] = useState("");
  const idempotencyKeyRef = useRef<string | null>(null);
  const machineQuery = useQuery({
    queryKey: ["owner-machines-for-repair-intake"],
    queryFn: ({ signal }) => machinesApi.list(signal),
  });
  const submitMutation = useMutation({
    mutationFn: (input: { machineId: string; issueDescription: string; idempotencyKey: string }) =>
      machinesApi.createRepairIntake(input),
    onSuccess: () => {
      setIssueDescription("");
      idempotencyKeyRef.current = null;
    },
  });

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!machineId || !issueDescription.trim() || issueDescription.trim().length > 4000) {
      setValidationError(messages.REPAIR_INTAKE_VALIDATION);
      return;
    }
    setValidationError("");
    idempotencyKeyRef.current ??= createIdempotencyKey();
    submitMutation.mutate({
      machineId,
      issueDescription: issueDescription.trim(),
      idempotencyKey: idempotencyKeyRef.current,
    });
  };

  return (
    <section className={styles.pageContent} aria-labelledby="customer-workflow-title">
      <header className={styles.pageHeading}>
        <h1 id="customer-workflow-title">{title}</h1>
        <p>{description}</p>
      </header>
      <form className={styles.dataPanel} onSubmit={submit}>
        <h2>{messages.REPAIR_INTAKE_SUBMIT}</h2>
        <p>{messages.SUPPORT_API_REASON}</p>
        {machineQuery.isPending ? <p className={styles.loadingNotice} role="status">{CUSTOMER_MESSAGES.READ_SCREENS.LOADING}</p> : null}
        {machineQuery.isError ? <p className={styles.errorNotice} role="alert">{messages.REPAIR_INTAKE_MACHINES_ERROR}</p> : null}
        {!machineQuery.isPending && !machineQuery.isError && !machineQuery.data?.length
          ? <p className={styles.emptyNotice} role="status">{messages.REPAIR_INTAKE_NO_MACHINES}</p>
          : null}
        {machineQuery.data?.length ? (
          <>
            <label className={styles.formField}>
              <span>{messages.REPAIR_INTAKE_MACHINE}</span>
              <select
                onChange={(event) => {
                  idempotencyKeyRef.current = null;
                  submitMutation.reset();
                  setMachineId(event.target.value);
                }}
                required
                value={machineId}
              >
                <option value="">{messages.FIELD_MACHINE}</option>
                {machineQuery.data.map((machine) => (
                  <option key={machine.id} value={machine.id}>
                    {(machine.serialNumber || CUSTOMER_MESSAGES.READ_SCREENS.MACHINE_NO_SERIAL) + " · " + (machine.machineType || "—")}
                  </option>
                ))}
              </select>
            </label>
            <label className={styles.formField}>
              <span>{messages.REPAIR_INTAKE_DESCRIPTION}</span>
              <textarea
                maxLength={4000}
                onChange={(event) => {
                  idempotencyKeyRef.current = null;
                  submitMutation.reset();
                  setIssueDescription(event.target.value);
                }}
                placeholder={messages.REPAIR_INTAKE_DESCRIPTION_HINT}
                required
                rows={5}
                value={issueDescription}
              />
              <small>{issueDescription.length} / 4000</small>
            </label>
            {validationError ? <p className={styles.errorNotice} role="alert">{validationError}</p> : null}
            {submitMutation.isError ? <p className={styles.errorNotice} role="alert">{messages.REPAIR_INTAKE_ERROR}</p> : null}
            {submitMutation.isSuccess ? <p className={styles.successNotice} role="status">{messages.REPAIR_INTAKE_SUCCESS}</p> : null}
            <button
              className={styles.primaryButton}
              disabled={submitMutation.isPending || !issueDescription.trim()}
              type="submit"
            >
              {submitMutation.isPending ? messages.REPAIR_INTAKE_SENDING : messages.REPAIR_INTAKE_SUBMIT}
            </button>
          </>
        ) : null}
      </form>
    </section>
  );
}

function LocalRecipeForm() {
  const queryClient = useQueryClient();
  const [globalRecipeId, setGlobalRecipeId] = useState("");
  const [overridesText, setOverridesText] = useState("");
  const [validationError, setValidationError] = useState("");
  const globalRecipes = useQuery({
    queryKey: ["owner-global-recipes"],
    queryFn: ({ signal }) => recipesApi.listGlobal(signal),
  });
  const saveMutation = useMutation({
    mutationFn: (input: { globalRecipeId: string; dosageOverrides: string[] }) =>
      recipesApi.upsertLocal(input),
    onSuccess: async () => {
      setOverridesText("");
      setValidationError("");
      await queryClient.invalidateQueries({ queryKey: ["owner-local-recipes"] });
    },
  });

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const dosageOverrides = overridesText
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
    if (!globalRecipeId || dosageOverrides.length === 0) {
      setValidationError(messages.LOCAL_RECIPE_ERROR);
      return;
    }
    setValidationError("");
    saveMutation.mutate({ globalRecipeId, dosageOverrides });
  };

  return (
    <section className={styles.pageContent} aria-labelledby="customer-workflow-title">
      <header className={styles.pageHeading}>
        <h1 id="customer-workflow-title">{messages.MENU_ADD_DISH_TITLE}</h1>
        <p>{messages.MENU_ADD_DISH_DESCRIPTION}</p>
      </header>
      <form className={styles.dataPanel} onSubmit={submit}>
        {globalRecipes.isPending ? <p className={styles.loadingNotice} role="status">{CUSTOMER_MESSAGES.READ_SCREENS.LOADING}</p> : null}
        {globalRecipes.isError ? <p className={styles.errorNotice} role="alert">{CUSTOMER_MESSAGES.READ_SCREENS.LOAD_ERROR}</p> : null}
        {!globalRecipes.isPending && !globalRecipes.isError && !globalRecipes.data?.length
          ? <p className={styles.emptyNotice} role="status">{messages.LOCAL_RECIPE_NO_GLOBAL}</p>
          : null}
        {globalRecipes.data?.length ? (
          <>
            <label className={styles.formField}>
              <span>{messages.LOCAL_RECIPE_SELECT_GLOBAL}</span>
              <select
                onChange={(event) => {
                  saveMutation.reset();
                  setGlobalRecipeId(event.target.value);
                }}
                required
                value={globalRecipeId}
              >
                <option value="">{messages.LOCAL_RECIPE_SELECT_GLOBAL}</option>
                {globalRecipes.data.map((recipe) => (
                  <option key={recipe.id} value={recipe.id}>{recipe.name}</option>
                ))}
              </select>
            </label>
            <label className={styles.formField}>
              <span>{messages.LOCAL_RECIPE_OVERRIDES}</span>
              <textarea
                onChange={(event) => {
                  saveMutation.reset();
                  setOverridesText(event.target.value);
                }}
                placeholder={messages.LOCAL_RECIPE_OVERRIDES_HINT}
                required
                rows={5}
                value={overridesText}
              />
            </label>
            {validationError ? <p className={styles.errorNotice} role="alert">{validationError}</p> : null}
            {saveMutation.isError ? <p className={styles.errorNotice} role="alert">{messages.LOCAL_RECIPE_ERROR}</p> : null}
            {saveMutation.isSuccess ? <p className={styles.successNotice} role="status">{messages.LOCAL_RECIPE_SUCCESS}</p> : null}
            <button className={styles.primaryButton} disabled={saveMutation.isPending} type="submit">
              {saveMutation.isPending ? messages.LOCAL_RECIPE_SAVING : messages.LOCAL_RECIPE_SAVE}
            </button>
          </>
        ) : null}
      </form>
    </section>
  );
}

function NotificationInbox() {
  const queryClient = useQueryClient();
  const [unreadOnly, setUnreadOnly] = useState(false);
  const list = useQuery({
    queryKey: ["owner-notifications", unreadOnly],
    queryFn: ({ signal }) => notificationsApi.list(signal, unreadOnly ? true : undefined),
  });
  const unreadCount = useQuery({
    queryKey: ["owner-notification-unread-count"],
    queryFn: ({ signal }) => notificationsApi.unreadCount(signal),
  });
  const markOne = useMutation({
    mutationFn: (id: string) => notificationsApi.markAsRead(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["owner-notifications"] });
      await queryClient.invalidateQueries({ queryKey: ["owner-notification-unread-count"] });
    },
  });
  const markAll = useMutation({
    mutationFn: () => notificationsApi.markAllAsRead(),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["owner-notifications"] });
      await queryClient.invalidateQueries({ queryKey: ["owner-notification-unread-count"] });
    },
  });

  return (
    <section className={styles.pageContent} aria-labelledby="customer-workflow-title">
      <header className={styles.pageHeading}>
        <h1 id="customer-workflow-title">{messages.NOTIFICATIONS_TITLE}</h1>
        <p>{messages.NOTIFICATIONS_DESCRIPTION}</p>
      </header>
      <div className={styles.dataPanel}>
        <div className={styles.actionRow} role="group" aria-label={messages.NOTIFICATIONS_FILTER_LABEL}>
          <button className={styles.secondaryButton} aria-pressed={!unreadOnly} onClick={() => setUnreadOnly(false)} type="button">
            {messages.NOTIFICATIONS_FILTER_ALL}
          </button>
          <button className={styles.secondaryButton} aria-pressed={unreadOnly} onClick={() => setUnreadOnly(true)} type="button">
            {messages.NOTIFICATIONS_FILTER_UNREAD}
          </button>
          <span>{messages.NOTIFICATIONS_UNREAD_COUNT}: {unreadCount.data?.unreadCount ?? "—"}</span>
          <button
            className={styles.primaryButton}
            disabled={markAll.isPending || (unreadCount.isSuccess && unreadCount.data.unreadCount === 0)}
            onClick={() => markAll.mutate()}
            type="button"
          >
            {messages.NOTIFICATIONS_MARK_ALL}
          </button>
        </div>
        {markOne.isError || markAll.isError ? <p className={styles.errorNotice} role="alert">{messages.NOTIFICATIONS_MARK_ERROR}</p> : null}
        {markOne.isSuccess ? <p className={styles.successNotice} role="status">{messages.NOTIFICATIONS_MARKED_ONE}</p> : null}
        {markAll.isSuccess ? <p className={styles.successNotice} role="status">{messages.NOTIFICATIONS_MARKED_ALL}</p> : null}
        {list.isPending ? <p className={styles.loadingNotice} role="status">{CUSTOMER_MESSAGES.READ_SCREENS.LOADING}</p> : null}
        {list.isError ? <p className={styles.errorNotice} role="alert">{CUSTOMER_MESSAGES.READ_SCREENS.LOAD_ERROR}</p> : null}
        {!list.isPending && !list.isError && !list.data?.length
          ? <p className={styles.emptyNotice} role="status">{messages.NOTIFICATIONS_EMPTY}</p>
          : null}
        {list.data?.length ? (
          <div className={styles.recordList}>
            {list.data.map((notification) => (
              <article className={styles.recordCard} key={notification.id}>
                <div className={styles.notificationCard}>
                  <div className={styles.notificationMeta}>
                    <span className={styles.unreadBadge}>
                      {notification.read ? messages.NOTIFICATIONS_READ_BADGE : messages.NOTIFICATIONS_UNREAD_BADGE}
                    </span>
                    <span>{notification.type}</span>
                    <time dateTime={notification.createdAt ?? undefined}>
                      {notification.createdAt ? new Date(notification.createdAt).toLocaleString("vi-VN") : "—"}
                    </time>
                  </div>
                  <h2>{notification.title}</h2>
                  <p>{notification.message}</p>
                </div>
                {!notification.read ? (
                  <button
                    className={styles.secondaryButton}
                    disabled={markOne.isPending}
                    onClick={() => markOne.mutate(notification.id)}
                    type="button"
                  >
                    {messages.NOTIFICATIONS_MARK_ONE}
                  </button>
                ) : null}
              </article>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}

export function CustomerWorkflowScreen({ sectionPath }: { sectionPath: string }) {
  const screen = getCustomerWorkflowDescriptor(sectionPath);
  if (!screen) return null;

  if (sectionPath === "support" || sectionPath === "support/new") {
    return <RepairIntakeForm title={screen.title} description={screen.description} />;
  }
  if (sectionPath === "menu/add-dish") return <LocalRecipeForm />;
  if (sectionPath === "notifications") return <NotificationInbox />;

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
