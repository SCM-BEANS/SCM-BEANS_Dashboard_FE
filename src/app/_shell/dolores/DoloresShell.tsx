"use client";

import { getRoleNavigationState, isCurrentPath, ROLE_LABEL } from "@/routes/navigation";
import { PATH_MODERATOR, PATH_PUBLIC } from "@/routes/path";
import type { AppRole } from "@/routes/routes";
import { DoloresIconView } from "@/app/_ui/dolores/DoloresUI";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  createContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import styles from "./DoloresShell.module.css";

export type DoloresRole = AppRole;

export const DoloresShellFocusContext = createContext<{
  setFocusLabel: (label: string | null) => void;
} | null>(null);

export function DoloresShell({ role, children }: { role: DoloresRole; children: ReactNode }) {
  const pathname = usePathname();
  const isAdminUsersRoute = pathname === "/admin/users";
  const isModeratorApiReadRoute = role === "moderator" && (
    [
      PATH_MODERATOR.root,
      PATH_MODERATOR.contracts,
      PATH_MODERATOR.customers,
      PATH_MODERATOR.notifications,
      PATH_MODERATOR.notificationAlerts,
      PATH_MODERATOR.machines,
      PATH_MODERATOR.machinesList,
      PATH_MODERATOR.machineStock,
      PATH_MODERATOR.machineCustomer,
      PATH_MODERATOR.machineRepairHistory,
      PATH_MODERATOR.iot,
      PATH_MODERATOR.iotCustomer,
      PATH_MODERATOR.iotMachines,
      PATH_MODERATOR.technicalRequests,
      PATH_MODERATOR.technicalRequestsList,
      PATH_MODERATOR.machineHistory,
    ].some((route) => route === pathname) ||
    [PATH_MODERATOR.contracts, PATH_MODERATOR.customers, PATH_MODERATOR.machines, PATH_MODERATOR.technicalRequests, PATH_MODERATOR.machineHistory].some((base) => {
      const id = pathname.startsWith(`${base}/`) ? pathname.slice(base.length + 1) : "";
      return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
    })
  );
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { nav, selectionPath, mobileSelectionPath, selectedItem, notificationsHref, mobileItems } = getRoleNavigationState(role, pathname);
  const [focusLabel, setFocusLabel] = useState<string | null>(null);
  const selectedLabel = [
    selectedItem?.label ?? nav[0]?.label ?? "Tổng quan",
    focusLabel,
  ]
    .filter(Boolean)
    .join(" / ");

  useEffect(() => {
    setFocusLabel(null);
  }, [pathname]);

  useEffect(() => {
    if (!mobileMenuOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileMenuOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [mobileMenuOpen]);

  return (
    <div className={`${styles.shell} flex h-screen min-h-[640px] min-w-[1024px] overflow-hidden bg-[#F8F6F3] text-[#302927]`} data-role={role} style={{ fontFamily: "var(--font-inter), Arial, sans-serif" }}>
      <aside className={`${styles.sidebar} flex h-screen w-[240px] shrink-0 flex-col gap-1 border-r border-[#E9E2DC] bg-white px-3 pb-5 pt-6`}>
        <Link className="text-[28px] font-semibold leading-[1.45] text-[#B81724]" href={nav[0]?.href ?? PATH_PUBLIC.home}>
          dolores.
        </Link>
        <p className="text-[13px] leading-[1.45] text-[#706561]">{ROLE_LABEL[role]}</p>
        <div className="h-5 shrink-0" />
        <nav className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto" aria-label={"Điều hướng " + ROLE_LABEL[role]}>
          {nav.map((item) => {
            const isCurrent = selectionPath === item.href;
            return (
              <Link
                className="flex h-12 shrink-0 items-center gap-1 rounded-[10px] px-1"
                href={item.href}
                key={item.href}
                aria-current={isCurrent ? "page" : undefined}
              >
                <DoloresIconView icon={item.icon} />
                <span className={"flex h-12 min-w-0 flex-1 items-center rounded-[10px] px-4 py-3 text-sm " + (isCurrent ? "bg-[#F9E9EA] text-[#B81724]" : "text-[#706561] hover:bg-[#F7F5F3]")}>
                  {item.label}
                </span>
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto pt-4 text-xs leading-[1.45] text-[#706561]">
          <p>Không gian {ROLE_LABEL[role]}</p>
          <p>{isAdminUsersRoute ? "Dolores • Quản lý tài khoản" : isModeratorApiReadRoute ? "Dolores • Dữ liệu API" : "Dolores • Dữ liệu minh họa"}</p>
        </div>
      </aside>
      <DoloresShellFocusContext.Provider value={{ setFocusLabel }}>
        <div className={`${styles.workspace} flex h-screen min-w-0 flex-1 flex-col`}>
        <header className={styles.mobileHeader}>
          <Link className={styles.mobileBrand} href={nav[0]?.href ?? PATH_PUBLIC.home}>dolores.</Link>
          <Link className={styles.mobileNotification} href={notificationsHref}>Thông báo</Link>
        </header>
        <header className={`${styles.desktopHeader} flex h-[72px] shrink-0 items-center gap-4 bg-white px-8`}>
          <p className="min-w-0 flex-1 text-sm leading-[1.45] text-[#706561]">
            {ROLE_LABEL[role]} &nbsp;/&nbsp; {selectedLabel}
          </p>
          <Link className="flex h-12 items-center justify-center rounded-[10px] border border-[#E9E2DC] bg-white px-4 py-3 text-sm text-[#302927] hover:bg-[#F7F5F3]" href={notificationsHref}>
            Thông báo
          </Link>
        </header>
        {children}
        <nav className={styles.mobileNav} aria-label={`Điều hướng chính ${ROLE_LABEL[role]}`}>
          {mobileItems.map((item) => {
            const selected = item.exact ? mobileSelectionPath === item.href : isCurrentPath(mobileSelectionPath, item.href);
            return <Link className={selected ? styles.mobileNavItemActive : styles.mobileNavItem} href={item.href} aria-current={selected ? "page" : undefined} key={item.href}>{item.label}</Link>;
          })}
          <button aria-expanded={mobileMenuOpen} aria-controls="dolores-mobile-menu" className={styles.mobileNavItem} onClick={() => setMobileMenuOpen(true)} type="button">Khác</button>
        </nav>
        </div>
      </DoloresShellFocusContext.Provider>
      {mobileMenuOpen && <div className={styles.menuOverlay} id="dolores-mobile-menu" role="dialog" aria-modal="true" aria-labelledby="dolores-mobile-menu-title">
        <div className={styles.menuHeading} id="dolores-mobile-menu-title">Điều hướng · {ROLE_LABEL[role]}</div>
        <nav aria-label={`Tất cả trang ${ROLE_LABEL[role]}`} className={styles.menuLinks}>
          {nav.map((item) => <Link aria-current={isCurrentPath(mobileSelectionPath, item.href) ? "page" : undefined} className={styles.menuLink} href={item.href} key={item.href} onClick={() => setMobileMenuOpen(false)}>{item.label}</Link>)}
        </nav>
        <div className={styles.menuCloseWrap}><button className={styles.menuClose} onClick={() => setMobileMenuOpen(false)} type="button">Đóng</button></div>
      </div>}
    </div>
  );
}

export function DoloresPage({
  title,
  description,
  children,
  actions,
  mobileActions,
  showMobileActionsMenu = true,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  actions?: ReactNode;
  mobileActions?: ReactNode;
  showMobileActionsMenu?: boolean;
}) {
  const [actionsOpen, setActionsOpen] = useState(false);
  const resolvedMobileActions = mobileActions ?? actions;
  return (
    <>
      <main className={`${styles.pageMain} min-h-0 flex-1 overflow-x-hidden overflow-y-auto bg-[#F8F6F3]`}>
        <div className={`${styles.pageContent} flex min-h-full flex-col gap-5 px-8 pb-10 pt-7`}>
          <div className="flex flex-col gap-2">
            <h1 className="text-[28px] font-semibold leading-[1.45] text-[#302927]">{title}</h1>
            {description && <p className="text-[15px] leading-[1.45] text-[#706561]">{description}</p>}
          </div>
          {children}
        </div>
      </main>
      <footer className="flex h-20 shrink-0 items-center gap-4 overflow-x-auto bg-white px-8 py-4">
        {actions}
      </footer>
      {resolvedMobileActions && <div className={styles.mobileActionDock}>
        <div className={styles.mobilePrimaryAction}>{resolvedMobileActions}</div>
        {showMobileActionsMenu && <button aria-expanded={actionsOpen} aria-controls="dolores-mobile-actions" className={styles.mobileActionsButton} onClick={() => setActionsOpen(true)} type="button">Tác vụ</button>}
      </div>}
      {actionsOpen && showMobileActionsMenu && resolvedMobileActions && <div aria-labelledby="dolores-mobile-actions-title" aria-modal="true" className={styles.actionsOverlay} id="dolores-mobile-actions" role="dialog">
        <h2 className={styles.actionsSheetTitle} id="dolores-mobile-actions-title">Thao tác</h2>
        <div className={styles.actionsSheetItems} onClick={() => setActionsOpen(false)}>{resolvedMobileActions}</div>
        <div className={styles.menuCloseWrap}><button className={styles.actionsSheetClose} onClick={() => setActionsOpen(false)} type="button">Đóng</button></div>
      </div>}
    </>
  );
}
