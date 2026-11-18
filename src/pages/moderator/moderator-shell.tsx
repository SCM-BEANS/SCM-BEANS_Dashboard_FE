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
  Receipt,
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
import { MobileNavigation } from "@/components/sidebar/mobile-navigation";
import { NotificationRuntime } from "@/components/notifications/notification-runtime";
import { NotificationInbox } from "@/components/notifications/notification-inbox";
import { SidebarShell, SidebarWorkspace, Sidebar, type SidebarItem } from "@/components/sidebar/sidebar";
import { getActiveNavigationItem, normalizeNavigationPath } from "@/components/sidebar/navigation-route";
import { hasModeratorRole } from "@/lib/auth-role";
import { PATH_AUTH, PATH_HOME, PATH_MODERATOR } from "@/routes/path";
import { MODERATOR_NAVIGATION_LINKS } from "@/routes/routes";
import { MODERATOR_MESSAGES } from "@/text/moderator/moderator-messages";
import styles from "./moderator-shell.module.css";

const NAV_ICONS = {
  Receipt,
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

  return (
    <>
      <Head>
        <title>{pageTitle} | {MODERATOR_MESSAGES.BRAND}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <SidebarShell className={`${styles.shell} dashboard-tailadmin ta:bg-gray-50 ta:text-gray-800`} data-role="moderator">
        <NotificationRuntime scope="moderator" />
        <Sidebar
          brand={MODERATOR_MESSAGES.BRAND}
          brandHref={PATH_MODERATOR.ROOT}
          roleLabel={MODERATOR_MESSAGES.ROLE}
          pathname={pathname}
          rootHref={PATH_MODERATOR.ROOT}
          navigationLabel={MODERATOR_MESSAGES.ROUTES.NAVIGATION_LABEL}
          items={MODERATOR_SIDEBAR_ITEMS}
        />
        <SidebarWorkspace className={styles.workspace} context={currentSection.LABEL} notifications={<NotificationInbox scope="moderator" variant="bell" viewAllHref={PATH_MODERATOR.NOTIFICATIONS} settingsHref={PATH_MODERATOR.SETTINGS} logout={{ label: MODERATOR_MESSAGES.AUTH.LOGOUT, pendingLabel: MODERATOR_MESSAGES.AUTH.LOGGING_OUT, pending: loggingOut, onLogout: handleLogout }} />}>
          <header className={`${styles.mobileHeader} ta:items-center ta:justify-between ta:gap-3 ta:bg-white ta:px-4`}>
            <Link className={`${styles.mobileBrand} ta:truncate ta:text-lg ta:font-bold ta:text-gray-800`} href={PATH_MODERATOR.ROOT}>
              {MODERATOR_MESSAGES.BRAND}
            </Link>
            <div data-dashboard-dev-login-mobile />
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
          <main className={styles.main} aria-label={pageTitle}>
            <ActionBarLayout navigationHrefs={MODERATOR_SIDEBAR_ITEMS.filter(item => item.enabled !== false).map(item => item.href)} label={MODERATOR_MESSAGES.ACTION_BAR.LABEL}>
              {children}
            </ActionBarLayout>
          </main>
        </SidebarWorkspace>
      </SidebarShell>
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
