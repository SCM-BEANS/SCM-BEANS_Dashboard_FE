import { LogOut, type LucideIcon } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
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
    <button className={styles.logoutButton} type="button" onClick={() => void onLogout()} disabled={pending}>
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
  return (
    <nav className={className} aria-label={navigationLabel}>
      {items.map((item) => {
        const Icon = item.icon;
        const active = pathname === item.href ||
          (item.href !== rootHref && pathname.startsWith(item.href + "/"));
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
  logout: SidebarLogoutProps;
  footer?: ReactNode;
}) {
  return (
    <aside className={styles.sidebar}>
      <Link className={styles.brand} href={brandHref}>{brand}</Link>
      <p className={styles.roleLabel}>{roleLabel}</p>
      <SidebarNavigation
        items={items}
        pathname={pathname}
        rootHref={rootHref}
        navigationLabel={navigationLabel}
      />
      {footer}
      <SidebarLogoutButton {...logout} />
    </aside>
  );
}
