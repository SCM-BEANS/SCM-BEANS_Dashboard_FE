/**
 * Application page URLs, grouped by area and role.
 * Builders accept raw path segments; route acceptance is owned by Next.js and
 * the route catalog, so constructing a URL does not grant access to that route.
 */

const ROOTS_ADMIN = "/admin";
const ROOTS_MODERATOR = "/moderator";
const ROOTS_TECHNICIAN = "/technician";
const ROOTS_DASHBOARD = "/dashboard";
const ROOTS_SETTINGS = "/settings";

const encodeSegment = (value: string): string => encodeURIComponent(value);

export const PATH_PUBLIC = {
  home: "/",
  solutions: "/solutions",
  products: "/products",
  technology: "/technology",
  pricing: "/pricing",
  about: "/about",
} as const;

export const PATH_AUTH = {
  login: "/login",
} as const;

export const PATH_ADMIN = {
  root: ROOTS_ADMIN,
  users: `${ROOTS_ADMIN}/users`,
  businesses: `${ROOTS_ADMIN}/businesses`,
  stores: `${ROOTS_ADMIN}/stores`,
  contracts: `${ROOTS_ADMIN}/contracts`,
  machines: `${ROOTS_ADMIN}/machines`,
  machineDetail: (id: string) => `${ROOTS_ADMIN}/machines/${encodeSegment(id)}`,
  iot: `${ROOTS_ADMIN}/iot`,
  menu: `${ROOTS_ADMIN}/menu`,
  reports: `${ROOTS_ADMIN}/reports`,
  notifications: `${ROOTS_ADMIN}/notifications`,
} as const;

