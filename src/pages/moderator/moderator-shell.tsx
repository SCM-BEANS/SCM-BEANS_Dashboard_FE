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

export function ModeratorShell({
  children,
  pageTitle,
}: {
  children: ReactNode;
  pageTitle: string;
}) {
  const router = useRouter();
  const [access, setAccess] = useState<"checking" | "allowed" | "forbidden">("checking");
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

  const renderNavigation = (closeMenu = false) =>
    MODERATOR_NAVIGATION_LINKS.map((item) => {
      const Icon = NAV_ICONS[item.ICON];
      const active =
        pathname === item.HREF ||
        (item.HREF !== PATH_MODERATOR.ROOT && pathname.startsWith(item.HREF + "/"));

      return (
        <Link
          href={item.HREF}
          className={styles.navItem + (active ? " " + styles.navItemActive : "")}
          aria-current={active ? "page" : undefined}
          key={item.HREF}
          onClick={closeMenu ? () => setMobileMenuOpen(false) : undefined}
        >
          <Icon size={20} aria-hidden="true" />
          <span>{item.LABEL}</span>
        </Link>
      );
    });

  const notificationsLink = MODERATOR_NAVIGATION_LINKS.find(
    (item) => item.HREF === PATH_MODERATOR.NOTIFICATIONS,
  )!;
  const currentMobileItem = MODERATOR_MOBILE_NAVIGATION_LINKS.find(
    (item) => ("EXACT" in item && item.EXACT)
      ? pathname === item.HREF
      : pathname === item.HREF || pathname.startsWith(item.HREF + "/"),
  );

  return (
    <>
      <Head>
        <title>{pageTitle} | {MODERATOR_MESSAGES.BRAND}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <div className={styles.shell} data-role="moderator">
        <aside className={styles.sidebar}>
          <Link className={styles.brand} href={PATH_MODERATOR.ROOT}>
            {MODERATOR_MESSAGES.BRAND}
          </Link>
          <p className={styles.roleLabel}>{MODERATOR_MESSAGES.ROLE}</p>
          <nav className={styles.sidebarNav} aria-label={MODERATOR_MESSAGES.ROUTES.NAVIGATION_LABEL}>
            {renderNavigation()}
          </nav>
        </aside>
        <div className={styles.workspace}>
          <header className={styles.desktopHeader}>
            <p>
              {MODERATOR_MESSAGES.ROLE} <span aria-hidden="true">/</span> {pageTitle || currentSection.LABEL}
            </p>
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
          <main className={styles.main}>{children}</main>
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
            <nav className={styles.mobileMenuNav}>{renderNavigation(true)}</nav>
          </section>
        </div>
      )}
    </>
  );
}

export { styles as moderatorStyles };
