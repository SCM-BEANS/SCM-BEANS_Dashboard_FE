import { lazy, Suspense, type ReactNode } from "react";
import { moderatorStyles as styles } from "./moderator-shell";
import { MODERATOR_MESSAGES } from "@/text/moderator/moderator-messages";

const OverviewScreen = lazy(() => import("./overview/overview-screen").then((module) => ({ default: module.OverviewScreen })));
const NotificationsScreen = lazy(() => import("./notifications/notifications-screen").then((module) => ({ default: module.NotificationsScreen })));
const AlertsScreen = lazy(() => import("./alerts/alerts-screen").then((module) => ({ default: module.AlertsScreen })));
const CustomerProfileListScreen = lazy(() => import("./customers/customer-list-screen").then((module) => ({ default: module.CustomerProfileListScreen })));
const CustomerProfileDetailScreen = lazy(() => import("./customers/customer-detail-screen").then((module) => ({ default: module.CustomerProfileDetailScreen })));
const CustomerCreateScreen = lazy(() => import("./customers/customer-create-screen").then((module) => ({ default: module.ModeratorCustomerCreateScreen })));
const ContractListScreen = lazy(() => import("./contracts/contract-list-screen").then((module) => ({ default: module.ContractListScreen })));
const ContractCreateScreen = lazy(() => import("./contracts/contract-create-screen").then((module) => ({ default: module.ContractCreateScreen })));
const ContractDetailScreen = lazy(() => import("./contracts/contract-detail-screen").then((module) => ({ default: module.ContractDetailScreen })));
const ContractInstallationRequestScreen = lazy(() => import("./contracts/contract-installation-request-screen").then((module) => ({ default: module.ContractInstallationRequestScreen })));
const ModeratorMachinesScreen = lazy(() => import("./machines/machines-screen").then((module) => ({ default: module.ModeratorMachinesScreen })));
const ModeratorIoTScreen = lazy(() => import("./iot/iot-screen").then((module) => ({ default: module.ModeratorIoTScreen })));
const ModeratorTechnicalScreen = lazy(() => import("./technical/technical-screen").then((module) => ({ default: module.ModeratorTechnicalScreen })));
const ModeratorInvoicesScreen = lazy(() => import("./invoices/invoices-screen").then((module) => ({ default: module.ModeratorInvoicesScreen })));
const ModeratorRecipesScreen = lazy(() => import("./menu/recipes-screen").then((module) => ({ default: module.ModeratorRecipesScreen })));
const ModeratorBuybackScreen = lazy(() => import("./buyback/buyback-screen").then((module) => ({ default: module.ModeratorBuybackScreen })));

function ScreenLoading() {
  return (
    <div className={styles.pageContent}>
      <p className={styles.pendingNotice} role="status">
        {MODERATOR_MESSAGES.READ_SCREENS.LOADING_OVERVIEW}
      </p>
    </div>
  );
}

function UnavailableReadRoute({ message }: { message: string }) {
  return (
    <div className={styles.pageContent}>
      <p className={styles.pendingNotice} role="status">{message}</p>
    </div>
  );
}

function loadScreen(screen: ReactNode) {
  return <Suspense fallback={<ScreenLoading />}>{screen}</Suspense>;
}

export function ModeratorReadScreen({ sectionPath }: { sectionPath: string }) {
  const contractInstallationRequest = /^contracts\/([^/]+)\/installation-request$/.exec(sectionPath);
  if (contractInstallationRequest) {
    return loadScreen(<ContractInstallationRequestScreen contractId={contractInstallationRequest[1]} />);
  }
  if (sectionPath === "machines" || sectionPath.startsWith("machines/")) {
    return loadScreen(<ModeratorMachinesScreen path={sectionPath} />);
  }
  if (sectionPath === "iot" || sectionPath === "iot/customer" || sectionPath === "iot/machines") {
    return loadScreen(<ModeratorIoTScreen path={sectionPath} />);
  }
  if (sectionPath === "technical-requests" || sectionPath.startsWith("technical-requests/") ||
      sectionPath === "machine-history" || sectionPath.startsWith("machine-history/")) {
    return loadScreen(<ModeratorTechnicalScreen path={sectionPath} />);
  }
  if (sectionPath === "invoices" || sectionPath === "invoices/list" ||
      /^invoices\/[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(sectionPath)) {
    return loadScreen(<ModeratorInvoicesScreen sectionPath={sectionPath} />);
  }
  if (sectionPath === "menu" ||
      /^menu\/[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(sectionPath)) {
    return loadScreen(<ModeratorRecipesScreen sectionPath={sectionPath} />);
  }
  if (sectionPath === "buyback" || sectionPath === "buyback/list" ||
      /^buyback\/(?:[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}|MB-[A-Z0-9-]+)$/i.test(sectionPath)) {
    return loadScreen(<ModeratorBuybackScreen sectionPath={sectionPath} />);
  }
  if (sectionPath === "customers" || sectionPath === "customers/list") {
    return loadScreen(<CustomerProfileListScreen />);
  }
  if (sectionPath === "customers/new") {
    return loadScreen(<CustomerCreateScreen />);
  }
  if (sectionPath.startsWith("customers/")) {
    return loadScreen(<CustomerProfileDetailScreen id={sectionPath.slice("customers/".length)} />);
  }
  if (sectionPath === "contracts" || sectionPath === "contracts/list") {
    return loadScreen(<ContractListScreen />);
  }
  if (sectionPath === "contracts/new") {
    return loadScreen(<ContractCreateScreen />);
  }
  if (sectionPath === "contracts/expiry") {
    return <UnavailableReadRoute message={MODERATOR_MESSAGES.READ_SCREENS.CONTRACT_EXPIRY_UNAVAILABLE} />;
  }
  if (sectionPath.startsWith("contracts/")) {
    return loadScreen(<ContractDetailScreen id={sectionPath.slice("contracts/".length)} />);
  }
  if (sectionPath === "notifications") return loadScreen(<NotificationsScreen />);
  if (sectionPath === "notifications/alerts") return loadScreen(<AlertsScreen />);
  return loadScreen(<OverviewScreen />);
}