export const PATH_MODERATOR = {
  root: ROOTS_MODERATOR,
  contracts: `${ROOTS_MODERATOR}/contracts`,
  contractsList: `${ROOTS_MODERATOR}/contracts/list`,
  contractDetail: (id: string) => `${ROOTS_MODERATOR}/contracts/${encodeSegment(id)}`,
  newContract: `${ROOTS_MODERATOR}/contracts/new`,
  contractFirstInvoice: `${ROOTS_MODERATOR}/contracts/first-invoice`,
  contractStandardHandover: `${ROOTS_MODERATOR}/contracts/handover/standard`,
  contractSmartHandover: `${ROOTS_MODERATOR}/contracts/handover/smart`,
  contractExpiry: `${ROOTS_MODERATOR}/contracts/expiry`,
  contractRetrieval: `${ROOTS_MODERATOR}/contracts/retrieval`,
  contractSettlement: `${ROOTS_MODERATOR}/contracts/settlement`,
  contractEarlyTermination: `${ROOTS_MODERATOR}/contracts/early-termination`,
  contractCompensation: `${ROOTS_MODERATOR}/contracts/compensation`,
  contractDepositRefund: `${ROOTS_MODERATOR}/contracts/deposit-refund`,
  contractRefundGood: `${ROOTS_MODERATOR}/contracts/refund-good`,
  contractViolations: `${ROOTS_MODERATOR}/contracts/violations`,
  customers: `${ROOTS_MODERATOR}/customers`,
  customersList: `${ROOTS_MODERATOR}/customers/list`,
  newCustomer: `${ROOTS_MODERATOR}/customers/new`,
  customerDetail: (id: string) => `${ROOTS_MODERATOR}/customers/${encodeSegment(id)}`,
  invoices: `${ROOTS_MODERATOR}/invoices`,
  invoicesList: `${ROOTS_MODERATOR}/invoices/list`,
  invoiceDetail: (id: string) => `${ROOTS_MODERATOR}/invoices/${encodeSegment(id)}`,
  invoiceReconcile: `${ROOTS_MODERATOR}/invoices/reconcile`,
  invoiceShortfall: `${ROOTS_MODERATOR}/invoices/shortfall`,
  invoiceExcess: `${ROOTS_MODERATOR}/invoices/excess`,
  invoiceLateCups: `${ROOTS_MODERATOR}/invoices/late-cups`,
  invoiceLateCupsFinal: `${ROOTS_MODERATOR}/invoices/late-cups-final`,
  invoiceOverdue: `${ROOTS_MODERATOR}/invoices/overdue`,
  invoiceHistory: `${ROOTS_MODERATOR}/invoices/history`,
  invoicePayg: `${ROOTS_MODERATOR}/invoices/payg`,
  machines: `${ROOTS_MODERATOR}/machines`,
  machinesList: `${ROOTS_MODERATOR}/machines/list`,
  machineDetail: (id: string) => `${ROOTS_MODERATOR}/machines/${encodeSegment(id)}`,
  machineStock: `${ROOTS_MODERATOR}/machines/stock`,
  machineCustomer: `${ROOTS_MODERATOR}/machines/customer`,
  machineLoans: `${ROOTS_MODERATOR}/machines/loans`,
  machineRepairHistory: `${ROOTS_MODERATOR}/machines/repair-history`,
  machineSubstitute: `${ROOTS_MODERATOR}/machines/substitute`,
  machineSubstituteReturn: `${ROOTS_MODERATOR}/machines/substitute/return`,
  iot: `${ROOTS_MODERATOR}/iot`,
  iotCustomer: `${ROOTS_MODERATOR}/iot/customer`,
  iotMachines: `${ROOTS_MODERATOR}/iot/machines`,
  menu: `${ROOTS_MODERATOR}/menu`,
  menuItems: `${ROOTS_MODERATOR}/menu/items`,
  menuRecipeDetail: (id: string) => `${ROOTS_MODERATOR}/menu/${encodeSegment(id)}`,
  menuIngredients: `${ROOTS_MODERATOR}/menu/ingredients`,
  menuAdd: `${ROOTS_MODERATOR}/menu/add`,
  menuAddMissing: `${ROOTS_MODERATOR}/menu/add/missing`,
  menuSend: `${ROOTS_MODERATOR}/menu/send`,
  menuSent: `${ROOTS_MODERATOR}/menu/sent`,
  menuEspresso: `${ROOTS_MODERATOR}/menu/espresso`,
  menuEspressoWater60: `${ROOTS_MODERATOR}/menu/espresso/60`,
  menuEspressoCoffee20g: `${ROOTS_MODERATOR}/menu/espresso/20g`,
  technicalRequests: `${ROOTS_MODERATOR}/technical-requests`,
  technicalRequestsList: `${ROOTS_MODERATOR}/technical-requests/list`,
  newTechnicalRequest: `${ROOTS_MODERATOR}/technical-requests/new`,
  technicalRequestDetail: (id: string) => `${ROOTS_MODERATOR}/technical-requests/${encodeSegment(id)}`,
  technicalRequestType: (kind: string) => `${ROOTS_MODERATOR}/technical-requests/new/${encodeSegment(kind)}`,
  machineHistory: `${ROOTS_MODERATOR}/machine-history`,
  machineHistoryDetail: (id: string) => `${ROOTS_MODERATOR}/machine-history/${encodeSegment(id)}`,
  buyback: `${ROOTS_MODERATOR}/buyback`,
  buybackList: `${ROOTS_MODERATOR}/buyback/list`,
  buybackDetail: (id: string) => `${ROOTS_MODERATOR}/buyback/${encodeSegment(id)}`,
  buybackDocuments: `${ROOTS_MODERATOR}/buyback/documents`,
  buybackRefurbishment: `${ROOTS_MODERATOR}/buyback/refurbishment`,
  notifications: `${ROOTS_MODERATOR}/notifications`,
  notificationAlerts: `${ROOTS_MODERATOR}/notifications/alerts`,
} as const;

export const PATH_TECHNICIAN = {
  root: ROOTS_TECHNICIAN,
  tasks: `${ROOTS_TECHNICIAN}/tasks`,
  taskDetail: (id: string) => `${ROOTS_TECHNICIAN}/tasks/${encodeSegment(id)}`,
  taskStandardHandover: `${ROOTS_TECHNICIAN}/tasks/standard-handover`,
  taskSmartActivation: `${ROOTS_TECHNICIAN}/tasks/smart-activation`,
  taskRepair: `${ROOTS_TECHNICIAN}/tasks/repair`,
  taskRetrieval: `${ROOTS_TECHNICIAN}/tasks/retrieval`,
  taskSubstitute: `${ROOTS_TECHNICIAN}/tasks/substitute`,
  taskSubstituteReturn: `${ROOTS_TECHNICIAN}/tasks/substitute-return`,
  taskRefurbishment: `${ROOTS_TECHNICIAN}/tasks/refurbishment`,
  taskBuybackAssessment: `${ROOTS_TECHNICIAN}/tasks/buyback-assessment`,
  taskMaintenanceHistory: `${ROOTS_TECHNICIAN}/tasks/maintenance-history`,
  history: `${ROOTS_TECHNICIAN}/history`,
  historyDetail: (id: string) => `${ROOTS_TECHNICIAN}/history/${encodeSegment(id)}`,
  notifications: `${ROOTS_TECHNICIAN}/notifications`,
} as const;

