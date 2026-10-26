import {
  Activity,
  BarChart3,
  Bell,
  Building2,
  FileText,
  LayoutDashboard,
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
import { Sidebar, SidebarLogoutButton, SidebarNavigation, type SidebarItem } from "@/components/sidebar/sidebar";
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

const ADMIN_SIDEBAR_ITEMS: SidebarItem[] = ADMIN_NAVIGATION_LINKS.map((item) => ({
  label: item.LABEL,
  href: item.HREF,
  icon: NAV_ICONS[item.ICON],
  enabled: ADMIN_ENABLED_PATHS.has(item.HREF),
  title: ADMIN_ENABLED_PATHS.has(item.HREF) ? undefined : ADMIN_MESSAGES.NAVIGATION.PENDING,
}));

export function getCurrentAdminSection(pathname: string): NavigationItem {
  return ADMIN_NAVIGATION_LINKS.find(
    (item) => pathname === item.HREF ||
      (item.HREF !== PATH_ADMIN.ROOT && pathname.startsWith(`${item.HREF}/`)),
  ) ?? ADMIN_NAVIGATION_LINKS[0];
}

export function AdminSidebarMenu({ loggingOut, onLogout }: { loggingOut: boolean; onLogout: () => void | Promise<void> }) {
  const { pathname } = useRouter();

  return (
    <Sidebar
      brand={ADMIN_MESSAGES.BRAND}
      brandHref={PATH_ADMIN.ROOT}
      roleLabel={ADMIN_MESSAGES.ROLE}
      pathname={pathname}
      rootHref={PATH_ADMIN.ROOT}
      navigationLabel={"\u0110i\u1ec1u h\u01b0\u1edbng Admin"}
      items={ADMIN_SIDEBAR_ITEMS}
      footer={<p className={styles.sidebarFootnote}>{ADMIN_MESSAGES.NAVIGATION.PENDING}</p>}
      logout={{
        label: ADMIN_MESSAGES.AUTH.LOGOUT,
        pendingLabel: ADMIN_MESSAGES.AUTH.LOGGING_OUT,
        pending: loggingOut,
        onLogout,
      }}
    />
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
      <nav className={styles.mobileNav} aria-label={"\u0110i\u1ec1u h\u01b0\u1edbng ch\u00ednh Admin"}>
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
            aria-label={"T\u1ea5t c\u1ea3 trang Admin"}
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
              <strong>{"\u0110i\u1ec1u h\u01b0\u1edbng Admin"}</strong>
              <button type="button" ref={closeRef} aria-label={"\u0110\u00f3ng menu"} onClick={() => setOpen(false)}>
                <X size={20} aria-hidden="true" />
              </button>
            </div>
            <SidebarNavigation
              items={ADMIN_SIDEBAR_ITEMS}
              pathname={router.pathname}
              rootHref={PATH_ADMIN.ROOT}
              navigationLabel={"\u0110i\u1ec1u h\u01b0\u1edbng Admin"}
              className={styles.mobileMenuNav}
              onNavigate={() => setOpen(false)}
            />
            <p className={styles.sidebarFootnote}>{ADMIN_MESSAGES.NAVIGATION.PENDING}</p>
            <SidebarLogoutButton
              label={ADMIN_MESSAGES.AUTH.LOGOUT}
              pendingLabel={ADMIN_MESSAGES.AUTH.LOGGING_OUT}
              pending={loggingOut}
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
