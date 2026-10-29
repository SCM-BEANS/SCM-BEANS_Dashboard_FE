import Cookies from "js-cookie";
import { Bell, Coffee, FileText, LayoutDashboard, Package, Utensils, Wrench } from "lucide-react";
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
import { canAccessCustomerArea } from "@/lib/auth-role";
import { PATH_AUTH, PATH_CUSTOMER, PATH_HOME } from "@/routes/path";
import { CUSTOMER_NAVIGATION_LINKS } from "@/routes/routes";
import { CUSTOMER_MESSAGES } from "@/text/customer/customer-messages";
import styles from "./customer-shell.module.css";

const NAV_ICONS = {
  Bell,
  Coffee,
  FileText,
  LayoutDashboard,
  Package,
  Utensils,
  Wrench,
} as const;

const CUSTOMER_SIDEBAR_ITEMS: SidebarItem[] = CUSTOMER_NAVIGATION_LINKS
  .filter((item) => item.HREF !== PATH_CUSTOMER.NOTIFICATIONS)
  .map((item) => ({
    label: item.LABEL,
    href: item.HREF,
    icon: NAV_ICONS[item.ICON],
  }));
const CUSTOMER_ROUTE_ITEMS = CUSTOMER_NAVIGATION_LINKS.map((item) => ({ href: item.HREF }));

export function CustomerShell({
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
    CUSTOMER_ROUTE_ITEMS,
    pathname,
    PATH_CUSTOMER.ROOT,
  );
  const currentSection = CUSTOMER_NAVIGATION_LINKS.find(
    (item) => item.HREF === activeNavigationItem?.href,
  ) ?? CUSTOMER_NAVIGATION_LINKS[0];

  useEffect(() => {
    const token = Cookies.get("access_token");
    if (!token) {
      void router.replace(PATH_AUTH.LOGIN);
      return;
    }
    setAccess(canAccessCustomerArea(token) ? "allowed" : "forbidden");
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
        <strong>{CUSTOMER_MESSAGES.BRAND}</strong>
        <p>
          {access === "checking"
            ? CUSTOMER_MESSAGES.AUTH.CHECKING
            : CUSTOMER_MESSAGES.AUTH.FORBIDDEN}
        </p>
        {access === "forbidden" && (
          <div className={styles.accessLinks}>
            <Link href={PATH_HOME.ROOT}>{CUSTOMER_MESSAGES.AUTH.HOME}</Link>
            <Link href={PATH_AUTH.LOGIN}>{CUSTOMER_MESSAGES.AUTH.LOGIN}</Link>
          </div>
        )}
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>{pageTitle} | {CUSTOMER_MESSAGES.BRAND}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <div className={styles.shell} data-role="customer">
        <Sidebar
          brand={CUSTOMER_MESSAGES.BRAND}
          brandHref={PATH_CUSTOMER.ROOT}
          roleLabel={CUSTOMER_MESSAGES.ROLE}
          pathname={pathname}
          rootHref={PATH_CUSTOMER.ROOT}
          navigationLabel={CUSTOMER_MESSAGES.NAVIGATION.NAVIGATION_LABEL}
          items={CUSTOMER_SIDEBAR_ITEMS}
          logout={{
            label: CUSTOMER_MESSAGES.NAVIGATION.LOGOUT,
            pendingLabel: CUSTOMER_MESSAGES.NAVIGATION.LOGGING_OUT,
            pending: loggingOut,
            onLogout: handleLogout,
          }}
        />
        <div className={styles.workspace}>
          <header className={styles.desktopHeader}>
            <p>{CUSTOMER_MESSAGES.ROLE} / {pageTitle}</p>
            <NotificationInbox scope="customer" variant="bell" viewAllHref={PATH_CUSTOMER.NOTIFICATIONS} />
          </header>
          <header className={styles.mobileHeader}>
            <Link className={styles.mobileBrand} href={PATH_CUSTOMER.ROOT}>
              {CUSTOMER_MESSAGES.BRAND}
            </Link>
            <NotificationInbox scope="customer" variant="bell" viewAllHref={PATH_CUSTOMER.NOTIFICATIONS} />
            <MobileNavigation
              items={CUSTOMER_SIDEBAR_ITEMS}
              pathname={pathname}
              rootHref={PATH_CUSTOMER.ROOT}
              navigationLabel={CUSTOMER_MESSAGES.NAVIGATION.NAVIGATION_LABEL}
              drawerLabel={CUSTOMER_MESSAGES.NAVIGATION.ALL_PAGES_LABEL}
              triggerLabel={CUSTOMER_MESSAGES.NAVIGATION.OPEN_MENU}
              closeLabel={CUSTOMER_MESSAGES.NAVIGATION.CLOSE_MENU}
              logout={{
                label: CUSTOMER_MESSAGES.NAVIGATION.LOGOUT,
                pendingLabel: CUSTOMER_MESSAGES.NAVIGATION.LOGGING_OUT,
                pending: loggingOut,
                onLogout: handleLogout,
              }}
            />
          </header>
          <div className={styles.mobileBreadcrumb}>
            {CUSTOMER_MESSAGES.ROLE} / {currentSection.LABEL}
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