export const PATH_DASHBOARD = {
  root: ROOTS_DASHBOARD,
  businesses: `${ROOTS_DASHBOARD}/businesses`,
  contracts: `${ROOTS_DASHBOARD}/contracts`,
  contractDetail: (id: string) => `${ROOTS_DASHBOARD}/contracts/${encodeSegment(id)}`,
  newContract: `${ROOTS_DASHBOARD}/contracts/new`,
  contractExpiry: `${ROOTS_DASHBOARD}/contracts/expiry`,
  contractEndEarly: `${ROOTS_DASHBOARD}/contracts/end-early`,
  contractEnd: `${ROOTS_DASHBOARD}/contracts/end`,
  contractDepositComplete: `${ROOTS_DASHBOARD}/contracts/deposit-complete`,
  machines: `${ROOTS_DASHBOARD}/machines`,
  machineDetail: (id: string) => `${ROOTS_DASHBOARD}/machines/${encodeSegment(id)}`,
  machineSubstitute: `${ROOTS_DASHBOARD}/machines/substitute`,
  machineHistory: `${ROOTS_DASHBOARD}/machines/history`,
  invoices: `${ROOTS_DASHBOARD}/invoices`,
  invoiceDetail: (period: string) => `${ROOTS_DASHBOARD}/invoices/${encodeSegment(period)}`,
  invoicePayment: `${ROOTS_DASHBOARD}/invoices/payment`,
  invoiceShortfall: `${ROOTS_DASHBOARD}/invoices/shortfall`,
  invoiceRefund: `${ROOTS_DASHBOARD}/invoices/refund`,
  invoiceReminder: `${ROOTS_DASHBOARD}/invoices/reminder`,
  invoiceStandard: `${ROOTS_DASHBOARD}/invoices/standard`,
  invoiceStandardPayment: `${ROOTS_DASHBOARD}/invoices/standard-payment`,
  menu: `${ROOTS_DASHBOARD}/menu`,
  menuEspresso: `${ROOTS_DASHBOARD}/menu/espresso`,
  menuFreshMilk: `${ROOTS_DASHBOARD}/menu/fresh-milk`,
  menuAddDish: `${ROOTS_DASHBOARD}/menu/add-dish`,
  menuSent: `${ROOTS_DASHBOARD}/menu/sent`,
  menuApplied: `${ROOTS_DASHBOARD}/menu/applied`,
  support: `${ROOTS_DASHBOARD}/support`,
  newSupport: `${ROOTS_DASHBOARD}/support/new`,
  supportMenu: `${ROOTS_DASHBOARD}/support/menu`,
  supportDetail: (id: string) => `${ROOTS_DASHBOARD}/support/${encodeSegment(id)}`,
  buyback: `${ROOTS_DASHBOARD}/buyback`,
  newBuyback: `${ROOTS_DASHBOARD}/buyback/new`,
  buybackDocuments: `${ROOTS_DASHBOARD}/buyback/documents`,
  buybackDocumentsConfirmed: `${ROOTS_DASHBOARD}/buyback/documents/confirmed`,
  buybackIssue: `${ROOTS_DASHBOARD}/buyback/issue`,
  notifications: `${ROOTS_DASHBOARD}/notifications`,
} as const;

export const PATH_TOOLS = {
  inventory: "/inventory",
  thermodynamics: "/thermodynamics",
  model: "/model",
  modelViewer: "/model/viewer",
  assembly: "/assembly",
  digital: "/digital",
} as const;

export const PATH_SETTINGS = {
  root: ROOTS_SETTINGS,
  security: `${ROOTS_SETTINGS}/security`,
} as const;

export const PATH_EXAMPLES = {
  client: "/client-example",
  server: "/server-example",
} as const;

// Existing navigation target without a registered page; retained for compatibility.
export const PATH_LEGACY = {
  users: "/users",
  news: "/news",
} as const;
