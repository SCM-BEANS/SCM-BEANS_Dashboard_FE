import { CUSTOMER_MESSAGES } from "@/text/customer/customer-messages";
import styles from "./customer-shell.module.css";

type Availability = "unavailable" | "pending";

export interface CustomerScreenDescriptor {
  title: string;
  description: string;
  availability: Availability;
}

const messages = CUSTOMER_MESSAGES.READ_SCREENS;
const phaseThreeSections = new Set([
  "contracts/new",
  "contracts/end-early",
  "invoices/payment",
  "invoices/shortfall",
  "invoices/refund",
  "invoices/reminder",
  "invoices/standard-payment",
  "menu/espresso",
  "menu/fresh-milk",
  "menu/add-dish",
  "menu/sent",
  "menu/applied",
]);

function descriptor(
  title: string,
  description: string,
  availability: Availability = "unavailable",
): CustomerScreenDescriptor {
  return { title, description, availability };
}

export function getCustomerScreenDescriptor(sectionPath: string): CustomerScreenDescriptor {
  if (!sectionPath) {
    return descriptor(messages.OVERVIEW_TITLE, messages.OVERVIEW_DESCRIPTION);
  }

  if (phaseThreeSections.has(sectionPath)) {
    return descriptor(
      CUSTOMER_MESSAGES.ROUTES.PENDING_TITLE,
      CUSTOMER_MESSAGES.ROUTES.PAGE_DESCRIPTION,
      "pending",
    );
  }

  if (sectionPath === "contracts") {
    return descriptor(messages.CONTRACTS_TITLE, messages.CONTRACTS_DESCRIPTION);
  }
  if (sectionPath === "contracts/expiry") {
    return descriptor(messages.CONTRACT_EXPIRY_TITLE, messages.CONTRACTS_DESCRIPTION);
  }
  if (sectionPath === "contracts/end") {
    return descriptor(messages.CONTRACT_END_TITLE, messages.CONTRACTS_DESCRIPTION);
  }
  if (sectionPath === "contracts/deposit-complete") {
    return descriptor(messages.DEPOSIT_COMPLETE_TITLE, messages.CONTRACTS_DESCRIPTION);
  }
  if (sectionPath.split("/").length === 2 && sectionPath.startsWith("contracts/")) {
    return descriptor(messages.CONTRACT_DETAIL_TITLE, messages.CONTRACTS_DESCRIPTION);
  }

  if (sectionPath === "machines") {
    return descriptor(messages.MACHINES_TITLE, messages.MACHINES_DESCRIPTION);
  }
  if (sectionPath === "machines/history") {
    return descriptor(messages.MACHINE_HISTORY_TITLE, messages.MACHINES_DESCRIPTION);
  }
  if (sectionPath === "machines/substitute") {
    return descriptor(messages.MACHINE_SUBSTITUTE_TITLE, messages.MACHINES_DESCRIPTION);
  }
  if (sectionPath.startsWith("machines/") && sectionPath.endsWith("/model")) {
    return descriptor(messages.MACHINE_MODEL_TITLE, messages.MACHINES_DESCRIPTION);
  }
  if (sectionPath.startsWith("machines/")) {
    return descriptor(messages.MACHINE_DETAIL_TITLE, messages.MACHINES_DESCRIPTION);
  }

  if (sectionPath === "invoices") {
    return descriptor(messages.INVOICES_TITLE, messages.INVOICES_DESCRIPTION);
  }
  if (sectionPath === "invoices/standard") {
    return descriptor(messages.STANDARD_INVOICE_TITLE, messages.INVOICES_DESCRIPTION);
  }
  if (/^invoices\/\d{4}-\d{2}$/.test(sectionPath)) {
    return descriptor(messages.INVOICE_PERIOD_TITLE, messages.INVOICES_DESCRIPTION);
  }
  if (sectionPath.split("/").length === 2 && sectionPath.startsWith("invoices/")) {
    return descriptor(messages.INVOICE_DETAIL_TITLE, messages.INVOICES_DESCRIPTION);
  }

  if (sectionPath === "menu") {
    return descriptor(messages.MENU_TITLE, messages.MENU_DESCRIPTION);
  }
  if (sectionPath.split("/").length === 2 && sectionPath.startsWith("menu/")) {
    return descriptor(messages.RECIPE_DETAIL_TITLE, messages.MENU_DESCRIPTION);
  }

  return descriptor(
    CUSTOMER_MESSAGES.ROUTES.PENDING_TITLE,
    CUSTOMER_MESSAGES.ROUTES.PAGE_DESCRIPTION,
    "pending",
  );
}

export function CustomerReadScreen({ sectionPath }: { sectionPath: string }) {
  const screen = getCustomerScreenDescriptor(sectionPath);

  return (
    <section className={styles.pageContent} aria-labelledby="customer-screen-title">
      <header className={styles.pageHeading}>
        <h1 id="customer-screen-title">{screen.title}</h1>
        <p>{screen.description}</p>
      </header>
      {screen.availability === "unavailable" ? (
        <div className={styles.pendingNotice} role="status">
          <h2>{messages.DATA_UNAVAILABLE_TITLE}</h2>
          <p>{messages.DATA_UNAVAILABLE_DESCRIPTION}</p>
          <p>{messages.DATA_SCOPE_REASON}</p>
        </div>
      ) : (
        <p className={styles.pendingNotice} role="status">
          {CUSTOMER_MESSAGES.ROUTES.PENDING}
        </p>
      )}
    </section>
  );
}
