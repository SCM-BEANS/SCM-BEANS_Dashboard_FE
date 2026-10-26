import { ActionBar } from "@/components/action-bar/action-bar";
import { ActionBarActions } from "@/components/action-bar/action-bar-actions";
import { CUSTOMER_MESSAGES } from "@/text/customer/customer-messages";
import { getCustomerWorkflowActions, getCustomerWorkflowDescriptor, type CustomerWorkflowDescriptor, type WorkflowField } from "./customer-workflow-descriptor";
import { RepairIntakeForm } from "./repair-intake-screen";
import { LocalRecipeForm } from "./local-recipe-screen";
import { NotificationInbox } from "./notification-inbox";
import styles from "../customer-shell.module.css";

export { getCustomerWorkflowDescriptor };

const messages = CUSTOMER_MESSAGES.WORKFLOWS;

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
