import Cookies from "js-cookie";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useState, type ReactNode } from "react";
import { ActionBar } from "@/components/action-bar/action-bar";
import { LiquidSuccessSplash, prepareLiquidSuccessAnimation } from "@/components/feedback/liquid-success-splash";
import { AdminBreadcrumb } from "@/components/heading/admin-breadcrumb";
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
  actions,
}: {
  children: ReactNode;
  actions?: ReactNode;
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
      <div className={styles.shell}>
        <AdminSidebarMenu loggingOut={loggingOut} onLogout={handleLogout} />
        <div className={styles.workspace}>
          <header className={styles.desktopHeader}>
            <AdminBreadcrumb
              rootLabel={ADMIN_MESSAGES.ROLE}
              currentLabel={currentSection.LABEL}
            />
            <NotificationInbox scope="admin" variant="bell" viewAllHref={PATH_ADMIN.NOTIFICATIONS} />
          </header>
          <header className={styles.mobileHeader}>
            <Link className={styles.mobileBrand} href={PATH_ADMIN.ROOT}>
              {ADMIN_MESSAGES.BRAND}
            </Link>
            <span className={styles.mobileHeaderStatus}>
              {currentSection.LABEL}
            </span>
            <NotificationInbox scope="admin" variant="bell" viewAllHref={PATH_ADMIN.NOTIFICATIONS} />
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
              footer={<p className={styles.sidebarFootnote}>{ADMIN_MESSAGES.NAVIGATION.PENDING}</p>}
            />
          </header>
          <main className={styles.main}>{children}</main>
          {actions && <ActionBar>{actions}</ActionBar>}
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
