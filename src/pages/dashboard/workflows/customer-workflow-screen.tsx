import type { ReactNode } from "react";
import { useRouter } from "next/router";
import { ActionBarConfig } from "@/components/action-bar/action-bar";
import { ActionBarActions } from "@/components/action-bar/action-bar-actions";
import type { ActionBarAction } from "@/components/action-bar/action-bar-actions";
import { BackButtonHeading } from "@/components/navigation/back-button-heading";
import { CUSTOMER_MESSAGES } from "@/text/customer/customer-messages";
import { getCustomerWorkflowActions, getCustomerWorkflowDescriptor, type CustomerWorkflowDescriptor, type WorkflowField } from "./customer-workflow-descriptor";
import { RepairIntakeForm } from "./repair-intake-screen";
import { SupportRequestsListScreen } from "../support/support-requests-list-screen";
import { RepairCaseDetailScreen } from "@/components/features/repair-workflow/repair-case-detail-screen";
import { OwnerMaintenanceScreen } from "@/components/features/maintenance-workflow/owner-maintenance-screen";
import { RepairCostReviewScreen } from "@/components/features/maintenance-workflow/repair-cost-review-screen";
import { PATH_CUSTOMER } from "@/routes/path";
import { NotificationInbox } from "./notification-inbox";
import { RecallWorkOrdersScreen } from "@/components/features/contract-termination/recall-work-orders-screen";
import { BuybackOwnerScreen } from "@/components/features/buyback/buyback-owner-screen";
import { OwnerRecipeAdjustmentsScreen } from "../menu/owner-recipe-adjustments-screen";
import { OwnerRecipeSyncScreen } from "../menu/owner-recipe-sync-screen";
import styles from "../customer-shell.module.css";

export { getCustomerWorkflowDescriptor };

const messages = CUSTOMER_MESSAGES.WORKFLOWS;

function withWorkflowActions(
  content: ReactNode,
  workflowActions: readonly ActionBarAction[],
  fallbackAction?: ActionBarAction,
) {
  const navigationActions = workflowActions.filter((action) => !action.disabled);
  const actions = navigationActions.length > 0
    ? navigationActions
    : fallbackAction
      ? [fallbackAction]
      : [];
  return (
    <>
      {content}
      {actions.length > 0 ? (
        <ActionBarConfig>
          <ActionBarActions actions={actions} />
        </ActionBarConfig>
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
  const screen = getCustomerWorkflowDescriptor(sectionPath);
  if (!screen) return null;
  const actions = getCustomerWorkflowActions(sectionPath, screen);
  const fallbackAction = screen.back?.fallbackHref
    ? { label: screen.back.label, href: screen.back.fallbackHref, variant: "secondary" as const }
    : undefined;

  if (sectionPath === "menu/adjustments" || sectionPath === "menu/add-dish") {
    return <OwnerRecipeAdjustmentsScreen creating={sectionPath === "menu/add-dish"} />;
  }
  if (sectionPath === "menu/sync" || sectionPath === "menu/sent" || sectionPath === "menu/applied") {
    return <OwnerRecipeSyncScreen />;
  }

  if (sectionPath === "support") {
    return withWorkflowActions(
      <SupportRequestsListScreen />,
      actions,
      fallbackAction,
    );
  }
  const recallDetail = /^contracts\/recall\/([^/]+)$/.exec(sectionPath);
  if (recallDetail) {
    return <RecallWorkOrdersScreen
      role="owner"
      workOrderId={recallDetail[1]}
      backHref={PATH_CUSTOMER.RECALLS}
    />;
  }
  if (sectionPath === "contracts/recall") {
    return <RecallWorkOrdersScreen
      role="owner"
      backHref={PATH_CUSTOMER.CONTRACTS}
      onOpen={(id) => void router.push(PATH_CUSTOMER.RECALL_DETAIL(id))}
    />;
  }
  if (sectionPath === "maintenance") return <OwnerMaintenanceScreen />;
  if (sectionPath === "buyback" || sectionPath === "buyback/new" || sectionPath === "buyback/documents" || sectionPath === "buyback/documents/confirmed") {
    return withWorkflowActions(
      <BuybackOwnerScreen
        listHref={PATH_CUSTOMER.BUYBACK}
        showCreateForm={sectionPath === "buyback/new"}
      />,
      actions,
      fallbackAction,
    );
  }
  const maintenanceRequestDetail = /^maintenance\/([^/]+)$/.exec(sectionPath);
  if (maintenanceRequestDetail) return <OwnerMaintenanceScreen requestId={maintenanceRequestDetail[1]} />;
  const repairCostReview = /^repair-cost-reviews\/([^/]+)$/.exec(sectionPath);
  if (repairCostReview) return <RepairCostReviewScreen reviewId={repairCostReview[1]} role="owner" listHref={PATH_CUSTOMER.NOTIFICATIONS} />;
  const repairCaseDetail = /^support\/repair-cases\/([^/]+)$/.exec(sectionPath);
  if (repairCaseDetail) {
    return withWorkflowActions(
      <RepairCaseDetailScreen
        caseId={repairCaseDetail[1]}
        role="owner"
        listHref={PATH_CUSTOMER.SUPPORT}
      />,
      actions,
      fallbackAction,
    );
  }
  if (sectionPath === "support/new") {
    return withWorkflowActions(
      <RepairIntakeForm title={screen.title} description={screen.description} back={screen.back} />,
      actions,
      fallbackAction,
    );
  }
  if (sectionPath === "notifications") {
    return withWorkflowActions(<NotificationInbox back={screen.back} />, actions, fallbackAction);
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
        <ActionBarConfig>
          <ActionBarActions actions={actions} />
        </ActionBarConfig>
      ) : null}
    </section>
  );
}
