import {
  PATH_ADMIN,
  PATH_CUSTOMER,
  PATH_HOME,
  PATH_MODERATOR,
  PATH_TECHNICIAN,
} from "./path";
import { ContractIdSchema } from "@/schema/contracts.schema";
import { InvoiceIdSchema } from "@/schema/billing.schema";
import { MachineIdSchema } from "@/schema/machines.schema";
import { GlobalRecipeIdSchema } from "@/schema/recipes.schema";
import { InstallationWorkOrderIdSchema } from "@/schema/installation-work-orders.schema";
import { HOME_MESSAGES } from "@/text/home/home-messages";
import { ADMIN_MESSAGES } from "@/text/admin/admin-messages";
import { MODERATOR_MESSAGES } from "@/text/moderator/moderator-messages";
import { CUSTOMER_MESSAGES } from "@/text/customer/customer-messages";
import { TECHNICIAN_MESSAGES } from "@/text/technician/technician-messages";

export const HOME_NAVIGATION_LINKS = [
  { LABEL: HOME_MESSAGES.NAVIGATION.ITEMS[0], HREF: PATH_HOME.SECTIONS.SOLUTIONS },
  { LABEL: HOME_MESSAGES.NAVIGATION.ITEMS[1], HREF: PATH_HOME.SECTIONS.PRODUCTS },
  { LABEL: HOME_MESSAGES.NAVIGATION.ITEMS[2], HREF: PATH_HOME.SECTIONS.TECHNOLOGY },
] as const;

export const HOME_FOOTER_PRODUCT_LINKS = [
  { LABEL: HOME_MESSAGES.FOOTER.PRODUCT_LINKS[0], HREF: PATH_HOME.SECTIONS.PRODUCTS },
  { LABEL: HOME_MESSAGES.FOOTER.PRODUCT_LINKS[1], HREF: PATH_HOME.SECTIONS.TECHNOLOGY },
  { LABEL: HOME_MESSAGES.FOOTER.PRODUCT_LINKS[2], HREF: PATH_HOME.SECTIONS.SOLUTIONS },
] as const;

export const HOME_FOOTER_DISCOVERY_LINKS = [
  { LABEL: HOME_MESSAGES.FOOTER.DISCOVERY_LINKS[0], HREF: PATH_HOME.SECTIONS.ABOUT },
] as const;

export const ADMIN_NAVIGATION_LINKS = [
  { LABEL: ADMIN_MESSAGES.NAVIGATION.OVERVIEW, HREF: PATH_ADMIN.ROOT, ICON: "LayoutDashboard" },
  { LABEL: ADMIN_MESSAGES.NAVIGATION.BUSINESSES, HREF: PATH_ADMIN.BUSINESSES, ICON: "Store" },
  { LABEL: ADMIN_MESSAGES.NAVIGATION.STORES, HREF: PATH_ADMIN.STORES, ICON: "Building2" },
  { LABEL: ADMIN_MESSAGES.NAVIGATION.CONTRACTS, HREF: PATH_ADMIN.CONTRACTS, ICON: "FileText" },
  { LABEL: ADMIN_MESSAGES.NAVIGATION.MACHINES, HREF: PATH_ADMIN.MACHINES, ICON: "Package" },
  { LABEL: ADMIN_MESSAGES.NAVIGATION.IOT, HREF: PATH_ADMIN.IOT, ICON: "Activity" },
  { LABEL: ADMIN_MESSAGES.NAVIGATION.MENU, HREF: PATH_ADMIN.MENU, ICON: "Utensils" },
  { LABEL: ADMIN_MESSAGES.NAVIGATION.REPORTS, HREF: PATH_ADMIN.REPORTS, ICON: "BarChart3" },
  { LABEL: ADMIN_MESSAGES.NAVIGATION.NOTIFICATIONS, HREF: PATH_ADMIN.NOTIFICATIONS, ICON: "Bell" },
] as const;

