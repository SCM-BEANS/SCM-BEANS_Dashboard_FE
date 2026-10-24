import {
  Activity,
  BarChart3,
  Bell,
  Building2,
  FileText,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  Store,
  Users,
  Utensils,
  X,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useRef, useState } from "react";
import { PATH_ADMIN } from "@/routes/path";
import { ADMIN_ENABLED_PATHS, ADMIN_NAVIGATION_LINKS } from "@/routes/routes";
import { ADMIN_MESSAGES } from "@/text/admin/admin-messages";
import styles from "../admin-shell.module.css";

const NAV_ICONS = {
  LayoutDashboard,
  Users,
  Store,
  Building2,
  FileText,
  Package,
  Activity,
  Utensils,
  BarChart3,
  Bell,
} as const;

type NavigationItem = (typeof ADMIN_NAVIGATION_LINKS)[number];

export function getCurrentAdminSection(pathname: string): NavigationItem {
  return ADMIN_NAVIGATION_LINKS.find(
    (item) => pathname === item.HREF ||
      (item.HREF !== PATH_ADMIN.ROOT && pathname.startsWith(`${item.HREF}/`)),
  ) ?? ADMIN_NAVIGATION_LINKS[0];
}

function NavigationLinks({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  return ADMIN_NAVIGATION_LINKS.map((item) => {
    const Icon = NAV_ICONS[item.ICON];
    const enabled = ADMIN_ENABLED_PATHS.has(item.HREF);
    const active = pathname === item.HREF ||
      (item.HREF !== PATH_ADMIN.ROOT && pathname.startsWith(`${item.HREF}/`));
    const content = (
      <>
        <Icon size={20} aria-hidden="true" />
        <span>{item.LABEL}</span>
      </>
    );

    return enabled ? (
      <Link
        href={item.HREF}
        className={`${styles.navItem} ${active ? styles.navItemActive : ""}`}
        aria-current={active ? "page" : undefined}
        key={item.HREF}
        onClick={onNavigate}
      >
        {content}
      </Link>
    ) : (
      <span
        className={`${styles.navItem} ${styles.navItemDisabled}`}
        aria-disabled="true"
        title={ADMIN_MESSAGES.NAVIGATION.PENDING}
        key={item.HREF}
      >
        {content}
      </span>
    );
  });
}

function LogoutButton({ loggingOut, onLogout }: { loggingOut: boolean; onLogout: () => void | Promise<void> }) {
  return (
    <button className={styles.logoutButton} type="button" onClick={() => void onLogout()} disabled={loggingOut}>
      <LogOut size={18} aria-hidden="true" />
      <span>{loggingOut ? ADMIN_MESSAGES.AUTH.LOGGING_OUT : ADMIN_MESSAGES.AUTH.LOGOUT}</span>
    </button>
  );
}

export function AdminSidebarMenu({ loggingOut, onLogout }: { loggingOut: boolean; onLogout: () => void | Promise<void> }) {
  const { pathname } = useRouter();

  return (
    <aside className={styles.sidebar}>
      <Link className={styles.brand} href={PATH_ADMIN.ROOT}>{ADMIN_MESSAGES.BRAND}</Link>
      <p className={styles.roleLabel}>{ADMIN_MESSAGES.ROLE}</p>
      <nav className={styles.sidebarNav} aria-label="Điều hướng Admin">
        <NavigationLinks pathname={pathname} />
      </nav>
      <p className={styles.sidebarFootnote}>{ADMIN_MESSAGES.NAVIGATION.PENDING}</p>
      <LogoutButton loggingOut={loggingOut} onLogout={onLogout} />
    </aside>
  );
}

export function AdminMobileMenu({
  currentSection,
  loggingOut,
  onLogout,
}: {
  currentSection: NavigationItem;
  loggingOut: boolean;
  onLogout: () => void | Promise<void>;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLElement>(null);
  const wasOpen = useRef(false);

  useEffect(() => setOpen(false), [router.asPath]);

  useEffect(() => {
    if (!open) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [open]);

  useEffect(() => {
    if (open) closeRef.current?.focus();
    else if (wasOpen.current) triggerRef.current?.focus();
    wasOpen.current = open;
  }, [open]);

  return (
    <>
      <nav className={styles.mobileNav} aria-label="Điều hướng chính Admin">
        <Link className={styles.mobileNavActive} href={currentSection.HREF} aria-current="page">
          {currentSection.LABEL}
        </Link>
        <button
          type="button"
          ref={triggerRef}
          className={styles.mobileNavButton}
          aria-expanded={open}
          aria-controls="admin-mobile-menu"
          onClick={() => setOpen(true)}
        >
          <Menu size={19} aria-hidden="true" />
          {ADMIN_MESSAGES.NAVIGATION.MORE}
        </button>
      </nav>
      {open && (
        <div className={styles.menuBackdrop} onClick={() => setOpen(false)}>
          <section
            className={styles.mobileMenu}
            id="admin-mobile-menu"
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-label="Tất cả trang Admin"
            onClick={(event) => event.stopPropagation()}
            onKeyDown={(event) => {
              if (event.key !== "Tab") return;
              const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(
                'a[href], button:not([disabled])',
              );
              if (!focusable?.length) return;
              const first = focusable[0];
              const last = focusable[focusable.length - 1];
              if (event.shiftKey && document.activeElement === first) {
                event.preventDefault();
                last.focus();
              } else if (!event.shiftKey && document.activeElement === last) {
                event.preventDefault();
                first.focus();
              }
            }}
          >
            <div className={styles.mobileMenuHeader}>
              <strong>Điều hướng Admin</strong>
              <button type="button" ref={closeRef} aria-label="Đóng menu" onClick={() => setOpen(false)}>
                <X size={20} aria-hidden="true" />
              </button>
            </div>
            <nav className={styles.mobileMenuNav}>
              <NavigationLinks pathname={router.pathname} onNavigate={() => setOpen(false)} />
            </nav>
            <p className={styles.sidebarFootnote}>{ADMIN_MESSAGES.NAVIGATION.PENDING}</p>
            <LogoutButton
              loggingOut={loggingOut}
              onLogout={() => {
                setOpen(false);
                return onLogout();
              }}
            />
          </section>
        </div>
      )}
    </>
  );
}
