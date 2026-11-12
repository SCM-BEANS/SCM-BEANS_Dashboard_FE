import Cookies from "js-cookie";
import {
  Activity,
  Bell,
  Building2,
  ClipboardCheck,
  Coffee,
  FileText,
  LayoutDashboard,
  Package,
  Settings,
  Users,
  Utensils,
  Wrench,
  MapPin,
} from "lucide-react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useState, type ReactNode } from "react";
import { authApi } from "@/apis/auth.api";
import { ActionBarLayout } from "@/components/action-bar/action-bar";
import { LiquidSuccessSplash, prepareLiquidSuccessAnimation } from "@/components/feedback/liquid-success-splash";
import { AdminBreadcrumb } from "@/components/heading/admin-breadcrumb";
import { MobileNavigation } from "@/components/sidebar/mobile-navigation";
import { NotificationInbox } from "@/components/notifications/notification-inbox";
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
  Building2,
  ClipboardCheck,
  Coffee,
  FileText,
  LayoutDashboard,
  MapPin,
  Package,
  Settings,
  Users,
  Utensils,
  Wrench,
} as const;

const MODERATOR_SIDEBAR_ITEMS: SidebarItem[] = MODERATOR_NAVIGATION_LINKS
  .filter((item) => item.HREF !== PATH_MODERATOR.NOTIFICATIONS)
  .filter((item) => item.HREF !== PATH_MODERATOR.SETTINGS)
  .map((item) => ({
    label: item.LABEL,
    href: item.HREF,
    icon: NAV_ICONS[item.ICON],
  }));
const MODERATOR_ROUTE_ITEMS = MODERATOR_NAVIGATION_LINKS.map((item) => ({ href: item.HREF }));

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
  const [logoutSucceeded, setLogoutSucceeded] = useState(false);
  const pathname = normalizeNavigationPath(router.asPath || router.pathname);
  const activeNavigationItem = getActiveNavigationItem(
    MODERATOR_ROUTE_ITEMS,
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

  useEffect(() => {
    if (access === "allowed") void prepareLiquidSuccessAnimation();
  }, [access]);

  const handleLogout = () => {
    if (loggingOut) return;
    setLoggingOut(true);
    void authApi.logout().catch(() => {
      // Local logout still completes when the remote session is already expired.
    });
    Cookies.remove("access_token", { path: "/" });
    setLogoutSucceeded(true);
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

  const renderBreadcrumb = () => (
    <AdminBreadcrumb
      rootLabel={MODERATOR_MESSAGES.ROLE}
      currentLabel={currentSection.LABEL}
    />
  );
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
          settingsHref={PATH_MODERATOR.SETTINGS}
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
            <NotificationInbox scope="moderator" variant="bell" viewAllHref={PATH_MODERATOR.NOTIFICATIONS} />
          </header>
          <header className={styles.mobileHeader}>
            <Link className={styles.mobileBrand} href={PATH_MODERATOR.ROOT}>
              {MODERATOR_MESSAGES.BRAND}
            </Link>
            <NotificationInbox scope="moderator" variant="bell" viewAllHref={PATH_MODERATOR.NOTIFICATIONS} settingsHref={PATH_MODERATOR.SETTINGS} logout={{ label: MODERATOR_MESSAGES.AUTH.LOGOUT, pendingLabel: MODERATOR_MESSAGES.AUTH.LOGGING_OUT, pending: loggingOut, onLogout: handleLogout }} />
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
          <ActionBarLayout label={MODERATOR_MESSAGES.ACTION_BAR.LABEL}>
            <main className={styles.main}>{children}</main>
          </ActionBarLayout>
        </div>
      </div>
      {logoutSucceeded && (
        <LiquidSuccessSplash
          message="Đăng xuất thành công"
          onComplete={() => { void router.replace(PATH_AUTH.LOGIN); }}
        />
      )}
    </>
  );
}

export { styles as moderatorStyles };
