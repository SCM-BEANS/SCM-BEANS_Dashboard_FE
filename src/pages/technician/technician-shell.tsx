import Cookies from "js-cookie";
import { Bell, ClipboardCheck, Coffee, Wrench } from "lucide-react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useState, type ReactNode } from "react";
import { authApi } from "@/apis/auth.api";
import { LiquidSuccessSplash, prepareLiquidSuccessAnimation } from "@/components/feedback/liquid-success-splash";
import { MobileNavigation } from "@/components/sidebar/mobile-navigation";
import { NotificationInbox } from "@/components/notifications/notification-inbox";
import { Sidebar, type SidebarItem } from "@/components/sidebar/sidebar";
import { getActiveNavigationItem, normalizeNavigationPath } from "@/components/sidebar/navigation-route";
import { canAccessTechnicianArea } from "@/lib/auth-role";
import { PATH_AUTH, PATH_HOME, PATH_TECHNICIAN } from "@/routes/path";
import { TECHNICIAN_NAVIGATION_LINKS } from "@/routes/routes";
import { TECHNICIAN_MESSAGES } from "@/text/technician/technician-messages";
import styles from "./technician-shell.module.css";

const NAV_ICONS = {
  Bell,
  ClipboardCheck,
  Coffee,
  Wrench,
} as const;

const TECHNICIAN_SIDEBAR_ITEMS: SidebarItem[] = TECHNICIAN_NAVIGATION_LINKS
  .map((item) => ({
    label: item.LABEL,
    href: item.HREF,
    icon: NAV_ICONS[item.ICON],
  }));
const TECHNICIAN_ROUTE_ITEMS = TECHNICIAN_NAVIGATION_LINKS.map((item) => ({ href: item.HREF }));

export function TechnicianShell({
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
    TECHNICIAN_ROUTE_ITEMS,
    pathname,
    PATH_TECHNICIAN.ROOT,
  );
  const currentSection = TECHNICIAN_NAVIGATION_LINKS.find(
    (item) => item.HREF === activeNavigationItem?.href,
  ) ?? TECHNICIAN_NAVIGATION_LINKS[0];

  useEffect(() => {
    const token = Cookies.get("access_token");
    if (!token) {
      void router.replace(PATH_AUTH.LOGIN);
      return;
    }
    setAccess(canAccessTechnicianArea(token) ? "allowed" : "forbidden");
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
        <strong>{TECHNICIAN_MESSAGES.BRAND}</strong>
        <p>
          {access === "checking"
            ? TECHNICIAN_MESSAGES.AUTH.CHECKING
            : TECHNICIAN_MESSAGES.AUTH.FORBIDDEN}
        </p>
        {access === "forbidden" && (
          <div className={styles.accessLinks}>
            <Link href={PATH_HOME.ROOT}>{TECHNICIAN_MESSAGES.AUTH.HOME}</Link>
            <Link href={PATH_AUTH.LOGIN}>{TECHNICIAN_MESSAGES.AUTH.LOGIN}</Link>
          </div>
        )}
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>{pageTitle} | {TECHNICIAN_MESSAGES.BRAND}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <div className={styles.shell} data-role="technician">
        <Sidebar
          brand={TECHNICIAN_MESSAGES.BRAND}
          brandHref={PATH_TECHNICIAN.ROOT}
          roleLabel={TECHNICIAN_MESSAGES.ROLE}
          pathname={pathname}
          rootHref={PATH_TECHNICIAN.ROOT}
          navigationLabel={TECHNICIAN_MESSAGES.NAVIGATION.NAVIGATION_LABEL}
          items={TECHNICIAN_SIDEBAR_ITEMS}
          logout={{
            label: TECHNICIAN_MESSAGES.NAVIGATION.LOGOUT,
            pendingLabel: TECHNICIAN_MESSAGES.NAVIGATION.LOGGING_OUT,
            pending: loggingOut,
            onLogout: handleLogout,
          }}
        />
        <div className={styles.workspace}>
          <header className={styles.desktopHeader}>
            <p>{TECHNICIAN_MESSAGES.ROLE} / {pageTitle}</p>
            <NotificationInbox scope="technician" variant="bell" viewAllHref={PATH_TECHNICIAN.NOTIFICATIONS} />
          </header>
          <header className={styles.mobileHeader}>
            <Link className={styles.mobileBrand} href={PATH_TECHNICIAN.ROOT}>
              {TECHNICIAN_MESSAGES.BRAND}
            </Link>
            <NotificationInbox scope="technician" variant="bell" viewAllHref={PATH_TECHNICIAN.NOTIFICATIONS} />
            <MobileNavigation
              items={TECHNICIAN_SIDEBAR_ITEMS}
              pathname={pathname}
              rootHref={PATH_TECHNICIAN.ROOT}
              navigationLabel={TECHNICIAN_MESSAGES.NAVIGATION.NAVIGATION_LABEL}
              drawerLabel={TECHNICIAN_MESSAGES.NAVIGATION.ALL_PAGES_LABEL}
              triggerLabel={TECHNICIAN_MESSAGES.NAVIGATION.OPEN_MENU}
              closeLabel={TECHNICIAN_MESSAGES.NAVIGATION.CLOSE_MENU}
              logout={{
                label: TECHNICIAN_MESSAGES.NAVIGATION.LOGOUT,
                pendingLabel: TECHNICIAN_MESSAGES.NAVIGATION.LOGGING_OUT,
                pending: loggingOut,
                onLogout: handleLogout,
              }}
            />
          </header>
          <div className={styles.mobileBreadcrumb}>
            {TECHNICIAN_MESSAGES.ROLE} / {currentSection.LABEL}
          </div>
          <main className={styles.main}>{children}</main>
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
