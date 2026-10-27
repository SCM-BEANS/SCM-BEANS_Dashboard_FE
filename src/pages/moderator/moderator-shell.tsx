import Cookies from "js-cookie";
import {
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
} from "lucide-react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useState, type ReactNode } from "react";
import { authApi } from "@/apis/auth.api";
import { ActionBar } from "@/components/action-bar/action-bar";
import { ButtonBar } from "@/components/button/button-bar";
import { AdminBreadcrumb } from "@/components/heading/admin-breadcrumb";
import { MobileNavigation } from "@/components/sidebar/mobile-navigation";
import { Sidebar, type SidebarItem } from "@/components/sidebar/sidebar";
import { getActiveNavigationItem, normalizeNavigationPath } from "@/components/sidebar/navigation-route";
import { hasModeratorRole } from "@/lib/auth-role";
import { PATH_AUTH, PATH_HOME, PATH_MODERATOR } from "@/routes/path";
import { MODERATOR_NAVIGATION_LINKS } from "@/routes/routes";
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
  const pathname = normalizeNavigationPath(router.asPath || router.pathname);
  const activeNavigationItem = getActiveNavigationItem(
    MODERATOR_SIDEBAR_ITEMS,
    pathname,
    PATH_MODERATOR.ROOT,
  );
  const currentSection = MODERATOR_NAVIGATION_LINKS.find(
    (item) => item.HREF === activeNavigationItem?.href,
  ) ?? MODERATOR_NAVIGATION_LINKS[0];

  useEffect(() => {
    const token = Cookies.get("access_token");
    if (!token) {
      void router.replace(PATH_AUTH.LOGIN);
      return;
    }
    setAccess(hasModeratorRole(token) ? "allowed" : "forbidden");
  }, [router]);

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
            <MobileNavigation
              items={MODERATOR_SIDEBAR_ITEMS}
              pathname={pathname}
              rootHref={PATH_MODERATOR.ROOT}
              navigationLabel={MODERATOR_MESSAGES.ROUTES.NAVIGATION_LABEL}
              drawerLabel={MODERATOR_MESSAGES.ROUTES.ALL_PAGES_LABEL}
              triggerLabel={MODERATOR_MESSAGES.ROUTES.OPEN_MENU}
              closeLabel={MODERATOR_MESSAGES.ROUTES.CLOSE_MENU}
              logout={{
                label: MODERATOR_MESSAGES.AUTH.LOGOUT,
                pendingLabel: MODERATOR_MESSAGES.AUTH.LOGGING_OUT,
                pending: loggingOut,
                onLogout: handleLogout,
              }}
            />
          </header>
          <div className={styles.mobileBreadcrumb}>
            {renderBreadcrumb()}
          </div>
          <main className={styles.main}>{children}</main>
          {isSectionList && <ActionBar label={actionMessages.LABEL}>{renderActions()}</ActionBar>}
        </div>
      </div>
    </>
  );
}

export { styles as moderatorStyles };
