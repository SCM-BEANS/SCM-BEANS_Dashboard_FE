import { PATH_ADMIN, PATH_DASHBOARD, PATH_MODERATOR, PATH_PUBLIC, PATH_TECHNICIAN, PATH_TOOLS } from "./path";
import type { AppRole } from "./routes";

interface NavigationItem {
  readonly label: string;
  readonly href: string;
}

interface MobileNavigationItem extends NavigationItem {
  readonly exact?: boolean;
}

export const ROLE_NAV = {
  admin: [
    { label: "Tổng quan", href: PATH_ADMIN.root, icon: "layout-dashboard" },
    { label: "Tài khoản", href: PATH_ADMIN.users, icon: "users" },
    { label: "Khách hàng", href: PATH_ADMIN.businesses, icon: "store" },
    { label: "Cửa hàng", href: PATH_ADMIN.stores, icon: "layout-dashboard" },
    { label: "Hợp đồng", href: PATH_ADMIN.contracts, icon: "file-text" },
    { label: "Máy & tồn kho", href: PATH_ADMIN.machines, icon: "package" },
    { label: "Giám sát Smart IoT", href: PATH_ADMIN.iot, icon: "activity" },
    { label: "Menu & công thức", href: PATH_ADMIN.menu, icon: "utensils" },
    { label: "Báo cáo vận hành", href: PATH_ADMIN.reports, icon: "chart-column" },
    { label: "Thông báo", href: PATH_ADMIN.notifications, icon: "bell" },
  ],
  moderator: [
    { label: "Tổng quan", href: PATH_MODERATOR.root, icon: "layout-dashboard" },
    { label: "Hợp đồng", href: PATH_MODERATOR.contracts, icon: "file-text" },
    { label: "Tài khoản khách", href: PATH_MODERATOR.customers, icon: "users" },
    { label: "Hóa đơn", href: PATH_MODERATOR.invoices, icon: "file-text" },
    { label: "Máy & tồn kho", href: PATH_MODERATOR.machines, icon: "coffee" },
    { label: "Giám sát Smart IoT", href: PATH_MODERATOR.iot, icon: "activity" },
    { label: "Menu & công thức", href: PATH_MODERATOR.menu, icon: "utensils" },
    { label: "Yêu cầu kỹ thuật", href: PATH_MODERATOR.technicalRequests, icon: "wrench" },
    { label: "Lịch sử máy", href: PATH_MODERATOR.machineHistory, icon: "clipboard-check" },
    { label: "Thu mua máy cũ", href: PATH_MODERATOR.buyback, icon: "package" },
    { label: "Thông báo", href: PATH_MODERATOR.notifications, icon: "bell" },
  ],
  technician: [
    { label: "Việc được giao", href: PATH_TECHNICIAN.tasks, icon: "clipboard-check" },
    { label: "Lịch sử máy", href: PATH_TECHNICIAN.history, icon: "coffee" },
    { label: "Thông báo", href: PATH_TECHNICIAN.notifications, icon: "bell" },
  ],
  customer: [
    { label: "Tổng quan", href: PATH_DASHBOARD.root, icon: "layout-dashboard" },
    { label: "Hợp đồng", href: PATH_DASHBOARD.contracts, icon: "file-text" },
    { label: "Máy của tôi", href: PATH_DASHBOARD.machines, icon: "coffee" },
    { label: "Menu của tôi", href: PATH_DASHBOARD.menu, icon: "utensils" },
    { label: "Hóa đơn", href: PATH_DASHBOARD.invoices, icon: "file-text" },
    { label: "Yêu cầu hỗ trợ", href: PATH_DASHBOARD.support, icon: "wrench" },
    { label: "Thu mua máy cũ", href: PATH_DASHBOARD.buyback, icon: "package" },
    { label: "Thông báo", href: PATH_DASHBOARD.notifications, icon: "bell" },
  ],
} as const satisfies Record<AppRole, readonly (NavigationItem & { readonly icon: string })[]>;

export type RoleNavigationItem = typeof ROLE_NAV[AppRole][number];

export const ROLE_LABEL: Readonly<Record<AppRole, string>> = {
  admin: "Admin",
  moderator: "Moderator",
  technician: "Technician",
  customer: "Khách hàng",
};

export const MOBILE_NAV: Readonly<Record<AppRole, readonly MobileNavigationItem[]>> = {
  admin: [
    { label: "Tổng quan", href: PATH_ADMIN.root, exact: true },
    { label: "Khách hàng", href: PATH_ADMIN.businesses },
    { label: "Máy", href: PATH_ADMIN.machines },
  ],
  moderator: [
    { label: "Tổng quan", href: PATH_MODERATOR.root, exact: true },
    { label: "Hợp đồng", href: PATH_MODERATOR.contracts },
    { label: "Giám sát", href: PATH_MODERATOR.iot },
  ],
  technician: [
    { label: "Công việc", href: PATH_TECHNICIAN.tasks },
    { label: "Lịch sử", href: PATH_TECHNICIAN.history },
    { label: "Thông báo", href: PATH_TECHNICIAN.notifications, exact: true },
  ],
  customer: [
    { label: "Tổng quan", href: PATH_DASHBOARD.root, exact: true },
    { label: "Máy", href: PATH_DASHBOARD.machines },
    { label: "Hóa đơn", href: PATH_DASHBOARD.invoices },
  ],
};

