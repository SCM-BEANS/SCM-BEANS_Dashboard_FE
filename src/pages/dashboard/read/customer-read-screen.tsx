import type { ReactNode } from "react";
import type { ActionBarAction } from "@/components/action-bar/action-bar-actions";
import { InvoiceIdSchema } from "@/schema/billing.schema";
import { ContractIdSchema } from "@/schema/contracts.schema";
import { MachineIdSchema } from "@/schema/machines.schema";
import { GlobalRecipeIdSchema } from "@/schema/recipes.schema";
import { CUSTOMER_MESSAGES } from "@/text/customer/customer-messages";
import { ActionBar } from "@/components/action-bar/action-bar";
import { ActionBarActions } from "@/components/action-bar/action-bar-actions";
import { BackButtonHeading } from "@/components/navigation/back-button-heading";
import { getCustomerScreenDescriptor } from "./customer-read-descriptor";
import { OverviewScreen } from "../overview/overview-screen";
import { ContractsScreen } from "../contracts/contracts-screen";
import { MachinesScreen } from "../machines/machines-screen";
import { CustomerMachineOperationalOverviewScreen } from "../machines/machine-operational-overview-screen";
import { MenuScreen } from "../menu/menu-screen";
import { InvoicesScreen } from "../invoices/invoices-screen";
import styles from "../customer-shell.module.css";

export { getCustomerScreenDescriptor };

const messages = CUSTOMER_MESSAGES.READ_SCREENS;

function withCustomerActions(content: ReactNode, title: string, actions: readonly ActionBarAction[]) {
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

export function CustomerReadScreen({ sectionPath }: { sectionPath: string }) {
  const screen = getCustomerScreenDescriptor(sectionPath);
  const contractCandidate = sectionPath.startsWith("contracts/")
    ? sectionPath.slice("contracts/".length)
    : "";
  const machineCandidate = sectionPath.startsWith("machines/")
    ? sectionPath.slice("machines/".length)
    : "";
  const recipeCandidate = sectionPath.startsWith("menu/")
    ? sectionPath.slice("menu/".length)
    : "";
  const invoiceCandidate = sectionPath.startsWith("invoices/")
    ? sectionPath.slice("invoices/".length)
    : "";

  if (!sectionPath) return withCustomerActions(<OverviewScreen />, screen.title, screen.actions);
  const machineOperationsMatch = /^machines\/([^/]+)\/operations$/.exec(sectionPath);
  if (machineOperationsMatch && MachineIdSchema.safeParse(machineOperationsMatch[1]).success) {
    return withCustomerActions(
      <CustomerMachineOperationalOverviewScreen machineId={machineOperationsMatch[1]} />,
      screen.title,
      screen.actions,
    );
  }
  if (sectionPath === "contracts" || sectionPath === "contracts/expiry" || ContractIdSchema.safeParse(contractCandidate).success) {
    return withCustomerActions(<ContractsScreen sectionPath={sectionPath} back={screen.back} />, screen.title, screen.actions);
  }
  if (sectionPath === "machines" || sectionPath === "machines/history" || MachineIdSchema.safeParse(machineCandidate).success) {
    return withCustomerActions(<MachinesScreen sectionPath={sectionPath} back={screen.back} />, screen.title, screen.actions);
  }
  if (sectionPath === "menu" || GlobalRecipeIdSchema.safeParse(recipeCandidate).success) {
    return withCustomerActions(<MenuScreen sectionPath={sectionPath} back={screen.back} />, screen.title, screen.actions);
  }
  if (
    sectionPath === "invoices" ||
    sectionPath === "invoices/standard" ||
    /^invoices\/\d{4}-\d{2}$/.test(sectionPath) ||
    InvoiceIdSchema.safeParse(invoiceCandidate).success
  ) {
    return withCustomerActions(<InvoicesScreen sectionPath={sectionPath} back={screen.back} />, screen.title, screen.actions);
  }

  return (
    <section className={styles.pageContent} aria-labelledby="customer-screen-title">
      <BackButtonHeading
        back={screen.back}
        title={screen.title}
        titleId="customer-screen-title"
        description={screen.description}
        className={styles.pageHeading}
      />
      {screen.availability === "unavailable" ? (
        <div className={styles.pendingNotice} role="status">
          <h2>{messages.DATA_UNAVAILABLE_TITLE}</h2>
          <p>{messages.DATA_UNAVAILABLE_DESCRIPTION}</p>
          <p id="customer-read-reason">{messages.DATA_SCOPE_REASON}</p>
        </div>
      ) : (
        <p className={styles.pendingNotice} role="status">{CUSTOMER_MESSAGES.ROUTES.PENDING}</p>
      )}
      <ActionBar label={`Thao tác ${screen.title}`}>
        <ActionBarActions actions={screen.actions} />
      </ActionBar>
    </section>
  );
}