// Expose only routes that already have a page implementation.
export const ADMIN_ENABLED_PATHS = new Set<string>([
  PATH_ADMIN.ROOT,
  PATH_ADMIN.BUSINESSES,
  PATH_ADMIN.STORES,
  PATH_ADMIN.CONTRACTS,
  PATH_ADMIN.MACHINES,
  PATH_ADMIN.IOT,
  PATH_ADMIN.MENU,
  PATH_ADMIN.REPORTS,
  PATH_ADMIN.NOTIFICATIONS,
]);

export const MODERATOR_NAVIGATION_LINKS = [
  { LABEL: MODERATOR_MESSAGES.NAVIGATION.OVERVIEW, HREF: PATH_MODERATOR.ROOT, ICON: "LayoutDashboard" },
  { LABEL: MODERATOR_MESSAGES.NAVIGATION.CONTRACTS, HREF: PATH_MODERATOR.CONTRACTS, ICON: "FileText" },
  { LABEL: MODERATOR_MESSAGES.NAVIGATION.CUSTOMERS, HREF: PATH_MODERATOR.CUSTOMERS, ICON: "Users" },
  { LABEL: MODERATOR_MESSAGES.NAVIGATION.INVOICES, HREF: PATH_MODERATOR.INVOICES, ICON: "FileText" },
  { LABEL: MODERATOR_MESSAGES.NAVIGATION.MACHINES, HREF: PATH_MODERATOR.MACHINES, ICON: "Coffee" },
  { LABEL: MODERATOR_MESSAGES.NAVIGATION.IOT, HREF: PATH_MODERATOR.IOT, ICON: "Activity" },
  { LABEL: MODERATOR_MESSAGES.NAVIGATION.MENU, HREF: PATH_MODERATOR.MENU, ICON: "Utensils" },
  { LABEL: MODERATOR_MESSAGES.NAVIGATION.TECHNICAL_REQUESTS, HREF: PATH_MODERATOR.TECHNICAL_REQUESTS, ICON: "Wrench" },
  { LABEL: MODERATOR_MESSAGES.NAVIGATION.MACHINE_HISTORY, HREF: PATH_MODERATOR.MACHINE_HISTORY, ICON: "ClipboardCheck" },
  { LABEL: MODERATOR_MESSAGES.NAVIGATION.BUYBACK, HREF: PATH_MODERATOR.BUYBACK, ICON: "Package" },
  { LABEL: MODERATOR_MESSAGES.NAVIGATION.NOTIFICATIONS, HREF: PATH_MODERATOR.NOTIFICATIONS, ICON: "Bell" },
] as const;

export const CUSTOMER_NAVIGATION_LINKS = [
  { LABEL: CUSTOMER_MESSAGES.NAVIGATION.OVERVIEW, HREF: PATH_CUSTOMER.ROOT, ICON: "LayoutDashboard" },
  { LABEL: CUSTOMER_MESSAGES.NAVIGATION.CONTRACTS, HREF: PATH_CUSTOMER.CONTRACTS, ICON: "FileText" },
  { LABEL: CUSTOMER_MESSAGES.NAVIGATION.MACHINES, HREF: PATH_CUSTOMER.MACHINES, ICON: "Coffee" },
  { LABEL: CUSTOMER_MESSAGES.NAVIGATION.MENU, HREF: PATH_CUSTOMER.MENU, ICON: "Utensils" },
  { LABEL: CUSTOMER_MESSAGES.NAVIGATION.INVOICES, HREF: PATH_CUSTOMER.INVOICES, ICON: "FileText" },
  { LABEL: CUSTOMER_MESSAGES.NAVIGATION.SUPPORT, HREF: PATH_CUSTOMER.SUPPORT, ICON: "Wrench" },
  { LABEL: CUSTOMER_MESSAGES.NAVIGATION.BUYBACK, HREF: PATH_CUSTOMER.BUYBACK, ICON: "Package" },
  { LABEL: CUSTOMER_MESSAGES.NAVIGATION.NOTIFICATIONS, HREF: PATH_CUSTOMER.NOTIFICATIONS, ICON: "Bell" },
] as const;