export const LANDING_NAV = [
  { name: "Solutions", href: PATH_PUBLIC.solutions },
  { name: "Products", href: PATH_PUBLIC.products },
  { name: "Technology", href: PATH_PUBLIC.technology },
  { name: "Pricing", href: PATH_PUBLIC.pricing },
  { name: "About", href: PATH_PUBLIC.about },
] as const;

export type LegacyNavigationIcon = "LayoutDashboard" | "Store" | "Coffee" | "Box" | "ThermometerSun" | "Layers" | "Wrench" | "Settings" | "HelpCircle" | "ShieldAlert" | "Users";
type LegacyTranslationKey = "nav_overview" | "nav_inventory" | "nav_thermodynamics" | "nav_model" | "nav_diagnostic" | "nav_calibration" | "nav_logs";

interface LegacyNavigationItem {
  readonly name: string;
  readonly href: string;
  readonly icon: LegacyNavigationIcon;
}

// Resolve translated labels on every render, using the caller's current language.
export function getLegacyNavigation(pathname: string, t: (key: LegacyTranslationKey) => string): readonly LegacyNavigationItem[] {
  const isAdmin = pathname.startsWith(PATH_ADMIN.root);

  const userNavItems: LegacyNavigationItem[] = [
    { name: t("nav_overview"), href: PATH_DASHBOARD.root, icon: "LayoutDashboard" },
    { name: "My Businesses", href: PATH_DASHBOARD.businesses, icon: "Store" },
    { name: "My Machines", href: PATH_DASHBOARD.machines, icon: "Coffee" },
    { name: t("nav_inventory"), href: PATH_TOOLS.inventory, icon: "Box" },
    { name: t("nav_thermodynamics"), href: PATH_TOOLS.thermodynamics, icon: "ThermometerSun" },
    { name: t("nav_model"), href: PATH_TOOLS.model, icon: "Layers" },
    { name: t("nav_diagnostic"), href: "#", icon: "Wrench" },
    { name: t("nav_calibration"), href: "#", icon: "Settings" },
    { name: t("nav_logs"), href: "#", icon: "HelpCircle" },
  ];

  const adminNavItems: LegacyNavigationItem[] = [
    { name: "Admin Dashboard", href: PATH_ADMIN.root, icon: "ShieldAlert" },
    { name: "Manage Users", href: PATH_ADMIN.users, icon: "Users" },
    { name: "Manage Businesses", href: PATH_ADMIN.businesses, icon: "Store" },
    { name: "Manage Machines", href: PATH_ADMIN.machines, icon: "Coffee" },
    { name: t("nav_logs"), href: "#", icon: "HelpCircle" },
  ];

  return isAdmin ? adminNavItems : userNavItems;
}

export function isCurrentPath(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function getRoleNavigationState(role: AppRole, pathname: string) {
  const nav: readonly RoleNavigationItem[] = ROLE_NAV[role];
  const selectionPath = role === "customer" && pathname === PATH_DASHBOARD.supportMenu
    ? PATH_DASHBOARD.menu
    : role === "admin" && pathname === PATH_ADMIN.notifications ? PATH_ADMIN.root : pathname;
  const mobileSelectionPath = role === "customer" && pathname === PATH_DASHBOARD.supportMenu
    ? PATH_DASHBOARD.menu
    : pathname;
  const selectedItem =
    nav.find((item) => item.href === selectionPath) ??
    nav.filter((item) => item.href !== nav[0]?.href && selectionPath.startsWith(item.href)).sort((a, b) => b.href.length - a.href.length)[0];
  const notificationsHref = nav.find((item) => item.label === "Thông báo")?.href ?? nav[0]?.href ?? PATH_PUBLIC.home;

  return { nav, selectionPath, mobileSelectionPath, selectedItem, notificationsHref, mobileItems: MOBILE_NAV[role] };
}

const customerDashboardSections = [
  PATH_DASHBOARD.contracts,
  PATH_DASHBOARD.machines,
  PATH_DASHBOARD.menu,
  PATH_DASHBOARD.invoices,
  PATH_DASHBOARD.support,
  PATH_DASHBOARD.buyback,
  PATH_DASHBOARD.notifications,
].map((pathname) => pathname.slice(PATH_DASHBOARD.root.length + 1)).join("|");

const customerDashboardPattern = new RegExp(
  `^${PATH_DASHBOARD.root}(?:$|/(?:${customerDashboardSections})(?:/|$))`
);

export function isCustomerDashboardPath(pathname: string): boolean {
  return customerDashboardPattern.test(pathname);
}
