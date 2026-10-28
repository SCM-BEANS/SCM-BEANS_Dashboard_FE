import { ActionBar } from "@/components/action-bar/action-bar";
import { ActionBarActions, type ActionBarAction } from "@/components/action-bar/action-bar-actions";
import { BackButtonHeading } from "@/components/navigation/back-button-heading";
import type { BackButtonDestination } from "@/components/navigation/back-button";
import { TECHNICIAN_MESSAGES } from "@/text/technician/technician-messages";
import styles from "./technician-shell.module.css";

export type TechnicianFieldType = "text" | "textarea" | "file";

export interface TechnicianField {
  label: string;
  type: TechnicianFieldType;
}

export interface TechnicianScreenDescriptor {
  title: string;
  description: string;
  reason: string;
  panelTitle?: string;
  fields?: TechnicianField[];
  actions?: ActionBarAction[];
  showNoSubmission?: boolean;
  filters?: string[];
  filterLabel?: string;
  back?: BackButtonDestination | null;
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

export function TechnicianScreen({ screen }: { screen: TechnicianScreenDescriptor }) {
  const actions = (screen.actions ?? []).filter((action) => action.href !== screen.back?.fallbackHref);

  return (
    <section className={styles.pageContent} aria-labelledby="technician-screen-title">
      <BackButtonHeading
        back={screen.back ?? null}
        title={screen.title}
        titleId="technician-screen-title"
        description={screen.description}
        className={styles.pageHeading}
      />
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
        <h2 id="technician-status-title">{TECHNICIAN_MESSAGES.WORKFLOWS.UNAVAILABLE_TITLE}</h2>
        <p id="technician-screen-reason">{screen.reason}</p>
        {(screen.fields?.length || screen.showNoSubmission) ? (
          <p>{TECHNICIAN_MESSAGES.WORKFLOWS.NO_SUBMISSION}</p>
        ) : null}
      </div>
      {screen.fields?.length ? (
        <fieldset className={styles.workflowFields} disabled aria-label={screen.title}>
          <legend>{TECHNICIAN_MESSAGES.WORKFLOWS.FIELDS_TITLE}</legend>
          {screen.fields.map(renderField)}
        </fieldset>
      ) : null}
      <ActionBar label={`Thao tác ${screen.title}`}>
        <ActionBarActions actions={actions} />
      </ActionBar>
    </section>
  );
}
