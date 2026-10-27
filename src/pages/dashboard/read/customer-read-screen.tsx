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
import { MenuScreen } from "../menu/menu-screen";
import { InvoicesScreen } from "../invoices/invoices-screen";
import styles from "../customer-shell.module.css";

export { getCustomerScreenDescriptor };

const messages = CUSTOMER_MESSAGES.READ_SCREENS;

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

  if (!sectionPath) return <OverviewScreen />;
  if (sectionPath === "contracts" || ContractIdSchema.safeParse(contractCandidate).success) {
    return <ContractsScreen sectionPath={sectionPath} back={screen.back} />;
  }
  if (sectionPath === "machines" || MachineIdSchema.safeParse(machineCandidate).success) {
    return <MachinesScreen sectionPath={sectionPath} back={screen.back} />;
  }
  if (sectionPath === "menu" || GlobalRecipeIdSchema.safeParse(recipeCandidate).success) {
    return <MenuScreen sectionPath={sectionPath} back={screen.back} />;
  }
  if (
    sectionPath === "invoices" ||
    sectionPath === "invoices/standard" ||
    /^invoices\/\d{4}-\d{2}$/.test(sectionPath) ||
    InvoiceIdSchema.safeParse(invoiceCandidate).success
  ) {
    return <InvoicesScreen sectionPath={sectionPath} back={screen.back} />;
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
