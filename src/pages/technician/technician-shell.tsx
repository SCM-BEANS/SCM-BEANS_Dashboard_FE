import Cookies from "js-cookie";
import { Bell, ClipboardCheck, Coffee } from "lucide-react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useState, type ReactNode } from "react";
import { authApi } from "@/apis/auth.api";
import { Sidebar, SidebarLogoutButton, SidebarNavigation, type SidebarItem } from "@/components/sidebar/sidebar";
import { canAccessTechnicianArea } from "@/lib/auth-role";
import { PATH_AUTH, PATH_HOME, PATH_TECHNICIAN } from "@/routes/path";
import { TECHNICIAN_NAVIGATION_LINKS } from "@/routes/routes";
import { TECHNICIAN_MESSAGES } from "@/text/technician/technician-messages";
import styles from "./technician-shell.module.css";

const NAV_ICONS = {
  Bell,
  ClipboardCheck,
  Coffee,
} as const;

const TECHNICIAN_SIDEBAR_ITEMS: SidebarItem[] = TECHNICIAN_NAVIGATION_LINKS.map((item) => ({
  label: item.LABEL,
  href: item.HREF,
  icon: NAV_ICONS[item.ICON],
}));

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
  const pathname = router.asPath.split("?")[0].replace(/\/+$/, "") || "/";
  const currentSection = TECHNICIAN_NAVIGATION_LINKS.find(
    (item) => item.HREF === pathname || pathname.startsWith(item.HREF + "/"),
  ) ?? TECHNICIAN_NAVIGATION_LINKS[0];

  useEffect(() => {
    const token = Cookies.get("access_token");
    if (!token) {
      void router.replace(PATH_AUTH.LOGIN);
      return;
    }
    setAccess(canAccessTechnicianArea(token) ? "allowed" : "forbidden");
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

  const notificationsLink = TECHNICIAN_NAVIGATION_LINKS.find(
    (item) => item.HREF === PATH_TECHNICIAN.NOTIFICATIONS,
  )!;

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
            <Link className={styles.headerLink} href={notificationsLink.HREF}>
              {notificationsLink.LABEL}
            </Link>
          </header>
          <header className={styles.mobileHeader}>
            <Link className={styles.mobileBrand} href={PATH_TECHNICIAN.ROOT}>
              {TECHNICIAN_MESSAGES.BRAND}
            </Link>
            <Link className={styles.mobileHeaderLink} href={notificationsLink.HREF}>
              {notificationsLink.LABEL}
            </Link>
          </header>
          <div className={styles.mobileBreadcrumb}>
            {TECHNICIAN_MESSAGES.ROLE} / {currentSection.LABEL}
          </div>
          <main className={styles.main}>{children}</main>
          <div className={styles.mobileNav}>
            <SidebarNavigation
              items={TECHNICIAN_SIDEBAR_ITEMS}
              pathname={pathname}
              rootHref={PATH_TECHNICIAN.ROOT}
              navigationLabel={TECHNICIAN_MESSAGES.NAVIGATION.NAVIGATION_LABEL}
              className={styles.mobileNavLinks}
            />
            <SidebarLogoutButton
              label={TECHNICIAN_MESSAGES.NAVIGATION.LOGOUT}
              pendingLabel={TECHNICIAN_MESSAGES.NAVIGATION.LOGGING_OUT}
              pending={loggingOut}
              onLogout={handleLogout}
            />
          </div>
        </div>
      </div>
    </>
  );
}
