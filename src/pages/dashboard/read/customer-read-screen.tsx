import type { ReactNode } from "react";
import type { ActionBarAction } from "@/components/action-bar/action-bar-actions";
import { InvoiceIdSchema } from "@/schema/billing.schema";
import { ContractIdSchema } from "@/schema/contracts.schema";
import { MachineIdSchema } from "@/schema/machines.schema";
import { GlobalRecipeIdSchema } from "@/schema/recipes.schema";
import { CUSTOMER_MESSAGES } from "@/text/customer/customer-messages";
import { PageActions } from "@/components/action-bar/page-actions";
import { BackButtonHeading } from "@/components/navigation/back-button-heading";
import { getCustomerScreenDescriptor } from "./customer-read-descriptor";
import { OverviewScreen } from "../overview/overview-screen";
import { ContractsScreen } from "../contracts/contracts-screen";
import { MachinesScreen } from "../machines/machines-screen";
import { CustomerMachineOperationalOverviewScreen } from "../machines/machine-operational-overview-screen";
import { MenuScreen } from "../menu/menu-screen";
import { InvoicesScreen } from "../invoices/invoices-screen";
import { LocationsScreen } from "../locations/locations-screen";
import { MachineRegistrationScreen } from "../machines/machine-registration-screen";
import styles from "../customer-shell.module.css";

export { getCustomerScreenDescriptor };

const messages = CUSTOMER_MESSAGES.READ_SCREENS;

function withCustomerActions(content: ReactNode, actions: readonly ActionBarAction[]) {
  return (
    <>
      {content}
      {actions.length > 0 ? (
        <PageActions actions={actions.filter((action) => !action.disabled).map((action, index) => ({ ...action, id: String(index) }))} />
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
  const machineOperationsMatch = /^machines\/([^/]+)\/operations$/.exec(sectionPath);
  const invoiceCandidate = sectionPath.startsWith("invoices/")
    ? sectionPath.slice("invoices/".length)
    : "";

  if (!sectionPath) return withCustomerActions(<OverviewScreen />, screen.actions);
  if (sectionPath === "locations") return withCustomerActions(<LocationsScreen />, screen.actions);
  if (sectionPath === "machines/new") return withCustomerActions(<MachineRegistrationScreen />, screen.actions);
  if (machineOperationsMatch && MachineIdSchema.safeParse(machineOperationsMatch[1]).success) {
    return <CustomerMachineOperationalOverviewScreen machineId={machineOperationsMatch[1]} />;
  }
  if (sectionPath === "contracts" || ContractIdSchema.safeParse(contractCandidate).success) {
    return withCustomerActions(<ContractsScreen sectionPath={sectionPath} back={screen.back} />, screen.actions);
  }
  if (sectionPath === "machines" || MachineIdSchema.safeParse(machineCandidate).success) {
    return withCustomerActions(<MachinesScreen sectionPath={sectionPath} back={screen.back} />, screen.actions);
  }
  if (sectionPath === "menu") return <MenuScreen />;
  const recipeDetailMatch = /^menu\/([^/]+)$/.exec(sectionPath);
  if (recipeDetailMatch && GlobalRecipeIdSchema.safeParse(recipeDetailMatch[1]).success) {
    return <MenuScreen initialGlobalRecipeId={recipeDetailMatch[1]} />;
  }
  if (
    sectionPath === "invoices" ||
    sectionPath === "invoices/standard" ||
    /^invoices\/\d{4}-\d{2}$/.test(sectionPath) ||
    InvoiceIdSchema.safeParse(invoiceCandidate).success
  ) {
    return withCustomerActions(<InvoicesScreen sectionPath={sectionPath} back={screen.back} />, screen.actions);
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
      <PageActions actions={screen.actions.filter((action) => !action.disabled && action.href !== screen.back?.fallbackHref).map((action, index) => ({ ...action, id: String(index) }))} />
    </section>
  );
}
