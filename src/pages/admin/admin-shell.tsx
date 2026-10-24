import Cookies from "js-cookie";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useState, type ReactNode } from "react";
import { AdminActionBar } from "@/components/action-bar/admin-action-bar";
import { AdminBreadcrumb } from "@/components/heading/admin-breadcrumb";
import { authApi } from "@/apis/auth.api";
import { hasAdminRole } from "@/lib/auth-role";
import { PATH_ADMIN, PATH_AUTH, PATH_HOME } from "@/routes/path";
import { ADMIN_MESSAGES } from "@/text/admin/admin-messages";
import { AdminMobileMenu, AdminSidebarMenu, getCurrentAdminSection } from "@/pages/admin/menu/admin-menu";
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
  const currentSection = getCurrentAdminSection(router.pathname);
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
          {actions && <AdminActionBar>{actions}</AdminActionBar>}
          <AdminMobileMenu currentSection={currentSection} loggingOut={loggingOut} onLogout={handleLogout} />
        </div>
      </div>
    </>
  );
}
