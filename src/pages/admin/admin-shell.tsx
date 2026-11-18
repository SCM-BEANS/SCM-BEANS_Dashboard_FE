import { SidebarShell, SidebarWorkspace } from "@/components/sidebar/sidebar";
import Cookies from "js-cookie";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useState, type ReactNode } from "react";
import { ActionBarLayout } from "@/components/action-bar/action-bar";
import { LiquidSuccessSplash, prepareLiquidSuccessAnimation } from "@/components/feedback/liquid-success-splash";
import { NotificationRuntime } from "@/components/notifications/notification-runtime";
import { NotificationInbox } from "@/components/notifications/notification-inbox";
import { MobileNavigation } from "@/components/sidebar/mobile-navigation";
import { authApi } from "@/apis/auth.api";
import { hasAdminRole } from "@/lib/auth-role";
import { PATH_ADMIN, PATH_AUTH, PATH_HOME } from "@/routes/path";
import { ADMIN_MESSAGES } from "@/text/admin/admin-messages";
import { ADMIN_SIDEBAR_ITEMS, AdminSidebarMenu, getCurrentAdminSection } from "@/pages/admin/menu/admin-menu";
import styles from "./admin-shell.module.css";

export { styles as adminStyles };

export function AdminShell({
  children,
}: {
  children: ReactNode;
}) {
  const router = useRouter();
  const [access, setAccess] = useState<"checking" | "allowed" | "forbidden">(
    "checking",
  );
  const [loggingOut, setLoggingOut] = useState(false);
  const [logoutSucceeded, setLogoutSucceeded] = useState(false);
  const currentSection = getCurrentAdminSection(router.asPath || router.pathname);
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

  return (
    <>
      <Head>
        <title>{pageTitle} | {ADMIN_MESSAGES.BRAND}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <SidebarShell className={`${styles.shell} dashboard-tailadmin ta:bg-gray-50 ta:text-gray-800`}>
        <NotificationRuntime scope="admin" />
        <AdminSidebarMenu />
        <SidebarWorkspace className={styles.workspace} context={currentSection.LABEL} notifications={<NotificationInbox scope="admin" variant="bell" viewAllHref={PATH_ADMIN.NOTIFICATIONS} settingsHref={PATH_ADMIN.SETTINGS} logout={{ label: ADMIN_MESSAGES.AUTH.LOGOUT, pendingLabel: ADMIN_MESSAGES.AUTH.LOGGING_OUT, pending: loggingOut, onLogout: handleLogout }} />}>
          <header className={`${styles.mobileHeader} ta:items-center ta:justify-between ta:gap-3 ta:bg-white ta:px-4`}>
            <Link className={`${styles.mobileBrand} ta:truncate ta:text-lg ta:font-bold ta:text-gray-800`} href={PATH_ADMIN.ROOT}>
              {ADMIN_MESSAGES.BRAND}
            </Link>
            <span className={styles.mobileHeaderStatus}>
              {currentSection.LABEL}
            </span>
            <div data-dashboard-dev-login-mobile />
            <NotificationInbox scope="admin" variant="bell" viewAllHref={PATH_ADMIN.NOTIFICATIONS} settingsHref={PATH_ADMIN.SETTINGS} logout={{ label: ADMIN_MESSAGES.AUTH.LOGOUT, pendingLabel: ADMIN_MESSAGES.AUTH.LOGGING_OUT, pending: loggingOut, onLogout: handleLogout }} />
            <MobileNavigation
              items={ADMIN_SIDEBAR_ITEMS}
              pathname={router.asPath || router.pathname}
              rootHref={PATH_ADMIN.ROOT}
              navigationLabel={"Điều hướng Admin"}
              drawerLabel={"Tất cả trang Admin"}
              triggerLabel={"Mở menu điều hướng"}
              closeLabel={"Đóng menu"}
              logout={{
                label: ADMIN_MESSAGES.AUTH.LOGOUT,
                pendingLabel: ADMIN_MESSAGES.AUTH.LOGGING_OUT,
                pending: loggingOut,
                onLogout: handleLogout,
              }}
            />
          </header>
          <main className={styles.main} aria-label={pageTitle}>
            <ActionBarLayout navigationHrefs={ADMIN_SIDEBAR_ITEMS.filter(item => item.enabled !== false).map(item => item.href)} label={`Thao tác ${pageTitle}`}>
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
