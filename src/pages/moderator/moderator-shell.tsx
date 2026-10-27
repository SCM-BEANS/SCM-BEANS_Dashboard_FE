import Cookies from "js-cookie";
import {
  Activity,
  Bell,
  ClipboardCheck,
  Coffee,
  FileText,
  LayoutDashboard,
  Menu,
  Package,
  Users,
  Utensils,
  Wrench,
  X,
} from "lucide-react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { authApi } from "@/apis/auth.api";
import { ActionBar } from "@/components/action-bar/action-bar";
import { ButtonBar } from "@/components/button/button-bar";
import { AdminBreadcrumb } from "@/components/heading/admin-breadcrumb";
import { Sidebar, SidebarLogoutButton, SidebarNavigation, type SidebarItem } from "@/components/sidebar/sidebar";
import { hasModeratorRole } from "@/lib/auth-role";
import { PATH_AUTH, PATH_HOME, PATH_MODERATOR } from "@/routes/path";
import {
  MODERATOR_MOBILE_NAVIGATION_LINKS,
  MODERATOR_NAVIGATION_LINKS,
} from "@/routes/routes";
import { MODERATOR_MESSAGES } from "@/text/moderator/moderator-messages";
import styles from "./moderator-shell.module.css";

const NAV_ICONS = {
  Activity,
  Bell,
  ClipboardCheck,
  Coffee,
  FileText,
  LayoutDashboard,
  Package,
  Users,
  Utensils,
  Wrench,
} as const;

const MODERATOR_SIDEBAR_ITEMS: SidebarItem[] = MODERATOR_NAVIGATION_LINKS.map((item) => ({
  label: item.LABEL,
  href: item.HREF,
  icon: NAV_ICONS[item.ICON],
}));

