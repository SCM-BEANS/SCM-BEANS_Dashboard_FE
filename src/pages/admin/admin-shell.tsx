import Cookies from "js-cookie";
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
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { hasAdminRole } from "@/lib/auth-role";
import { PATH_ADMIN, PATH_AUTH, PATH_HOME } from "@/routes/path";
import { ADMIN_ENABLED_PATHS, ADMIN_NAVIGATION_LINKS } from "@/routes/routes";
import { ADMIN_MESSAGES } from "@/text/admin/admin-messages";
import styles from "./admin-shell.module.css";

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

export { styles as adminStyles };

export function AdminShell({
  children,
  actions,
}: {
  children: ReactNode;
  actions?: ReactNode;
}) {
  const router = useRouter();
  const [access, setAccess] = useState<"checking" | "allowed" | "forbidden">(
    "checking",
  );
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const menuTriggerRef = useRef<HTMLButtonElement>(null);
  const menuCloseRef = useRef<HTMLButtonElement>(null);
  const menuDialogRef = useRef<HTMLElement>(null);
  const wasMenuOpen = useRef(false);
  const currentSection = ADMIN_NAVIGATION_LINKS.find(
    (item) => router.pathname === item.HREF ||
      (item.HREF !== PATH_ADMIN.ROOT && router.pathname.startsWith(`${item.HREF}/`)),
  ) ?? ADMIN_NAVIGATION_LINKS[0];
  const pageTitle = currentSection.HREF === PATH_ADMIN.ROOT
    ? ADMIN_MESSAGES.OVERVIEW.TITLE
    : currentSection.LABEL;

  useEffect(() => {
    const token = Cookies.get("access_token");
    if (!token) {
      void router.replace(PATH_AUTH.LOGIN);
      return;
    }
    setAccess(hasAdminRole(token) ? "allowed" : "forbidden");
  }, [router]);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [router.asPath]);

  useEffect(() => {
    if (!mobileMenuOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileMenuOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [mobileMenuOpen]);

  useEffect(() => {
    if (mobileMenuOpen) menuCloseRef.current?.focus();
    else if (wasMenuOpen.current) menuTriggerRef.current?.focus();
    wasMenuOpen.current = mobileMenuOpen;
  }, [mobileMenuOpen]);

  if (access !== "allowed") {
    return (
      <div className={styles.accessScreen} role="status">
        <strong>{ADMIN_MESSAGES.BRAND}</strong>
        <p>
          {access === "checking"
            ? ADMIN_MESSAGES.AUTH.CHECKING
            : ADMIN_MESSAGES.AUTH.FORBIDDEN}
        </p>
        {access === "forbidden" && (
          <div className={styles.accessLinks}>
            <Link href={PATH_HOME.ROOT}>{ADMIN_MESSAGES.AUTH.HOME}</Link>
            <Link href={PATH_AUTH.LOGIN}>{ADMIN_MESSAGES.AUTH.LOGIN}</Link>
          </div>
        )}
      </div>
    );
  }

  const renderNavigation = (closeMenu = false) =>
    ADMIN_NAVIGATION_LINKS.map((item) => {
      const Icon = NAV_ICONS[item.ICON];
      const enabled = ADMIN_ENABLED_PATHS.has(item.HREF);
      const active =
        router.pathname === item.HREF ||
        (item.HREF !== PATH_ADMIN.ROOT &&
          router.pathname.startsWith(`${item.HREF}/`));
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
          onClick={closeMenu ? () => setMobileMenuOpen(false) : undefined}
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

  return (
    <>
      <Head>
        <title>{pageTitle} | {ADMIN_MESSAGES.BRAND}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <div className={styles.shell}>
        <aside className={styles.sidebar}>
          <Link className={styles.brand} href={PATH_ADMIN.ROOT}>
            {ADMIN_MESSAGES.BRAND}
          </Link>
          <p className={styles.roleLabel}>{ADMIN_MESSAGES.ROLE}</p>
          <nav className={styles.sidebarNav} aria-label="Điều hướng Admin">
            {renderNavigation()}
          </nav>
          <p className={styles.sidebarFootnote}>
            {ADMIN_MESSAGES.NAVIGATION.PENDING}
          </p>
        </aside>
        <div className={styles.workspace}>
          <header className={styles.desktopHeader}>
            <span>{ADMIN_MESSAGES.ROLE} / {currentSection.LABEL}</span>
            <span className={styles.headerPending} title={ADMIN_MESSAGES.NAVIGATION.PENDING}>
              {ADMIN_MESSAGES.NAVIGATION.NOTIFICATIONS}
            </span>
          </header>
          <header className={styles.mobileHeader}>
            <Link className={styles.mobileBrand} href={PATH_ADMIN.ROOT}>
              {ADMIN_MESSAGES.BRAND}
            </Link>
            <span className={styles.mobileHeaderStatus}>
              {currentSection.LABEL}
            </span>
          </header>
          <main className={styles.main}>{children}</main>
          {actions && <footer className={styles.actionDock}>{actions}</footer>}
          <nav className={styles.mobileNav} aria-label="Điều hướng chính Admin">
            <Link className={styles.mobileNavActive} href={currentSection.HREF} aria-current="page">
              {currentSection.LABEL}
            </Link>
            <button
              type="button"
              ref={menuTriggerRef}
              className={styles.mobileNavButton}
              aria-expanded={mobileMenuOpen}
              aria-controls="admin-mobile-menu"
              onClick={() => setMobileMenuOpen(true)}
            >
              <Menu size={19} aria-hidden="true" />
              {ADMIN_MESSAGES.NAVIGATION.MORE}
            </button>
          </nav>
        </div>
      </div>
      {mobileMenuOpen && (
        <div className={styles.menuBackdrop} onClick={() => setMobileMenuOpen(false)}>
          <section
            className={styles.mobileMenu}
            id="admin-mobile-menu"
            ref={menuDialogRef}
            role="dialog"
            aria-modal="true"
            aria-label="Tất cả trang Admin"
            onClick={(event) => event.stopPropagation()}
            onKeyDown={(event) => {
              if (event.key !== "Tab") return;
              const focusable = menuDialogRef.current?.querySelectorAll<HTMLElement>(
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
              <button
                type="button"
                ref={menuCloseRef}
                aria-label="Đóng menu"
                onClick={() => setMobileMenuOpen(false)}
              >
                <X size={20} aria-hidden="true" />
              </button>
            </div>
            <nav className={styles.mobileMenuNav}>{renderNavigation(true)}</nav>
          </section>
        </div>
      )}
    </>
  );
}
