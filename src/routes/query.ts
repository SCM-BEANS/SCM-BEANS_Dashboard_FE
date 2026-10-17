/** Pure URL/query contracts shared by server page adapters and client screens. */

export type QueryUpdates = Readonly<Record<string, string | null | undefined>>;

/**
 * Merge query updates without normalizing the path or dropping its fragment.
 * An omitted/undefined value is retained; null removes every value for that key.
 */
export function buildRouteUrl(pathname: string, updates: QueryUpdates, currentSearch?: string): string {
  const hashIndex = pathname.indexOf("#");
  const hash = hashIndex === -1 ? "" : pathname.slice(hashIndex);
  const pathAndSearch = hashIndex === -1 ? pathname : pathname.slice(0, hashIndex);
  const queryIndex = pathAndSearch.indexOf("?");
  const path = queryIndex === -1 ? pathAndSearch : pathAndSearch.slice(0, queryIndex);
  const search = currentSearch ?? (queryIndex === -1 ? "" : pathAndSearch.slice(queryIndex + 1));
  const query = new URLSearchParams(search);

  Object.entries(updates).forEach(([key, value]) => {
    if (value === null) query.delete(key);
    else if (value !== undefined) query.set(key, value);
  });

  const serialized = query.toString();
  return `${path}${serialized ? `?${serialized}` : ""}${hash}`;
}

export const ADMIN_ACCOUNT_VIEWS = ["list", "create-customer", "create-moderator", "create-technician", "tenant", "staff"] as const;
export const ADMIN_CONTRACT_VIEWS = ["list", "c204", "c205", "history"] as const;
export const ADMIN_MACHINE_VIEWS = ["inventory", "stock", "loan-history", "s022", "standard", "mb017", "repair-history", "s018", "repair-history-s018"] as const;
export const ADMIN_MENU_VIEWS = ["list", "items", "add", "missing", "ingredients", "edit-espresso", "edit-espresso-60", "edit-espresso-20g", "send", "sent"] as const;
export const ADMIN_STORE_VIEWS = ["list", "detail"] as const;
export const ADMIN_REPORT_VIEWS = ["overview", "customers"] as const;
export const ADMIN_CUSTOMER_VIEWS = ["list", "customer", "machines"] as const;

export type AdminAccountView = typeof ADMIN_ACCOUNT_VIEWS[number];
export type AdminContractView = typeof ADMIN_CONTRACT_VIEWS[number];
export type AdminMachineView = typeof ADMIN_MACHINE_VIEWS[number];
export type AdminMenuView = typeof ADMIN_MENU_VIEWS[number];
export type AdminStoreView = typeof ADMIN_STORE_VIEWS[number];
export type AdminReportView = typeof ADMIN_REPORT_VIEWS[number];
export type AdminCustomerView = typeof ADMIN_CUSTOMER_VIEWS[number];

function resolveView<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return allowed.find((candidate) => candidate === value) ?? fallback;
}

export const resolveAdminAccountView = (view: unknown): AdminAccountView =>
  resolveView(view, ADMIN_ACCOUNT_VIEWS, "list");

export const resolveAdminContractView = (view: unknown): AdminContractView =>
  resolveView(view, ADMIN_CONTRACT_VIEWS, "list");

export const resolveAdminMachineView = (view: unknown): AdminMachineView =>
  resolveView(view, ADMIN_MACHINE_VIEWS, "inventory");

export const resolveAdminMenuView = (view: unknown, machine?: string): AdminMenuView =>
  resolveView(view, ADMIN_MENU_VIEWS, machine === "S-018" ? "items" : "list");

export const resolveAdminStoreView = (view: unknown): AdminStoreView =>
  resolveView(view, ADMIN_STORE_VIEWS, "list");

export const resolveAdminReportView = (view: unknown): AdminReportView =>
  resolveView(view, ADMIN_REPORT_VIEWS, "overview");

// Businesses only accepts the customer view; machines belongs to the IoT screen.
export const resolveAdminBusinessView = (view: unknown): AdminCustomerView =>
  view === "customer" ? "customer" : "list";

export const isAdminIoTMachineView = (view: unknown): boolean => view === "machines";
