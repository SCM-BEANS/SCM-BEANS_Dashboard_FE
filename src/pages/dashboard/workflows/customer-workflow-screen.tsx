import type { ReactNode } from "react";
import { useRouter } from "next/router";
import { ActionBar } from "@/components/action-bar/action-bar";
import { ActionBarActions } from "@/components/action-bar/action-bar-actions";
import type { ActionBarAction } from "@/components/action-bar/action-bar-actions";
import { BackButtonHeading } from "@/components/navigation/back-button-heading";
import { CUSTOMER_MESSAGES } from "@/text/customer/customer-messages";
import { getCustomerWorkflowActions, getCustomerWorkflowDescriptor, type CustomerWorkflowDescriptor, type WorkflowField } from "./customer-workflow-descriptor";
import { RepairIntakeForm } from "./repair-intake-screen";
import { SupportRequestsListScreen } from "../support/support-requests-list-screen";
import { LocalRecipeForm } from "./local-recipe-screen";
import { OwnerMenuDeviceScreen } from "../menu/menu-screen";
import { NotificationInbox } from "./notification-inbox";
import styles from "../customer-shell.module.css";

export { getCustomerWorkflowDescriptor };

const messages = CUSTOMER_MESSAGES.WORKFLOWS;

function withWorkflowActions(
  content: ReactNode,
  title: string,
  workflowActions: readonly ActionBarAction[],
  fallbackAction?: ActionBarAction,
  showActions = true,
) {
  const navigationActions = showActions ? workflowActions.filter((action) => !action.disabled) : [];
  const actions = showActions
    ? navigationActions.length > 0
      ? navigationActions
      : fallbackAction
        ? [fallbackAction]
        : []
    : [];
  return (
    <>
      {content}
      {actions.length > 0 ? (
        <ActionBar label={`Thao tác ${title}`}>
          <ActionBarActions actions={actions} />
        </ActionBar>
      ) : null}
    </>
  );
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

export function CustomerWorkflowScreen({ sectionPath }: { sectionPath: string }) {
  const router = useRouter();
  const notificationDetailOpen = sectionPath === "notifications" && Boolean(router.query.notificationId);
  const screen = getCustomerWorkflowDescriptor(sectionPath);
  if (!screen) return null;
  const actions = getCustomerWorkflowActions(sectionPath, screen);
  const fallbackAction = screen.back?.fallbackHref
    ? { label: screen.back.label, href: screen.back.fallbackHref, variant: "secondary" as const }
    : undefined;

  if (sectionPath === "support") {
    return withWorkflowActions(
      <SupportRequestsListScreen />,
      screen.title,
      actions,
      fallbackAction,
    );
  }
  if (
    sectionPath.startsWith("support/") &&
    sectionPath.split("/").length === 2 &&
    !["support/new", "support/menu"].includes(sectionPath)
  ) {
    return withWorkflowActions(
      <SupportRequestsListScreen key={sectionPath} requestId={sectionPath.slice("support/".length)} />,
      screen.title,
      actions,
      fallbackAction,
    );
  }
  if (sectionPath === "support/new") {
    return withWorkflowActions(
      <RepairIntakeForm title={screen.title} description={screen.description} back={screen.back} />,
      screen.title,
      actions,
      fallbackAction,
    );
  }
  if (sectionPath === "menu/add-dish") {
    return withWorkflowActions(<LocalRecipeForm back={screen.back} />, screen.title, actions, fallbackAction);
  }
  if (sectionPath === "menu/sent" || sectionPath === "menu/applied") {
    return withWorkflowActions(
      <OwnerMenuDeviceScreen sectionPath={sectionPath} />,
      screen.title,
      actions,
      fallbackAction,
    );
  }
  if (sectionPath === "notifications") {
    return withWorkflowActions(
      <NotificationInbox back={screen.back} />,
      screen.title,
      actions,
      fallbackAction,
      !notificationDetailOpen,
    );
  }

  return (
    <section className={styles.pageContent} aria-labelledby="customer-workflow-title">
      <BackButtonHeading
        back={screen.back ?? null}
        title={screen.title}
        titleId="customer-workflow-title"
        description={screen.description}
        className={styles.pageHeading}
      />
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
      {actions.length ? (
        <ActionBar label={`Thao tác ${screen.title}`}>
          <ActionBarActions actions={actions} />
        </ActionBar>
      ) : null}
    </section>
  );
}
