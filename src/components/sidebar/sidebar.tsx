import { LogOut, PanelLeft, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { createContext, useContext, useEffect, useId, useState, type ReactNode } from "react";
import { getActiveNavigationItem } from "./navigation-route";
import styles from "./sidebar.module.css";

export type SidebarItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  enabled?: boolean;
  title?: string;
};

export type SidebarNavigationProps = {
  items: readonly SidebarItem[];
  pathname: string;
  rootHref: string;
  navigationLabel: string;
  className?: string;
  onNavigate?: () => void;
};

export type SidebarLogoutProps = {
  label: string;
  pendingLabel: string;
  pending: boolean;
  onLogout: () => void | Promise<void>;
};

export function SidebarLogoutButton({ label, pendingLabel, pending, onLogout }: SidebarLogoutProps) {
  return (
    <button className={`${styles.logoutButton} ta:flex ta:w-full ta:min-h-11 ta:items-center ta:gap-3 ta:rounded-lg ta:border ta:border-gray-200 ta:bg-white ta:px-3 ta:text-sm ta:font-medium ta:text-gray-600 ta:hover:bg-gray-100 ta:focus-visible:shadow-focus-ring`} type="button" onClick={() => void onLogout()} disabled={pending}>
      <LogOut size={18} aria-hidden="true" />
      <span>{pending ? pendingLabel : label}</span>
    </button>
  );
}

export function SidebarNavigation({
  items,
  pathname,
  rootHref,
  navigationLabel,
  className = styles.sidebarNav,
  onNavigate,
}: SidebarNavigationProps) {
  const activeItem = getActiveNavigationItem(items, pathname, rootHref);

  return (
    <nav className={className} aria-label={navigationLabel}>
      {items.map((item) => {
        const Icon = item.icon;
        const active = activeItem === item;
        const className = `${styles.navItem} ta:flex ta:min-h-11 ta:items-center ta:gap-3 ta:rounded-lg ta:p-3 ta:text-sm ta:focus-visible:shadow-focus-ring` +
          (item.enabled === false ? " " + styles.navItemDisabled + " ta:opacity-50" : " ta:hover:bg-gray-100") +
          (active && item.enabled !== false ? " " + styles.navItemActive + " ta:bg-brand-50 ta:text-brand-500 ta:font-medium" : " ta:text-gray-700");
        const content = (
          <>
            <Icon size={20} aria-hidden="true" />
            <span>{item.label}</span>
          </>
        );

        return item.enabled === false ? (
          <span
            className={className}
            aria-disabled="true"
            title={item.title}
            key={item.href}
          >
            {content}
          </span>
        ) : (
          <Link
            href={item.href}
            className={className}
            aria-current={active ? "page" : undefined}
            key={item.href}
            onClick={onNavigate}
          >
            {content}
          </Link>
        );
      })}
    </nav>
  );
}

export function Sidebar({
  brand,
  brandHref,
  roleLabel,
  pathname,
  rootHref,
  navigationLabel,
  items,
}: {
  brand: string;
  brandHref: string;
  roleLabel: string;
  pathname: string;
  rootHref: string;
  navigationLabel: string;
  items: readonly SidebarItem[];
}) {
  return (
    <aside className={`${styles.sidebar} ta:flex-col ta:border-r ta:border-gray-200 ta:bg-white ta:p-5`} id={useContext(SidebarContext).sidebarId}>
      <Link className={`${styles.brand} ta:px-3 ta:text-[26px] ta:font-bold ta:tracking-tight`} href={brandHref}>{brand}</Link>
      <p className={`${styles.roleLabel} ta:mx-3 ta:mt-2 ta:mb-6 ta:text-xs ta:font-medium ta:text-gray-600 ta:uppercase`}>{roleLabel}</p>
      <SidebarNavigation
        items={items}
        pathname={pathname}
        rootHref={rootHref}
        navigationLabel={navigationLabel}
      />
    </aside>
  );
}

const SidebarContext = createContext({ sidebarId: "desktop-sidebar", collapsed: false, toggle: () => {} });

export function SidebarShell({ children, className, ...props }: { children: ReactNode; className: string; "data-role"?: string }) {
  const sidebarId = useId();
  const [collapsed, setCollapsed] = useState(false);
  useEffect(() => {
    try { setCollapsed(localStorage.getItem("dolores-sidebar-collapsed") === "true"); } catch { /* Storage may be unavailable. */ }
  }, []);
  const toggle = () => {
    const next = !collapsed;
    setCollapsed(next);
    try { localStorage.setItem("dolores-sidebar-collapsed", String(next)); } catch { /* Keep the in-memory preference. */ }
  };
  return <SidebarContext.Provider value={{ sidebarId, collapsed, toggle }}>
    <div {...props} className={`${className} ${styles.shellLayout}`} data-sidebar-collapsed={collapsed}>{children}</div>
  </SidebarContext.Provider>;
}

export function SidebarWorkspace({ children, notifications, className, context }: { children: ReactNode; notifications: ReactNode; className: string; context?: string }) {
  const { sidebarId, collapsed, toggle } = useContext(SidebarContext);
  return <div className={`${className} ${styles.workspace}`}>
    <header className={`${styles.workspaceToolbar} ta:items-center ta:gap-4 ta:bg-white ta:px-6`}>
      <button type="button" className={`${styles.sidebarToggle} ta:inline-flex ta:size-11 ta:shrink-0 ta:items-center ta:justify-center ta:rounded-lg ta:border ta:border-gray-200 ta:bg-white ta:text-gray-700 ta:hover:bg-gray-100 ta:focus-visible:shadow-focus-ring`} aria-label={collapsed ? "Mở thanh bên" : "Thu gọn thanh bên"}
        aria-expanded={!collapsed} aria-controls={sidebarId} onClick={toggle}>
        <PanelLeft size={20} aria-hidden="true" />
      </button>
      <span className="ta:min-w-0 ta:flex-1 ta:truncate ta:text-sm ta:font-medium ta:text-gray-600">{context}</span>
      <div data-dashboard-dev-login />
      {notifications}
    </header>
    {children}
  </div>;
}
