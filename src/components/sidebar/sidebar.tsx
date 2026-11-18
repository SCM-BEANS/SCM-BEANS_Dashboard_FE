import { LogOut, PanelLeftClose, PanelLeftOpen, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { useId, useState, type ReactNode } from "react";
import { SettingsMenu } from "./settings-menu";
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
  id?: string;
};

export type SidebarLogoutProps = {
  label: string;
  pendingLabel: string;
  pending: boolean;
  onLogout: () => void | Promise<void>;
};

export function SidebarLogoutButton({ label, pendingLabel, pending, onLogout }: SidebarLogoutProps) {
  return (
    <button className={styles.logoutButton} type="button" aria-label={pending ? pendingLabel : label} onClick={() => void onLogout()} disabled={pending}>
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
  id,
}: SidebarNavigationProps) {
  const activeItem = getActiveNavigationItem(items, pathname, rootHref);

  return (
    <nav id={id} className={className} aria-label={navigationLabel}>
      {items.map((item) => {
        const Icon = item.icon;
        const active = activeItem === item;
        const className = styles.navItem +
          (item.enabled === false ? " " + styles.navItemDisabled : "") +
          (active && item.enabled !== false ? " " + styles.navItemActive : "");
        const content = (
          <>
            <Icon size={20} aria-hidden="true" />
            <span>{item.label}</span>
          </>
        );

        return item.enabled === false ? (
          <span
            className={className}
            aria-label={item.label}
            aria-disabled="true"
            title={item.title}
            key={item.href}
          >
            {content}
          </span>
        ) : (
          <Link
            href={item.href}
            aria-label={item.label}
            title={item.label}
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
  settingsHref,
  logout,
  footer,
}: {
  brand: string;
  brandHref: string;
  roleLabel: string;
  pathname: string;
  rootHref: string;
  navigationLabel: string;
  items: readonly SidebarItem[];
  settingsHref?: string;
  logout?: SidebarLogoutProps;
  footer?: ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const navId = useId();
  const ToggleIcon = collapsed ? PanelLeftOpen : PanelLeftClose;
  const toggleLabel = collapsed ? "Mở rộng thanh điều hướng" : "Thu gọn thanh điều hướng";

  return (
    <aside className={styles.sidebar} data-collapsed={collapsed}>
      <div className={styles.brandRow}>
        <Link className={styles.brand} href={brandHref}>{brand}</Link>
        <button type="button" className={styles.collapseButton} aria-label={toggleLabel} title={toggleLabel} aria-controls={navId} aria-expanded={!collapsed} onClick={() => setCollapsed(value => !value)}>
          <ToggleIcon size={20} aria-hidden="true" />
        </button>
      </div>
      <p className={styles.roleLabel}>{roleLabel}</p>
      <SidebarNavigation
        id={navId}
        items={items}
        pathname={pathname}
        rootHref={rootHref}
        navigationLabel={navigationLabel}
      />
      {footer}
      {settingsHref && logout ? (
        <SettingsMenu settingsHref={settingsHref} logout={logout} variant="wide" compact={collapsed} />
      ) : logout && <SidebarLogoutButton {...logout} />}
    </aside>
  );
}
