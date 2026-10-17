import {
  PATH_ADMIN,
  PATH_AUTH,
  PATH_DASHBOARD,
  PATH_EXAMPLES,
  PATH_LEGACY,
  PATH_MODERATOR,
  PATH_PUBLIC,
  PATH_SETTINGS,
  PATH_TECHNICIAN,
  PATH_TOOLS,
} from "./path";

export type AppRole = "admin" | "moderator" | "technician" | "customer";

interface DynamicPage {
  readonly base: string;
  readonly parameter: string;
}

interface DynamicSection {
  readonly base: string;
  readonly segment: RegExp;
}

interface RouteGroup {
  readonly root?: string;
  readonly role?: AppRole;
  readonly pages: readonly string[];
  readonly dynamicPages?: readonly DynamicPage[];
  readonly sections?: readonly string[];
  readonly dynamicSections?: readonly DynamicSection[];
  readonly unresolved?: readonly string[];
}

function staticPaths(group: Record<string, string | ((value: string) => string)>): string[] {
  return Object.values(group).filter((value): value is string => typeof value === "string");
}

/**
 * Next.js app files register pages and layouts. This catalog describes their
 * destinations and owns catch-all acceptance; role labels are not auth guards.
 */
export const ROUTES = {
  public: { pages: Object.values(PATH_PUBLIC) },
  auth: { pages: Object.values(PATH_AUTH) },
  admin: {
    root: PATH_ADMIN.root,
    role: "admin",
    pages: staticPaths(PATH_ADMIN),
    dynamicPages: [{ base: PATH_ADMIN.machines, parameter: "machineId" }],
  },
  moderator: {
    root: PATH_MODERATOR.root,
    role: "moderator",
    pages: [PATH_MODERATOR.root],
    sections: [
      PATH_MODERATOR.contracts,
      PATH_MODERATOR.contractsList,
      PATH_MODERATOR.newContract,
      PATH_MODERATOR.contractFirstInvoice,
      PATH_MODERATOR.contractStandardHandover,
      PATH_MODERATOR.contractSmartHandover,
      PATH_MODERATOR.contractExpiry,
      PATH_MODERATOR.contractRetrieval,
      PATH_MODERATOR.contractSettlement,
      PATH_MODERATOR.contractEarlyTermination,
      PATH_MODERATOR.contractCompensation,
      PATH_MODERATOR.contractDepositRefund,
      PATH_MODERATOR.contractRefundGood,
      PATH_MODERATOR.contractViolations,
      PATH_MODERATOR.customers,
      PATH_MODERATOR.customersList,
      PATH_MODERATOR.newCustomer,
      PATH_MODERATOR.invoices,
      PATH_MODERATOR.invoicesList,
      PATH_MODERATOR.invoiceReconcile,
      PATH_MODERATOR.invoiceShortfall,
      PATH_MODERATOR.invoiceExcess,
      PATH_MODERATOR.invoiceLateCups,
      PATH_MODERATOR.invoiceLateCupsFinal,
      PATH_MODERATOR.invoiceOverdue,
      PATH_MODERATOR.invoiceHistory,
      PATH_MODERATOR.invoicePayg,
      PATH_MODERATOR.machines,
      PATH_MODERATOR.machinesList,
      PATH_MODERATOR.machineStock,
      PATH_MODERATOR.machineCustomer,
      PATH_MODERATOR.machineLoans,
      PATH_MODERATOR.machineRepairHistory,
      PATH_MODERATOR.machineSubstitute,
      PATH_MODERATOR.machineSubstituteReturn,
      PATH_MODERATOR.iot,
      PATH_MODERATOR.iotCustomer,
      PATH_MODERATOR.iotMachines,
      PATH_MODERATOR.menu,
      PATH_MODERATOR.menuItems,
      PATH_MODERATOR.menuIngredients,
      PATH_MODERATOR.menuAdd,
      PATH_MODERATOR.menuAddMissing,
      PATH_MODERATOR.menuSend,
      PATH_MODERATOR.menuSent,
      PATH_MODERATOR.menuEspresso,
      PATH_MODERATOR.menuEspressoWater60,
      PATH_MODERATOR.menuEspressoCoffee20g,
      PATH_MODERATOR.technicalRequests,
      PATH_MODERATOR.technicalRequestsList,
      PATH_MODERATOR.newTechnicalRequest,
      PATH_MODERATOR.technicalRequestDetail("YC-017"),
      PATH_MODERATOR.technicalRequestType("install-standard"),
      PATH_MODERATOR.technicalRequestType("install-smart"),
      PATH_MODERATOR.technicalRequestType("repair"),
      PATH_MODERATOR.technicalRequestType("retrieval"),
      PATH_MODERATOR.technicalRequestType("buyback"),
      PATH_MODERATOR.technicalRequestType("collection"),
      PATH_MODERATOR.machineHistory,
      PATH_MODERATOR.machineHistoryDetail("S-018"),
      PATH_MODERATOR.buyback,
      PATH_MODERATOR.buybackList,
      PATH_MODERATOR.buybackDocuments,
      PATH_MODERATOR.buybackRefurbishment,
      PATH_MODERATOR.notifications,
      PATH_MODERATOR.notificationAlerts,
    ],
    dynamicSections: [
      { base: PATH_MODERATOR.contracts, segment: /^C-\d{3}$/ },
      { base: PATH_MODERATOR.customers, segment: /^[a-z0-9-]+$/ },
      { base: PATH_MODERATOR.machines, segment: /^[A-Z0-9-]+$/ },
      { base: PATH_MODERATOR.technicalRequests, segment: /^YC-\d{3}$/ },
      { base: PATH_MODERATOR.machineHistory, segment: /^[A-Z0-9-]+$/ },
      { base: PATH_MODERATOR.buyback, segment: /^MB-[A-Z0-9-]+$/ },
    ],
  },
  technician: {
    root: PATH_TECHNICIAN.root,
    role: "technician",
    pages: [PATH_TECHNICIAN.root],
    sections: [
      PATH_TECHNICIAN.tasks,
      PATH_TECHNICIAN.taskDetail("YC-017"),
      PATH_TECHNICIAN.taskStandardHandover,
      PATH_TECHNICIAN.taskSmartActivation,
      PATH_TECHNICIAN.taskRepair,
      PATH_TECHNICIAN.taskRetrieval,
      PATH_TECHNICIAN.taskSubstitute,
      PATH_TECHNICIAN.taskSubstituteReturn,
      PATH_TECHNICIAN.taskRefurbishment,
      PATH_TECHNICIAN.taskBuybackAssessment,
      PATH_TECHNICIAN.taskMaintenanceHistory,
      PATH_TECHNICIAN.history,
      PATH_TECHNICIAN.historyDetail("S-018"),
      PATH_TECHNICIAN.historyDetail("C-031"),
      PATH_TECHNICIAN.historyDetail("CF-STD-026"),
      PATH_TECHNICIAN.historyDetail("S-022"),
      PATH_TECHNICIAN.notifications,
    ],
  },
  customer: {
    root: PATH_DASHBOARD.root,
    role: "customer",
    // These explicit Next pages take precedence over the catch-all.
    pages: [PATH_DASHBOARD.root, PATH_DASHBOARD.businesses, PATH_DASHBOARD.machines],
    sections: [
      PATH_DASHBOARD.contracts,
      PATH_DASHBOARD.contractDetail("C-204"),
      PATH_DASHBOARD.contractDetail("C-205"),
      PATH_DASHBOARD.newContract,
      PATH_DASHBOARD.contractExpiry,
      PATH_DASHBOARD.contractEndEarly,
      PATH_DASHBOARD.contractEnd,
      PATH_DASHBOARD.contractDepositComplete,
      PATH_DASHBOARD.machines,
      PATH_DASHBOARD.machineDetail("S-018"),
      PATH_DASHBOARD.machineDetail("S-022"),
      PATH_DASHBOARD.machineDetail("C-031"),
      PATH_DASHBOARD.machineSubstitute,
      PATH_DASHBOARD.machineHistory,
      PATH_DASHBOARD.invoices,
      PATH_DASHBOARD.invoicePayment,
      PATH_DASHBOARD.invoiceShortfall,
      PATH_DASHBOARD.invoiceRefund,
      PATH_DASHBOARD.invoiceDetail("2026-08"),
      PATH_DASHBOARD.invoiceDetail("2026-09"),
      PATH_DASHBOARD.invoiceReminder,
      PATH_DASHBOARD.invoiceStandard,
      PATH_DASHBOARD.invoiceStandardPayment,
      PATH_DASHBOARD.menu,
      PATH_DASHBOARD.menuEspresso,
      PATH_DASHBOARD.menuFreshMilk,
      PATH_DASHBOARD.menuAddDish,
      PATH_DASHBOARD.menuSent,
      PATH_DASHBOARD.menuApplied,
      PATH_DASHBOARD.support,
      PATH_DASHBOARD.newSupport,
      PATH_DASHBOARD.supportMenu,
      PATH_DASHBOARD.supportDetail("YC-017"),
      PATH_DASHBOARD.supportDetail("YC-018"),
      PATH_DASHBOARD.supportDetail("YC-012"),
      PATH_DASHBOARD.buyback,
      PATH_DASHBOARD.newBuyback,
      PATH_DASHBOARD.buybackDocuments,
      PATH_DASHBOARD.buybackDocumentsConfirmed,
      PATH_DASHBOARD.buybackIssue,
      PATH_DASHBOARD.notifications,
    ],
  },
  tools: { pages: Object.values(PATH_TOOLS) },
  settings: { root: PATH_SETTINGS.root, pages: Object.values(PATH_SETTINGS) },
  examples: { pages: Object.values(PATH_EXAMPLES) },
  legacy: { pages: [], unresolved: Object.values(PATH_LEGACY) },
} as const satisfies Record<string, RouteGroup>;

function sectionMatcher(group: RouteGroup & { readonly root: string }): (section: string) => boolean {
  const exactPaths = new Set(group.sections);
  return (section) => {
    const pathname = `${group.root}/${section}`;
    if (exactPaths.has(pathname)) return true;
    return group.dynamicSections?.some(({ base, segment }) =>
      pathname.startsWith(`${base}/`) && segment.test(pathname.slice(base.length + 1))
    ) ?? false;
  };
}

export const isSupportedCustomerSection = sectionMatcher(ROUTES.customer);
export const isSupportedModeratorSection = sectionMatcher(ROUTES.moderator);
export const isSupportedTechnicianSection = sectionMatcher(ROUTES.technician);