export function ModeratorShell({
  children,
  pageTitle,
}: {
  children: ReactNode;
  pageTitle: string;
}) {
  const router = useRouter();
  const [access, setAccess] = useState<"checking" | "allowed" | "forbidden">("checking");
  const [loggingOut, setLoggingOut] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const menuTriggerRef = useRef<HTMLButtonElement>(null);
  const menuCloseRef = useRef<HTMLButtonElement>(null);
  const menuDialogRef = useRef<HTMLElement>(null);
  const wasMenuOpen = useRef(false);
  const pathname = router.asPath.split("?")[0].replace(/\/+$/, "") || "/";
  const currentSection = MODERATOR_NAVIGATION_LINKS.find(
    (item) => item.HREF === pathname ||
      (item.HREF !== PATH_MODERATOR.ROOT && pathname.startsWith(item.HREF + "/")),
  ) ?? MODERATOR_NAVIGATION_LINKS[0];

  useEffect(() => {
    const token = Cookies.get("access_token");
    if (!token) {
      void router.replace(PATH_AUTH.LOGIN);
      return;
    }
    setAccess(hasModeratorRole(token) ? "allowed" : "forbidden");
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

  const handleLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await authApi.logout();
    } catch {
      // Clear the browser access token even if the remote logout request fails.
    } finally {
      Cookies.remove("access_token", { path: "/" });
      void router.replace(PATH_AUTH.LOGIN);
    }
  };

  if (access !== "allowed") {
    return (
      <div className={styles.accessScreen} role="status">
        <strong>{MODERATOR_MESSAGES.BRAND}</strong>
        <p>
          {access === "checking"
            ? MODERATOR_MESSAGES.AUTH.CHECKING
            : MODERATOR_MESSAGES.AUTH.FORBIDDEN}
        </p>
        {access === "forbidden" && (
          <div className={styles.accessLinks}>
            <Link href={PATH_HOME.ROOT}>{MODERATOR_MESSAGES.AUTH.HOME}</Link>
            <Link href={PATH_AUTH.LOGIN}>{MODERATOR_MESSAGES.AUTH.LOGIN}</Link>
          </div>
        )}
      </div>
    );
  }

  const notificationsLink = MODERATOR_NAVIGATION_LINKS.find(
    (item) => item.HREF === PATH_MODERATOR.NOTIFICATIONS,
  )!;
  const currentMobileItem = MODERATOR_MOBILE_NAVIGATION_LINKS.find(
    (item) => ("EXACT" in item && item.EXACT)
      ? pathname === item.HREF
      : pathname === item.HREF || pathname.startsWith(item.HREF + "/"),
  );
  const renderBreadcrumb = () => (
    <AdminBreadcrumb
      rootLabel={MODERATOR_MESSAGES.ROLE}
      currentLabel={currentSection.LABEL}
    />
  );
  const actionMessages = MODERATOR_MESSAGES.ACTION_BAR;
  const isSectionList = pathname === currentSection.HREF || pathname === currentSection.HREF + "/list";
  const disabledAction = (label: string) => (
    <>
      <ButtonBar disabled aria-describedby="moderator-action-unavailable">{label}</ButtonBar>
      <span className={styles.actionHint} id="moderator-action-unavailable" role="note">
        {actionMessages.WRITE_UNAVAILABLE}
      </span>
    </>
  );
  const renderActions = () => {
    switch (currentSection.HREF) {
      case PATH_MODERATOR.ROOT:
        return <ButtonBar href={PATH_MODERATOR.INVOICES}>{actionMessages.PENDING_WORK}</ButtonBar>;
      case PATH_MODERATOR.CONTRACTS:
        return <ButtonBar href={PATH_MODERATOR.NEW_CONTRACT}>{actionMessages.CREATE_CONTRACT}</ButtonBar>;
      case PATH_MODERATOR.CUSTOMERS:
        return <ButtonBar href={PATH_MODERATOR.NEW_CUSTOMER}>{actionMessages.CREATE_CUSTOMER}</ButtonBar>;
      case PATH_MODERATOR.INVOICES:
        return disabledAction(actionMessages.RECONCILE_INVOICE);
      case PATH_MODERATOR.MACHINES:
        return <ButtonBar href={PATH_MODERATOR.MACHINE_HISTORY}>{actionMessages.MACHINE_HISTORY}</ButtonBar>;
      case PATH_MODERATOR.IOT:
        return <ButtonBar href={PATH_MODERATOR.MACHINES}>{actionMessages.MACHINES}</ButtonBar>;
      case PATH_MODERATOR.MENU:
        return disabledAction(actionMessages.ADD_RECIPE);
      case PATH_MODERATOR.TECHNICAL_REQUESTS:
        return disabledAction(actionMessages.CREATE_TECHNICAL_REQUEST);
      case PATH_MODERATOR.MACHINE_HISTORY:
        return <ButtonBar href={PATH_MODERATOR.TECHNICAL_REQUESTS}>{actionMessages.TECHNICAL_REQUESTS}</ButtonBar>;
      case PATH_MODERATOR.BUYBACK:
        return disabledAction(actionMessages.CREATE_BUYBACK_REQUEST);
      case PATH_MODERATOR.NOTIFICATIONS:
        return <ButtonBar href={PATH_MODERATOR.NOTIFICATION_ALERTS}>{actionMessages.ALERTS}</ButtonBar>;
      default:
        return <ButtonBar href={PATH_MODERATOR.ROOT}>{actionMessages.OVERVIEW}</ButtonBar>;
    }
  };

  return (
    <>
      <Head>
        <title>{pageTitle} | {MODERATOR_MESSAGES.BRAND}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <div className={styles.shell} data-role="moderator">
        <Sidebar
          brand={MODERATOR_MESSAGES.BRAND}
          brandHref={PATH_MODERATOR.ROOT}
          roleLabel={MODERATOR_MESSAGES.ROLE}
          pathname={pathname}
          rootHref={PATH_MODERATOR.ROOT}
          navigationLabel={MODERATOR_MESSAGES.ROUTES.NAVIGATION_LABEL}
          items={MODERATOR_SIDEBAR_ITEMS}
          logout={{
            label: MODERATOR_MESSAGES.AUTH.LOGOUT,
            pendingLabel: MODERATOR_MESSAGES.AUTH.LOGGING_OUT,
            pending: loggingOut,
            onLogout: handleLogout,
          }}
        />
        <div className={styles.workspace}>
          <header className={styles.desktopHeader}>
            {renderBreadcrumb()}
            <Link className={styles.headerLink} href={notificationsLink.HREF}>
              {MODERATOR_MESSAGES.NAVIGATION.NOTIFICATIONS}
            </Link>
          </header>
          <header className={styles.mobileHeader}>
            <Link className={styles.mobileBrand} href={PATH_MODERATOR.ROOT}>
              {MODERATOR_MESSAGES.BRAND}
            </Link>
            <Link className={styles.mobileHeaderLink} href={notificationsLink.HREF}>
              {MODERATOR_MESSAGES.NAVIGATION.NOTIFICATIONS}
            </Link>
          </header>
          <div className={styles.mobileBreadcrumb}>
            {renderBreadcrumb()}
          </div>
          <main className={styles.main}>{children}</main>
          {isSectionList && <ActionBar label={actionMessages.LABEL}>{renderActions()}</ActionBar>}
          <nav className={styles.mobileNav} aria-label={MODERATOR_MESSAGES.ROUTES.NAVIGATION_LABEL}>
            {currentMobileItem
              ? (
                <Link
                  className={styles.mobileNavActive}
                  href={currentMobileItem.HREF}
                  aria-current="page"
                >
                  {currentMobileItem.LABEL}
                </Link>
              )
              : (
                <span className={styles.mobileNavActive} aria-current="page">
                  {currentSection.LABEL}
                </span>
              )}
            <button
              type="button"
              ref={menuTriggerRef}
              className={styles.mobileNavButton}
              aria-expanded={mobileMenuOpen}
              aria-controls="moderator-mobile-menu"
              onClick={() => setMobileMenuOpen(true)}
            >
              <Menu size={19} aria-hidden="true" />
              {MODERATOR_MESSAGES.NAVIGATION.MORE}
            </button>
          </nav>
        </div>
      </div>
      {mobileMenuOpen && (
        <div className={styles.menuBackdrop} onClick={() => setMobileMenuOpen(false)}>
          <section
            className={styles.mobileMenu}
            id="moderator-mobile-menu"
            ref={menuDialogRef}
            role="dialog"
            aria-modal="true"
            aria-label={MODERATOR_MESSAGES.ROUTES.ALL_PAGES_LABEL}
            onClick={(event) => event.stopPropagation()}
            onKeyDown={(event) => {
              if (event.key !== "Tab") return;
              const focusable = menuDialogRef.current?.querySelectorAll<HTMLElement>(
                "a[href], button:not([disabled])",
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
              <strong>{MODERATOR_MESSAGES.ROUTES.ALL_PAGES_LABEL}</strong>
              <button
                type="button"
                ref={menuCloseRef}
                aria-label={MODERATOR_MESSAGES.ROUTES.CLOSE_MENU}
                onClick={() => setMobileMenuOpen(false)}
              >
                <X size={20} aria-hidden="true" />
              </button>
            </div>
            <SidebarNavigation
              items={MODERATOR_SIDEBAR_ITEMS}
              pathname={pathname}
              rootHref={PATH_MODERATOR.ROOT}
              navigationLabel={MODERATOR_MESSAGES.ROUTES.ALL_PAGES_LABEL}
              className={styles.mobileMenuNav}
              onNavigate={() => setMobileMenuOpen(false)}
            />
            <SidebarLogoutButton
              label={MODERATOR_MESSAGES.AUTH.LOGOUT}
              pendingLabel={MODERATOR_MESSAGES.AUTH.LOGGING_OUT}
              pending={loggingOut}
              onLogout={() => {
                setMobileMenuOpen(false);
                return handleLogout();
              }}
            />
          </section>
        </div>
      )}
    </>
  );
}

export { styles as moderatorStyles };