export const TECHNICIAN_NAVIGATION_LINKS = [
  { LABEL: TECHNICIAN_MESSAGES.NAVIGATION.TASKS, HREF: PATH_TECHNICIAN.TASKS, ICON: "ClipboardCheck" },
  { LABEL: TECHNICIAN_MESSAGES.NAVIGATION.MACHINE_CHECK, HREF: PATH_TECHNICIAN.MACHINE_CHECK, ICON: "Wrench" },
  { LABEL: TECHNICIAN_MESSAGES.NAVIGATION.HISTORY, HREF: PATH_TECHNICIAN.HISTORY, ICON: "Coffee" },
  { LABEL: TECHNICIAN_MESSAGES.NAVIGATION.NOTIFICATIONS, HREF: PATH_TECHNICIAN.NOTIFICATIONS, ICON: "Bell" },
] as const;

const customerStaticSections = [
  "contracts",
  "contracts/new",
  "contracts/expiry",
  "contracts/end-early",
  "contracts/end",
  "contracts/deposit-complete",
  "machines",
  "machines/substitute",
  "machines/history",
  "invoices",
  "invoices/payment",
  "invoices/shortfall",
  "invoices/refund",
  "invoices/reminder",
  "invoices/standard",
  "invoices/standard-payment",
  "menu",
  "menu/espresso",
  "menu/fresh-milk",
  "menu/add-dish",
  "menu/sent",
  "menu/applied",
  "support",
  "support/new",
  "support/menu",
  "buyback",
  "buyback/new",
  "buyback/documents",
  "buyback/documents/confirmed",
  "buyback/issue",
  "notifications",
] as const;

const technicianStaticSections = [
  "tasks",
  "tasks/standard-handover",
  "tasks/smart-activation",
  "tasks/repair",
  "tasks/retrieval",
  "tasks/substitute",
  "tasks/substitute-return",
  "tasks/refurbishment",
  "tasks/buyback-assessment",
  "tasks/maintenance-history",
  "machine-check",
  "history",
  "notifications",
] as const;

export const CUSTOMER_ROUTE_CATALOG = {
  root: PATH_CUSTOMER.ROOT,
  pages: [PATH_CUSTOMER.ROOT],
  sections: customerStaticSections.map((section) => `${PATH_CUSTOMER.ROOT}/${section}`),
} as const;

export const TECHNICIAN_ROUTE_CATALOG = {
  root: PATH_TECHNICIAN.ROOT,
  pages: [PATH_TECHNICIAN.ROOT],
  sections: technicianStaticSections.map((section) => `${PATH_TECHNICIAN.ROOT}/${section}`),
} as const;

const customerExactPaths = new Set<string>([
  ...CUSTOMER_ROUTE_CATALOG.pages,
  ...CUSTOMER_ROUTE_CATALOG.sections,
]);

const technicianExactPaths = new Set<string>([
  ...TECHNICIAN_ROUTE_CATALOG.pages,
  ...TECHNICIAN_ROUTE_CATALOG.sections,
]);

function isWellFormedSection(section: string): boolean {
  return !(
    section.startsWith("/") ||
    section.endsWith("/") ||
    section.includes("//") ||
    section.includes("\\") ||
    section.split("/").some((segment) => segment === "." || segment === "..")
  );
}

function isUuidRouteSegment(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export function isSupportedCustomerSection(section: string): boolean {
  if (!isWellFormedSection(section)) return false;
  const pathname = section ? `${PATH_CUSTOMER.ROOT}/${section}` : PATH_CUSTOMER.ROOT;
  if (customerExactPaths.has(pathname)) return true;

  const segments = section.split("/");
  if (segments.length === 2) {
    const [group, id] = segments;
    if (group === "contracts") return ContractIdSchema.safeParse(id).success;
    if (group === "machines") return MachineIdSchema.safeParse(id).success;
    if (group === "invoices") {
      return InvoiceIdSchema.safeParse(id).success || /^\d{4}-(?:0[1-9]|1[0-2])$/.test(id);
    }
    if (group === "menu") return GlobalRecipeIdSchema.safeParse(id).success;
    if (group === "support") return isUuidRouteSegment(id);
  }

  if (
    segments.length === 3 &&
    segments[0] === "machines" &&
    segments[2] === "model"
  ) {
    return MachineIdSchema.safeParse(segments[1]).success;
  }
  return false;
}

export function isSupportedTechnicianSection(section: string): boolean {
  if (!isWellFormedSection(section)) return false;
  const pathname = section ? `${PATH_TECHNICIAN.ROOT}/${section}` : PATH_TECHNICIAN.ROOT;
  if (technicianExactPaths.has(pathname)) return true;

  const segments = section.split("/");
  if (segments.length !== 2) return false;
  if (segments[0] === "tasks") {
    return InstallationWorkOrderIdSchema.safeParse(segments[1]).success;
  }
  if (segments[0] === "history") {
    return MachineIdSchema.safeParse(segments[1]).success;
  }
  return false;
}

function staticPaths(group: Record<string, string | ((value: string) => string)>): string[] {
  return Object.values(group).filter((value): value is string => typeof value === "string");
}

const moderatorDynamicSections = [
  { base: PATH_MODERATOR.INVOICES, segment: /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i },
  { base: PATH_MODERATOR.MENU, segment: /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i },
  { base: PATH_MODERATOR.CONTRACTS, segment: /^(?:C-\d{3}|[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})$/i },
  { base: PATH_MODERATOR.CUSTOMERS, segment: /^[a-z0-9]+(?:-[a-z0-9]+)*$/i },
  { base: PATH_MODERATOR.MACHINES, segment: /^(?:[A-Z]{1,2}-\d{3}|[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})$/i },
  { base: PATH_MODERATOR.TECHNICAL_REQUESTS, segment: /^(?:YC-\d{3}|[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})$/i },
  { base: PATH_MODERATOR.MACHINE_HISTORY, segment: /^(?:[A-Z]{1,2}-\d{3}|[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})$/i },
  { base: PATH_MODERATOR.BUYBACK, segment: /^(?:MB-[A-Z0-9-]+|[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})$/i },
] as const;

export const MODERATOR_ROUTE_CATALOG = {
  root: PATH_MODERATOR.ROOT,
  pages: [PATH_MODERATOR.ROOT],
  sections: staticPaths(PATH_MODERATOR).filter((path) => path !== PATH_MODERATOR.ROOT),
  dynamicSections: moderatorDynamicSections,
} as const;

const moderatorExactPaths = new Set([
  ...MODERATOR_ROUTE_CATALOG.pages,
  ...MODERATOR_ROUTE_CATALOG.sections,
]);

export function isSupportedModeratorSection(section: string): boolean {
  if (section && (section.startsWith("/") || section.endsWith("/") || section.includes("//"))) {
    return false;
  }
  const contractInstallationRequest = /^contracts\/([^/]+)\/installation-request$/.exec(section);
  if (contractInstallationRequest) {
    return ContractIdSchema.safeParse(contractInstallationRequest[1]).success;
  }
  const pathname = section
    ? PATH_MODERATOR.ROOT + "/" + section
    : PATH_MODERATOR.ROOT;

  if (moderatorExactPaths.has(pathname)) return true;
  return moderatorDynamicSections.some(({ base, segment }) =>
    pathname.startsWith(base + "/") &&
    segment.test(pathname.slice(base.length + 1)),
  );
}
